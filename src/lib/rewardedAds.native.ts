import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

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

export const createRewardedAd = (): RewardedAdController => {
  const ad = RewardedAd.createForAdRequest(TestIds.REWARDED, {
    requestNonPersonalizedAdsOnly: true,
  });

  return {
    load: () => {
      ad.load();
    },

    show: async () => {
      await ad.show();
    },

    addListener: (event, handler) => {
      const eventMap = {
        loaded: RewardedAdEventType.LOADED,
        earned: RewardedAdEventType.EARNED_REWARD,
        closed: AdEventType.CLOSED,
        error: AdEventType.ERROR,
      } as const;

      return ad.addAdEventListener(
        eventMap[event],
        handler
      );
    },
  };
};