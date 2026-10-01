import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pedometer } from 'expo-sensors';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getPoints } from '../lib/points';
import { BRAND } from '@/lib/brand';
import { supabase } from '../lib/supabase';
import { completeStreakDay } from '../lib/streak';
import { syncDailySteps } from '../services/dailyStepsService';

type DayData = {
  day: string;
  steps: number;
  active: boolean;
};

const DAILY_GOAL = 4000;
const WALK_MISSION_POINTS = 40;
const WALK_MISSION_GOAL = 4000;

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

  const [pedometerAvailable, setPedometerAvailable] =
    useState<boolean | null>(null);
  const [pedometerPermission, setPedometerPermission] =
    useState(false);
  const [sensorBaseSteps, setSensorBaseSteps] =
    useState<number | null>(null);
  const lastDailyStepsSyncAt = useRef(0);
  const lastDailyStepsSyncedValue = useRef<number | null>(null);

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

  /*
   * -------------------------------------------------------
   * LOAD WALKING DATA
   * -------------------------------------------------------
   *
   * Walking progress is stored separately from the central
   * Chalega Points wallet.
   *
   * IMPORTANT:
   * data.points is intentionally NOT used as the wallet.
   * The wallet always comes from the server profile.
   */
  const loadWalkingData = async () => {
    try {
      const todayKey = getTodayKey();

      const saved = await AsyncStorage.getItem(
        'chalega_walking_data'
      );

      if (!saved) {
        await AsyncStorage.setItem(
          'chalega_walking_data',
          JSON.stringify({
            steps: 2450,
            goal: DAILY_GOAL,
            streak: 6,
            week: initialWeek,
            date: todayKey,
          })
        );
      } else {
        const data = JSON.parse(saved);

        const savedDate =
          typeof data.date === 'string'
            ? data.date
            : null;

        const isNewDay =
          savedDate !== null &&
          savedDate !== todayKey;

        if (
          !isNewDay &&
          typeof data.steps === 'number'
        ) {
          setSteps(data.steps);
        }

        if (typeof data.goal === 'number') {
          setGoal(data.goal);
        }

        if (typeof data.streak === 'number') {
          setStreak(data.streak);
        }

        if (Array.isArray(data.week)) {
          setWeek(data.week);
        }

        if (isNewDay) {
          setSteps(0);
          setWalkMissionComplete(false);

          await AsyncStorage.setItem(
            'chalega_walking_data',
            JSON.stringify({
              steps: 0,
              goal:
                typeof data.goal === 'number'
                  ? data.goal
                  : DAILY_GOAL,
              streak:
                typeof data.streak === 'number'
                  ? data.streak
                  : 0,
              week:
                Array.isArray(data.week)
                  ? data.week
                  : initialWeek,
              date: todayKey,
            })
          );
        } else if (savedDate === null) {
          await AsyncStorage.setItem(
            'chalega_walking_data',
            JSON.stringify({
              steps:
                typeof data.steps === 'number'
                  ? data.steps
                  : 0,
              goal:
                typeof data.goal === 'number'
                  ? data.goal
                  : DAILY_GOAL,
              streak:
                typeof data.streak === 'number'
                  ? data.streak
                  : 0,
              week:
                Array.isArray(data.week)
                  ? data.week
                  : initialWeek,
              date: todayKey,
            })
          );
        }
      }

      const { data: walletProfile, error: walletError } = await supabase.from('profiles').select('points').single();
      if (!walletError) {
        setPoints(Math.max(0, Number(walletProfile?.points ?? 0)));
      }
    } catch (error) {
      console.log(
        'Could not load walking data:',
        error
      );
    }
  };

  useEffect(() => {
    loadWalkingData();
  }, []);

  /*
   * Keep checking the central wallet while this screen
   * is focused and alive. No local walking value is allowed
   * to overwrite it.
   */
  useEffect(() => {
    const refreshPoints = async () => {
      try {
        const { data: walletProfile, error: walletError } = await supabase.from('profiles').select('points').single();
        if (!walletError) {
          setPoints(Math.max(0, Number(walletProfile?.points ?? 0)));
        }
      } catch (error) {
        console.log(
          'Could not refresh Chalega Points:',
          error
        );
      }
    };

    refreshPoints();

    const interval = setInterval(
      refreshPoints,
      2000
    );

    return () => clearInterval(interval);
  }, []);

  /*
   * Automatic walking mission completion when the goal
   * is reached.
   */
  useEffect(() => {
    if (steps >= WALK_MISSION_GOAL && !walkMissionComplete) {
      completeWalkMissionIfNeeded();
    }
  }, [steps, goal, walkMissionComplete]);

  /*
   * -------------------------------------------------------
   * SAVE WALKING DATA
   * -------------------------------------------------------
   *
   * This function stores walking state only.
   *
   * It DOES NOT write to:
   * chalega_points
   *
   * That prevents stale walking state from overwriting
   * mission, health, streak, or reward points.
   */
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
    } catch (error) {
      console.log(
        'Could not save walking data:',
        error
      );
    }
  };

  /*
   * -------------------------------------------------------
   * WALKING MISSION
   * -------------------------------------------------------
   */
  const completeWalkMissionIfNeeded = async () => {
    try {
      if (steps < WALK_MISSION_GOAL) {
        return;
      }

      const todayKey = getTodayKey();

      /*
       * Persist the completed Walking mission first.
       * The secure reward RPC requires this backend record.
       */
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user');
      }

      const { error: dailyStepsError } = await supabase
        .from('daily_steps')
        .upsert(
          {
            user_id: user.id,
            step_date: todayKey,
            steps: Math.floor(steps),
            distance_km: Number(
              (steps * 0.00072).toFixed(3)
            ),
            calories: Math.round(steps * 0.04),
          },
          {
            onConflict: 'user_id,step_date',
          }
        );

      if (dailyStepsError) {
        throw dailyStepsError;
      }

      const { error: missionSaveError } = await supabase
        .from('user_missions')
        .upsert(
          {
            user_id: user.id,
            mission_id: 4,
            mission_date: todayKey,
            progress: 1,
            completed: true,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict:
              'user_id,mission_id,mission_date',
          }
        );

      if (missionSaveError) {
        throw missionSaveError;
      }


      const {
        data: missionRewardResult,
        error: missionRewardError,
      } = await supabase.rpc(
        'award_daily_mission_reward',
        {
          p_mission_id: 4,
          p_mission_date: todayKey,
        }
      );

      if (missionRewardError) {
        throw missionRewardError;
      }

      const missionResult = {
        awarded:
          missionRewardResult?.already_awarded !== true,
        balance:
          Number(
            missionRewardResult?.balance ?? 0
          ),
      };

      setPoints(
        missionResult.balance
      );
      setWalkMissionComplete(true);

      await AsyncStorage.setItem(
        `chalega_walk_mission_${todayKey}`,
        'true'
      );

      /*
       * Daily streak engine.
       *
       * The existing local streak is passed in so the first
       * migration preserves the user's current 6-day streak.
       * completeStreakDay itself prevents duplicate completion
       * for the same date.
       */
      const nextStreak = await completeStreakDay(
        todayKey,
        streak
      );

      setStreak(nextStreak);

      /*
       * The streak reward is also idempotent.
       * It can therefore safely run every time the goal-completion
       * check fires without awarding +25 twice.
       */
      /* Persist the completed Streak mission first. The secure reward RPC requires this backend record. */
      const { data: { user: streakUser } } = await supabase.auth.getUser();
      if (!streakUser) throw new Error('No authenticated streakUser');
      const { error: streakMissionSaveError } = await supabase.from('user_missions').upsert({ user_id:streakUser.id, mission_id:7, mission_date:todayKey, progress:1, completed:true, completed_at:new Date().toISOString() }, { onConflict:'user_id,mission_id,mission_date' });
      if (streakMissionSaveError) throw streakMissionSaveError;
      const { data: streakRewardResult, error: streakRewardError } = await supabase.rpc('award_daily_mission_reward',{ p_mission_id:7, p_mission_date:todayKey });
      if (streakRewardError) throw streakRewardError;
      setPoints(Number(streakRewardResult?.balance ?? 0));

      await saveWalkingData(
        steps,
        week,
        goal,
        nextStreak
      );


      /*
       * Only show the mission-complete alert when the +40 mission
       * reward was actually newly awarded. The streak engine and
       * streak reward remain silent on repeat checks.
       */
      if (missionResult.awarded) {
        Alert.alert(
          '🎉 Walking Mission Complete!',
          `You reached ${WALK_MISSION_GOAL.toLocaleString(
            'en-IN'
          )} steps today.

+${WALK_MISSION_POINTS} Chalega Points
+25 Streak Points

Your rewards have been added to your account.`,
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
    }
  };

  /*
   * -------------------------------------------------------
   * OPTIONAL TEST / DEMO STEP ADDER
   * -------------------------------------------------------
   *
   * This changes walking progress only.
   *
   * It no longer awards arbitrary points per 100 steps.
   * Points are awarded through the central points engine.
   */
  const addSteps = (amount: number) => {
    const nextSteps = Math.min(
      steps + amount,
      20000
    );

    const nextWeek = [...week];

    nextWeek[3] = {
      ...nextWeek[3],
      steps: nextSteps,
      active: true,
    };

    setSteps(nextSteps);
    setWeek(nextWeek);

    saveWalkingData(
      nextSteps,
      nextWeek,
      goal,
      streak
    );
  };

  /*
   * -------------------------------------------------------
   * START / STOP PHONE TRACKING
   * -------------------------------------------------------
   */
  // Keep step simulation available only in local development web builds.
  // Production web builds must not expose test controls to users.
  const isDevRuntime =
    typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  const WEB_TEST_CONTROLS =
    isDevRuntime && Platform.OS === 'web';

  const startTracking = async () => {
    if (tracking) {
      setTracking(false);
      setSensorBaseSteps(null);
      return;
    }

    try {
      const available =
        await Pedometer.isAvailableAsync();

      setPedometerAvailable(available);

      if (!available) {
        Alert.alert(
          'Step Tracking Unavailable',
          'Your phone does not currently provide pedometer data to Chalega.'
        );
        return;
      }

      const permission =
        await Pedometer.requestPermissionsAsync();

      if (!permission.granted) {
        setPedometerPermission(false);

        Alert.alert(
          'Permission Needed',
          'Please allow physical activity access so Chalega can count your steps.'
        );

        return;
      }

      setPedometerPermission(true);

      /*
       * Expo Android live step listener reports steps
       * since the subscription began.
       *
       * We preserve the steps already shown on screen.
       */
      const baseSteps = steps;

      setSensorBaseSteps(baseSteps);
      setTracking(true);

      await saveWalkingData(
        baseSteps,
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
      console.log(
        'Pedometer error:',
        error
      );

      Alert.alert(
        'Step Tracking Error',
        'Chalega could not access your step data right now. Please try again.'
      );
    }
  };

  /*
   * -------------------------------------------------------
   * CHANGE GOAL
   * -------------------------------------------------------
   */
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

  /*
   * -------------------------------------------------------
   * COMPLETE BUTTON
   * -------------------------------------------------------
   */
  const completeMission = async () => {
    if (steps < WALK_MISSION_GOAL) {
      Alert.alert(
        'Keep going! 🚶',
        `You still need ${(WALK_MISSION_GOAL - steps).toLocaleString(
          'en-IN'
        )} more steps to complete today's walking mission.`
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

    await completeWalkMissionIfNeeded();
  };

  /*
   * -------------------------------------------------------
   * LIVE PEDOMETER
   * -------------------------------------------------------
   */
  useEffect(() => {
    if (!tracking) {
      return;
    }

    let subscription: {
      remove: () => void;
    } | null = null;

    let cancelled = false;

    const startLiveTracking = async () => {
      try {
        const available =
          await Pedometer.isAvailableAsync();

        if (!available || cancelled) {
          return;
        }

        subscription =
          Pedometer.watchStepCount(
            result => {
              if (cancelled) {
                return;
              }

              const nextSteps = Math.max(
                steps,
                result.steps +
                  (sensorBaseSteps ?? 0)
              );

              setSteps(nextSteps);

              /*
               * Only save walking data.
               * Never touch the central points wallet here.
               */
              saveWalkingData(
                nextSteps,
                week,
                goal,
                streak
              );syncDailySteps(nextSteps);
            }
          );
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
  }, [
    tracking,
    sensorBaseSteps,
  ]);

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
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerBrand}>
              CHALEGA KOLKATA
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
            activeOpacity={0.8}
          >
            <Text style={styles.pointsSmallEmoji}>🪙</Text>
            <Text style={styles.pointsSmallNumber}>{points}</Text>
          </TouchableOpacity>
        </View>

        {/* HERO */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>TODAY'S MOVEMENT</Text>
              <Text style={styles.heroTitle}>Keep moving.</Text>
              <Text style={styles.heroSubtitle}>
                Every step counts toward a healthier you.
              </Text>
            </View>

            <View style={styles.heroGoalCircle}>
              <Text style={styles.heroGoalPercent}>
                {Math.round(progress * 100)}%
              </Text>
              <Text style={styles.heroGoalLabel}>GOAL</Text>
            </View>
          </View>

          <View style={styles.heroStepsRow}>
            <View>
              <Text style={styles.stepNumber}>
                {steps.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.stepLabel}>STEPS TODAY</Text>
            </View>

            <View style={styles.remainingPill}>
              <Text style={styles.remainingPillText}>
                {todayComplete
                  ? 'GOAL COMPLETE'
                  : `${remainingSteps.toLocaleString('en-IN')} TO GO`}
              </Text>
            </View>
          </View>

          <View style={styles.heroProgressBackground}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <View style={styles.heroProgressRow}>
            <Text style={styles.heroProgressText}>
              Daily target
            </Text>
            <Text style={styles.heroProgressText}>
              {goal.toLocaleString('en-IN')} steps
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.trackButton,
              tracking && styles.trackButtonActive,
            ]}
            onPress={startTracking}
            activeOpacity={0.88}
          >
            <Text style={styles.trackButtonIcon}>
              {tracking ? '⏹' : '▶'}
            </Text>
            <Text style={styles.trackButtonText}>
              {tracking ? 'TRACKING WALK' : 'START WALKING'}
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

        {/* WEB TEST CONTROLS */}
        {WEB_TEST_CONTROLS && (
          <View
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 16,
              backgroundColor: '#D7F7F1',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '900',
                marginBottom: 10,
              }}
            >
              WEB TEST - SIMULATE STEPS
            </Text>

            <View style={styles.webTestRow}>
              <TouchableOpacity
                onPress={() => addSteps(1000)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: BRAND.teal,
                }}
              >
                <Text style={styles.webTestButtonText}>+1,000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => addSteps(4000)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: BRAND.teal,
                }}
              >
                <Text style={styles.webTestButtonText}>+4,000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => addSteps(8000)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: BRAND.teal,
                }}
              >
                <Text style={styles.webTestButtonText}>+8,000</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MISSION */}
        <TouchableOpacity
          style={[
            styles.missionCard,
            walkMissionComplete && styles.missionCardComplete,
          ]}
          activeOpacity={0.88}
          onPress={() => router.push('/missions')}
        >
          <View
            style={[
              styles.missionIcon,
              walkMissionComplete && styles.missionIconComplete,
            ]}
          >
            <Text style={styles.missionEmoji}>
              {walkMissionComplete ? '✓' : '🚶'}
            </Text>
          </View>

          <View style={styles.missionContent}>
            <Text style={styles.eyebrow}>
              TODAY'S WALKING MISSION
            </Text>
            <Text style={styles.missionTitle}>
              {walkMissionComplete
                ? 'Mission complete!'
                : `Reach ${WALK_MISSION_GOAL.toLocaleString('en-IN')} steps`}
            </Text>
            <Text style={styles.missionText}>
              {walkMissionComplete
                ? `+${WALK_MISSION_POINTS} points earned today`
                : `Earn +${WALK_MISSION_POINTS} Chalega Points`}
            </Text>
          </View>

          <Text style={styles.missionArrow}>
            {walkMissionComplete
              ? '✓'
              : `${Math.max(remainingSteps, 0).toLocaleString('en-IN')}`}
          </Text>
        </TouchableOpacity>

        {/* STATS */}
        <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.statIconBlue]}>
              <Text style={styles.statIconEmoji}>📍</Text>
            </View>
            <Text style={styles.statNumber}>{distanceKm}</Text>
            <Text style={styles.statLabel}>KM</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.statIconOrange]}>
              <Text style={styles.statIconEmoji}>🔥</Text>
            </View>
            <Text style={styles.statNumber}>{calories}</Text>
            <Text style={styles.statLabel}>CALORIES*</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.statIconGreen]}>
              <Text style={styles.statIconEmoji}>⏱️</Text>
            </View>
            <Text style={styles.statNumber}>{Math.round(steps / 100)}</Text>
            <Text style={styles.statLabel}>MINUTES*</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          *Estimated values. Actual results vary by person.
        </Text>

        {/* WEEK */}
        <Text style={styles.sectionTitle}>YOUR WEEK</Text>

        <View style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <View>
              <Text style={styles.weekTitle}>Walking activity</Text>
              <Text style={styles.weekSubtitle}>
                Keep your momentum going.
              </Text>
            </View>

            <View style={styles.weekStreakPill}>
              <Text style={styles.weekStreak}>🔥 {streak}</Text>
            </View>
          </View>

          <View style={styles.weekRow}>
            {week.map((item, index) => {
              const percentage = Math.min(item.steps / goal, 1);
              const isToday = index === 3;

              return (
                <View
                  key={`${item.day}-${index}`}
                  style={styles.dayColumn}
                >
                  <View style={styles.dayBarBackground}>
                    <View
                      style={[
                        styles.dayBarFill,
                        {
                          height: `${
                            Math.max(
                              percentage * 100,
                              item.steps > 0 ? 10 : 3
                            )
                          }%`,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.dayLabel,
                      isToday && styles.dayLabelToday,
                    ]}
                  >
                    {item.day}
                  </Text>

                  {isToday && <View style={styles.todayDot} />}
                </View>
              );
            })}
          </View>

          <View style={styles.weekBottom}>
            <Text style={styles.weekBottomText}>
              Goal: {goal.toLocaleString('en-IN')} steps/day
            </Text>

            <TouchableOpacity onPress={changeGoal} activeOpacity={0.8}>
              <Text style={styles.changeGoal}>CHANGE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STREAK */}
        <View style={styles.streakCard}>
          <View style={styles.streakFire}>
            <Text style={styles.streakFireText}>🔥</Text>
          </View>

          <View style={styles.streakContent}>
            <Text style={styles.streakEyebrow}>WALKING STREAK</Text>
            <Text style={styles.streakNumber}>{streak} DAYS</Text>
            <Text style={styles.streakDescription}>
              You're building a healthy habit. Keep today's walk going!
            </Text>
          </View>

          <Text style={styles.streakArrow}>›</Text>
        </View>

        {/* LEVEL */}
        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.levelEyebrow}>CHALEGA LEVEL</Text>
              <Text style={styles.levelTitle}>Walker Level {level}</Text>
            </View>

            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
          </View>

          <View style={styles.levelProgressBackground}>
            <View
              style={[
                styles.levelProgressFill,
                { width: `${levelProgress}%` },
              ]}
            />
          </View>

          <View style={styles.levelBottom}>
            <Text style={styles.levelText}>{points} points</Text>
            <Text style={styles.levelText}>{level * 250} points</Text>
          </View>
        </View>

        {/* CHALLENGE */}
        <Text style={styles.sectionTitle}>THIS WEEK'S CHALLENGE</Text>

        <View style={styles.challengeCard}>
          <View style={styles.challengeTop}>
            <View style={styles.challengeIcon}>
              <Text style={styles.challengeEmoji}>🪙</Text>
            </View>

            <View style={styles.challengeTopText}>
              <Text style={styles.challengeTitle}>
                25,000 Step Challenge
              </Text>
              <Text style={styles.challengeText}>
                Walk 25,000 steps this week and earn bonus Chalega Points.
              </Text>
            </View>
          </View>

          <View style={styles.challengeProgressBackground}>
            <View style={styles.challengeProgressFill} />
          </View>

          <View style={styles.challengeNumbers}>
            <Text style={styles.challengeNumber}>15,850 steps</Text>
            <Text style={styles.challengeNumber}>25,000</Text>
          </View>

          <TouchableOpacity
            style={styles.challengeButton}
            onPress={() =>
              Alert.alert(
                'Challenge Joined',
                'Keep walking and complete 25,000 steps this week!'
              )
            }
            activeOpacity={0.88}
          >
            <Text style={styles.challengeButtonText}>KEEP WALKING</Text>
          </TouchableOpacity>
        </View>

        {/* COMMUNITY */}
        <View style={styles.communityCard}>
          <View style={styles.communityIcon}>
            <Text style={styles.communityEmoji}>🌍</Text>
          </View>

          <View style={styles.communityContent}>
            <Text style={styles.communityEyebrow}>CHALEGA COMMUNITY</Text>
            <Text style={styles.communityTitle}>
              You're not walking alone.
            </Text>
            <Text style={styles.communityText}>
              Join people taking small steps toward healthier lives.
            </Text>
          </View>
        </View>

        {/* COMPLETE */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            todayComplete && styles.completeButtonActive,
            walkMissionComplete && styles.completeButtonDone,
          ]}
          onPress={completeMission}
          activeOpacity={0.88}
        >
          <Text style={styles.completeButtonText}>
            {walkMissionComplete
              ? '✓ WALKING MISSION COMPLETE'
              : steps >= WALK_MISSION_GOAL
              ? 'CLAIM +40 POINTS'
              : 'KEEP WALKING →'}
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            CHALEGA
          </Text>

          <Text style={styles.footerTagline}>
            MOVE PEOPLE • LIVE HEALTHIER
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.cream,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
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
    borderWidth: 1,
    borderColor: '#E8E2D7',
  },

  backText: {
    color: BRAND.midnight,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '300',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerBrand: {
    color: BRAND.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.1,
  },

  headerTitle: {
    color: BRAND.midnight,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },

  pointsSmall: {
    minWidth: 64,
    height: 44,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E8E2D7',
  },

  pointsSmallEmoji: {
    fontSize: 15,
  },

  pointsSmallNumber: {
    color: BRAND.midnight,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 3,
  },

  heroCard: {
    backgroundColor: BRAND.teal,
    borderRadius: 27,
    padding: 23,
    shadowColor: BRAND.teal,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 5,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  heroEyebrow: {
    color: '#D7F7F1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 5,
  },

  heroSubtitle: {
    color: '#B9C1C8',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    maxWidth: 190,
  },

  heroGoalCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#F47B20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  heroGoalPercent: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },

  heroGoalLabel: {
    color: '#FFF1E6',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },

  heroStepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 22,
  },

  stepNumber: {
    color: '#FFFFFF',
    fontSize: 51,
    lineHeight: 57,
    fontWeight: '900',
  },

  stepLabel: {
    color: '#D7F7F1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },

  remainingPill: {
    backgroundColor: '#1C2B34',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 4,
  },

  goalCircleNumber: {
    color: BRAND.teal,
    fontSize: 23,
    fontWeight: '900',
  },

  goalCircleText: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  remainingPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  heroProgressBackground: {
    height: 11,
    borderRadius: 6,
    backgroundColor: '#25DDBB',
    marginTop: 18,
    overflow: 'hidden',
  },

  heroProgressFill: {
    height: '100%',
    backgroundColor: '#F47B20',
    borderRadius: 5,
  },

  heroProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  heroProgressText: {
    color: '#D7F7F1',
    fontSize: 10,
    fontWeight: '700',
  },

  trackButton: {
    height: 51,
    borderRadius: 15,
    backgroundColor: BRAND.midnight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 19,
  },

  trackButtonActive: {
    backgroundColor: '#FFFFFF',
  },

  trackButtonIcon: {
    color: '#101820',
    fontSize: 13,
    marginRight: 7,
  },

  trackButtonText: {
    color: '#101820',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  sensorStatus: {
    color: '#D7F7F1',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
  },

  webTestCard: {
    marginTop: 13,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E8E2D7',
  },

  webTestTitle: {
    color: '#101820',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },

  webTestRow: {
    flexDirection: 'row',
    gap: 8,
  },

  webTestButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: '#101820',
  },

  webTestButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
    textAlign: 'center',
  },

  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND.line,
  },

  missionCardComplete: {
    backgroundColor: '#F0F8F1',
    borderColor: '#CFE3D1',
  },

  missionIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#D7F7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  missionIconComplete: {
    backgroundColor: '#DCEEDD',
  },

  missionEmoji: {
    fontSize: 25,
  },

  missionContent: {
    flex: 1,
    paddingHorizontal: 13,
  },

  missionStatusLabel: {
    color: BRAND.teal,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  missionStatusTitle: {
    color: BRAND.midnight,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },

  eyebrow: {
    color: '#F47B20',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  missionTitle: {
    color: '#101820',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },

  missionText: {
    color: '#777777',
    fontSize: 10,
    marginTop: 3,
  },

  missionStatusCheck: {
    color: BRAND.teal,
    fontSize: 14,
    fontWeight: '900',
  },

  missionArrow: {
    color: '#101820',
    fontSize: 12,
    fontWeight: '900',
  },

  sectionTitle: {
    color: BRAND.midnight,
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
    borderWidth: 1,
    borderColor: '#E5DED2',
  },

  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  statIconBlue: {
    backgroundColor: BRAND.teal,
  },

  statIconOrange: {
    backgroundColor: BRAND.orange,
  },

  statIconGreen: {
    backgroundColor: BRAND.green,
  },

  statIconEmoji: {
    fontSize: 23,
  },

  statNumber: {
    color: BRAND.midnight,
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
    color: '#999999',
    fontSize: 9,
    marginTop: 7,
    textAlign: 'center',
  },

  weekCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5DED2',
  },

  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  weekTitle: {
    color: BRAND.midnight,
    fontSize: 15,
    fontWeight: '900',
  },

  weekSubtitle: {
    color: '#888888',
    fontSize: 10,
    marginTop: 3,
  },

  weekStreakPill: {
    backgroundColor: '#FFF3D9',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  weekStreak: {
    color: BRAND.midnight,
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
    backgroundColor: '#EAF0F2',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  dayBarFill: {
    width: '100%',
    backgroundColor: BRAND.teal,
    borderRadius: 9,
  },

  dayLabel: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 7,
  },

  dayLabelToday: {
    color: BRAND.teal,
  },

  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.teal,
    marginTop: 3,
  },

  weekBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEE9E0',
    paddingTop: 13,
    marginTop: 15,
  },

  weekBottomText: {
    color: '#888888',
    fontSize: 10,
  },

  changeGoal: {
    color: BRAND.teal,
    fontSize: 9,
    fontWeight: '900',
  },

  streakCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 22,
    padding: 18,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1DFC0',
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
    color: BRAND.midnight,
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
    backgroundColor: BRAND.midnight,
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
    color: '#9FAAB2',
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
    backgroundColor: '#F47B20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  levelBadgeText: {
    color: BRAND.midnight,
    fontSize: 20,
    fontWeight: '900',
  },

  levelProgressBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D3A42',
    marginTop: 17,
    overflow: 'hidden',
  },

  levelProgressFill: {
    height: '100%',
    backgroundColor: '#F47B20',
    borderRadius: 4,
  },

  levelBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  levelText: {
    color: '#9FAAB2',
    fontSize: 9,
    fontWeight: '700',
  },

  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5DED2',
  },

  challengeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  challengeIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  challengeEmoji: {
    fontSize: 27,
  },

  challengeTopText: {
    flex: 1,
    paddingLeft: 13,
  },

  challengeTitle: {
    color: BRAND.midnight,
    fontSize: 19,
    fontWeight: '900',
  },

  challengeText: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  challengeProgressBackground: {
    height: 9,
    backgroundColor: '#F0ECE4',
    borderRadius: 5,
    marginTop: 17,
    overflow: 'hidden',
  },

  challengeProgressFill: {
    width: '63%',
    height: '100%',
    backgroundColor: BRAND.teal,
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
    backgroundColor: BRAND.midnight,
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
    backgroundColor: '#D7F7F1',
    borderRadius: 22,
    padding: 19,
    marginTop: 15,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D5E4D7',
  },

  communityIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  communityEmoji: {
    fontSize: 28,
  },

  communityContent: {
    flex: 1,
    paddingLeft: 12,
  },

  communityEyebrow: {
    color: BRAND.teal,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  communityTitle: {
    color: BRAND.midnight,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },

  communityText: {
    color: '#68736B',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  completeButton: {
    backgroundColor: BRAND.midnight,
    borderRadius: 17,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  completeButtonActive: {
    backgroundColor: BRAND.teal,
  },

  completeButtonDone: {
    backgroundColor: BRAND.green,
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
    color: BRAND.teal,
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
