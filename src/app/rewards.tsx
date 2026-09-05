import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

import {
  getPoints,
  getPointsHistory,
  subtractPoints,
  type PointsTransaction,
} from '../lib/points';
import { formatLocalDateTime } from '../lib/date';
import { createRewardedAd } from '../lib/rewardedAds';

const CLAIMED_REWARDS_KEY = 'chalega_claimed_rewards';

const CHALEGA_ENERGY_KEY = 'chalega_energy';
const CHALEGA_ENERGY_DATE_KEY = 'chalega_energy_date';
const MAX_DAILY_ENERGY = 3;

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

type Reward = {
  id: string;
  emoji: string;
  category: string;
  title: string;
  description: string;
  cost: number;
};

const REWARDS: Reward[] = [
  {
    id: 'badge-500',
    emoji: '🏃',
    category: 'MILESTONE',
    title: 'First 500',
    description: 'Your first major Chalega milestone.',
    cost: 500,
  },
  {
    id: 'badge-1000',
    emoji: '🏆',
    category: 'MILESTONE',
    title: 'Healthy Walker',
    description: 'Reach 1,000 Chalega Points.',
    cost: 1000,
  },
  {
    id: 'badge-2500',
    emoji: '🥇',
    category: 'MILESTONE',
    title: 'Chalega Champion',
    description: 'Reach 2,500 Chalega Points.',
    cost: 2500,
  },
  {
    id: 'shop-50',
    emoji: '🎁',
    category: 'SHOP REWARD',
    title: '₹50 Health Reward',
    description:
      'A future reward redeemable with participating Chalega partners.',
    cost: 5000,
  },
];

