import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

const HEALTH_DATA_KEY = 'chalega_health_home';

type HealthData = {
  water?: number;
  mood?: string;
};

const HEALTH_TOPICS = [
  {
    title: 'Heart',
    short: 'Move more',
    description: 'Keep your heart strong with regular movement and healthy habits.',
    accent: '#E85D75',
  },
  {
    title: 'Water',
    short: 'Stay hydrated',
    description: 'Drink regularly throughout the day, especially in hot weather.',
    accent: '#1D6FF2',
  },
  {
    title: 'Diet',
    short: 'Eat better',
    description: 'Choose fresh, balanced meals with more whole foods.',
    accent: '#2FA84F',
  },
  {
    title: 'Walking',
    short: 'Every step',
    description: 'Turn daily walking into a simple habit for better health.',
    accent: '#F47B20',
  },
  {
    title: 'Sleep',
    short: 'Recover',
    description: 'Give your body and mind enough time to rest and recharge.',
    accent: '#7B61D9',
  },
  {
    title: 'Mind',
    short: 'Stay positive',
    description: 'Take breaks, relax and make time for the people you care about.',
    accent: '#D59A18',
  },
];

export default function HealthScreen() {
  const router = useRouter();

  const [water, setWater] = useState(0);
  const [mood, setMood] = useState('');
  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(4000);
  const [streak, setStreak] = useState(0);

  const loadHealthData = useCallback(async () => {
    try {
      const healthRaw = await AsyncStorage.getItem(HEALTH_DATA_KEY);

      if (healthRaw) {
        const health: HealthData = JSON.parse(healthRaw);
        setWater(Number(health.water ?? 0));
        setMood(health.mood ?? '');
      }

      const [
        savedSteps,
        savedGoal,
        savedStreak,
      ] = await Promise.all([
        AsyncStorage.getItem('chalega_steps'),
        AsyncStorage.getItem('chalega_goal'),
        AsyncStorage.getItem('chalega_streak_count'),
      ]);

      const parsedSteps = Number(savedSteps ?? 0);
      const parsedGoal = Number(savedGoal ?? 4000);
      const parsedStreak = Number(savedStreak ?? 0);

      setSteps(Number.isFinite(parsedSteps) ? parsedSteps : 0);
      setGoal(
        Number.isFinite(parsedGoal) && parsedGoal > 0
          ? parsedGoal
          : 4000
      );
      setStreak(
        Number.isFinite(parsedStreak) && parsedStreak > 0
          ? parsedStreak
          : 0
      );
    } catch (error) {
      console.log('Could not load health dashboard:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHealthData();
    }, [loadHealthData])
  );

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const safeGoal = goal > 0 ? goal : 4000;

  const stepProgress = Math.min(steps / safeGoal, 1);
  const waterProgress = Math.min(water / 8, 1);

  const healthScore = Math.min(
    100,
    Math.round(
      stepProgress * 45 +
        waterProgress * 25 +
        Math.min(streak * 3, 15) +
        (mood ? 15 : 8)
    )
  );

  const openTopic = (title: string) => {
    router.push({
      pathname: '/health-topic',
      params: { topic: title },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.brand}>CHALEGA INDIA</Text>
          <Text style={styles.kicker}>YOUR HEALTH DASHBOARD</Text>
        </View>

        <View style={styles.scoreMini}>
          <Text style={styles.scoreMiniNumber}>{healthScore}</Text>
          <Text style={styles.scoreMiniLabel}>/100</Text>
        </View>
      </View>

      <Text style={styles.title}>
        Chalo Health{'\n'}Banaye.
      </Text>

      <Text style={styles.subtitle}>
        Sehat ek choice nahi, roz ki aadat hai.
      </Text>

      {/* HEALTH SCORE HERO */}

      <View style={styles.scoreCard}>
        <View style={styles.scoreTop}>
          <View>
            <Text style={styles.scoreEyebrow}>YOUR HEALTH TODAY</Text>
            <Text style={styles.scoreTitle}>Health Score</Text>
          </View>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{healthScore}</Text>
            <Text style={styles.scoreOutOf}>/100</Text>
          </View>
        </View>

        <Text style={styles.scoreMessage}>
          {healthScore >= 80
            ? 'Excellent! Keep your healthy routine going.'
            : healthScore >= 60
            ? 'Good progress. A few healthy habits can make it even better.'
            : 'Every small step counts. Start with one healthy habit today.'}
        </Text>

        <View style={styles.scoreBars}>
          <View style={styles.scoreBarItem}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel}>WALKING</Text>
              <Text style={styles.barValue}>
                {steps.toLocaleString('en-IN')} / {safeGoal.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  styles.barBlue,
                  { width: `${stepProgress * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.scoreBarItem}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel}>HYDRATION</Text>
              <Text style={styles.barValue}>{water} / 8</Text>
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  styles.barGreen,
                  { width: `${waterProgress * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* QUICK HEALTH STATS */}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>W</Text>
          <Text style={styles.statNumber}>{water}</Text>
          <Text style={styles.statLabel}>GLASSES</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>S</Text>
          <Text style={styles.statNumber}>
            {steps.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.statLabel}>STEPS</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>F</Text>
          <Text style={styles.statNumber}>{streak}</Text>
          <Text style={styles.statLabel}>DAY STREAK</Text>
        </View>
      </View>

      {/* TODAY'S CHECK-IN */}

      <View style={styles.checkinCard}>
        <View style={styles.checkinBadge}>
          <Text style={styles.checkinBadgeText}>
            {mood ? 'DONE' : 'TODAY'}
          </Text>
        </View>

        <Text style={styles.checkinTitle}>
          Daily health check-in
        </Text>

        <Text style={styles.checkinText}>
          {mood
            ? `Today's mood: ${mood}. Keep looking after yourself.`
            : 'Complete your simple health check-in and keep building your healthy routine.'}
        </Text>

        <TouchableOpacity
          style={styles.checkinButton}
          activeOpacity={0.85}
          onPress={() => openTopic('Mind')}
        >
          <Text style={styles.checkinButtonText}>
            {mood ? 'VIEW CHECK-IN' : 'CHECK IN NOW'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* HEALTH TOPICS */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>EXPLORE</Text>
          <Text style={styles.sectionTitle}>Your Health</Text>
        </View>

        <Text style={styles.sectionCount}>06 TOPICS</Text>
      </View>

      <View style={styles.topicGrid}>
        {HEALTH_TOPICS.map((topic, index) => (
          <TouchableOpacity
            key={topic.title}
            style={styles.topicCard}
            activeOpacity={0.85}
            onPress={() => openTopic(topic.title)}
          >
            <View
              style={[
                styles.topicNumber,
                { backgroundColor: topic.accent },
              ]}
            >
              <Text style={styles.topicNumberText}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>

            <Text style={styles.topicShort}>{topic.short}</Text>

            <Text style={styles.topicTitle}>{topic.title}</Text>

            <Text style={styles.topicDescription}>
              {topic.description}
            </Text>

            <Text
              style={[
                styles.topicLink,
                { color: topic.accent },
              ]}
            >
              EXPLORE  →
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SIMPLE HABITS */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>KEEP IT SIMPLE</Text>
          <Text style={styles.sectionTitle}>3 Healthy Habits</Text>
        </View>
      </View>

      <View style={styles.habitCard}>
        <View style={styles.habitNumber}>
          <Text style={styles.habitNumberText}>01</Text>
        </View>

        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>Walk every day</Text>
          <Text style={styles.habitText}>
            A daily walk is one of the simplest ways to stay active.
          </Text>
        </View>
      </View>

      <View style={styles.habitCard}>
        <View style={styles.habitNumber}>
          <Text style={styles.habitNumberText}>02</Text>
        </View>

        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>Drink enough water</Text>
          <Text style={styles.habitText}>
            Keep water with you and make hydration part of your routine.
          </Text>
        </View>
      </View>

      <View style={styles.habitCard}>
        <View style={styles.habitNumber}>
          <Text style={styles.habitNumberText}>03</Text>
        </View>

        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>Eat better</Text>
          <Text style={styles.habitText}>
            Choose more fruits, vegetables and wholesome foods.
          </Text>
        </View>
      </View>

      {/* WALK CTA */}

      <TouchableOpacity
        style={styles.walkButton}
        activeOpacity={0.85}
        onPress={() => router.push('/walking')}
      >
        <View>
          <Text style={styles.walkEyebrow}>READY?</Text>
          <Text style={styles.walkTitle}>Let's get moving.</Text>
        </View>

        <Text style={styles.walkArrow}>→</Text>
      </TouchableOpacity>

      {/* FOOTER */}

      <Text style={styles.footerBrand}>CHALEGA INDIA</Text>
      <Text style={styles.footerText}>
        WALK • EARN • IMPROVE • REPEAT
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 45,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  brand: {
    color: '#0B1F33',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 3,
  },

  kicker: {
    color: '#2FA84F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginTop: 6,
  },

  scoreMini: {
    minWidth: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E8ED',
  },

  scoreMiniNumber: {
    color: '#1D6FF2',
    fontSize: 22,
    fontWeight: '900',
  },

  scoreMiniLabel: {
    color: '#6B7785',
    fontSize: 9,
    fontWeight: '800',
  },

  title: {
    color: '#0B1F33',
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '900',
    marginTop: 28,
  },

  subtitle: {
    color: '#6B7785',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    marginTop: 12,
  },

  scoreCard: {
    backgroundColor: '#0B1F33',
    borderRadius: 28,
    padding: 22,
    marginTop: 26,
  },

  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  scoreEyebrow: {
    color: '#8FB9E8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  scoreTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },

  scoreCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreNumber: {
    color: '#1D6FF2',
    fontSize: 28,
    fontWeight: '900',
  },

  scoreOutOf: {
    color: '#6B7785',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -3,
  },

  scoreMessage: {
    color: '#DCE8F5',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 18,
  },

  scoreBars: {
    marginTop: 20,
  },

  scoreBarItem: {
    marginTop: 12,
  },

  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  barLabel: {
    color: '#8FB9E8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  barValue: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  barTrack: {
    height: 7,
    borderRadius: 5,
    backgroundColor: '#25425D',
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    borderRadius: 5,
  },

  barBlue: {
    backgroundColor: '#1D6FF2',
  },

  barGreen: {
    backgroundColor: '#2FA84F',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  statCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    paddingVertical: 17,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E8ED',
  },

  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EAF7EE',
    color: '#2FA84F',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },

  statNumber: {
    color: '#0B1F33',
    fontSize: 19,
    fontWeight: '900',
  },

  statLabel: {
    color: '#6B7785',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 3,
    textAlign: 'center',
  },

  checkinCard: {
    backgroundColor: '#EAF7EE',
    borderRadius: 26,
    padding: 22,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#CDEBD5',
  },

  checkinBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2FA84F',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  checkinBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  checkinTitle: {
    color: '#0B1F33',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 14,
  },

  checkinText: {
    color: '#536473',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 7,
  },

  checkinButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B1F33',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },

  checkinButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  sectionHeader: {
    marginTop: 34,
    marginBottom: 17,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  sectionEyebrow: {
    color: '#1D6FF2',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  sectionTitle: {
    color: '#0B1F33',
    fontSize: 28,
    fontWeight: '900',
  },

  sectionCount: {
    color: '#6B7785',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 3,
  },

  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  topicCard: {
    width: '48.2%',
    minHeight: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E4E8ED',
  },

  topicNumber: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topicNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  topicShort: {
    color: '#6B7785',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 17,
  },

  topicTitle: {
    color: '#0B1F33',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },

  topicDescription: {
    color: '#6B7785',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 8,
  },

  topicLink: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 15,
  },

  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 18,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E8ED',
  },

  habitNumber: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF1E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  habitNumberText: {
    color: '#F47B20',
    fontSize: 13,
    fontWeight: '900',
  },

  habitContent: {
    flex: 1,
  },

  habitTitle: {
    color: '#0B1F33',
    fontSize: 17,
    fontWeight: '900',
  },

  habitText: {
    color: '#6B7785',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 4,
  },

  walkButton: {
    backgroundColor: '#1D6FF2',
    borderRadius: 23,
    paddingHorizontal: 21,
    paddingVertical: 19,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  walkEyebrow: {
    color: '#BFD8FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  walkTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 3,
  },

  walkArrow: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '300',
  },

  footerBrand: {
    color: '#0B1F33',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 38,
  },

  footerText: {
    color: '#6B7785',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 6,
  },
});