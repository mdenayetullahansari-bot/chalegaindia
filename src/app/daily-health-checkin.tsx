import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

type Option<T extends string | number> = {
  value: T;
  label: string;
  emoji?: string;
};

type CheckInData = {
  mood: string;
  water: number;
  activity: string;
  sleep: string;
  completedAt: string;
  healthScore?: number;
  steps?: number;
  goal?: number;
  streak?: number;
};

const moodOptions: Option<string>[] = [
  { value: 'great', label: 'Great', emoji: '😄' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'care', label: 'Need a little care', emoji: '💙' },
];

const waterOptions: Option<number>[] = [
  { value: 0, label: '0', emoji: '💧' },
  { value: 2, label: '2', emoji: '💧' },
  { value: 4, label: '4', emoji: '💧' },
  { value: 6, label: '6', emoji: '💧' },
  { value: 8, label: '8', emoji: '💧' },
];

const activityOptions: Option<string>[] = [
  { value: 'walked', label: 'Walked today', emoji: '🚶' },
  { value: 'movement', label: 'Some movement', emoji: '🏃' },
  { value: 'not-yet', label: 'Not yet', emoji: '🌱' },
];

const sleepOptions: Option<string>[] = [
  { value: 'good', label: 'Good', emoji: '😴' },
  { value: 'okay', label: 'Okay', emoji: '🙂' },
  { value: 'not-enough', label: 'Not enough', emoji: '🥱' },
];

