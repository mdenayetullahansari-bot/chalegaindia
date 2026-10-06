import { BRAND } from '@/lib/brand';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';


import { supabase } from '../lib/supabase';

async function hasServerTransaction(
  transactionType: string,
  transactionKey: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    'get_my_points_transactions'
  );

  if (error) {
    throw error;
  }

  const dateKey = transactionKey.startsWith(`${transactionType}_`)
    ? transactionKey.slice(transactionType.length + 1)
    : transactionKey;

  return (data ?? []).some(
    (transaction: {
      transaction_type: string | null;
      transaction_key: string | null;
    }) => {
      if (transaction.transaction_type !== transactionType) {
        return false;
      }

      const serverKey = transaction.transaction_key;

      return (
        serverKey === transactionKey ||
        (serverKey !== null &&
          serverKey.startsWith(`${transactionType}:`) &&
          serverKey.endsWith(`:${dateKey}`))
      );
    }
  );
}

type Mission = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  points: number;
  action: string;
  completed: boolean;
};

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'walk',
    icon: 'walk-outline',
    title: 'Walk 4,000 steps',
    description:
      'Move your body and complete your daily walking goal.',
    points: 40,
    action: 'OPEN WALK',
    completed: false,
  },
  {
    id: 'water',
    icon: 'water-outline',
    title: 'Drink 6 glasses of water',
    description:
      'Stay hydrated throughout your day.',
    points: 18,
    action: 'MARK DONE',
    completed: false,
  },
  {
    id: 'health',
    icon: 'heart-outline',
    title: 'Complete your health check-in',
    description:
      'Take a moment to check in with your health today.',
    points: 10,
    action: 'OPEN HEALTH',
    completed: false,
  },
  {
    id: 'streak',
    icon: 'flame-outline',
    title: 'Keep your streak alive',
    description:
      "Complete today's walking goal to keep your streak alive.",
    points: 25,
    action: 'CLAIM STREAK',
    completed: false,
  },
];


