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

export const createRewardedAd = (): RewardedAdController | null => null;