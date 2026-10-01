import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { supabase } from '@/lib/supabase';

export type RewardedAdEventName =
  | 'loaded'
  | 'earned'
  | 'closed'
  | 'error';

export type RewardedAdController = {
  load: () => void;
  show: () => Promise<void>;
  addListener: (
    event: RewardedAdEventName,
    handler: (error?: unknown) => void
  ) => () => void;
};

const REWARDED_AD_UNIT_ID = TestIds.REWARDED;

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 1000;

function createSessionId(): string {
  return `ad_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const createRewardedAd = (): RewardedAdController | null => {
  let sessionId = createSessionId();
  let ad: RewardedAd | null = null;
  let loaded = false;
  let loadingPromise: Promise<void> | null = null;

  const listeners: Record<
    RewardedAdEventName,
    Set<(error?: unknown) => void>
  > = {
    loaded: new Set(),
    earned: new Set(),
    closed: new Set(),
    error: new Set(),
  };

  let removeListeners: (() => void) | null = null;

  const notify = (
    event: RewardedAdEventName,
    error?: unknown
  ) => {
    listeners[event].forEach(handler => handler(error));
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user || user.is_anonymous) {
      throw new Error('Please sign in before watching rewarded ads.');
    }

    return user;
  };

  const createAd = async () => {
    const user = await getCurrentUser();

    sessionId = createSessionId();

    const created = RewardedAd.createForAdRequest(
      REWARDED_AD_UNIT_ID,
      {
        serverSideVerificationOptions: {
          userId: user.id,
          customData: sessionId,
        },
      }
    );

    ad = created;
    loaded = false;

    removeListeners?.();

    const removers = [
      created.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          loaded = true;
          loadingPromise = null;
          notify('loaded');
        }
      ),
      created.addAdEventListener(
        AdEventType.ERROR,
        error => {
          loaded = false;
          loadingPromise = null;
          notify('error', error);
        }
      ),
      created.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          loaded = false;
          loadingPromise = null;
          notify('closed');
          void createAd().then(next => {
            next.load();
          }).catch(error => {
            notify('error', error);
          });
        }
      ),
      created.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          notify('earned');
        }
      ),
    ];

    removeListeners = () => {
      removers.forEach(remove => remove());
      removeListeners = null;
    };

    return created;
  };

  const load = () => {
    if (loadingPromise || loaded) {
      return;
    }

    loadingPromise = (async () => {
      const created = ad ?? (await createAd());

      if (!created) {
        throw new Error('Rewarded ad could not be created.');
      }

      created.load();
    })().catch(error => {
      loadingPromise = null;
      notify('error', error);
    });
  };

  const waitForLoaded = async () => {
    if (loaded && ad) {
      return ad;
    }

    load();

    for (let i = 0; i < 20; i += 1) {
      if (loaded && ad) {
        return ad;
      }
      await wait(250);
    }

    throw new Error('Rewarded ad did not load in time.');
  };

  const waitForServerReward = async (expectedSessionId: string) => {
    const user = await getCurrentUser();

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      const { data, error } = await supabase
        .from('chalega_reward_events')
        .select('id, status, coins')
        .eq('user_id', user.id)
        .eq('event_type', 'rewarded_ad')
        .filter(
          'metadata->>custom_data',
          'eq',
          expectedSessionId
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.status === 'awarded') {
        return;
      }

      if (data?.status === 'rejected') {
        throw new Error('The ad reward was rejected.');
      }

      await wait(POLL_INTERVAL_MS);
    }

    throw new Error(
      'The ad finished, but the Coin reward is still being verified. Your reward may arrive shortly.'
    );
  };

  const show = async () => {
    const created = await waitForLoaded();
    const expectedSessionId = sessionId;

    let earned = false;

    const earnedListener = created.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        earned = true;
      }
    );

    try {
      await created.show();

      if (!earned) {
        return;
      }

      await waitForServerReward(expectedSessionId);
    } finally {
      earnedListener();
    }
  };

  return {
    load,
    show,
    addListener: (event, handler) => {
      listeners[event].add(handler);
      return () => listeners[event].delete(handler);
    },
  };
};