export default function MissionsScreen() {
  const router = useRouter();

  const [missions, setMissions] =
    useState<Mission[]>(
      DEFAULT_MISSIONS
    );

  const [points, setPoints] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [completingMission, setCompletingMission] =
    useState<string | null>(null);

/*
 * ----------------------------------------------------
 * TODAY
 * ----------------------------------------------------
 */

const getTodayKey = useCallback(() => {
  const today = new Date();

  return (
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')
  );
}, []);

/*
 * ----------------------------------------------------
 * LOAD MISSIONS FROM SUPABASE
 * ----------------------------------------------------
 */

const loadMissions = useCallback(async () => {
  try {
    setLoading(true);

    const todayKey = getTodayKey();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data: missionRows, error: missionError } =
      await supabase
        .from('missions')
        .select(
          'id, title, description, target_steps, reward_points, active'
        )
        .eq('active', true)
        .in('id', [4, 5, 6, 7])
        .order('id', { ascending: true });

    if (missionError) {
      throw missionError;
    }

    const { data: userMissionRows, error: userMissionError } =
      await supabase
        .from('user_missions')
        .select('mission_id, progress, completed, completed_at')
        .eq('user_id', user.id)
        .eq('mission_date', todayKey);

    if (userMissionError) {
      throw userMissionError;
    }

    const userMissionMap = new Map(
      (userMissionRows ?? []).map(row => [
        Number(row.mission_id),
        row,
      ])
    );

    const backendMissions: Mission[] = (missionRows ?? []).map(row => {
      const missionId = Number(row.id);
      const userMission = userMissionMap.get(missionId);

      let icon: keyof typeof Ionicons.glyphMap = 'flag-outline';
      let action = 'MARK DONE';

      if (missionId === 4) {
        icon = 'walk-outline';
        action = 'OPEN WALK';
      } else if (missionId === 5) {
        icon = 'water-outline';
        action = 'MARK DONE';
      } else if (missionId === 6) {
        icon = 'heart-outline';
        action = 'OPEN HEALTH';
      } else if (missionId === 7) {
        icon = 'flame-outline';
        action = 'CLAIM STREAK';
      }

      return {
        id: String(missionId),
        icon,
        title: row.title,
        description: row.description,
        points: Number(row.reward_points) || 0,
        action,
        completed: userMission?.completed === true,
      };
    });

    /*
     * Points history remains the source of truth for rewards while
     * the user_missions table becomes the persistent daily state.
     * This also lets the existing Walk and Health flows synchronize
     * their completion into Supabase when this screen is opened.
     */

    const walkingCompleted = await hasServerTransaction(
      'walking_mission',
      `walking_mission_${todayKey}`
    );

    const waterCompleted = await hasServerTransaction(
      'water_mission',
      `water_mission_${todayKey}`
    );

    const healthCompleted = await hasServerTransaction(
      'health_checkin',
      `health_checkin_${todayKey}`
    );

    const streakCompleted = await hasServerTransaction(
      'streak_mission',
      `streak_mission_${todayKey}`
    );

    const completionByMissionId: Record<string, boolean> = {
      '4': walkingCompleted,
      '5': waterCompleted,
      '6': healthCompleted,
      '7': streakCompleted,
    };

    const loadedMissions = backendMissions.map(mission => ({
      ...mission,
      completed:
        mission.completed ||
        completionByMissionId[mission.id] === true,
    }));

    /*
     * Synchronize completion detected from the existing reward
     * transactions into the new daily backend state.
     */
    const rowsToSync = loadedMissions
      .filter(mission => mission.completed)
      .map(mission => ({
        user_id: user.id,
        mission_id: Number(mission.id),
        mission_date: todayKey,
        progress: 1,
        completed: true,
        completed_at:
          userMissionMap.get(Number(mission.id))?.completed_at ??
          new Date().toISOString(),
      }));

    if (rowsToSync.length > 0) {
      const { error: syncError } = await supabase
        .from('user_missions')
        .upsert(rowsToSync, {
          onConflict: 'user_id,mission_id,mission_date',
        });

      if (syncError) {
        console.warn(
          '[MISSIONS] Could not synchronize mission state:',
          syncError
        );
      }
    }

    setMissions(loadedMissions);

    const { data: walletProfile, error: walletError } = await supabase
        .from('profiles')
        .select('points')
        .single();

      if (walletError) {
        throw walletError;
      }

      const currentPoints = Math.max(
        0,
        Math.round(Number(walletProfile?.points) || 0)
      );

    setPoints(
      Number.isFinite(currentPoints)
        ? Math.max(0, Math.round(currentPoints))
        : 0
    );
  } catch (error) {
    console.warn(
      '[MISSIONS] Could not load missions:',
      error
    );
  } finally {
    setLoading(false);
  }
}, [getTodayKey]);

/*
 * ----------------------------------------------------
 * INITIAL LOAD
 * ----------------------------------------------------
 */

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  /*
   * ----------------------------------------------------
   * REFRESH WHEN RETURNING
   * ----------------------------------------------------
   */

  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [loadMissions])
  );

/*
 * ----------------------------------------------------
 * SAVE MISSION STATE
 * ----------------------------------------------------
 */

const saveMissionState = useCallback(
  async (missionId: string, completed: boolean) => {
    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    const { error } = await supabase
      .from('user_missions')
      .upsert(
        {
          user_id: user.id,
          mission_id: Number(missionId),
          mission_date: getTodayKey(),
          progress: completed ? 1 : 0,
          completed,
          completed_at: completed
            ? new Date().toISOString()
            : null,
        },
        {
          onConflict:
            'user_id,mission_id,mission_date',
        }
      );

    if (error) {
      throw error;
    }
  },
  [getTodayKey]
);

