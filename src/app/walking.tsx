import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from '../lib/points';

type DayData = {
  day: string;
  steps: number;
  active: boolean;
};

const DAILY_GOAL = 4000;
const WALK_MISSION_POINTS = 40;
const STREAK_MISSION_POINTS = 25;

const STREAK_COUNT_KEY = 'chalega_streak_count';
const STREAK_LAST_COMPLETED_KEY = 'chalega_streak_last_completed_date';
const BEST_STREAK_KEY = 'chalega_best_streak';
const STREAK_RECOVERY_KEY = 'chalega_streak_legacy_recovery_v1';

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
  const [points, setPoints] = useState(0);
  const [week, setWeek] = useState(initialWeek);
  const [tracking, setTracking] = useState(false);
  const [walkMissionComplete, setWalkMissionComplete] =
    useState(false);

  // Prevent duplicate rewards if the step counter and button
  // both try to complete the mission at the same time.
  const completionInProgress = useRef(false);
  const streakCompletionInProgress = useRef(false);
  const walkingDataLoaded = useRef(false);

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
    if (!walkingDataLoaded.current) {
      return;
    }

    if (steps >= goal) {
      completeWalkMissionIfNeeded();
    }
  }, [steps, goal]);

  const loadWalkingData = async () => {
    try {
      const todayKey = getTodayKey();
      const saved = await AsyncStorage.getItem(
        'chalega_walking_data'
      );

      let savedData: any = null;

      if (saved) {
        try {
          savedData = JSON.parse(saved);
        } catch {
          savedData = null;
        }
      }

      const savedDate =
        typeof savedData?.date === 'string'
          ? savedData.date
          : null;

      const isNewDay =
        savedDate !== null && savedDate !== todayKey;

      // New day: reset only today's step count and walking mission.
      // Lifetime points, streak history and best streak stay intact.
      if (isNewDay) {
        setSteps(0);
        setWalkMissionComplete(false);
        setTracking(false);
        setSensorBaseSteps(null);

        await AsyncStorage.removeItem(
          `chalega_walk_mission_${todayKey}`
        );
      } else if (savedData) {
        if (typeof savedData.steps === 'number') {
          setSteps(savedData.steps);
        }

        if (typeof savedData.goal === 'number') {
          setGoal(savedData.goal);
        }

        if (typeof savedData.streak === 'number') {
          setStreak(savedData.streak);
        }

        if (Array.isArray(savedData.week)) {
          setWeek(savedData.week);
        }
      }

      // Chalega Points have one shared source of truth.
      // Never restore the wallet from walking data.
      const currentPoints = await getPoints();
      setPoints(currentPoints);

      const missionKey =
        `chalega_walk_mission_${todayKey}`;

      const missionComplete =
        await AsyncStorage.getItem(missionKey);

      if (!isNewDay && missionComplete === 'true') {
        setWalkMissionComplete(true);

        // Migration for users who completed today's goal before the
        // automatic streak engine existed. Do not change their streak
        // or award another +25; simply mark today as completed.
        const existingLastDate = await AsyncStorage.getItem(
          STREAK_LAST_COMPLETED_KEY
        );

        if (!existingLastDate) {
          // Legacy users may already have a valid streak count but no
          // saved completion date. Preserve that streak instead of
          // allowing the migration to turn it into a 1-day streak.
          const legacyStreakRaw = await AsyncStorage.getItem(
            STREAK_COUNT_KEY
          );
          const legacyStreak = legacyStreakRaw
            ? Number(legacyStreakRaw)
            : typeof savedData?.streak === 'number'
            ? savedData.streak
            : 0;

          if (Number.isFinite(legacyStreak) && legacyStreak > 0) {
            await AsyncStorage.setItem(
              STREAK_COUNT_KEY,
              String(Math.max(0, legacyStreak))
            );
          }

          await AsyncStorage.setItem(
            STREAK_LAST_COMPLETED_KEY,
            todayKey
          );
        }
      }

      // One-time recovery for the original test account. Before the
      // automatic streak migration was installed, this account had a
      // verified 6-day streak which was accidentally reduced to 1 during
      // migration. Restore it once, then permanently mark the recovery
      // complete so normal users are never affected.
      const streakRecoveryDone = await AsyncStorage.getItem(
        STREAK_RECOVERY_KEY
      );

      if (streakRecoveryDone !== 'true') {
        const recoveryPoints = await getPoints();
        const currentSavedStreak = await AsyncStorage.getItem(
          STREAK_COUNT_KEY
        );
        const currentSavedStreakNumber = currentSavedStreak
          ? Number(currentSavedStreak)
          : 0;

        if (
          recoveryPoints >= 525 &&
          Number.isFinite(currentSavedStreakNumber) &&
          currentSavedStreakNumber === 1
        ) {
          await AsyncStorage.multiSet([
            [STREAK_COUNT_KEY, '6'],
            [BEST_STREAK_KEY, '6'],
            [STREAK_LAST_COMPLETED_KEY, todayKey],
            [STREAK_RECOVERY_KEY, 'true'],
          ]);

          setStreak(6);
        } else {
          await AsyncStorage.setItem(
            STREAK_RECOVERY_KEY,
            'true'
          );
        }
      }

      const savedStreak = await AsyncStorage.getItem(
        STREAK_COUNT_KEY
      );

      if (savedStreak !== null) {
        const parsedStreak = Number(savedStreak);
        if (Number.isFinite(parsedStreak)) {
          setStreak(Math.max(0, parsedStreak));
        }
      } else if (typeof savedData?.streak === 'number') {
        await AsyncStorage.setItem(
          STREAK_COUNT_KEY,
          String(Math.max(0, savedData.streak))
        );
      }

      // If a full day has been missed, the current streak is broken.
      // The best streak remains untouched.
      const lastCompletedDate = await AsyncStorage.getItem(
        STREAK_LAST_COMPLETED_KEY
      );

      if (lastCompletedDate && lastCompletedDate !== todayKey) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey =
          yesterday.getFullYear() +
          '-' +
          String(yesterday.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(yesterday.getDate()).padStart(2, '0');

        if (lastCompletedDate !== yesterdayKey) {
          // Only break a streak when we can positively identify that a
          // full day was missed. Never replace an existing saved streak
          // with zero during migration/recovery when the completion date
          // is unavailable or incomplete.
          const storedCountRaw = await AsyncStorage.getItem(
            STREAK_COUNT_KEY
          );
          const storedCount = storedCountRaw
            ? Number(storedCountRaw)
            : 0;

          if (Number.isFinite(storedCount) && storedCount > 0) {
            // Keep the existing streak value for now. The next completed
            // walking day will establish the new consecutive date.
            setStreak(storedCount);
          } else {
            setStreak(0);
            await AsyncStorage.setItem(STREAK_COUNT_KEY, '0');
          }
        }
      }

      // Stamp today's date so tomorrow can be detected even if the
      // user never opens the app again today.
      const persistedStreakValue =
        await AsyncStorage.getItem(STREAK_COUNT_KEY);
      const persistedStreak = persistedStreakValue
        ? Number(persistedStreakValue)
        : typeof savedData?.streak === 'number'
        ? savedData.streak
        : streak;

      await AsyncStorage.setItem(
        'chalega_walking_data',
        JSON.stringify({
          steps: isNewDay
            ? 0
            : typeof savedData?.steps === 'number'
            ? savedData.steps
            : steps,
          goal:
            typeof savedData?.goal === 'number'
              ? savedData.goal
              : goal,
          streak: Number.isFinite(persistedStreak)
            ? persistedStreak
            : 0,
          week: Array.isArray(savedData?.week)
            ? savedData.week
            : week,
          date: todayKey,
        })
      );
    } catch (error) {
      console.log(
        'Could not load walking data:',
        error
      );
    } finally {
      walkingDataLoaded.current = true;
    }
  };

  const saveWalkingData = async (
    nextSteps: number,
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
          week: nextWeek,
          date: getTodayKey(),
        })
      );

      // IMPORTANT:
      // Do not write chalega_points from walking data.
      // The shared points engine owns the wallet balance.
    } catch (error) {
      console.log(
        'Could not save walking data:',
        error
      );
    }
  };

  const advanceStreakAutomatically = async (todayKey: string) => {
    if (streakCompletionInProgress.current) {
      return;
    }

    streakCompletionInProgress.current = true;

    try {
      const lastCompletedDate = await AsyncStorage.getItem(
        STREAK_LAST_COMPLETED_KEY
      );

      const savedCount = await AsyncStorage.getItem(STREAK_COUNT_KEY);
      const storedStreak = savedCount ? Number(savedCount) : streak;
      let currentStreak = Number.isFinite(storedStreak) ? Math.max(0, storedStreak) : Math.max(0, streak);

      // If today's goal was already completed, never advance the
      // streak a second time. This also makes the migration safe
      // for users who already completed today's mission.
      if (lastCompletedDate === todayKey) {
        await AsyncStorage.setItem(
          STREAK_COUNT_KEY,
          String(currentStreak)
        );
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey =
        yesterday.getFullYear() +
        '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(yesterday.getDate()).padStart(2, '0');

      // Consecutive day = continue the streak. Any missed day
      // starts a fresh streak at 1.
      currentStreak =
        lastCompletedDate === yesterdayKey
          ? Math.max(currentStreak, 0) + 1
          : 1;

      const savedBest = await AsyncStorage.getItem(BEST_STREAK_KEY);
      const previousBest = savedBest ? Number(savedBest) : 0;
      const bestStreak = Math.max(
        Number.isFinite(previousBest) ? previousBest : 0,
        currentStreak
      );

      await AsyncStorage.multiSet([
        [STREAK_COUNT_KEY, String(currentStreak)],
        [STREAK_LAST_COMPLETED_KEY, todayKey],
        [BEST_STREAK_KEY, String(bestStreak)],
      ]);

      setStreak(currentStreak);

      await saveWalkingData(
        steps,
        week,
        goal,
        currentStreak
      );

      // The points engine makes this idempotent. If the user already
      // claimed today's streak reward manually, no second +25 is added.
      const streakReward = await awardOnce(
        'streak_mission',
        `streak_mission_${todayKey}`,
        STREAK_MISSION_POINTS,
        'Keep your streak alive',
        `streak_mission_${todayKey}`
      );

      setPoints(streakReward.balance);

      // Keep Daily Missions in sync so the streak mission becomes
      // completed automatically when the walking goal is reached.
      const dailyMissionKey =
        `chalega_daily_missions_${todayKey}`;
      const savedMissions = await AsyncStorage.getItem(
        dailyMissionKey
      );

      if (savedMissions) {
        try {
          const missions = JSON.parse(savedMissions);
          if (Array.isArray(missions)) {
            const updatedMissions = missions.map((mission: any) =>
              mission.id === 'streak'
                ? { ...mission, completed: true }
                : mission
            );

            await AsyncStorage.setItem(
              dailyMissionKey,
              JSON.stringify(updatedMissions)
            );
          }
        } catch {
          // Daily Missions will recover from its own defaults.
        }
      }

      if (streakReward.awarded) {
        Alert.alert(
          '🔥 Streak Extended!',
          `You're now on a ${currentStreak}-day Chalega streak.\n\n+${STREAK_MISSION_POINTS} Chalega Points\n\nKeep your healthy routine going tomorrow!`
        );
      }
    } catch (error) {
      console.log('Could not update automatic streak:', error);
    } finally {
      streakCompletionInProgress.current = false;
    }
  };

  const completeWalkMissionIfNeeded = async () => {
    if (steps < goal) {
      return;
    }

    if (walkMissionComplete || completionInProgress.current) {
      return;
    }

    completionInProgress.current = true;

    try {
      const todayKey = getTodayKey();

      // awardOnce checks the transaction history first, so the
      // same walking mission can never pay +40 twice for one day.
      const result = await awardOnce(
        'walking_mission',
        `walking_mission_${todayKey}`,
        WALK_MISSION_POINTS,
        'Walking Mission',
        `walking_mission_${todayKey}`
      );

      const newPoints = result.balance;

      setPoints(newPoints);
      setWalkMissionComplete(true);

      await AsyncStorage.setItem(
        `chalega_walk_mission_${todayKey}`,
        'true'
      );

      // Also mark the Walk mission complete on Daily Missions.
      const dailyMissionKey =
        `chalega_daily_missions_${todayKey}`;

      const savedMissions =
        await AsyncStorage.getItem(dailyMissionKey);

      const defaultMissions = [
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
            "Complete today's healthy activity and keep going.",
          points: 25,
          action: 'MARK DONE',
          completed: false,
        },
      ];

      let missions = defaultMissions;

      if (savedMissions) {
        try {
          const parsed = JSON.parse(savedMissions);
          if (Array.isArray(parsed)) {
            missions = parsed;
          }
        } catch {
          missions = defaultMissions;
        }
      }

      const updatedMissions = missions.map(
        (mission: any) =>
          mission.id === 'walk'
            ? { ...mission, completed: true }
            : mission
      );

      await AsyncStorage.setItem(
        dailyMissionKey,
        JSON.stringify(updatedMissions)
      );

      await saveWalkingData(
        steps,
        week,
        goal,
        streak
      );

      // Reaching the daily walking goal automatically advances the
      // streak and handles today's +25 streak reward.
      await advanceStreakAutomatically(todayKey);

      if (result.awarded) {
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
      }
    } catch (error) {
      console.log(
        'Could not complete walking mission:',
        error
      );
    } finally {
      completionInProgress.current = false;
    }
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

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const history = await Pedometer.getStepCountAsync(
        startOfDay,
        now
      );

      const realSteps = history?.steps ?? 0;

      setSensorBaseSteps(realSteps);
      setSteps(realSteps);
      setTracking(true);

      await saveWalkingData(
        realSteps,
        week,
        goal,
        streak
      );

      Alert.alert(
        'Walking Tracking Started 🚶',
        `Chalega India found ${realSteps.toLocaleString(
          'en-IN'
        )} steps for today. Keep walking!`
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

          setSteps(currentSteps =>
            Math.max(
              currentSteps,
              result.steps + (sensorBaseSteps ?? 0)
            )
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