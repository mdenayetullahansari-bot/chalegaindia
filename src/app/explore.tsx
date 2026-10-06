import { BRAND } from '@/lib/brand';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getStreakFromSteps = (
  rows: Array<{ step_date: string; steps: number | null }>,
  today: string,
) => {
  const stepsByDate = new Map<string, number>();

  for (const row of rows) {
    stepsByDate.set(row.step_date, Math.max(0, Number(row.steps) || 0));
  }

  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);

  while (true) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if ((stepsByDate.get(dateKey) ?? 0) <= 0) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const HEALTH_TOPICS = [
  {
    icon: '❤️',
    title: 'Heart Health',
    description: 'Simple habits for a stronger heart.',
    color: BRAND.orange,
    light: BRAND.orangeLight,
    topic: 'Heart',
  },
  {
    icon: '💧',
    title: 'Hydration',
    description: 'Keep your body refreshed and active.',
    color: BRAND.teal,
    light: BRAND.greenLight,
    topic: 'Water',
  },
  {
    icon: '🥗',
    title: 'Healthy Diet',
    description: 'Better food choices, one meal at a time.',
    color: BRAND.green,
    light: BRAND.greenLight,
    topic: 'Diet',
  },
  {
    icon: '🚶',
    title: 'Daily Walking',
    description: 'Move more and build your walking habit.',
    color: BRAND.teal,
    light: BRAND.greenLight,
    topic: 'Walking',
  },
  {
    icon: '😴',
    title: 'Better Sleep',
    description: 'Good rest helps your body recover.',
    color: BRAND.teal,
    light: BRAND.greenLight,
    topic: 'Sleep',
  },
  {
    icon: '🧠',
    title: 'Mind & Mood',
    description: 'Take care of your mental wellbeing.',
    color: BRAND.orange,
    light: BRAND.orangeLight,
    topic: 'Mind',
  },
];

const HEALTHY_HABITS = [
  {
    icon: '🚶',
    title: 'Walk every day',
    description: 'Aim for your daily step goal.',
  },
  {
    icon: '💧',
    title: 'Drink more water',
    description: 'Keep hydration part of your routine.',
  },
  {
    icon: '😴',
    title: 'Protect your sleep',
    description: 'Give your body time to recover.',
  },
];

