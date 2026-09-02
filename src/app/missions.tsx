import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
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
  awardOnce,
  getPoints,
  hasTransaction,
} from '../lib/points';

type Mission = {
  id: string;
  icon: string;
  title: string;
  description: string;
  points: number;
  action: string;
  completed: boolean;
};

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'walk',
    icon: '🚶',
    title: 'Walk 4,000 steps',
    description:
      'Move your body and complete your daily walking goal.',
    points: 40,
    action: 'OPEN WALK',
    completed: false,
  },
  {
    id: 'water',
    icon: '💧',
    title: 'Drink 6 glasses of water',
    description:
      'Stay hydrated throughout your day.',
    points: 18,
    action: 'MARK DONE',
    completed: false,
  },
  {
    id: 'health',
    icon: '❤️',
    title: 'Complete your health check-in',
    description:
      'Take a moment to check in with your health today.',
    points: 10,
    action: 'OPEN HEALTH',
    completed: false,
  },
  {
    id: 'streak',
    icon: '🔥',
    title: 'Keep your streak alive',
    description:
      "Complete today's walking goal to keep your streak alive.",
    points: 25,
    action: 'MARK DONE',
    completed: false,
  },
];

const MISSIONS_KEY_PREFIX =
  'chalega_daily_missions_';

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
   * TODAY KEY
   * ----------------------------------------------------
   */
  const getTodayKey = () => {
    const today = new Date();

    return (
      today.getFullYear() +
      '-' +
      String(
        today.getMonth() + 1
      ).padStart(2, '0') +
      '-' +
      String(
        today.getDate()
      ).padStart(2, '0')
    );
  };

  /*
   * ----------------------------------------------------
   * MISSIONS STORAGE KEY
   * ----------------------------------------------------
   */
  const getMissionStorageKey = () => {
    return (
      MISSIONS_KEY_PREFIX +
      getTodayKey()
    );
  };

  /*
   * ----------------------------------------------------
   * LOAD MISSIONS
   * ----------------------------------------------------
   *
   * IMPORTANT:
   *
   * Points come from the central points engine.
   *
   * We do NOT read chalega_points directly here.
   */
  const loadMissions = useCallback(
    async () => {
      try {
        setLoading(true);

        const todayKey =
          getTodayKey();

        const missionStorageKey =
          `${MISSIONS_KEY_PREFIX}${todayKey}`;

        /*
         * Load today's visual mission state.
         */
        const savedMissions =
          await AsyncStorage.getItem(
            missionStorageKey
          );

        let loadedMissions =
          DEFAULT_MISSIONS.map(
            mission => ({
              ...mission,
            })
          );

        if (savedMissions) {
          try {
            const parsed =
              JSON.parse(
                savedMissions
              );

            if (
              Array.isArray(parsed) &&
              parsed.length > 0
            ) {
              loadedMissions =
                parsed;
            }
          } catch {
            loadedMissions =
              DEFAULT_MISSIONS.map(
                mission => ({
                  ...mission,
                })
              );
          }
        }

        /*
         * ------------------------------------------------
         * SYNC COMPLETION WITH POINTS HISTORY
         * ------------------------------------------------
         *
         * This is important.
         *
         * Even if the mission JSON gets out of sync,
         * Points Activity remains the source of truth.
         */

        const walkingCompleted =
          await hasTransaction(
            'walking_mission',
            `walking_mission_${todayKey}`
          );

        const waterCompleted =
          await hasTransaction(
            'water_mission',
            `water_mission_${todayKey}`
          );

        const healthCompleted =
          await hasTransaction(
            'health_mission',
            `health_mission_${todayKey}`
          );

        const streakCompleted =
          await hasTransaction(
            'streak_mission',
            `streak_mission_${todayKey}`
          );

        loadedMissions =
          loadedMissions.map(
            mission => {
              if (
                mission.id === 'walk' &&
                walkingCompleted
              ) {
                return {
                  ...mission,
                  completed: true,
                };
              }

              if (
                mission.id === 'water' &&
                waterCompleted
              ) {
                return {
                  ...mission,
                  completed: true,
                };
              }

              if (
                mission.id === 'health' &&
                healthCompleted
              ) {
                return {
                  ...mission,
                  completed: true,
                };
              }

              if (
                mission.id === 'streak' &&
                streakCompleted
              ) {
                return {
                  ...mission,
                  completed: true,
                };
              }

              return mission;
            }
          );

        setMissions(
          loadedMissions
        );

        /*
         * Central wallet.
         */
        const currentPoints =
          await getPoints();

        setPoints(
          currentPoints
        );

        /*
         * Save the corrected mission state.
         */
        await AsyncStorage.setItem(
          missionStorageKey,
          JSON.stringify(
            loadedMissions
          )
        );
      } catch (error) {
        console.log(
          'Could not load missions:',
          error
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
   * REFRESH WHEN RETURNING TO PAGE
   * ----------------------------------------------------
   *
   * Example:
   *
   * Missions → Walking → complete → back to Missions
   *
   * Missions should immediately show the new state.
   */
  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [loadMissions])
  );

  /*
   * ----------------------------------------------------
   * SAVE MISSIONS
   * ----------------------------------------------------
   */
  const saveMissions = async (
    updatedMissions: Mission[]
  ) => {
    try {
      await AsyncStorage.setItem(
        getMissionStorageKey(),
        JSON.stringify(
          updatedMissions
        )
      );
    } catch (error) {
      console.log(
        'Could not save missions:',
        error
      );
    }
  };

  /*
   * ----------------------------------------------------
   * COMPLETE WATER / STREAK MISSION
   * ----------------------------------------------------
   *
   * Walk and Health are opened separately.
   *
   * Water and Streak are completed directly here.
   */
  const completeDirectMission =
    async (
      missionId: string
    ) => {
      if (
        completingMission !== null
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

      if (mission.completed) {
        return;
      }

      /*
       * Only these missions can be
       * completed directly here.
       */
      if (
        missionId !== 'water' &&
        missionId !== 'streak'
      ) {
        return;
      }

      const todayKey = getTodayKey();

      /*
       * The streak mission is earned by actually
       * completing today's walking mission.
       *
       * This prevents a user from simply pressing
       * MARK DONE and receiving the streak reward
       * without completing the walking goal.
       */
      if (missionId === 'streak') {
        const walkingCompleted =
          await hasTransaction(
            'walking_mission',
            `walking_mission_${todayKey}`
          );

        if (!walkingCompleted) {
          Alert.alert(
            'Keep Walking 🔥',
            'Complete today’s walking goal first. Once your walking mission is complete, you can claim the streak mission.'
          );

          return;
        }
      }

      setCompletingMission(
        missionId
      );

      try {
        let transactionType =
          '';

        let transactionKey =
          '';

        if (
          missionId === 'water'
        ) {
          transactionType =
            'water_mission';

          transactionKey =
            `water_mission_${todayKey}`;
        }

        if (
          missionId === 'streak'
        ) {
          transactionType =
            'streak_mission';

          transactionKey =
            `streak_mission_${todayKey}`;
        }

        /*
         * Central points engine.
         *
         * awardOnce guarantees:
         *
         * same day + same mission
         * = one reward only.
         */
        const result =
          await awardOnce(
            transactionType,
            transactionKey,
            mission.points,
            mission.title,
            transactionKey
          );

        /*
         * Update local mission UI.
         */
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

        setPoints(
          result.balance
        );

        await saveMissions(
          updatedMissions
        );

        /*
         * If it was already awarded,
         * don't give another alert claiming
         * that fresh points were added.
         */
        if (
          !result.awarded
        ) {
          Alert.alert(
            'Already completed',
            `You've already earned today's +${mission.points} points for this mission.`
          );

          return;
        }

        /*
         * Success message.
         */
        Alert.alert(
          '🎉 Mission Complete!',
          `+${mission.points} Chalega Points\n\nYour total is now ${result.balance} Chalega Points.`,
          [
            {
              text: 'CONTINUE',
              style: 'default',
            },
          ]
        );
      } catch (error) {
        console.log(
          'Could not complete mission:',
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
    };

  /*
   * ----------------------------------------------------
   * HANDLE MISSION
   * ----------------------------------------------------
   */
  const handleMission = (
    mission: Mission
  ) => {
    if (
      completingMission !== null
    ) {
      return;
    }

    if (mission.completed) {
      return;
    }

    /*
     * WALK
     *
     * Walking page controls the
     * 4,000-step mission.
     */
    if (
      mission.id === 'walk'
    ) {
      router.push(
        '/walking'
      );

      return;
    }

    /*
     * HEALTH
     *
     * Health page controls the
     * health check-in.
     */
    if (
      mission.id === 'health'
    ) {
      router.push(
        '/health-topic?mission=health'
      );

      return;
    }

    /*
     * WATER / STREAK
     */
    completeDirectMission(
      mission.id
    );
  };

  /*
   * ----------------------------------------------------
   * DERIVED VALUES
   * ----------------------------------------------------
   */
  const completedCount =
    missions.filter(
      mission =>
        mission.completed
    ).length;

  const earnedToday =
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
      );

  const totalPossible =
    missions.reduce(
      (
        total,
        mission
      ) =>
        total +
        mission.points,
      0
    );

  const progress =
    totalPossible > 0
      ? earnedToday /
        totalPossible
      : 0;

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
          <Text
            style={
              styles.loadingText
            }
          >
            Loading your missions...
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
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

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
          >
            <Text
              style={
                styles.backText
              }
            >
              ‹
            </Text>
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
              C H A L E G A  I N D I A
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

        {/* HERO */}

        <View
          style={
            styles.hero
          }
        >
          <Text
            style={
              styles.heroIcon
            }
          >
            🎯
          </Text>

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
            Complete healthy actions today and earn Chalega Points.
          </Text>

          <View
            style={
              styles.pointsRow
            }
          >
            <View
              style={
                styles.pointsColumn
              }
            >
              <Text
                style={
                  styles.pointsNumber
                }
              >
                {earnedToday}
              </Text>

              <Text
                style={
                  styles.pointsLabel
                }
              >
                POINTS EARNED TODAY
              </Text>
            </View>

            <View
              style={
                styles.pointsDivider
              }
            />

            <View
              style={
                styles.pointsColumn
              }
            >
              <Text
                style={
                  styles.pointsNumber
                }
              >
                {points}
              </Text>

              <Text
                style={
                  styles.pointsLabel
                }
              >
                TOTAL POINTS
              </Text>
            </View>
          </View>
        </View>

        {/* PROGRESS */}

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
            <Text
              style={
                styles.progressTitle
              }
            >
              Daily progress
            </Text>

            <Text
              style={
                styles.progressCount
              }
            >
              {completedCount}/
              {missions.length}
            </Text>
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
                  width: `${
                    Math.max(
                      0,
                      Math.min(
                        100,
                        progress *
                          100
                      )
                    )
                  }%`,
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.progressText
            }
          >
            {completedCount ===
            missions.length
              ? '🎉 All missions complete!'
              : `${
                  totalPossible -
                  earnedToday
                } points still available today.`}
          </Text>
        </View>

        {/* MISSIONS */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          TODAY'S MISSIONS
        </Text>

        {missions.map(
          mission => (
            <View
              key={
                mission.id
              }
              style={[
                styles.missionCard,
                mission.completed &&
                  styles.missionCompleted,
              ]}
            >
              <View
                style={
                  styles.missionTop
                }
              >
                <View
                  style={
                    styles.iconBox
                  }
                >
                  <Text
                    style={
                      styles.missionIcon
                    }
                  >
                    {mission.icon}
                  </Text>
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
                      style={
                        styles.missionTitle
                      }
                    >
                      {mission.title}
                    </Text>

                    <Text
                      style={
                        styles.pointsBadge
                      }
                    >
                      +
                      {
                        mission.points
                      }
                    </Text>
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
                  completingMission ===
                    mission.id &&
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
              >
                <Text
                  style={[
                    styles.missionButtonText,
                    mission.completed &&
                      styles.completedButtonText,
                  ]}
                >
                  {mission.completed
                    ? '✓ COMPLETED'
                    : completingMission ===
                      mission.id
                    ? 'SAVING...'
                    : mission.action}
                </Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* COMPLETE CARD */}

        {completedCount ===
          missions.length && (
          <View
            style={
              styles.completeCard
            }
          >
            <Text
              style={
                styles.completeEmoji
              }
            >
              🏆
            </Text>

            <Text
              style={
                styles.completeTitle
              }
            >
              You did it!
            </Text>

            <Text
              style={
                styles.completeText
              }
            >
              You completed every mission today. Your healthy streak is getting stronger.
            </Text>

            <TouchableOpacity
              style={
                styles.completeButton
              }
              onPress={() =>
                router.push(
                  '/rewards'
                )
              }
            >
              <Text
                style={
                  styles.completeButtonText
                }
              >
                VIEW MY REWARDS →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SPONSOR */}

        <View
          style={
            styles.sponsorCard
          }
        >
          <Text
            style={
              styles.sponsorLabel
            }
          >
            HEALTH PARTNER
          </Text>

          <Text
            style={
              styles.sponsorTitle
            }
          >
            Your brand could power tomorrow's healthy mission.
          </Text>

          <Text
            style={
              styles.sponsorText
            }
          >
            Local businesses can sponsor challenges, rewards and healthy community campaigns.
          </Text>

          <TouchableOpacity
            style={
              styles.sponsorButton
            }
            onPress={() =>
              Alert.alert(
                'Chalega Health Partners',
                'Partner opportunities will be available soon.'
              )
            }
          >
            <Text
              style={
                styles.sponsorButtonText
              }
            >
              BECOME A PARTNER →
            </Text>
          </TouchableOpacity>
        </View>

        {/* MOTIVATION */}

        <View
          style={
            styles.motivationCard
          }
        >
          <Text
            style={
              styles.motivationIcon
            }
          >
            🔥
          </Text>

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
            Every healthy day builds your streak, your points and your progress.
          </Text>
        </View>

        {/* FOOTER */}

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
            C H A L E G A  I N D I A
          </Text>

          <Text
            style={
              styles.footerText
            }
          >
            Walk • Earn • Unlock • Repeat
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
        '#F4F6FB',
    },

    content: {
      padding: 20,
      paddingBottom: 60,
    },

    loading: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#777777',
    },

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 24,
    },

    backButton: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor:
        '#FFFFFF',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 16,
    },

    backText: {
      fontSize: 52,
      lineHeight: 56,
      color: '#111111',
      marginTop: -5,
    },

    headerText: {
      flex: 1,
    },

    brand: {
      color: '#1976ED',
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 5,
      marginBottom: 3,
    },

    title: {
      fontSize: 36,
      fontWeight: '900',
      color: '#111111',
    },

    hero: {
      backgroundColor:
        '#1976ED',
      borderRadius: 34,
      padding: 28,
      marginBottom: 18,
    },

    heroIcon: {
      fontSize: 46,
      marginBottom: 14,
    },

    heroLabel: {
      color: '#DCEAFF',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 4,
      marginBottom: 10,
    },

    heroTitle: {
      color: '#FFFFFF',
      fontSize: 38,
      fontWeight: '900',
      lineHeight: 42,
    },

    heroSubtitle: {
      color: '#FFFFFF',
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '600',
      marginTop: 14,
    },

    pointsRow: {
      flexDirection:
        'row',
      backgroundColor:
        'rgba(255,255,255,0.13)',
      borderRadius: 22,
      padding: 18,
      marginTop: 24,
      alignItems:
        'center',
    },

    pointsColumn: {
      flex: 1,
    },

    pointsNumber: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '900',
    },

    pointsLabel: {
      color: '#DCEAFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginTop: 3,
    },

    pointsDivider: {
      width: 1,
      height: 45,
      backgroundColor:
        'rgba(255,255,255,0.35)',
      marginHorizontal: 18,
    },

    progressCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 28,
      padding: 24,
      marginBottom: 30,
    },

    progressHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 14,
    },

    progressTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: '#111111',
    },

    progressCount: {
      fontSize: 18,
      fontWeight: '900',
      color: '#1976ED',
    },

    progressTrack: {
      height: 14,
      backgroundColor:
        '#E4E9F2',
      borderRadius: 10,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      backgroundColor:
        '#1976ED',
      borderRadius: 10,
    },

    progressText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#777777',
      marginTop: 12,
    },

    sectionTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: '#111111',
      marginBottom: 14,
    },

    missionCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 28,
      padding: 20,
      marginBottom: 16,
    },

    missionCompleted: {
      opacity: 0.72,
    },

    missionTop: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    iconBox: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor:
        '#EDF4FF',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 16,
    },

    missionIcon: {
      fontSize: 34,
    },

    missionInfo: {
      flex: 1,
    },

    missionTitleRow: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
    },

    missionTitle: {
      flex: 1,
      fontSize: 19,
      fontWeight: '900',
      color: '#111111',
      lineHeight: 24,
      paddingRight: 8,
    },

    pointsBadge: {
      color: '#1976ED',
      fontSize: 17,
      fontWeight: '900',
    },

    missionDescription: {
      color: '#777777',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      marginTop: 6,
    },

    missionButton: {
      backgroundColor:
        '#111111',
      height: 52,
      borderRadius: 26,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 18,
    },

    completingButton: {
      opacity: 0.65,
    },

    missionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 1,
    },

    completedButton: {
      backgroundColor:
        '#EAF8EF',
    },

    completedButtonText: {
      color: '#228B45',
    },

    completeCard: {
      backgroundColor:
        '#1976ED',
      borderRadius: 30,
      padding: 30,
      alignItems:
        'center',
      marginTop: 10,
    },

    completeEmoji: {
      fontSize: 52,
      marginBottom: 10,
    },

    completeTitle: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '900',
    },

    completeText: {
      color: '#FFFFFF',
      fontSize: 16,
      lineHeight: 24,
      textAlign:
        'center',
      marginTop: 10,
    },

    completeButton: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 26,
      paddingHorizontal: 24,
      height: 52,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 22,
    },

    completeButtonText: {
      color: '#111111',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1,
    },

    sponsorCard: {
      backgroundColor:
        '#EAF2FF',
      borderRadius: 30,
      padding: 26,
      marginTop: 20,
    },

    sponsorLabel: {
      color: '#1976ED',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 3,
      marginBottom: 10,
    },

    sponsorTitle: {
      color: '#111111',
      fontSize: 25,
      lineHeight: 31,
      fontWeight: '900',
    },

    sponsorText: {
      color: '#666666',
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      marginTop: 10,
    },

    sponsorButton: {
      backgroundColor:
        '#111111',
      height: 52,
      borderRadius: 26,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 20,
    },

    sponsorButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
    },

    motivationCard: {
      backgroundColor:
        '#FFF7DF',
      borderRadius: 28,
      padding: 24,
      marginTop: 20,
      alignItems:
        'center',
    },

    motivationIcon: {
      fontSize: 38,
      marginBottom: 8,
    },

    motivationTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#111111',
    },

    motivationText: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
      color: '#666666',
      textAlign:
        'center',
      marginTop: 7,
    },

    footer: {
      alignItems:
        'center',
      paddingTop: 38,
      paddingBottom: 20,
    },

    footerBrand: {
      color: '#1976ED',
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: 6,
    },

    footerText: {
      color: '#999999',
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
    },
  });