export default function DailyHealthCheckIn() {
  const router = useRouter();

  const [mood, setMood] = useState<string | null>(null);
  const [water, setWater] = useState<number | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [sleep, setSleep] = useState<string | null>(null);

  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(4000);
  const [streak, setStreak] = useState(0);

  const [completed, setCompleted] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const todayKey = useMemo(
    () => getLocalDateKey(),
    []
  );

  useEffect(() => {
    loadTodayCheckIn();
  }, [todayKey]);

  const calculateHealthScore = (
    currentSteps: number,
    currentGoal: number,
    currentStreak: number,
    currentMood: string,
    currentWater: number,
    currentActivity: string,
    currentSleep: string
  ) => {
    const stepProgress =
      currentGoal > 0
        ? Math.min(currentSteps / currentGoal, 1)
        : 0;

    const waterProgress = Math.min(
      currentWater / 8,
      1
    );

    const walkingScore = Math.round(
      stepProgress * 30
    );

    const hydrationScore = Math.round(
      waterProgress * 20
    );

    const moodScore =
      currentMood === 'great'
        ? 15
        : currentMood === 'good'
        ? 13
        : currentMood === 'okay'
        ? 9
        : currentMood === 'care'
        ? 6
        : 0;

    const activityScore =
      currentActivity === 'walked'
        ? 15
        : currentActivity === 'movement'
        ? 11
        : currentActivity === 'not-yet'
        ? 3
        : 0;

    const sleepScore =
      currentSleep === 'good'
        ? 10
        : currentSleep === 'okay'
        ? 7
        : currentSleep === 'not-enough'
        ? 4
        : 0;

    const streakScore = Math.min(
      currentStreak,
      5
    );

    const checkInScore = 5;

    return Math.min(
      100,
      walkingScore +
        hydrationScore +
        moodScore +
        activityScore +
        sleepScore +
        streakScore +
        checkInScore
    );
  };

  const loadTodayCheckIn = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in to save your daily health check-in.'
        );
        return;
      }

      const [checkInResult, stepsResult, profileResult] =
        await Promise.all([
          supabase
            .from('daily_health_checkins')
            .select(
              'mood, water, activity, sleep, health_score, steps, goal, streak, completed_at'
            )
            .eq('user_id', user.id)
            .eq('checkin_date', todayKey)
            .maybeSingle(),

          supabase
            .from('daily_steps')
            .select('step_date, steps')
            .eq('user_id', user.id)
            .lte('step_date', todayKey)
            .gte(
              'step_date',
              (() => {
                const date = new Date(`${todayKey}T00:00:00`);
                date.setDate(date.getDate() - 30);
                return `${date.getFullYear()}-${String(
                  date.getMonth() + 1
                ).padStart(2, '0')}-${String(date.getDate()).padStart(
                  2,
                  '0'
                )}`;
              })()
            )
            .order('step_date', { ascending: false }),

          supabase
            .from('profiles')
            .select('daily_step_goal')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

      if (checkInResult.error) {
        throw checkInResult.error;
      }

      if (stepsResult.error) {
        throw stepsResult.error;
      }

      if (profileResult.error) {
        throw profileResult.error;
      }

      const stepRows = stepsResult.data ?? [];

      const todayStepsRow = stepRows.find(
        row => row.step_date === todayKey
      );

      const currentSteps =
        typeof todayStepsRow?.steps === 'number'
          ? Math.max(0, todayStepsRow.steps)
          : 0;

      const profileGoal =
        typeof profileResult.data?.daily_step_goal === 'number' &&
        profileResult.data.daily_step_goal > 0
          ? profileResult.data.daily_step_goal
          : 4000;

      let currentStreak = 0;
      let expectedDate = todayKey;

      for (const row of stepRows) {
        if (row.step_date !== expectedDate) {
          break;
        }

        if (
          typeof row.steps !== 'number' ||
          row.steps <= 0
        ) {
          break;
        }

        currentStreak += 1;

        const date = new Date(`${expectedDate}T00:00:00`);
        date.setDate(date.getDate() - 1);
        expectedDate = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${String(date.getDate()).padStart(
          2,
          '0'
        )}`;
      }

      setSteps(currentSteps);
      setGoal(profileGoal);
      setStreak(currentStreak);

      const saved = checkInResult.data;

      if (!saved) {
        return;
      }

      setMood(saved.mood);
      setWater(saved.water);
      setActivity(saved.activity);
      setSleep(saved.sleep);

      const savedSteps =
        typeof saved.steps === 'number'
          ? Math.max(0, saved.steps)
          : currentSteps;

      const savedGoal =
        typeof saved.goal === 'number' && saved.goal > 0
          ? saved.goal
          : profileGoal;

      const savedStreak =
        typeof saved.streak === 'number'
          ? Math.max(0, saved.streak)
          : currentStreak;

      setSteps(savedSteps);
      setGoal(savedGoal);
      setStreak(savedStreak);
      setCompleted(true);

      if (typeof saved.health_score === 'number') {
        setSavedScore(saved.health_score);
      } else {
        setSavedScore(
          calculateHealthScore(
            savedSteps,
            savedGoal,
            savedStreak,
            saved.mood,
            typeof saved.water === 'number'
              ? Math.max(0, saved.water)
              : 0,
            saved.activity,
            saved.sleep
          )
        );
      }
    } catch (error) {
      console.log(
        'Failed to load health check-in:',
        error
      );
    }
  };

  const completeCheckIn = async () => {
    if (
      !mood ||
      water === null ||
      !activity ||
      !sleep
    ) {
      Alert.alert(
        'Complete your check-in',
        'Please answer all four questions before submitting.'
      );
      return;
    }

    if (completed) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in to save your daily health check-in.'
        );
        return;
      }

      const { data: stepsRows, error: stepsError } =
        await supabase
          .from('daily_steps')
          .select('step_date, steps')
          .eq('user_id', user.id)
          .lte('step_date', todayKey)
          .order('step_date', { ascending: false })
          .limit(31);

      if (stepsError) {
        throw stepsError;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('daily_step_goal')
          .eq('id', user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const currentStepsRow = (stepsRows ?? []).find(
        row => row.step_date === todayKey
      );

      const currentSteps =
        typeof currentStepsRow?.steps === 'number'
          ? Math.max(0, currentStepsRow.steps)
          : steps;

      const currentGoal =
        typeof profile?.daily_step_goal === 'number' &&
        profile.daily_step_goal > 0
          ? profile.daily_step_goal
          : goal;

      let currentStreak = 0;
      let expectedDate = todayKey;

      for (const row of stepsRows ?? []) {
        if (row.step_date !== expectedDate) {
          break;
        }

        if (
          typeof row.steps !== 'number' ||
          row.steps <= 0
        ) {
          break;
        }

        currentStreak += 1;

        const date = new Date(`${expectedDate}T00:00:00`);
        date.setDate(date.getDate() - 1);
        expectedDate = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${String(date.getDate()).padStart(
          2,
          '0'
        )}`;
      }

      const healthScore =
        calculateHealthScore(
          currentSteps,
          currentGoal,
          currentStreak,
          mood,
          water,
          activity,
          sleep
        );

      const { error: saveError } = await supabase
        .from('daily_health_checkins')
        .upsert(
          {
            user_id: user.id,
            checkin_date: todayKey,
            mood,
            water,
            activity,
            sleep,
            health_score: healthScore,
            steps: currentSteps,
            goal: currentGoal,
            streak: currentStreak,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,checkin_date',
          }
        );

      if (saveError) {
        throw saveError;
      }

      const { data: rewardResult, error: rewardError } = await supabase.rpc(
        'award_health_checkin_reward',
        {
          p_checkin_date: todayKey,
        }
      );

      if (rewardError) {
        throw rewardError;
      }

      const result = {
        awarded: rewardResult?.already_awarded !== true,
        balance: Number(rewardResult?.balance ?? 0),
      };

      setSteps(currentSteps);
      setGoal(currentGoal);
      setStreak(currentStreak);
      setSavedScore(healthScore);
      setCompleted(true);

      if (result.awarded) {
        Alert.alert(
          '❤️ Health Check-in Complete!',
          `+10 Chalega Points\n\nToday's wellness score is ${healthScore}/100.\n\nYour check-in has been saved for your Health History.`
        );
      } else {
        Alert.alert(
          '❤️ Check-in Complete',
          `Today's wellness score is ${healthScore}/100.\n\nYour check-in has been saved. You have already received today's points.`
        );
      }
    } catch (error) {
      console.log(
        'Failed to save health check-in:',
        error
      );

      Alert.alert(
        'Something went wrong',
        'Your check-in could not be saved. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderOptions = <
    T extends string | number
  >(
    options: Option<T>[],
    selected: T | null,
    onSelect: (value: T) => void,
    disabled = false
  ) => (
    <View style={styles.optionsWrap}>
      {options.map(option => {
        const selectedOption =
          selected === option.value;

        return (
          <TouchableOpacity
            key={String(option.value)}
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() =>
              onSelect(option.value)
            }
            style={[
              styles.option,
              selectedOption &&
                styles.optionSelected,
              disabled &&
                styles.optionDisabled,
            ]}
          >
            {option.emoji ? (
              <Text style={styles.optionEmoji}>
                {option.emoji}
              </Text>
            ) : null}

            <Text
              style={[
                styles.optionText,
                selectedOption &&
                  styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>

            {selectedOption ? (
              <View style={styles.checkCircle}>
                <Text style={styles.checkText}>
                  ✓
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>
              CHALEGA INDIA • DAILY WELLNESS
            </Text>

            <Text style={styles.title}>
              Daily Health Check-in
            </Text>

            <Text style={styles.subtitle}>
              Take 30 seconds to check in with yourself.
            </Text>
          </View>
        </View>

        {completed ? (
          <View style={styles.completedCard}>
            <View style={styles.completedIcon}>
              <Text style={styles.completedIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.completedContent}>
              <Text style={styles.completedTitle}>
                Today’s check-in is complete
              </Text>

              <Text style={styles.completedText}>
                Your wellness answers and today’s health snapshot have been saved.
              </Text>

              {savedScore !== null ? (
                <Text style={styles.scoreSnapshot}>
                  TODAY’S SCORE • {savedScore}/100
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>
            ❤️
          </Text>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              How are you doing today?
            </Text>

            <Text style={styles.introText}>
              There are no right or wrong answers. This is simply a quick daily reflection.
            </Text>
          </View>
        </View>

        <View style={styles.snapshotCard}>
          <View style={styles.snapshotHeader}>
            <View>
              <Text style={styles.snapshotEyebrow}>
                TODAY’S SNAPSHOT
              </Text>

              <Text style={styles.snapshotTitle}>
                Your activity so far
              </Text>
            </View>

            <View style={styles.snapshotScore}>
              <Text style={styles.snapshotScoreText}>
                {savedScore ?? '—'}
              </Text>
            </View>
          </View>

          <View style={styles.snapshotRow}>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>
                STEPS
              </Text>

              <Text style={styles.snapshotValue}>
                {steps.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.snapshotDivider} />

            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>
                GOAL
              </Text>

              <Text style={styles.snapshotValue}>
                {goal.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.snapshotDivider} />

            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>
                STREAK
              </Text>

              <Text style={styles.snapshotValue}>
                {streak}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>
              1
            </Text>
          </View>

          <Text style={styles.question}>
            How are you feeling today?
          </Text>

          {renderOptions(
            moodOptions,
            mood,
            setMood,
            completed
          )}
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>
              2
            </Text>
          </View>

          <Text style={styles.question}>
            How much water have you had today?
          </Text>

          <Text style={styles.questionHint}>
            Choose the number of glasses so far.
          </Text>

          {renderOptions(
            waterOptions,
            water,
            setWater,
            completed
          )}
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>
              3
            </Text>
          </View>

          <Text style={styles.question}>
            How active have you been today?
          </Text>

          {renderOptions(
            activityOptions,
            activity,
            setActivity,
            completed
          )}
        </View>

        <View style={styles.questionCard}>
          <View style={styles.questionNumber}>
            <Text style={styles.questionNumberText}>
              4
            </Text>
          </View>

          <Text style={styles.question}>
            How was your sleep?
          </Text>

          {renderOptions(
            sleepOptions,
            sleep,
            setSleep,
            completed
          )}
        </View>

        {!completed ? (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={completeCheckIn}
            style={[
              styles.submitButton,
              saving &&
                styles.submitButtonDisabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {saving
                ? 'SAVING...'
                : 'COMPLETE CHECK-IN • +10 POINTS'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.doneButton}>
            <Text style={styles.doneButtonText}>
              ✓ CHECK-IN COMPLETED TODAY
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            router.replace('/explore')
          }
          style={styles.dashboardButton}
        >
          <Text style={styles.dashboardButtonText}>
            ← BACK TO HEALTH
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          This check-in is for everyday wellness tracking and is not a medical diagnosis.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#071522',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: '#0B1F33',
    marginTop: -3,
  },

  headerTextWrap: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#2FA84F',
    marginBottom: 5,
  },

  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0B1F33',
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7785',
  },

  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1F33',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },

  introEmoji: {
    fontSize: 30,
    marginRight: 14,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },

  introText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#D9E4EF',
  },

  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
    borderWidth: 1,
    borderColor: '#BDE3C8',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  completedIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#2FA84F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  completedIconText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  completedContent: {
    flex: 1,
  },

  completedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#17662D',
    marginBottom: 3,
  },

  completedText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#39734A',
  },

  scoreSnapshot: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '900',
    color: '#2FA84F',
    marginTop: 6,
    letterSpacing: 0.7,
  },

  snapshotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E8ED',
    padding: 16,
    marginBottom: 16,
  },

  snapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  snapshotEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#2FA84F',
  },

  snapshotTitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '900',
    color: '#0B1F33',
  },

  snapshotScore: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#1D6FF2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  snapshotScoreText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  snapshotItem: {
    flex: 1,
  },

  snapshotLabel: {
    color: '#7A8793',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  snapshotValue: {
    color: '#0B1F33',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },

  snapshotDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E4E8ED',
    marginHorizontal: 12,
  },

  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
    shadowColor: '#071522',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  questionNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  questionNumberText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F47B20',
  },

  question: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    color: '#0B1F33',
  },

  questionHint: {
    fontSize: 12,
    color: '#7A8793',
    marginTop: 4,
  },

  optionsWrap: {
    marginTop: 13,
    gap: 9,
  },

  option: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E4E8ED',
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  optionSelected: {
    borderColor: '#1D6FF2',
    backgroundColor: '#EEF5FF',
  },

  optionDisabled: {
    opacity: 0.92,
  },

  optionEmoji: {
    fontSize: 21,
    width: 32,
  },

  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#344454',
  },

  optionTextSelected: {
    color: '#1559C5',
    fontWeight: '900',
  },

  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1D6FF2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  submitButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#1D6FF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#071522',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  doneButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#2FA84F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  dashboardButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE2E8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  dashboardButtonText: {
    color: '#0B1F33',
    fontSize: 13,
    fontWeight: '900',
  },

  disclaimer: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: '#89939D',
    marginTop: 18,
    paddingHorizontal: 15,
  },
});