export default function ExploreScreen() {
  const router = useRouter();

  const [water, setWater] = useState(0);
  const [mood, setMood] = useState('');
  const [activity, setActivity] = useState('');
  const [sleep, setSleep] = useState('');
  const [lastCheckInDate, setLastCheckInDate] = useState('');

  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(4000);
  const [streak, setStreak] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const todayKey = getLocalDateKey();
  const checkInCompletedToday = lastCheckInDate === todayKey;

  const loadHealthData = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setWater(0);
        setMood('');
        setActivity('');
        setSleep('');
        setLastCheckInDate('');
        setSteps(0);
        setGoal(4000);
        setStreak(0);
        return;
      }

      const [{ data: checkIn, error: checkInError }, { data: stepRows, error: stepsError }, { data: profile, error: profileError }] =
        await Promise.all([
          supabase
            .from('daily_health_checkins')
            .select('checkin_date, mood, water, activity, sleep')
            .eq('user_id', user.id)
            .eq('checkin_date', todayKey)
            .maybeSingle(),
          supabase
            .from('daily_steps')
            .select('step_date, steps')
            .eq('user_id', user.id)
            .gte(
              'step_date',
              (() => {
                const date = new Date(`${todayKey}T00:00:00`);
                date.setDate(date.getDate() - 30);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              })(),
            )
            .lte('step_date', todayKey)
            .order('step_date', { ascending: false }),
          supabase
            .from('profiles')
            .select('daily_step_goal')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

      if (checkInError) {
        throw checkInError;
      }

      if (stepsError) {
        throw stepsError;
      }

      if (profileError) {
        throw profileError;
      }

      const todaySteps =
        (stepRows ?? []).find(row => row.step_date === todayKey)?.steps ?? 0;

      const dailyGoal =
        typeof profile?.daily_step_goal === 'number' &&
        profile.daily_step_goal > 0
          ? profile.daily_step_goal
          : 4000;

      const calculatedStreak = getStreakFromSteps(
        (stepRows ?? []).map(row => ({
          step_date: row.step_date,
          steps: row.steps,
        })),
        todayKey,
      );

      setSteps(Math.max(0, Number(todaySteps) || 0));
      setGoal(dailyGoal);
      setStreak(calculatedStreak);

      if (checkIn) {
        setWater(Math.max(0, Number(checkIn.water) || 0));
        setMood(typeof checkIn.mood === 'string' ? checkIn.mood : '');
        setActivity(
          typeof checkIn.activity === 'string' ? checkIn.activity : '',
        );
        setSleep(typeof checkIn.sleep === 'string' ? checkIn.sleep : '');
        setLastCheckInDate(checkIn.checkin_date);
      } else {
        setWater(0);
        setMood('');
        setActivity('');
        setSleep('');
        setLastCheckInDate('');
      }
    } catch (error) {
      console.log('Could not load health dashboard data:', error);
    }
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      loadHealthData();
    }, [loadHealthData]),
  );

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const onRefresh = async () => {
    setRefreshing(true);

    await loadHealthData();

    setRefreshing(false);
  };

  const openHealthCheckIn = () => {
    router.push('/daily-health-checkin');
  };

  const openHealthTopic = (topic: string) => {
    router.push({
      pathname: '/health-topic',
      params: {
        topic,
      },
    });
  };

  const openWalking = () => {
    router.push('/walking');
  };

  /*
   * ----------------------------------------------------
   * DYNAMIC HEALTH SCORE
   * ----------------------------------------------------
   *
   * Walking       30 points
   * Hydration     20 points
   * Mood          15 points
   * Activity      15 points
   * Sleep         10 points
   * Streak         5 points
   * Check-in       5 points
   *
   * Total = 100
   */

  const stepProgress =
    goal > 0
      ? Math.min(steps / goal, 1)
      : 0;

  const waterProgress =
    Math.min(water / 8, 1);

  const walkingScore = Math.round(
    stepProgress * 30,
  );

  const hydrationScore = Math.round(
    waterProgress * 20,
  );

  const moodScore =
    mood === 'great'
      ? 15
      : mood === 'good'
      ? 13
      : mood === 'okay'
      ? 9
      : mood === 'care'
      ? 6
      : 0;

  const activityScore =
    activity === 'walked'
      ? 15
      : activity === 'movement'
      ? 11
      : activity === 'not-yet'
      ? 3
      : 0;

  const sleepScore =
    sleep === 'good'
      ? 10
      : sleep === 'okay'
      ? 7
      : sleep === 'not-enough'
      ? 4
      : 0;

  const streakScore = Math.min(
    streak,
    5,
  );

  const checkInScore =
    checkInCompletedToday
      ? 5
      : 0;

  const healthScore = Math.min(
    100,
    walkingScore +
      hydrationScore +
      moodScore +
      activityScore +
      sleepScore +
      streakScore +
      checkInScore,
  );

  const scoreMessage =
    healthScore >= 90
      ? 'Outstanding! You are building a great healthy routine.'
      : healthScore >= 80
      ? 'Excellent work. Keep your healthy routine going!'
      : healthScore >= 65
      ? 'Good progress. A few small habits can make it even better.'
      : healthScore >= 45
      ? 'You are moving in the right direction. Keep building your habits.'
      : 'Every healthy choice counts. Start with one small step today.';

  const scoreBreakdown = [
    {
      label: 'Walking',
      value: walkingScore,
      max: 30,
    },
    {
      label: 'Hydration',
      value: hydrationScore,
      max: 20,
    },
    {
      label: 'Mood',
      value: moodScore,
      max: 15,
    },
    {
      label: 'Activity',
      value: activityScore,
      max: 15,
    },
    {
      label: 'Sleep',
      value: sleepScore,
      max: 10,
    },
    {
      label: 'Streak',
      value: streakScore,
      max: 5,
    },
    {
      label: 'Check-in',
      value: checkInScore,
      max: 5,
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              CHALIGA KOLKATA
            </Text>

            <Text style={styles.title}>
              Your Health.
              {'\n'}
              Your Journey.
            </Text>

            <Text style={styles.subtitle}>
              Small daily choices. A healthier you.
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>
              ❤️
            </Text>
          </View>
        </View>

        {/* HEALTH SCORE */}

        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <View style={styles.scoreMessageWrap}>
              <Text style={styles.scoreEyebrow}>
                TODAY'S HEALTH SCORE
              </Text>

              <Text style={styles.scoreTitle}>
                {scoreMessage}
              </Text>
            </View>

            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>
                {healthScore}
              </Text>

              <Text style={styles.scoreOutOf}>
                /100
              </Text>
            </View>
          </View>

          <View style={styles.scoreTrack}>
            <View
              style={[
                styles.scoreFill,
                {
                  width: `${healthScore}%`,
                },
              ]}
            />
          </View>

          <View style={styles.scoreFooter}>
            <Text style={styles.scoreFooterText}>
              WALKING
            </Text>

            <Text style={styles.scoreFooterValue}>
              {steps.toLocaleString('en-IN')} steps
            </Text>

            <Text style={styles.scoreFooterDivider}>
              •
            </Text>

            <Text style={styles.scoreFooterText}>
              HYDRATION
            </Text>

            <Text style={styles.scoreFooterValue}>
              {water}/8 glasses
            </Text>
          </View>
        </View>

        {/* SCORE BREAKDOWN */}

        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <View>
              <Text style={styles.breakdownEyebrow}>
                SCORE BREAKDOWN
              </Text>

              <Text style={styles.breakdownTitle}>
                What's driving your score?
              </Text>
            </View>

            <View style={styles.breakdownBadge}>
              <Text style={styles.breakdownBadgeText}>
                {healthScore}/100
              </Text>
            </View>
          </View>

          <View style={styles.breakdownGrid}>
            {scoreBreakdown.map(item => (
              <View
                key={item.label}
                style={styles.breakdownItem}
              >
                <View style={styles.breakdownItemTop}>
                  <Text style={styles.breakdownItemLabel}>
                    {item.label}
                  </Text>

                  <Text style={styles.breakdownItemValue}>
                    {item.value}/{item.max}
                  </Text>
                </View>

                <View style={styles.breakdownTrack}>
                  <View
                    style={[
                      styles.breakdownFill,
                      {
                        width: `${Math.round(
                          (item.value / item.max) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* LIVE STATS */}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statBlue,
              ]}
            >
              <Text style={styles.statIconText}>
                🚶
              </Text>
            </View>

            <Text style={styles.statLabel}>
              WALKING
            </Text>

            <Text style={styles.statValue}>
              {steps.toLocaleString('en-IN')}
            </Text>

            <Text style={styles.statSmall}>
              of {goal.toLocaleString('en-IN')} goal
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statGreen,
              ]}
            >
              <Text style={styles.statIconText}>
                💧
              </Text>
            </View>

            <Text style={styles.statLabel}>
              HYDRATION
            </Text>

            <Text style={styles.statValue}>
              {water}/8
            </Text>

            <Text style={styles.statSmall}>
              glasses today
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                styles.statOrange,
              ]}
            >
              <Text style={styles.statIconText}>
                🔥
              </Text>
            </View>

            <Text style={styles.statLabel}>
              STREAK
            </Text>

            <Text style={styles.statValue}>
              {streak}
            </Text>

            <Text style={styles.statSmall}>
              days active
            </Text>
          </View>
        </View>

        {/* DAILY CHECK-IN */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              DAILY ROUTINE
            </Text>

            <Text style={styles.sectionTitle}>
              Check in with yourself.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.checkinCard,
            checkInCompletedToday &&
              styles.checkinCardCompleted,
          ]}
          activeOpacity={0.88}
          onPress={openHealthCheckIn}
        >
          <View
            style={[
              styles.checkinIcon,
              checkInCompletedToday &&
                styles.checkinIconCompleted,
            ]}
          >
            <Text style={styles.checkinIconText}>
              {checkInCompletedToday ? '✓' : '❤️'}
            </Text>
          </View>

          <View style={styles.checkinBody}>
            <Text style={styles.checkinEyebrow}>
              DAILY HEALTH CHECK-IN
            </Text>

            <Text style={styles.checkinTitle}>
              {checkInCompletedToday
                ? "Today's check-in is complete"
                : 'How are you feeling today?'}
            </Text>

            <Text style={styles.checkinDescription}>
              {checkInCompletedToday
                ? 'Your mood, water, activity and sleep answers are saved for today.'
                : 'Take 30 seconds to check in with your mood, water, activity and sleep.'}
            </Text>

            <View
              style={[
                styles.checkinButton,
                checkInCompletedToday &&
                  styles.checkinButtonCompleted,
              ]}
            >
              <Text style={styles.checkinButtonText}>
                {checkInCompletedToday
                  ? 'VIEW TODAY’S CHECK-IN'
                  : 'START CHECK-IN'}
              </Text>

              <Text style={styles.checkinArrow}>
                →
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* HEALTH TOPICS */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              EXPLORE
            </Text>

            <Text style={styles.sectionTitle}>
              Health topics.
            </Text>
          </View>

          <Text style={styles.topicCount}>
            6 TOPICS
          </Text>
        </View>

        <View style={styles.topicGrid}>
          {HEALTH_TOPICS.map(topic => (
            <TouchableOpacity
              key={topic.topic}
              style={styles.topicCard}
              activeOpacity={0.86}
              onPress={() =>
                openHealthTopic(topic.topic)
              }
            >
              <View
                style={[
                  styles.topicIcon,
                  {
                    backgroundColor: topic.light,
                  },
                ]}
              >
                <Text style={styles.topicIconText}>
                  {topic.icon}
                </Text>
              </View>

              <Text style={styles.topicTitle}>
                {topic.title}
              </Text>

              <Text style={styles.topicDescription}>
                {topic.description}
              </Text>

              <View style={styles.topicBottom}>
                <Text
                  style={[
                    styles.topicLearn,
                    {
                      color: topic.color,
                    },
                  ]}
                >
                  LEARN
                </Text>

                <Text
                  style={[
                    styles.topicArrow,
                    {
                      color: topic.color,
                    },
                  ]}
                >
                  →
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* HEALTHY HABITS */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              SIMPLE HABITS
            </Text>

            <Text style={styles.sectionTitle}>
              Build a healthier day.
            </Text>
          </View>
        </View>

        <View style={styles.habitsCard}>
          {HEALTHY_HABITS.map((habit, index) => (
            <View
              key={habit.title}
              style={[
                styles.habitRow,
                index !== HEALTHY_HABITS.length - 1 &&
                  styles.habitBorder,
              ]}
            >
              <View style={styles.habitIcon}>
                <Text style={styles.habitIconText}>
                  {habit.icon}
                </Text>
              </View>

              <View style={styles.habitBody}>
                <Text style={styles.habitTitle}>
                  {habit.title}
                </Text>

                <Text style={styles.habitDescription}>
                  {habit.description}
                </Text>
              </View>

              <Text style={styles.habitCheck}>
                ✓
              </Text>
            </View>
          ))}
        </View>

        {/* WALKING CTA */}

        <TouchableOpacity
          style={styles.walkingCard}
          activeOpacity={0.88}
          onPress={openWalking}
        >
          <View style={styles.walkingIcon}>
            <Text style={styles.walkingIconText}>
              🚶
            </Text>
          </View>

          <View style={styles.walkingBody}>
            <Text style={styles.walkingEyebrow}>
              KEEP MOVING
            </Text>

            <Text style={styles.walkingTitle}>
              Your next healthy step starts now.
            </Text>

            <Text style={styles.walkingDescription}>
              {steps >= goal
                ? 'Daily walking goal complete. Amazing work!'
                : `${Math.max(
                    goal - steps,
                    0
                  ).toLocaleString(
                    'en-IN'
                  )} more steps to reach today's goal.`}
            </Text>
          </View>

          <Text style={styles.walkingArrow}>
            →
          </Text>
        </TouchableOpacity>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            CHALIGA KOLKATA
          </Text>

          <Text style={styles.footerTagline}>
            WALK • EARN • IMPROVE • REPEAT
          </Text>

          <Text style={styles.footerMessage}>
            Your health journey belongs to you.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND.cream,
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 45,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    color: BRAND.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: BRAND.midnight,
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 8,
  },

  subtitle: {
    color: '#6B7785',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 9,
  },

  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: BRAND.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE1CC',
  },

  headerIconText: {
    fontSize: 29,
  },

  scoreCard: {
    backgroundColor: BRAND.midnight,
    borderRadius: 26,
    padding: 21,
    marginBottom: 15,
  },

  scoreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scoreMessageWrap: {
    flex: 1,
    paddingRight: 10,
  },

  scoreEyebrow: {
    color: '#8BD7C9',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  scoreTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    marginTop: 7,
    maxWidth: 225,
  },

  scoreCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: BRAND.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '900',
  },

  scoreOutOf: {
    color: '#C9F5EC',
    fontSize: 9,
    fontWeight: '800',
    marginTop: -1,
  },

  scoreTrack: {
    height: 8,
    backgroundColor: '#12395A',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 20,
  },

  scoreFill: {
    height: '100%',
    backgroundColor: BRAND.green,
    borderRadius: 8,
  },

  scoreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 13,
  },

  scoreFooterText: {
    color: '#8BD7C9',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  scoreFooterValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 5,
  },

  scoreFooterDivider: {
    color: '#5C748A',
    marginHorizontal: 8,
    fontSize: 10,
  },

  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E4E8ED',
    padding: 17,
    marginBottom: 18,
  },

  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  breakdownEyebrow: {
    color: BRAND.green,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  breakdownTitle: {
    color: BRAND.midnight,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },

  breakdownBadge: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  breakdownBadgeText: {
    color: '#17662D',
    fontSize: 10,
    fontWeight: '900',
  },

  breakdownGrid: {
    gap: 10,
  },

  breakdownItem: {
    width: '100%',
  },

  breakdownItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },

  breakdownItemLabel: {
    color: '#43515F',
    fontSize: 10,
    fontWeight: '800',
  },

  breakdownItemValue: {
    color: BRAND.midnight,
    fontSize: 10,
    fontWeight: '900',
  },

  breakdownTrack: {
    height: 6,
    backgroundColor: '#EEF1F4',
    borderRadius: 6,
    overflow: 'hidden',
  },

  breakdownFill: {
    height: '100%',
    backgroundColor: BRAND.green,
    borderRadius: 6,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  statCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E4E8ED',
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  statBlue: {
    backgroundColor: BRAND.greenLight,
  },

  statGreen: {
    backgroundColor: BRAND.greenLight,
  },

  statOrange: {
    backgroundColor: BRAND.orangeLight,
  },

  statIconText: {
    fontSize: 19,
  },

  statLabel: {
    color: '#6B7785',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  statValue: {
    color: BRAND.midnight,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 3,
  },

  statSmall: {
    color: '#8994A0',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  sectionEyebrow: {
    color: BRAND.green,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: BRAND.midnight,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },

  checkinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 18,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E4E8ED',
    marginBottom: 27,
  },

  checkinCardCompleted: {
    backgroundColor: '#F5FBF7',
    borderColor: '#BDE3C8',
  },

  checkinIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: BRAND.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  checkinIconCompleted: {
    backgroundColor: BRAND.green,
  },

  checkinIconText: {
    fontSize: 24,
    color: '#FFFFFF',
  },

  checkinBody: {
    flex: 1,
  },

  checkinEyebrow: {
    color: BRAND.orange,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  checkinTitle: {
    color: BRAND.midnight,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: 4,
  },

  checkinDescription: {
    color: '#6B7785',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 5,
  },

  checkinButton: {
    backgroundColor: BRAND.teal,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },

  checkinButtonCompleted: {
    backgroundColor: BRAND.green,
  },

  checkinButtonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  checkinArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 7,
  },

  topicCount: {
    color: '#6B7785',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 27,
  },

  topicCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E4E8ED',
    minHeight: 185,
  },

  topicIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  topicIconText: {
    fontSize: 23,
  },

  topicTitle: {
    color: BRAND.midnight,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },

  topicDescription: {
    color: '#6B7785',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 5,
  },

  topicBottom: {
    marginTop: 'auto',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topicLearn: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  topicArrow: {
    fontSize: 17,
    fontWeight: '500',
  },

  habitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: '#E4E8ED',
    marginBottom: 20,
  },

  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },

  habitBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E4E8ED',
  },

  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  habitIconText: {
    fontSize: 20,
  },

  habitBody: {
    flex: 1,
  },

  habitTitle: {
    color: BRAND.midnight,
    fontSize: 14,
    fontWeight: '900',
  },

  habitDescription: {
    color: '#6B7785',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 2,
  },

  habitCheck: {
    color: BRAND.green,
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 8,
  },

  walkingCard: {
    backgroundColor: BRAND.teal,
    borderRadius: 25,
    padding: 19,
    flexDirection: 'row',
    alignItems: 'center',
  },

  walkingIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  walkingIconText: {
    fontSize: 25,
  },

  walkingBody: {
    flex: 1,
  },

  walkingEyebrow: {
    color: '#BFEFE5',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  walkingTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 4,
  },

  walkingDescription: {
    color: '#D7F7F1',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 4,
  },

  walkingArrow: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },

  footer: {
    alignItems: 'center',
    paddingTop: 38,
    paddingBottom: 12,
  },

  footerBrand: {
    color: BRAND.midnight,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2.7,
  },

  footerTagline: {
    color: '#6B7785',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
  },

  footerMessage: {
    color: '#9AA3AD',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 12,
  },
});