export default function RewardsScreen() {
  const router = useRouter();

  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsTransaction[]>([]);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [energy, setEnergy] = useState(0);
  const [adLoaded, setAdLoaded] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);

  const rewardedAd = useMemo(
    () => createRewardedAd(),
    []
  );

  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);

      const [
        currentPoints,
        currentHistory,
        savedClaims,
      ] = await Promise.all([
        getPoints(),
        getPointsHistory(),
        AsyncStorage.getItem(CLAIMED_REWARDS_KEY),
      ]);

      setPoints(currentPoints);
      setHistory(currentHistory);

      if (savedClaims) {
        try {
          const parsed = JSON.parse(savedClaims);

          if (Array.isArray(parsed)) {
            setClaimed(parsed);
          }
        } catch {
          setClaimed([]);
        }
      }
    } catch (error) {
      console.log(
        'Could not load Chalega wallet:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet])
  );

  /*
   * Load Chalega Energy.
   *
   * Energy is intentionally separate from Chalega Points.
   * Watching rewarded ads never adds Chalega Points.
   */
  const loadEnergy = useCallback(async () => {
    try {
      const today = getLocalDateKey();

      const [savedEnergy, savedDate] =
        await Promise.all([
          AsyncStorage.getItem(CHALEGA_ENERGY_KEY),
          AsyncStorage.getItem(CHALEGA_ENERGY_DATE_KEY),
        ]);

      if (savedDate !== today) {
        await AsyncStorage.multiSet([
          [CHALEGA_ENERGY_KEY, '0'],
          [CHALEGA_ENERGY_DATE_KEY, today],
        ]);

        setEnergy(0);
        return;
      }

      const parsedEnergy = Number(savedEnergy ?? 0);

      setEnergy(
        Number.isFinite(parsedEnergy)
          ? Math.min(
              Math.max(parsedEnergy, 0),
              MAX_DAILY_ENERGY
            )
          : 0
      );
    } catch (error) {
      console.log(
        'Could not load Chalega Energy:',
        error
      );

      setEnergy(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEnergy();
    }, [loadEnergy])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          loadEnergy();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [loadEnergy]);

  /*
   * Prepare rewarded video on native platforms.
   *
   * The web helper returns null, so this effect does
   * nothing in the web preview.
   */
  useEffect(() => {
    if (!rewardedAd) {
      return;
    }

    const unsubscribeLoaded = rewardedAd.addListener(
      'loaded',
      () => {
        setAdLoaded(true);
      }
    );

    const unsubscribeEarned = rewardedAd.addListener(
      'earned',
      async () => {
        try {
          const today = getLocalDateKey();

          const [
            savedEnergy,
            savedDate,
          ] = await Promise.all([
            AsyncStorage.getItem(CHALEGA_ENERGY_KEY),
            AsyncStorage.getItem(
              CHALEGA_ENERGY_DATE_KEY
            ),
          ]);

          let currentEnergy =
            savedDate === today
              ? Number(savedEnergy ?? 0)
              : 0;

          if (!Number.isFinite(currentEnergy)) {
            currentEnergy = 0;
          }

          if (
            currentEnergy >= MAX_DAILY_ENERGY
          ) {
            setEnergy(MAX_DAILY_ENERGY);
            return;
          }

          const nextEnergy = Math.min(
            currentEnergy + 1,
            MAX_DAILY_ENERGY
          );

          await AsyncStorage.setItem(
            CHALEGA_ENERGY_KEY,
            String(nextEnergy)
          );

          await AsyncStorage.setItem(
            CHALEGA_ENERGY_DATE_KEY,
            today
          );

          setEnergy(nextEnergy);
          setWatchingAd(false);

          Alert.alert(
            '⚡ Chalega Energy Earned!',
            `You unlocked 1 Chalega Energy.\n\nToday: ${nextEnergy} / ${MAX_DAILY_ENERGY}`,
            [
              {
                text: 'KEEP GOING',
              },
            ]
          );
        } catch (error) {
          console.log(
            'Could not save Chalega Energy:',
            error
          );

          setWatchingAd(false);
        }
      }
    );

    const unsubscribeClosed = rewardedAd.addListener(
      'closed',
      () => {
        setWatchingAd(false);
        setAdLoaded(false);

        rewardedAd.load();
      }
    );

    const unsubscribeError = rewardedAd.addListener(
      'error',
      error => {
        console.log(
          'Rewarded ad error:',
          error
        );

        setWatchingAd(false);
        setAdLoaded(false);

        Alert.alert(
          'Ad unavailable',
          'The rewarded video could not be loaded right now. Please try again in a moment.'
        );
      }
    );

    rewardedAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [rewardedAd]);

  const watchAndEarn = async () => {
    if (watchingAd) {
      return;
    }

    if (Platform.OS === 'web') {
      window.alert('Mobile App Reward - Rewarded videos are available in the Android and iPhone app. This web preview is for UI testing.');
      return;
    }

    if (energy >= MAX_DAILY_ENERGY) {
      Alert.alert(
        'Daily Limit Reached',
        'You have already earned the maximum 3 Chalega Energy rewards today. Come back tomorrow.'
      );

      return;
    }

    if (!adLoaded) {
      Alert.alert(
        'Video Loading',
        'The rewarded video is still loading. Please try again in a moment.'
      );

      return;
    }

    if (!rewardedAd) {
      return;
    }

    try {
      setWatchingAd(true);

      await rewardedAd.show();
    } catch (error) {
      console.log(
        'Could not show rewarded ad:',
        error
      );

      setWatchingAd(false);
      setAdLoaded(false);

      if (rewardedAd) {
        rewardedAd.load();
      }

      Alert.alert(
        'Ad unavailable',
        'The rewarded video could not be shown right now. Please try again.'
      );
    }
  };

  const level = useMemo(() => {
    if (points >= 5000) return 5;
    if (points >= 2500) return 4;
    if (points >= 1000) return 3;
    if (points >= 500) return 2;

    return 1;
  }, [points]);

  const levelName = [
    'New Walker',
    'Active Walker',
    'Healthy Walker',
    'Chalega Pro',
    'Chalega Champion',
  ][level - 1];

  const levelStart = [
    0,
    500,
    1000,
    2500,
    5000,
  ][level - 1];

  const levelEnd =
    level === 5
      ? 5000
      : [500, 1000, 2500, 5000][level - 1];

  const progress =
    level === 5
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((points - levelStart) /
              (levelEnd - levelStart)) *
              100
          )
        );

  const nextLevelPoints =
    level === 5
      ? 0
      : Math.max(levelEnd - points, 0);

  const recentHistory = history.slice(0, 6);

  const claimReward = async (reward: Reward) => {
    if (claimed.includes(reward.id)) {
      Alert.alert(
        'Already Claimed',
        'This reward has already been claimed.'
      );

      return;
    }

    if (points < reward.cost) {
      Alert.alert(
        'Keep Walking 🏃',
        `You need ${(
          reward.cost - points
        ).toLocaleString('en-IN')} more Chalega Points.`
      );

      return;
    }

    Alert.alert(
      'Redeem Reward?',
      `Use ${reward.cost.toLocaleString(
        'en-IN'
      )} Chalega Points for ${reward.title}?`,
      [
        {
          text: 'CANCEL',
          style: 'cancel',
        },
        {
          text: 'REDEEM',
          onPress: async () => {
            try {
              const newBalance =
                await subtractPoints(
                  reward.cost,
                  'reward_redemption',
                  reward.title,
                  `redeemed_${reward.id}_${Date.now()}`
                );

              if (newBalance === null) {
                Alert.alert(
                  'Not enough points',
                  'Your available balance has changed. Please try again.'
                );

                await loadWallet();

                return;
              }

              const updatedClaims = [
                ...claimed,
                reward.id,
              ];

              await AsyncStorage.setItem(
                CLAIMED_REWARDS_KEY,
                JSON.stringify(updatedClaims)
              );

              setClaimed(updatedClaims);
              setPoints(newBalance);

              await loadWallet();

              Alert.alert(
                '🎉 Reward Redeemed!',
                `${reward.title} has been added to your Chalega rewards history.`,
                [
                  {
                    text: 'KEEP GOING',
                  },
                ]
              );
            } catch (error) {
              console.log(
                'Reward redemption failed:',
                error
              );

              Alert.alert(
                'Something went wrong',
                'We could not complete the redemption.'
              );
            }
          },
        },
      ]
    );
  };

  const showAllHistory = () => {
    router.push('./points-activity');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingEmoji}>
            🚶
          </Text>

          <Text style={styles.loadingText}>
            Loading your Chalega wallet...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.brand}>
              CHALEGA INDIA
            </Text>

            <Text style={styles.headerTitle}>
              Rewards
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* WALLET HERO */}

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>
              🚶
            </Text>
          </View>

          <Text style={styles.heroEyebrow}>
            YOUR CHALEGA WALLET
          </Text>

          <Text style={styles.points}>
            {points.toLocaleString('en-IN')}
          </Text>

          <Text style={styles.pointsLabel}>
            CHALEGA POINTS
          </Text>

          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              LEVEL {level} • {levelName.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* LEVEL CARD */}

        <View style={styles.card}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.smallLabel}>
                YOUR PROGRESS
              </Text>

              <Text style={styles.levelTitle}>
                {level === 5
                  ? 'Maximum Level'
                  : `${nextLevelPoints.toLocaleString(
                      'en-IN'
                    )} points to go`}
              </Text>
            </View>

            <Text style={styles.percent}>
              {Math.round(progress)}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>
              {levelStart.toLocaleString('en-IN')}
            </Text>

            <Text style={styles.progressLabel}>
              {levelEnd.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* QUICK EARNING */}

        <Text style={styles.sectionTitle}>
          EARN MORE
        </Text>

        <TouchableOpacity
          style={[
            styles.watchEarnCard,
            watchingAd &&
              styles.watchEarnCardDisabled,
          ]}
          onPress={watchAndEarn}
          disabled={watchingAd}
          activeOpacity={0.85}
        >
          <View style={styles.watchEarnIcon}>
            <Text style={styles.watchEarnIconText}>
              ▶
            </Text>
          </View>

          <View style={styles.watchEarnBody}>
            <Text style={styles.watchEarnEyebrow}>
              CHALEGA EARN
            </Text>

            <Text style={styles.watchEarnTitle}>
              {watchingAd
                ? 'WATCHING...'
                : 'WATCH & EARN'}
            </Text>

            <Text style={styles.watchEarnDescription}>
              {energy >= MAX_DAILY_ENERGY
                ? 'Daily video reward limit reached. Come back tomorrow.'
                : 'Watch a rewarded video and unlock 1 Chalega Energy.'}
            </Text>

            <Text style={styles.watchEarnCounter}>
              TODAY {energy} / {MAX_DAILY_ENERGY} ENERGY
            </Text>
          </View>

          <View style={styles.watchEarnBadge}>
            <Text style={styles.watchEarnBadgeText}>
              {energy >= MAX_DAILY_ENERGY
                ? 'DONE'
                : rewardedAd
                ? adLoaded
                  ? 'WATCH'
                  : 'LOADING'
                : 'APP'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.earnGrid}>
          <TouchableOpacity
            style={styles.earnCard}
            onPress={() => router.push('/walking')}
          >
            <Text style={styles.earnEmoji}>
              🏃
            </Text>

            <Text style={styles.earnTitle}>
              WALK
            </Text>

            <Text style={styles.earnDescription}>
              Keep moving every day.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.earnCard}
            onPress={() =>
              router.push('/missions')
            }
          >
            <Text style={styles.earnEmoji}>
              🎯
            </Text>

            <Text style={styles.earnTitle}>
              MISSIONS
            </Text>

            <Text style={styles.earnDescription}>
              Complete healthy actions.
            </Text>
          </TouchableOpacity>

          <View style={styles.earnCard}>
            <Text style={styles.earnEmoji}>
              🔥
            </Text>

            <Text style={styles.earnTitle}>
              STREAK
            </Text>

            <Text style={styles.earnDescription}>
              Stay consistent for bonuses.
            </Text>
          </View>

          <View style={styles.earnCard}>
            <Text style={styles.earnEmoji}>
              ❤️
            </Text>

            <Text style={styles.earnTitle}>
              HEALTH
            </Text>

            <Text style={styles.earnDescription}>
              Build better daily habits.
            </Text>
          </View>
        </View>

        {/* WALLET ACTIVITY */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>
            POINTS ACTIVITY
          </Text>

          <TouchableOpacity
            onPress={showAllHistory}
          >
            <Text style={styles.viewAll}>
              VIEW ALL
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityCard}>
          {recentHistory.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>
                💎
              </Text>

              <Text style={styles.emptyTitle}>
                Your wallet is ready
              </Text>

              <Text style={styles.emptyText}>
                Complete a walking mission or
                healthy challenge and your activity
                will appear here.
              </Text>
            </View>
          ) : (
            recentHistory.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.activityRow,
                  index ===
                    recentHistory.length - 1 &&
                    styles.lastActivityRow,
                ]}
              >
                <View style={styles.activityIcon}>
                  <Text>
                    {item.amount >= 0
                      ? '⬆️'
                      : '⬇️'}
                  </Text>
                </View>

                <View style={styles.activityMiddle}>
                  <Text style={styles.activityTitle}>
                    {item.title}
                  </Text>

                  <Text
                    style={styles.activityDescription}
                    numberOfLines={1}
                  >
                    {item.type.replace(
                      /_/g,
                      ' '
                    )}
                  </Text>

                  <Text style={styles.activityDate}>
                    {formatLocalDateTime(
                      item.timestamp
                    )}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.activityAmount,
                    item.amount < 0 &&
                      styles.negativeAmount,
                  ]}
                >
                  {item.amount > 0
                    ? `+${item.amount}`
                    : item.amount}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* REWARDS */}

        <Text style={styles.sectionTitle}>
          REDEEM REWARDS
        </Text>

        {REWARDS.map(reward => {
          const alreadyClaimed =
            claimed.includes(reward.id);

          const affordable =
            points >= reward.cost;

          const rewardProgress = Math.min(
            100,
            (points / reward.cost) * 100
          );

          return (
            <View
              key={reward.id}
              style={styles.rewardCard}
            >
              <View
                style={[
                  styles.rewardIcon,
                  affordable &&
                    styles.rewardIconActive,
                ]}
              >
                <Text style={styles.rewardEmoji}>
                  {reward.emoji}
                </Text>
              </View>

              <View style={styles.rewardBody}>
                <View style={styles.rewardHeader}>
                  <Text style={styles.rewardCategory}>
                    {reward.category}
                  </Text>

                  {alreadyClaimed && (
                    <Text style={styles.claimed}>
                      CLAIMED ✓
                    </Text>
                  )}
                </View>

                <Text style={styles.rewardTitle}>
                  {reward.title}
                </Text>

                <Text style={styles.rewardDescription}>
                  {reward.description}
                </Text>

                <View style={styles.rewardTrack}>
                  <View
                    style={[
                      styles.rewardFill,
                      {
                        width: `${rewardProgress}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.rewardBottom}>
                  <Text style={styles.cost}>
                    {points.toLocaleString(
                      'en-IN'
                    )}{' '}
                    /{' '}
                    {reward.cost.toLocaleString(
                      'en-IN'
                    )}
                  </Text>

                  <TouchableOpacity
                    disabled={
                      !affordable ||
                      alreadyClaimed
                    }
                    onPress={() =>
                      claimReward(reward)
                    }
                    style={[
                      styles.redeemButton,
                      affordable &&
                        !alreadyClaimed &&
                        styles.redeemButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.redeemText,
                        affordable &&
                          !alreadyClaimed &&
                          styles.redeemTextActive,
                      ]}
                    >
                      {alreadyClaimed
                        ? 'CLAIMED'
                        : affordable
                        ? 'REDEEM'
                        : 'LOCKED'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* SHOP */}

        <TouchableOpacity
          style={styles.shopCard}
          onPress={() => router.push('/shop')}
        >
          <Text style={styles.shopEmoji}>
            🛒
          </Text>

          <View style={styles.shopBody}>
            <Text style={styles.shopEyebrow}>
              COMING TO CHALEGA
            </Text>

            <Text style={styles.shopTitle}>
              HEALTH SHOP
            </Text>

            <Text style={styles.shopText}>
              Use your healthy habits to unlock
              exclusive products and partner offers.
            </Text>
          </View>

          <Text style={styles.shopArrow}>
            ›
          </Text>
        </TouchableOpacity>

        {/* SPONSOR AREA */}

        <View style={styles.sponsorCard}>
          <Text style={styles.sponsorEyebrow}>
            CHALEGA PARTNERS
          </Text>

          <Text style={styles.sponsorTitle}>
            HEALTHY PEOPLE.
            {'\n'}
            LOCAL BUSINESSES.
            {'\n'}
            ONE COMMUNITY.
          </Text>

          <Text style={styles.sponsorText}>
            Sponsored missions and partner rewards
            will eventually allow businesses to
            reward people for healthy behaviour.
          </Text>

          <TouchableOpacity
            style={styles.sponsorButton}
            onPress={() =>
              Alert.alert(
                'Chalega Partners',
                'The partner marketplace is coming next.'
              )
            }
          >
            <Text style={styles.sponsorButtonText}>
              PARTNER WITH CHALEGA
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            CHALEGA INDIA
          </Text>

          <Text style={styles.footerText}>
            WALK • EARN • UNLOCK • REPEAT
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 70,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingEmoji: {
    fontSize: 40,
  },

  loadingText: {
    marginTop: 12,
    color: '#777777',
    fontSize: 12,
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#111111',
    fontSize: 31,
    fontWeight: '300',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerSpacer: {
    width: 42,
  },

  brand: {
    color: '#1976F3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },

  headerTitle: {
    color: '#111111',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },

  hero: {
    backgroundColor: '#1976F3',
    borderRadius: 28,
    padding: 25,
    alignItems: 'center',
  },

  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroEmoji: {
    fontSize: 34,
  },

  heroEyebrow: {
    color: '#DDEAFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 14,
  },

  points: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    marginTop: 1,
  },

  pointsLabel: {
    color: '#DDEAFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  levelBadge: {
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 15,
  },

  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginTop: 13,
  },

  levelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  smallLabel: {
    color: '#999999',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  levelTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },

  percent: {
    color: '#1976F3',
    fontSize: 16,
    fontWeight: '900',
  },

  progressTrack: {
    height: 9,
    backgroundColor: '#E7ECF3',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 16,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#1976F3',
    borderRadius: 5,
  },

  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  progressLabel: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '700',
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 28,
    marginBottom: 12,
  },

  sectionTitleNoMargin: {
    color: '#111111',
    fontSize: 19,
    fontWeight: '900',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 12,
  },

  viewAll: {
    color: '#1976F3',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  watchEarnCard: {
    width: '100%',
    minHeight: 112,
    backgroundColor: '#0B1F33',
    borderRadius: 22,
    padding: 17,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#071522',
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  watchEarnCardDisabled: {
    opacity: 0.72,
  },

  watchEarnIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#F47B20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  watchEarnIconText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  watchEarnBody: {
    flex: 1,
    paddingHorizontal: 13,
  },

  watchEarnEyebrow: {
    color: '#7DB3FF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  watchEarnTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },

  watchEarnDescription: {
    color: '#C8D4E2',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  watchEarnCounter: {
    color: '#7DB3FF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 5,
  },

  watchEarnBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  watchEarnBadgeText: {
    color: '#0B1F33',
    fontSize: 7,
    fontWeight: '900',
  },

  earnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  earnCard: {
    width: '48%',
    minHeight: 125,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 16,
    marginBottom: 11,
  },

  earnEmoji: {
    fontSize: 25,
  },

  earnTitle: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 7,
  },

  earnDescription: {
    color: '#888888',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    paddingHorizontal: 16,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  emptyEmoji: {
    fontSize: 31,
  },

  emptyTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },

  emptyText: {
    color: '#888888',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 5,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },

  lastActivityRow: {
    borderBottomWidth: 0,
  },

  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityMiddle: {
    flex: 1,
    paddingLeft: 11,
  },

  activityTitle: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '900',
  },

  activityDescription: {
    color: '#888888',
    fontSize: 9,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  activityDate: {
    color: '#AAAAAA',
    fontSize: 8,
    marginTop: 2,
  },

  activityAmount: {
    color: '#228B45',
    fontSize: 13,
    fontWeight: '900',
  },

  negativeAmount: {
    color: '#D64545',
  },

  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 17,
    marginBottom: 12,
    flexDirection: 'row',
  },

  rewardIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor: '#F0F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardIconActive: {
    backgroundColor: '#EAF2FF',
  },

  rewardEmoji: {
    fontSize: 29,
  },

  rewardBody: {
    flex: 1,
    paddingLeft: 13,
  },

  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  rewardCategory: {
    color: '#999999',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },

  claimed: {
    color: '#1976F3',
    fontSize: 7,
    fontWeight: '900',
  },

  rewardTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },

  rewardDescription: {
    color: '#777777',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },

  rewardTrack: {
    height: 7,
    backgroundColor: '#E8EDF3',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },

  rewardFill: {
    height: '100%',
    backgroundColor: '#1976F3',
    borderRadius: 4,
  },

  rewardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },

  cost: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '700',
  },

  redeemButton: {
    backgroundColor: '#E8ECF2',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  redeemButtonActive: {
    backgroundColor: '#111111',
  },

  redeemText: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
  },

  redeemTextActive: {
    color: '#FFFFFF',
  },

  shopCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 22,
    padding: 18,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  shopEmoji: {
    fontSize: 30,
  },

  shopBody: {
    flex: 1,
    paddingLeft: 12,
  },

  shopEyebrow: {
    color: '#1976F3',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  shopTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },

  shopText: {
    color: '#777777',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  shopArrow: {
    color: '#1976F3',
    fontSize: 28,
  },

  sponsorCard: {
    backgroundColor: '#111111',
    borderRadius: 23,
    padding: 21,
    marginTop: 15,
  },

  sponsorEyebrow: {
    color: '#7DB3FF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sponsorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
    marginTop: 8,
  },

  sponsorText: {
    color: '#AAAAAA',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },

  sponsorButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },

  sponsorButtonText: {
    color: '#111111',
    fontSize: 9,
    fontWeight: '900',
  },

  footer: {
    alignItems: 'center',
    marginTop: 35,
  },

  footerBrand: {
    color: '#1976F3',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  footerText: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 5,
  },
});


