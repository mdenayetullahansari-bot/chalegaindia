import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

const HEALTH_DATA_KEY = 'chalega_health_home';
const WALKING_DATA_KEY = 'chalega_walking_data';

type HealthData = {
  water?: number;
  mood?: string;
  activity?: string;
  sleep?: string;
};

type WalkingData = {
  steps?: number;
  goal?: number;
  streak?: number;
};

const HEALTH_TOPICS = [
  {
    icon: '❤️',
    title: 'Heart Health',
    description: 'Simple habits for a stronger heart.',
    color: '#F47B20',
    light: '#FFF1E6',
    topic: 'Heart',
  },
  {
    icon: '💧',
    title: 'Hydration',
    description: 'Keep your body refreshed and active.',
    color: '#1D6FF2',
    light: '#EAF2FF',
    topic: 'Water',
  },
  {
    icon: '🥗',
    title: 'Healthy Diet',
    description: 'Better food choices, one meal at a time.',
    color: '#2FA84F',
    light: '#EAF7EE',
    topic: 'Diet',
  },
  {
    icon: '🚶',
    title: 'Daily Walking',
    description: 'Move more and build your walking habit.',
    color: '#1D6FF2',
    light: '#EAF2FF',
    topic: 'Walking',
  },
  {
    icon: '😴',
    title: 'Better Sleep',
    description: 'Good rest helps your body recover.',
    color: '#6C63C7',
    light: '#F0EEFF',
    topic: 'Sleep',
  },
  {
    icon: '🧠',
    title: 'Mind & Mood',
    description: 'Take care of your mental wellbeing.',
    color: '#F47B20',
    light: '#FFF1E6',
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
  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(4000);
  const [streak, setStreak] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const loadHealthData = useCallback(async () => {
    try {
      const [healthSaved, walkingSaved] =
        await Promise.all([
          AsyncStorage.getItem(HEALTH_DATA_KEY),
          AsyncStorage.getItem(WALKING_DATA_KEY),
        ]);

      if (healthSaved) {
        try {
          const data: HealthData =
            JSON.parse(healthSaved);

          setWater(
            typeof data.water === 'number'
              ? Math.max(0, data.water)
              : 0
          );

          setMood(
            typeof data.mood === 'string'
              ? data.mood
              : ''
          );
        } catch {
          setWater(0);
          setMood('');
        }
      } else {
        setWater(0);
        setMood('');
      }

      if (walkingSaved) {
        try {
          const data: WalkingData =
            JSON.parse(walkingSaved);

          setSteps(
            typeof data.steps === 'number'
              ? Math.max(0, data.steps)
              : 0
          );

          setGoal(
            typeof data.goal === 'number' &&
              data.goal > 0
              ? data.goal
              : 4000
          );

          setStreak(
            typeof data.streak === 'number'
              ? Math.max(0, data.streak)
              : 0
          );
        } catch {
          setSteps(0);
          setGoal(4000);
          setStreak(0);
        }
      } else {
        setSteps(0);
        setGoal(4000);
        setStreak(0);
      }
    } catch (error) {
      console.log(
        'Could not load health dashboard data:',
        error
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHealthData();
    }, [loadHealthData])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    await loadHealthData();

    setRefreshing(false);
  };

  const openHealthCheckIn = () => {
    router.push('/daily-checkin');
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

  const stepProgress =
    goal > 0
      ? Math.min(steps / goal, 1)
      : 0;

  const waterProgress =
    Math.min(water / 8, 1);

  const healthScore = Math.min(
    100,
    Math.round(
      stepProgress * 45 +
        waterProgress * 25 +
        Math.min(streak * 3, 15) +
        (mood ? 15 : 8)
    )
  );

  const scoreMessage =
    healthScore >= 80
      ? 'Excellent work. Keep your healthy routine going!'
      : healthScore >= 60
      ? 'Good progress. A few small habits can make it even better.'
      : 'Every healthy choice counts. Start with one small step today.';

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
              CHALEGA INDIA
            </Text>

            <Text style={styles.title}>
              Your Health.
              {'\n'}
              Your Journey.
            </Text>

            <Text style={styles.subtitle}>
              Small daily choices. A healthier
              you.
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
            <View>
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
          style={styles.checkinCard}
          activeOpacity={0.88}
          onPress={openHealthCheckIn}
        >
          <View style={styles.checkinIcon}>
            <Text style={styles.checkinIconText}>
              ❤️
            </Text>
          </View>

          <View style={styles.checkinBody}>
            <Text style={styles.checkinEyebrow}>
              DAILY HEALTH CHECK-IN
            </Text>

            <Text style={styles.checkinTitle}>
              How are you feeling today?
            </Text>

            <Text style={styles.checkinDescription}>
              Take 30 seconds to check in with
              your mood, water, activity and sleep.
            </Text>

            <View style={styles.checkinButton}>
              <Text style={styles.checkinButtonText}>
                START CHECK-IN
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
                    backgroundColor:
                      topic.light,
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
          {HEALTHY_HABITS.map(
            (habit, index) => (
              <View
                key={habit.title}
                style={[
                  styles.habitRow,
                  index !==
                    HEALTHY_HABITS.length - 1 &&
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
            )
          )}
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
            CHALEGA INDIA
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
    backgroundColor: '#F7F5F0',
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
    color: '#2FA84F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: '#0B1F33',
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
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE1CC',
  },

  headerIconText: {
    fontSize: 29,
  },

  scoreCard: {
    backgroundColor: '#0B1F33',
    borderRadius: 26,
    padding: 21,
    marginBottom: 15,
  },

  scoreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  scoreEyebrow: {
    color: '#8FB9E8',
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
    backgroundColor: '#1D6FF2',
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
    color: '#C7DDFF',
    fontSize: 9,
    fontWeight: '800',
    marginTop: -1,
  },

  scoreTrack: {
    height: 8,
    backgroundColor: '#203B54',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 20,
  },

  scoreFill: {
    height: '100%',
    backgroundColor: '#2FA84F',
    borderRadius: 8,
  },

  scoreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 13,
  },

  scoreFooterText: {
    color: '#8FB9E8',
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
    backgroundColor: '#EAF2FF',
  },

  statGreen: {
    backgroundColor: '#EAF7EE',
  },

  statOrange: {
    backgroundColor: '#FFF1E6',
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
    color: '#0B1F33',
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
    color: '#2FA84F',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color: '#0B1F33',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },

  topicCount: {
    color: '#6B7785',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
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

  checkinIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  checkinIconText: {
    fontSize: 24,
  },

  checkinBody: {
    flex: 1,
  },

  checkinEyebrow: {
    color: '#F47B20',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  checkinTitle: {
    color: '#0B1F33',
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
    backgroundColor: '#1D6FF2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
    color: '#0B1F33',
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
    backgroundColor: '#EAF7EE',
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
    color: '#0B1F33',
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
    color: '#2FA84F',
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 8,
  },

  walkingCard: {
    backgroundColor: '#1D6FF2',
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
    color: '#BFD8FF',
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
    color: '#D9E8FF',
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
    color: '#0B1F33',
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