/*
 * ----------------------------------------------------
 * COMPLETE DIRECT MISSION
   * ----------------------------------------------------
   *
   * Only Water and Streak are completed here.
   *
   * Walking is completed by walking.tsx.
   * Health is completed by the Health flow.
   */

  const completeDirectMission =
    useCallback(
      async (
        missionId: string
      ) => {
        if (
          completingMission !==
          null
        ) {
          return;
        }

        const mission =
          missions.find(
            item =>
              item.id ===
              missionId
          );

        if (!mission) {
          return;
        }

        if (
          mission.completed
        ) {
          return;
        }

        if (
          missionId !== '5' &&
          missionId !== '7'
        ) {
          return;
        }

        const todayKey =
          getTodayKey();

        /*
         * Streak can only be claimed
         * after the walking mission
         * has actually been completed.
         */

        if (
          missionId === '7'
        ) {
          const walkingCompleted =
            await hasServerTransaction(
              'walking_mission',
              `walking_mission_${todayKey}`
            );

          if (
            !walkingCompleted
          ) {
            // On web, route directly to the walking screen instead of
            // relying on a native Alert, which may not render there.
            router.push('/walking');
            return;
          }
        }

        if (missionId === '5') {
          const { data: healthCheckIn, error: healthCheckInError } =
            await supabase
              .from('daily_health_checkins')
              .select('water')
              .eq('checkin_date', todayKey)
              .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
              .maybeSingle();

          if (healthCheckInError) {
            console.warn(
              "[MISSIONS] Could not read today's Health Check-in:",
              healthCheckInError
            );
            Alert.alert(
              'Health Check-in Required',
              "Please complete today's Health Check-in before claiming the water mission."
            );
            return;
          }

          const waterGlasses = Number(healthCheckIn?.water ?? 0);

          if (waterGlasses < 6) {
            // On web, route directly to the Health Check-in instead of
            // relying on a native Alert to explain the requirement.
            router.push('/daily-health-checkin');
            return;
          }
        }

        setCompletingMission(
          missionId
        );

        try {
          /*
           * First persist today's completion using the same
           * device-local date used throughout the missions screen.
           *
           * The server reward RPC requires this completed row
           * to exist before it will award points.
           */
          await saveMissionState(
            missionId,
            true
          );

          /*
           * Secure daily mission reward.
           *
           * Points are awarded by the Supabase SECURITY DEFINER
           * function, not by the client-side points system.
           *
           * The transaction key inside the RPC makes the reward
           * idempotent, so a retry cannot award the same mission
           * twice.
           */
          const {
            data: rewardResult,
            error: rewardError,
          } = await supabase.rpc(
            'award_daily_mission_reward',
            {
              p_mission_id:
                Number(missionId),
              p_mission_date:
                todayKey,
            }
          );

          if (rewardError) {
            throw rewardError;
          }

          const result = {
            awarded:
              rewardResult?.already_awarded !==
              true,
            balance:
              Number(
                rewardResult?.balance ?? 0
              ),
          };
          setPoints(
            result.balance
          );

          const updatedMissions =
            missions.map(
              item =>
                item.id ===
                missionId
                  ? {
                      ...item,
                      completed:
                        true,
                    }
                  : item
            );

          setMissions(
            updatedMissions
          );

          if (
            !result.awarded
          ) {
            Alert.alert(
              'Already Completed',
              `You've already earned today's +${mission.points} Chalega Coins for this mission.`
            );

            return;
          }

          Alert.alert(
            'Mission Complete!',
            `+${mission.points} Chalega Coins\n\nYour total is now ${result.balance.toLocaleString(
              'en-IN'
            )} Chalega Coins.`,
            [
              {
                text: 'CONTINUE',
              },
            ]
          );
        } catch (error) {
          console.warn(
            '[MISSIONS] Could not complete mission:',
            error
          );

          Alert.alert(
            'Something went wrong',
            'We could not record this mission. Please try again.'
          );
        } finally {
          setCompletingMission(
            null
          );
        }
      },
      [
        completingMission,
        getTodayKey,
        missions,
        router,
        saveMissionState,
      ]
    );

  /*
   * ----------------------------------------------------
   * MISSION ACTION
   * ----------------------------------------------------
   */

  const handleMission =
    useCallback(
      (mission: Mission) => {
        if (
          completingMission !==
          null
        ) {
          return;
        }

        if (
          mission.completed
        ) {
          return;
        }

        if (
          mission.id === '4'
        ) {
          router.push(
            '/walking'
          );

          return;
        }

        if (
          mission.id ===
          '6'
        ) {
          router.push(
            '/health-topic?mission=health'
          );

          return;
        }

        completeDirectMission(
          mission.id
        );
      },
      [
        completingMission,
        completeDirectMission,
        router,
      ]
    );

  /*
   * ----------------------------------------------------
   * DERIVED VALUES
   * ----------------------------------------------------
   */

  const completedCount =
    useMemo(
      () =>
        missions.filter(
          mission =>
            mission.completed
        ).length,
      [missions]
    );

  const totalPossible =
    useMemo(
      () =>
        missions.reduce(
          (
            total,
            mission
          ) =>
            total +
            mission.points,
          0
        ),
      [missions]
    );

  const earnedToday =
    useMemo(
      () =>
        missions
          .filter(
            mission =>
              mission.completed
          )
          .reduce(
            (
              total,
              mission
            ) =>
              total +
              mission.points,
            0
          ),
      [missions]
    );

  const remainingPoints =
    Math.max(
      0,
      totalPossible -
        earnedToday
    );

  const progress =
    totalPossible > 0
      ? earnedToday /
        totalPossible
      : 0;

  const progressPercent =
    Math.round(
      progress * 100
    );

  const allComplete =
    missions.length > 0 &&
    completedCount ===
      missions.length;

  /*
   * ----------------------------------------------------
   * LOADING
   * ----------------------------------------------------
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loading
          }
        >
          <View
            style={
              styles.loadingIcon
            }
          >
            <Ionicons
              name="flag-outline"
              size={30}
              color={BRAND.blue}
            />
          </View>

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading your missions
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Getting today's challenges ready...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * ----------------------------------------------------
   * UI
   * ----------------------------------------------------
   */

  return (
    <SafeAreaView
      style={
        styles.container
      }
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* ---------------------------------------------
         * HEADER
         * --------------------------------------------- */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={30}
              color={BRAND.ink}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.brand
              }
            >
              CHALEGA KOLKATA
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Daily Missions
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------
         * DAILY HERO
         * --------------------------------------------- */}

        <View
          style={
            styles.hero
          }
        >
          <View
            style={
              styles.heroTop
            }
          >
            <View
              style={
                styles.heroIcon
              }
            >
              <Ionicons
                name={
                  allComplete
                    ? 'checkmark-circle'
                    : 'flag'
                }
                size={30}
                color={
                  BRAND.white
                }
              />
            </View>

            <View
              style={
                styles.heroBadge
              }
            >
              <Text
                style={
                  styles.heroBadgeText
                }
              >
                {allComplete
                  ? 'DAY COMPLETE'
                  : 'TODAY'}
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.heroLabel
            }
          >
            TODAY'S CHALEGA
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            Small actions.
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            Real progress.
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
          >
            Complete healthy actions today and earn Chalega Coins.
          </Text>

          {/* HERO STATS */}

          <View
            style={
              styles.heroStats
            }
          >
            <View
              style={
                styles.heroStat
              }
            >
              <Text
                style={
                  styles.heroStatNumber
                }
              >
                {earnedToday}
              </Text>

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                EARNED TODAY
              </Text>
            </View>

            <View
              style={
                styles.heroDivider
              }
            />

            <View
              style={
                styles.heroStat
              }
            >
              <Text
                style={
                  styles.heroStatNumber
                }
              >
                {points.toLocaleString(
                  'en-IN'
                )}
              </Text>

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                TOTAL COINS
              </Text>
            </View>
          </View>
        </View>

        {/* ---------------------------------------------
         * DAILY PROGRESS
         * --------------------------------------------- */}

        <View
          style={
            styles.progressCard
          }
        >
          <View
            style={
              styles.progressHeader
            }
          >
            <View>
              <Text
                style={
                  styles.progressEyebrow
                }
              >
                DAILY CHALLENGE
              </Text>

              <Text
                style={
                  styles.progressTitle
                }
              >
                Your progress
              </Text>
            </View>

            <View
              style={
                styles.progressCountBox
              }
            >
              <Text
                style={
                  styles.progressCount
                }
              >
                {completedCount}
              </Text>

              <Text
                style={
                  styles.progressCountSlash
                }
              >
                /
              </Text>

              <Text
                style={
                  styles.progressCountTotal
                }
              >
                {missions.length}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      progressPercent
                    )
                  )}%`,
                },
              ]}
            />
          </View>

          <View
            style={
              styles.progressBottom
            }
          >
            <Text
              style={
                styles.progressPercent
              }
            >
              {progressPercent}% complete
            </Text>

            <Text
              style={
                styles.progressRemaining
              }
            >
              {allComplete
                ? 'All rewards unlocked'
                : `${remainingPoints} points left`}
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------
         * MISSION SECTION HEADER
         * --------------------------------------------- */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              TODAY
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Your missions
            </Text>
          </View>

          <View
            style={
              styles.availableBadge
            }
          >
            <Ionicons
              name="star"
              size={14}
              color={BRAND.orange}
            />

            <Text
              style={
                styles.availableBadgeText
              }
            >
              +{totalPossible}
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------
         * MISSION CARDS
         * --------------------------------------------- */}

        {missions.map(
          mission => {
            const isCompleting =
              completingMission ===
              mission.id;

            return (
              <View
                key={
                  mission.id
                }
                style={[
                  styles.missionCard,
                  mission.completed &&
                    styles.missionCardCompleted,
                ]}
              >
                <View
                  style={
                    styles.missionTop
                  }
                >
                  <View
                    style={[
                      styles.iconBox,
                      mission.completed &&
                        styles.iconBoxCompleted,
                    ]}
                  >
                    <Ionicons
                      name={
                        mission.icon
                      }
                      size={31}
                      color={
                        mission.completed
                          ? BRAND.green
                          : BRAND.blue
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.missionInfo
                    }
                  >
                    <View
                      style={
                        styles.missionTitleRow
                      }
                    >
                      <Text
                        style={[
                          styles.missionTitle,
                          mission.completed &&
                            styles.missionTitleCompleted,
                        ]}
                      >
                        {
                          mission.title
                        }
                      </Text>

                      <View
                        style={
                          styles.pointsBadge
                        }
                      >
                        <Text
                          style={
                            styles.pointsBadgeText
                          }
                        >
                          +{mission.points}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.missionDescription
                      }
                    >
                      {
                        mission.description
                      }
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.missionButton,
                    mission.completed &&
                      styles.completedButton,
                    isCompleting &&
                      styles.completingButton,
                  ]}
                  onPress={() =>
                    handleMission(
                      mission
                    )
                  }
                  disabled={
                    mission.completed ||
                    completingMission !==
                      null
                  }
                  activeOpacity={0.85}
                >
                  {mission.completed ? (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={19}
                        color={
                          BRAND.green
                        }
                      />

                      <Text
                        style={
                          styles.completedButtonText
                        }
                      >
                        COMPLETED
                      </Text>
                    </>
                  ) : isCompleting ? (
                    <>
                      <Ionicons
                        name="sync-outline"
                        size={18}
                        color={
                          BRAND.white
                        }
                      />

                      <Text
                        style={
                          styles.missionButtonText
                        }
                      >
                        SAVING...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.missionButtonText
                        }
                      >
                        {
                          mission.action
                        }
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={
                          BRAND.white
                        }
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          }
        )}

        {/* ---------------------------------------------
         * ALL COMPLETE
         * --------------------------------------------- */}

        {allComplete && (
          <View
            style={
              styles.completeCard
            }
          >
            <View
              style={
                styles.completeIcon
              }
            >
              <Ionicons
                name="trophy"
                size={38}
                color={
                  BRAND.gold
                }
              />
            </View>

            <Text
              style={
                styles.completeLabel
              }
            >
              DAILY CHALLENGE COMPLETE
            </Text>

            <Text
              style={
                styles.completeTitle
              }
            >
              You did it.
            </Text>

            <Text
              style={
                styles.completeText
              }
            >
              You completed every mission today and earned all {totalPossible} available Chalega Coins.
            </Text>

            <View
              style={
                styles.completePoints
              }
            >
              <Text
                style={
                  styles.completePointsNumber
                }
              >
                +{totalPossible}
              </Text>

              <Text
                style={
                  styles.completePointsLabel
                }
              >
                COINS TODAY
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.completeButton
              }
              onPress={() =>
                router.push(
                  '/rewards'
                )
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.completeButtonText
                }
              >
                VIEW MY REWARDS
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color={
                  BRAND.ink
                }
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ---------------------------------------------
         * PARTNER CARD
         * --------------------------------------------- */}

        <View
          style={
            styles.partnerCard
          }
        >
          <View
            style={
              styles.partnerIcon
            }
          >
            <Ionicons
              name="megaphone-outline"
              size={25}
              color={
                BRAND.blue
              }
            />
          </View>

          <Text
            style={
              styles.partnerEyebrow
            }
          >
            HEALTH PARTNER
          </Text>

          <Text
            style={
              styles.partnerTitle
            }
          >
            Your brand could power tomorrow's healthy mission.
          </Text>

          <Text
            style={
              styles.partnerText
            }
          >
            Local businesses can sponsor challenges, rewards and healthy community campaigns.
          </Text>

          <TouchableOpacity
            style={
              styles.partnerButton
            }
            onPress={() =>
              Alert.alert(
                'Chalega Health Partners',
                'Partner opportunities will be available soon.'
              )
            }
            activeOpacity={0.85}
          >
            <Text
              style={
                styles.partnerButtonText
              }
            >
              BECOME A PARTNER
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={
                BRAND.white
              }
            />
          </TouchableOpacity>
        </View>

        {/* ---------------------------------------------
         * MOTIVATION
         * --------------------------------------------- */}

        <View
          style={
            styles.motivationCard
          }
        >
          <View
            style={
              styles.motivationIcon
            }
          >
            <Ionicons
              name="flame"
              size={34}
              color={
                BRAND.orange
              }
            />
          </View>

          <Text
            style={
              styles.motivationTitle
            }
          >
            Don't break the chain.
          </Text>

          <Text
            style={
              styles.motivationText
            }
          >
            Every healthy day builds your streak, your Coins and your progress.
          </Text>
        </View>

        {/* ---------------------------------------------
         * FOOTER
         * --------------------------------------------- */}

        <View
          style={
            styles.footer
          }
        >
          <Text
            style={
              styles.footerBrand
            }
          >
            CHALEGA KOLKATA
          </Text>

          <Text
            style={
              styles.footerText
            }
          >
            WALK • EARN • IMPROVE • REPEAT
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/*
 * ======================================================
 * STYLES
 * ======================================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        BRAND.cream,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 70,
    },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 30,
    },

    loadingIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      backgroundColor:
        BRAND.blue + '14',
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 18,
    },

    loadingTitle: {
      color: BRAND.ink,
      fontSize: 21,
      fontWeight: '900',
    },

    loadingText: {
      color: BRAND.muted,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 7,
    },

    /*
     * HEADER
     */

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 22,
    },

    backButton: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor:
        BRAND.white,
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 14,
      shadowColor:
        BRAND.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 2,
    },

    headerText: {
      flex: 1,
    },

    brand: {
      color: BRAND.blue,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 4.5,
      marginBottom: 3,
    },

    title: {
      color: BRAND.ink,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '900',
      letterSpacing: -1,
    },

    /*
     * HERO
     */

    hero: {
      backgroundColor:
        BRAND.blue,
      borderRadius: 32,
      padding: 25,
      marginBottom: 16,
      overflow: 'hidden',
    },

    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 19,
    },

    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    heroBadge: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor:
        'rgba(255,255,255,0.14)',
    },

    heroBadgeText: {
      color: BRAND.white,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.5,
    },

    heroLabel: {
      color: '#DCEAFF',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 3.2,
      marginBottom: 9,
    },

    heroTitle: {
      color: BRAND.white,
      fontSize: 36,
      lineHeight: 39,
      fontWeight: '900',
      letterSpacing: -1.1,
    },

    heroSubtitle: {
      color: BRAND.white,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '600',
      marginTop: 13,
      maxWidth: 330,
    },

    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        'rgba(255,255,255,0.13)',
      borderRadius: 22,
      marginTop: 22,
      paddingVertical: 17,
      paddingHorizontal: 15,
    },

    heroStat: {
      flex: 1,
    },

    heroStatNumber: {
      color: BRAND.white,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '900',
    },

    heroStatLabel: {
      color: '#DCEAFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginTop: 4,
    },

    heroDivider: {
      width: 1,
      height: 44,
      backgroundColor:
        'rgba(255,255,255,0.32)',
      marginHorizontal: 14,
    },

    /*
     * PROGRESS
     */

    progressCard: {
      backgroundColor:
        BRAND.white,
      borderRadius: 27,
      padding: 22,
      marginBottom: 28,
      shadowColor:
        BRAND.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 1,
    },

    progressHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 17,
    },

    progressEyebrow: {
      color: BRAND.blue,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2.2,
      marginBottom: 4,
    },

    progressTitle: {
      color: BRAND.ink,
      fontSize: 22,
      fontWeight: '900',
    },

    progressCountBox: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },

    progressCount: {
      color: BRAND.blue,
      fontSize: 29,
      fontWeight: '900',
    },

    progressCountSlash: {
      color: BRAND.muted,
      fontSize: 19,
      fontWeight: '700',
      marginHorizontal: 2,
    },

    progressCountTotal: {
      color: BRAND.muted,
      fontSize: 18,
      fontWeight: '800',
    },

    progressTrack: {
      height: 13,
      borderRadius: 10,
      backgroundColor:
        '#E5EAF1',
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 10,
      backgroundColor:
        BRAND.blue,
    },

    progressBottom: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginTop: 11,
    },

    progressPercent: {
      color: BRAND.ink,
      fontSize: 13,
      fontWeight: '800',
    },

    progressRemaining: {
      color: BRAND.muted,
      fontSize: 13,
      fontWeight: '700',
    },

    /*
     * SECTION
     */

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent:
        'space-between',
      marginBottom: 14,
    },

    sectionEyebrow: {
      color: BRAND.blue,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 2.5,
      marginBottom: 3,
    },

    sectionTitle: {
      color: BRAND.ink,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.6,
    },

    availableBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        BRAND.orangeLight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
      marginBottom: 3,
    },

    availableBadgeText: {
      color: BRAND.orange,
      fontSize: 14,
      fontWeight: '900',
      marginLeft: 4,
    },

    /*
     * MISSION CARD
     */

    missionCard: {
      backgroundColor:
        BRAND.white,
      borderRadius: 28,
      padding: 19,
      marginBottom: 14,
      shadowColor:
        BRAND.shadow,
      shadowOpacity: 0.035,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 1,
    },

    missionCardCompleted: {
      backgroundColor:
        '#FBFDFB',
      borderWidth: 1,
      borderColor:
        '#D9EFDF',
    },

    missionTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    iconBox: {
      width: 70,
      height: 70,
      borderRadius: 22,
      backgroundColor:
        '#EDF4FF',
      alignItems: 'center',
      justifyContent:
        'center',
      marginRight: 15,
    },

    iconBoxCompleted: {
      backgroundColor:
        BRAND.greenLight,
    },

    missionInfo: {
      flex: 1,
      minWidth: 0,
    },

    missionTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    missionTitle: {
      flex: 1,
      color: BRAND.ink,
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '900',
      paddingRight: 7,
    },

    missionTitleCompleted: {
      color: '#31563B',
    },

    pointsBadge: {
      backgroundColor:
        BRAND.orangeLight,
      borderRadius: 14,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginLeft: 4,
    },

    pointsBadgeText: {
      color: BRAND.orange,
      fontSize: 14,
      fontWeight: '900',
    },

    missionDescription: {
      color: BRAND.muted,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      marginTop: 7,
    },

    missionButton: {
      height: 52,
      borderRadius: 26,
      backgroundColor:
        BRAND.ink,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 18,
    },

    missionButtonText: {
      color: BRAND.white,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginRight: 8,
    },

    completingButton: {
      opacity: 0.62,
    },

    completedButton: {
      backgroundColor:
        BRAND.greenLight,
    },

    completedButtonText: {
      color: BRAND.green,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginLeft: 7,
    },

    /*
     * COMPLETE CARD
     */

    completeCard: {
      backgroundColor:
        BRAND.navy,
      borderRadius: 30,
      padding: 26,
      marginTop: 4,
      marginBottom: 18,
      alignItems: 'center',
    },

    completeIcon: {
      width: 70,
      height: 70,
      borderRadius: 25,
      backgroundColor:
        'rgba(242,184,75,0.15)',
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 16,
    },

    completeLabel: {
      color: BRAND.gold,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2.1,
    },

    completeTitle: {
      color: BRAND.white,
      fontSize: 34,
      fontWeight: '900',
      marginTop: 7,
    },

    completeText: {
      color: '#DCE5ED',
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 9,
    },

    completePoints: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        'rgba(255,255,255,0.08)',
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 11,
      marginTop: 19,
    },

    completePointsNumber: {
      color: BRAND.gold,
      fontSize: 22,
      fontWeight: '900',
    },

    completePointsLabel: {
      color: '#DCE5ED',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginLeft: 8,
    },

    completeButton: {
      width: '100%',
      height: 52,
      borderRadius: 26,
      backgroundColor:
        BRAND.white,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 20,
    },

    completeButtonText: {
      color: BRAND.ink,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.1,
      marginRight: 8,
    },

    /*
     * PARTNER
     */

    partnerCard: {
      backgroundColor:
        BRAND.greenLight,
      borderRadius: 30,
      padding: 25,
      marginTop: 2,
      marginBottom: 18,
    },

    partnerIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor:
        BRAND.white,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 16,
    },

    partnerEyebrow: {
      color: BRAND.blue,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2.8,
      marginBottom: 9,
    },

    partnerTitle: {
      color: BRAND.ink,
      fontSize: 25,
      lineHeight: 30,
      fontWeight: '900',
    },

    partnerText: {
      color: BRAND.muted,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      marginTop: 10,
    },

    partnerButton: {
      height: 52,
      borderRadius: 26,
      backgroundColor:
        BRAND.ink,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      marginTop: 20,
    },

    partnerButtonText: {
      color: BRAND.white,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.1,
      marginRight: 8,
    },

    /*
     * MOTIVATION
     */

    motivationCard: {
      backgroundColor:
        BRAND.goldLight,
      borderRadius: 29,
      padding: 26,
      alignItems: 'center',
      marginBottom: 10,
    },

    motivationIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,
      backgroundColor:
        BRAND.white,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 12,
    },

    motivationTitle: {
      color: BRAND.ink,
      fontSize: 23,
      fontWeight: '900',
      textAlign: 'center',
    },

    motivationText: {
      color: BRAND.muted,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 7,
      maxWidth: 330,
    },

    /*
     * FOOTER
     */

    footer: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 20,
    },

    footerBrand: {
      color: BRAND.blue,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: 5.5,
    },

    footerText: {
      color: BRAND.muted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: 8,
    },
  });
