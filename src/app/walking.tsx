import React, { useEffect, useMemo, useState } from 'react';
import { Pedometer } from 'expo-sensors';
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
import { useRouter } from 'expo-router';
import {
  awardOnce,
  getPoints,
  setPoints,
} from '../lib/points';

type DayData = {
  day: string;
  steps: number;
  active: boolean;
};

const DAILY_GOAL = 4000;
const WALK_MISSION_POINTS = 40;

const initialWeek: DayData[] = [
  { day: 'M', steps: 4200, active: true },
  { day: 'T', steps: 5100, active: true },
  { day: 'W', steps: 3800, active: true },
  { day: 'T', steps: 2450, active: true },
  { day: 'F', steps: 0, active: false },
  { day: 'S', steps: 0, active: false },
  { day: 'S', steps: 0, active: false },
];

export default function WalkingScreen() {
  const router = useRouter();

  const [steps, setSteps] = useState(2450);
  const [goal, setGoal] = useState(DAILY_GOAL);
  const [streak, setStreak] = useState(6);
  const [points, setPoints] = useState(240);
  const [week, setWeek] = useState(initialWeek);
  const [tracking, setTracking] = useState(false);
  const [walkMissionComplete, setWalkMissionComplete] =
    useState(false);

  const [pedometerAvailable, setPedometerAvailable] =
    useState<boolean | null>(null);
  const [pedometerPermission, setPedometerPermission] =
    useState(false);
  const [sensorBaseSteps, setSensorBaseSteps] =
    useState<number | null>(null);

  const progress = Math.min(steps / goal, 1);

  const remainingSteps = Math.max(goal - steps, 0);

  const distanceKm = (steps * 0.00072).toFixed(2);

  const calories = Math.round(steps * 0.04);

  const todayComplete = steps >= goal;

  const level = useMemo(() => {
    if (points >= 1000) return 5;
    if (points >= 750) return 4;
    if (points >= 500) return 3;
    if (points >= 250) return 2;
    return 1;
  }, [points]);

  const levelStart = (level - 1) * 250;

  const levelProgress = Math.min(
    Math.max(
      ((points - levelStart) / 250) * 100,
      0
    ),
    100
  );

  const getTodayKey = () => {
    const today = new Date();

    return (
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    );
  };

  useEffect(() => {
    loadWalkingData();
  }, []);

  useEffect(() => {
    if (steps >= goal) {
      completeWalkMissionIfNeeded();
    }
  }, [steps, goal]);

  const loadWalkingData = async () => {
    try {
      const saved = await AsyncStorage.getItem(
        'chalega_walking_data'
      );

      if (saved) {
        const data = JSON.parse(saved);

        if (typeof data.steps === 'number') {
          setSteps(data.steps);
        }

        if (typeof data.goal === 'number') {
          setGoal(data.goal);
        }

        if (typeof data.streak === 'number') {
          setStreak(data.streak);
        }

        if (typeof data.points === 'number') {
          setPoints(data.points);
        }

        if (Array.isArray(data.week)) {
          setWeek(data.week);
        }
      }

      const missionKey =
        `chalega_walk_mission_${getTodayKey()}`;

      const missionComplete =
        await AsyncStorage.getItem(missionKey);

      if (missionComplete === 'true') {
        setWalkMissionComplete(true);
      }
    } catch (error) {
      console.log(
        'Could not load walking data:',
        error
      );
    }
  };

  const saveWalkingData = async (
    nextSteps: number,
    nextPoints: number,
    nextWeek = week,
    nextGoal = goal,
    nextStreak = streak
  ) => {
    try {
      await AsyncStorage.setItem(
        'chalega_walking_data',
        JSON.stringify({
          steps: nextSteps,
          goal: nextGoal,
          streak: nextStreak,
          points: nextPoints,
          week: nextWeek,
        })
      );

      await AsyncStorage.setItem(
        'chalega_points',
        String(nextPoints)
      );
    } catch (error) {
      console.log(
        'Could not save walking data:',
        error
      );
    }
  };

  const completeWalkMissionIfNeeded = async () => {
    try {
      if (steps < goal) {
        return;
      }

      const todayKey = getTodayKey();

      // Sync the shared engine with the existing local balance
      // while we transition the app to the new points architecture.
      const enginePoints = await getPoints();

      if (enginePoints !== points) {
        await setPoints(points);
      }

      // awardOnce prevents the same walking mission from paying twice.
      const result = await awardOnce(
        'walking_mission',
        `walking_mission_${todayKey}`,
        WALK_MISSION_POINTS,
        'Walking Mission',
        `walking_mission_${todayKey}`
      );

      if (!result.awarded) {
        setWalkMissionComplete(true);
        return;
      }

      const newPoints = result.balance;

      setPoints(newPoints);
      setWalkMissionComplete(true);

      await AsyncStorage.setItem(
        `chalega_walk_mission_${todayKey}`,
        'true'
      );

      await saveWalkingData(
        steps,
        newPoints,
        week,
        goal,
        streak
      );

      Alert.alert(
        '🎉 Walking Mission Complete!',
        `You reached ${goal.toLocaleString(
          'en-IN'
        )} steps today.\n\n+${WALK_MISSION_POINTS} Chalega Points\n\nYour points have been added to your account.`,
        [
          {
            text: 'VIEW MISSIONS',
            onPress: () => router.push('/missions'),
          },
          {
            text: 'KEEP WALKING',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.log(
        'Could not complete walking mission:',
        error
      );
    }
  };

  const addSteps = (amount: number) => {
    const nextSteps = Math.min(
      steps + amount,
      20000
    );

    const pointsForSteps =
      Math.floor(
        nextSteps / 100
      ) -
      Math.floor(
        steps / 100
      );

    const nextPoints =
      points + Math.max(pointsForSteps, 0);

    const nextWeek = [...week];

    nextWeek[3] = {
      ...nextWeek[3],
      steps: nextSteps,
      active: true,
    };

    setSteps(nextSteps);
    setPoints(nextPoints);
    setWeek(nextWeek);

    saveWalkingData(
      nextSteps,
      nextPoints,
      nextWeek
    );
  };

  const startTracking = async () => {
    if (tracking) {
      setTracking(false);
      return;
    }

    try {
      const available = await Pedometer.isAvailableAsync();
      setPedometerAvailable(available);

      if (!available) {
        Alert.alert(
          'Step Tracking Unavailable',
          'Your phone does not currently provide pedometer data to Chalega India.'
        );
        return;
      }

      const permission =
        await Pedometer.requestPermissionsAsync();

      if (!permission.granted) {
        setPedometerPermission(false);
        Alert.alert(
          'Permission Needed',
          'Please allow physical activity access so Chalega India can count your steps.'
        );
        return;
      }

      setPedometerPermission(true);

      // Android in Expo SDK 54 does not support getStepCountAsync().
      // Start the live sensor and preserve the steps already shown on screen.
      const baseSteps = steps;

      setSensorBaseSteps(baseSteps);
      setTracking(true);

      await saveWalkingData(
        baseSteps,
        points,
        week,
        goal,
        streak
      );

      Alert.alert(
        'Walking Tracking Started 🚶',
        `Live phone step tracking is now on. You currently have ${baseSteps.toLocaleString(
          'en-IN'
        )} steps. Keep walking!`
      );
    } catch (error) {
      console.log('Pedometer error:', error);
      Alert.alert(
        'Step Tracking Error',
        'Chalega could not access your step data right now. Please try again.'
      );
    }
  };

  const changeGoal = () => {
    Alert.alert(
      'Daily Walking Goal',
      'Choose your daily step target.',
      [
        {
          text: '4,000 steps',
          onPress: () => setGoal(4000),
        },
        {
          text: '6,000 steps',
          onPress: () => setGoal(6000),
        },
        {
          text: '8,000 steps',
          onPress: () => setGoal(8000),
        },
        {
          text: '10,000 steps',
          onPress: () => setGoal(10000),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const completeMission = () => {
    if (!todayComplete) {
      Alert.alert(
        'Keep going! 🚶',
        `You still have ${remainingSteps.toLocaleString(
          'en-IN'
        )} steps to reach today's goal.`
      );

      return;
    }

    if (walkMissionComplete) {
      Alert.alert(
        'Already Complete 🎉',
        `You've already earned today's ${WALK_MISSION_POINTS} walking mission points. Keep walking for your health!`
      );

      return;
    }

    completeWalkMissionIfNeeded();
  };

  useEffect(() => {
    if (!tracking) {
      return;
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    const startLiveTracking = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();

        if (!available || cancelled) {
          return;
        }

        subscription = Pedometer.watchStepCount(result => {
          if (cancelled) {
            return;
          }

          const nextSteps = Math.max(
            steps,
            result.steps + (sensorBaseSteps ?? 0)
          );

          setSteps(nextSteps);
          saveWalkingData(
            nextSteps,
            points,
            week,
            goal,
            streak
          );
        });
      } catch (error) {
        console.log(
          'Could not start live pedometer:',
          error
        );
      }
    };

    startLiveTracking();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [tracking, sensorBaseSteps]);

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
            <Text style={styles.headerBrand}>
              CHALEGA INDIA
            </Text>

            <Text style={styles.headerTitle}>
              Walking
            </Text>
          </View>

          <TouchableOpacity
            style={styles.pointsSmall}
            onPress={() =>
              Alert.alert(
                'Chalega Points',
                `You currently have ${points} points.`
              )
            }
          >
            <Text style={styles.pointsSmallEmoji}>
              🏆
            </Text>

            <Text style={styles.pointsSmallNumber}>
              {points}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MAIN WALKING CARD */}

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>
            TODAY'S WALK
          </Text>

          <View style={styles.heroMain}>
            <View>
              <Text style={styles.stepNumber}>
                {steps.toLocaleString('en-IN')}
              </Text>

              <Text style={styles.stepLabel}>
                STEPS
              </Text>
            </View>

            <View style={styles.goalCircle}>
              <Text style={styles.goalCircleNumber}>
                {Math.round(progress * 100)}%
              </Text>

              <Text style={styles.goalCircleText}>
                GOAL
              </Text>
            </View>
          </View>

          <View style={styles.heroProgressBackground}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>

          <View style={styles.heroProgressRow}>
            <Text style={styles.heroProgressText}>
              {todayComplete
                ? 'Goal completed! 🎉'
                : `${remainingSteps.toLocaleString(
                    'en-IN'
                  )} steps to go`}
            </Text>

            <Text style={styles.heroProgressText}>
              {goal.toLocaleString('en-IN')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.trackButton}
            onPress={startTracking}
          >
            <Text style={styles.trackButtonIcon}>
              {tracking ? '⏹' : '▶'}
            </Text>

            <Text style={styles.trackButtonText}>
              {tracking
                ? 'TRACKING WALK'
                : 'START WALKING'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.sensorStatus}>
            {pedometerAvailable === false
              ? 'Step sensor unavailable on this device'
              : pedometerPermission
              ? '● LIVE PHONE STEP TRACKING'
              : 'Phone steps connect when you start walking'}
          </Text>
        </View>

        {/* WALKING MISSION STATUS */}

        <View
          style={[
            styles.missionStatusCard,
            walkMissionComplete &&
              styles.missionStatusComplete,
          ]}
        >
          <View style={styles.missionStatusIcon}>
            <Text style={styles.missionStatusEmoji}>
              {walkMissionComplete
                ? '🏆'
                : '🎯'}
            </Text>
          </View>

          <View style={styles.missionStatusContent}>
            <Text style={styles.missionStatusLabel}>
              TODAY'S WALKING MISSION
            </Text>

            <Text style={styles.missionStatusTitle}>
              {walkMissionComplete
                ? 'Mission complete!'
                : `Reach ${goal.toLocaleString(
                    'en-IN'
                  )} steps`}
            </Text>

            <Text style={styles.missionStatusText}>
              {walkMissionComplete
                ? `+${WALK_MISSION_POINTS} points earned today`
                : `Earn +${WALK_MISSION_POINTS} Chalega Points`}
            </Text>
          </View>

          <Text style={styles.missionStatusCheck}>
            {walkMissionComplete
              ? '✓'
              : `${Math.max(
                  remainingSteps,
                  0
                ).toLocaleString('en-IN')}`}
          </Text>
        </View>

        {/* DAILY STATS */}

        <Text style={styles.sectionTitle}>
          TODAY'S ACTIVITY
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>
              📍
            </Text>

            <Text style={styles.statNumber}>
              {distanceKm}
            </Text>

            <Text style={styles.statLabel}>
              KM
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>
              🔥
            </Text>

            <Text style={styles.statNumber}>
              {calories}
            </Text>

            <Text style={styles.statLabel}>
              CALORIES*
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>
              ⏱️
            </Text>

            <Text style={styles.statNumber}>
              {Math.round(steps / 100)}
            </Text>

            <Text style={styles.statLabel}>
              MINUTES*
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          *Estimated values. Actual results vary by person.
        </Text>

        {/* WEEKLY ACTIVITY */}

        <Text style={styles.sectionTitle}>
          YOUR WEEK
        </Text>

        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <View>
              <Text style={styles.weekTitle}>
                Walking activity
              </Text>

              <Text style={styles.weekSubtitle}>
                Keep your momentum going.
              </Text>
            </View>

            <Text style={styles.weekStreak}>
              🔥 {streak}
            </Text>
          </View>

          <View style={styles.weekRow}>
            {week.map((item, index) => {
              const percentage = Math.min(
                item.steps / goal,
                1
              );

              const isToday = index === 3;

              return (
                <View
                  key={`${item.day}-${index}`}
                  style={styles.dayColumn}
                >
                  <View
                    style={styles.dayBarBackground}
                  >
                    <View
                      style={[
                        styles.dayBarFill,
                        {
                          height: `${
                            Math.max(
                              percentage * 100,
                              item.steps > 0
                                ? 10
                                : 3
                            )
                          }%`,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.dayLabel,
                      isToday &&
                        styles.dayLabelToday,
                    ]}
                  >
                    {item.day}
                  </Text>

                  {isToday && (
                    <View
                      style={styles.todayDot}
                    />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.weekBottom}>
            <Text style={styles.weekBottomText}>
              Goal: {goal.toLocaleString('en-IN')} steps/day
            </Text>

            <TouchableOpacity
              onPress={changeGoal}
            >
              <Text style={styles.changeGoal}>
                CHANGE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STREAK */}

        <View style={styles.streakCard}>
          <View style={styles.streakFire}>
            <Text style={styles.streakFireText}>
              🔥
            </Text>
          </View>

          <View style={styles.streakContent}>
            <Text style={styles.streakEyebrow}>
              WALKING STREAK
            </Text>

            <Text style={styles.streakNumber}>
              {streak} DAYS
            </Text>

            <Text style={styles.streakDescription}>
              You're building a healthy habit. Keep
              today's walk going!
            </Text>
          </View>

          <Text style={styles.streakArrow}>
            ›
          </Text>
        </View>

        {/* LEVEL */}

        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.levelEyebrow}>
                CHALEGA LEVEL
              </Text>

              <Text style={styles.levelTitle}>
                Walker Level {level}
              </Text>
            </View>

            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>
                {level}
              </Text>
            </View>
          </View>

          <View style={styles.levelProgressBackground}>
            <View
              style={[
                styles.levelProgressFill,
                {
                  width: `${levelProgress}%`,
                },
              ]}
            />
          </View>

          <View style={styles.levelBottom}>
            <Text style={styles.levelText}>
              {points} points
            </Text>

            <Text style={styles.levelText}>
              {level * 250} points
            </Text>
          </View>
        </View>

        {/* CHALLENGE */}

        <Text style={styles.sectionTitle}>
          THIS WEEK'S CHALLENGE
        </Text>

        <View style={styles.challengeCard}>
          <View style={styles.challengeIcon}>
            <Text style={styles.challengeEmoji}>
              🏆
            </Text>
          </View>

          <Text style={styles.challengeTitle}>
            25,000 Step Challenge
          </Text>

          <Text style={styles.challengeText}>
            Walk 25,000 steps this week and earn
            bonus Chalega Points.
          </Text>

          <View
            style={styles.challengeProgressBackground}
          >
            <View
              style={styles.challengeProgressFill}
            />
          </View>

          <View style={styles.challengeNumbers}>
            <Text style={styles.challengeNumber}>
              15,850 steps
            </Text>

            <Text style={styles.challengeNumber}>
              25,000
            </Text>
          </View>

          <TouchableOpacity
            style={styles.challengeButton}
            onPress={() =>
              Alert.alert(
                'Challenge Joined',
                'Keep walking and complete 25,000 steps this week!'
              )
            }
          >
            <Text style={styles.challengeButtonText}>
              KEEP WALKING
            </Text>
          </TouchableOpacity>
        </View>

        {/* COMMUNITY */}

        <View style={styles.communityCard}>
          <Text style={styles.communityEmoji}>
            🌆
          </Text>

          <View style={styles.communityContent}>
            <Text style={styles.communityEyebrow}>
              CHALEGA COMMUNITY
            </Text>

            <Text style={styles.communityTitle}>
              You're not walking alone.
            </Text>

            <Text style={styles.communityText}>
              Join people taking small steps toward
              healthier lives.
            </Text>
          </View>
        </View>

        {/* COMPLETE BUTTON */}

        <TouchableOpacity
          style={[
            styles.completeButton,
            todayComplete &&
              styles.completeButtonActive,
            walkMissionComplete &&
              styles.completeButtonDone,
          ]}
          onPress={completeMission}
        >
          <Text style={styles.completeButtonText}>
            {walkMissionComplete
              ? '✓ WALKING MISSION COMPLETE'
              : todayComplete
              ? 'CLAIM +40 POINTS'
              : 'KEEP WALKING →'}
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            C H A L E G A  I N D I A
          </Text>

          <Text style={styles.footerTagline}>
            Walk more • Live better • Stay healthy
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
    paddingBottom: 60,
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
    lineHeight: 34,
    fontWeight: '300',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerBrand: {
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

  pointsSmall: {
    width: 58,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  pointsSmallEmoji: {
    fontSize: 15,
  },

  pointsSmallNumber: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 3,
  },

  heroCard: {
    backgroundColor: '#1976F3',
    borderRadius: 27,
    padding: 23,
    shadowColor: '#1976F3',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 5,
  },

  heroEyebrow: {
    color: '#DCEAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },

  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  stepNumber: {
    color: '#FFFFFF',
    fontSize: 51,
    lineHeight: 58,
    fontWeight: '900',
  },

  stepLabel: {
    color: '#DCEAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  goalCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  goalCircleNumber: {
    color: '#1976F3',
    fontSize: 23,
    fontWeight: '900',
  },

  goalCircleText: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroProgressBackground: {
    height: 11,
    borderRadius: 6,
    backgroundColor: '#4D93F6',
    marginTop: 18,
    overflow: 'hidden',
  },

  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },

  heroProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  heroProgressText: {
    color: '#EAF2FF',
    fontSize: 10,
    fontWeight: '700',
  },

  trackButton: {
    height: 51,
    borderRadius: 15,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 19,
  },

  trackButtonIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 7,
  },

  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  sensorStatus: {
    color: '#DCEAFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
  },

  missionStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EBF2',
  },

  missionStatusComplete: {
    backgroundColor: '#EEF9F2',
    borderColor: '#CDEAD7',
  },

  missionStatusIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  missionStatusEmoji: {
    fontSize: 27,
  },

  missionStatusContent: {
    flex: 1,
    paddingHorizontal: 13,
  },

  missionStatusLabel: {
    color: '#1976F3',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  missionStatusTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },

  missionStatusText: {
    color: '#777777',
    fontSize: 10,
    marginTop: 3,
  },

  missionStatusCheck: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '900',
  },

  testCard: {
    backgroundColor: '#FFFBEA',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F0E5B8',
  },

  testLabel: {
    color: '#806800',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  testText: {
    color: '#777777',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  testButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  testButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDAE',
  },

  testButtonText: {
    color: '#806800',
    fontSize: 10,
    fontWeight: '900',
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 25,
    marginBottom: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    paddingVertical: 17,
    alignItems: 'center',
  },

  statEmoji: {
    fontSize: 22,
  },

  statNumber: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 7,
  },

  statLabel: {
    color: '#888888',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 2,
  },

  disclaimer: {
    color: '#AAAAAA',
    fontSize: 9,
    marginTop: 7,
    textAlign: 'center',
  },

  weekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
  },

  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  weekTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  weekSubtitle: {
    color: '#888888',
    fontSize: 10,
    marginTop: 3,
  },

  weekStreak: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '900',
  },

  weekRow: {
    height: 135,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
  },

  dayColumn: {
    width: 27,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  dayBarBackground: {
    width: 18,
    height: 100,
    borderRadius: 9,
    backgroundColor: '#EEF2F7',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  dayBarFill: {
    width: '100%',
    backgroundColor: '#1976F3',
    borderRadius: 9,
  },

  dayLabel: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 7,
  },

  dayLabelToday: {
    color: '#1976F3',
  },

  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1976F3',
    marginTop: 3,
  },

  weekBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    paddingTop: 13,
    marginTop: 15,
  },

  weekBottomText: {
    color: '#888888',
    fontSize: 10,
  },

  changeGoal: {
    color: '#1976F3',
    fontSize: 9,
    fontWeight: '900',
  },

  streakCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 22,
    padding: 18,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  streakFire: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  streakFireText: {
    fontSize: 29,
  },

  streakContent: {
    flex: 1,
    paddingLeft: 13,
  },

  streakEyebrow: {
    color: '#A06C00',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  streakNumber: {
    color: '#111111',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },

  streakDescription: {
    color: '#777777',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  streakArrow: {
    color: '#A06C00',
    fontSize: 27,
  },

  levelCard: {
    backgroundColor: '#111111',
    borderRadius: 22,
    padding: 20,
    marginTop: 15,
  },

  levelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  levelEyebrow: {
    color: '#AAAAAA',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  levelTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },

  levelBadge: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  levelBadgeText: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
  },

  levelProgressBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginTop: 17,
    overflow: 'hidden',
  },

  levelProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },

  levelBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  levelText: {
    color: '#AAAAAA',
    fontSize: 9,
    fontWeight: '700',
  },

  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 20,
  },

  challengeIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  challengeEmoji: {
    fontSize: 27,
  },

  challengeTitle: {
    color: '#111111',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 13,
  },

  challengeText: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  challengeProgressBackground: {
    height: 9,
    backgroundColor: '#E9EEF5',
    borderRadius: 5,
    marginTop: 17,
    overflow: 'hidden',
  },

  challengeProgressFill: {
    width: '63%',
    height: '100%',
    backgroundColor: '#1976F3',
    borderRadius: 5,
  },

  challengeNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  challengeNumber: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '700',
  },

  challengeButton: {
    backgroundColor: '#111111',
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 15,
  },

  challengeButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  communityCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 22,
    padding: 19,
    marginTop: 15,
    flexDirection: 'row',
  },

  communityEmoji: {
    fontSize: 30,
  },

  communityContent: {
    flex: 1,
    paddingLeft: 12,
  },

  communityEyebrow: {
    color: '#1976F3',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  communityTitle: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },

  communityText: {
    color: '#777777',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  completeButton: {
    backgroundColor: '#111111',
    borderRadius: 17,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  completeButtonActive: {
    backgroundColor: '#1976F3',
  },

  completeButtonDone: {
    backgroundColor: '#228B45',
  },

  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  footer: {
    alignItems: 'center',
    marginTop: 35,
  },

  footerBrand: {
    color: '#1976F3',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },

  footerTagline: {
    color: '#999999',
    fontSize: 10,
    marginTop: 5,
  },
});