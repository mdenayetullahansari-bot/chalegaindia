import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HealthScreen() {
  const router = useRouter();

  const healthTopics = [
    {
      emoji: '❤️',
      title: 'Heart',
      description: 'Keep moving and stay active every day.',
      message:
        'Regular walking, healthy food and good sleep can support a healthy heart.',
    },
    {
      emoji: '💧',
      title: 'Water',
      description: 'Stay hydrated throughout the day.',
      message:
        'Keep water with you and drink regularly, especially in hot weather.',
    },
    {
      emoji: '🥗',
      title: 'Diet',
      description: 'Choose fresh and balanced food.',
      message:
        'Add more fruits, vegetables, whole foods and balanced meals to your day.',
    },
    {
      emoji: '🚶',
      title: 'Walking',
      description: 'Every step counts towards better health.',
      message:
        'Start with a comfortable walk and gradually make walking part of your daily routine.',
    },
    {
      emoji: '😴',
      title: 'Sleep',
      description: 'Give your body enough time to recover.',
      message:
        'A regular sleep routine can help your body and mind recover and recharge.',
    },
    {
      emoji: '🧠',
      title: 'Mind',
      description: 'Take time to relax and stay positive.',
      message:
        'Take short breaks, spend time with people you care about and make time to relax.',
    },
  ];

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

      <Text style={styles.brand}>
        C H A L E G A  I N D I A
      </Text>

      <Text style={styles.title}>
        Chalo Health{'\n'}Banaye
      </Text>

      <Text style={styles.subtitle}>
        Sehat ek choice nahi, roz ki aadat hai.
      </Text>

      {/* HERO */}

      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>❤️</Text>

        <Text style={styles.heroTitle}>
          Har kadam zaroori{'\n'}hai.
        </Text>

        <Text style={styles.heroText}>
          Walk more. Eat better. Drink water.{'\n'}
          Sleep well. Live healthier.
        </Text>
      </View>

      {/* DAILY HEALTH */}

      <Text style={styles.sectionTitle}>
        Your Daily Health
      </Text>

      <View style={styles.grid}>
        {healthTopics.map((topic) => (
          <TouchableOpacity
            key={topic.title}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => openTopic(topic.title)}
          >
            <Text style={styles.cardEmoji}>
              {topic.emoji}
            </Text>

            <Text style={styles.cardTitle}>
              {topic.title}
            </Text>

            <Text style={styles.cardDescription}>
              {topic.description}
            </Text>

            <Text style={styles.learnMore}>
              LEARN MORE →
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* HEALTH HABITS */}

      <Text style={styles.sectionTitle}>
        Simple Health Habits
      </Text>

      <View style={styles.habit}>
        <Text style={styles.number}>01</Text>

        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>
            Walk every day
          </Text>

          <Text style={styles.habitText}>
            A daily walk can become one of the simplest
            healthy habits.
          </Text>
        </View>
      </View>

      <View style={styles.habit}>
        <Text style={styles.number}>02</Text>

        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>
            Drink enough water
          </Text>

          <Text style={styles.habitText}>
            Keep water with you and remember to drink
            regularly.
          </Text>
        </View>
      </View>

      <View style={styles.habit}>
        <Text style={styles.number}>03</Text>

        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>
            Eat better
          </Text>

          <Text style={styles.habitText}>
            Add more fruits, vegetables and wholesome
            foods to your meals.
          </Text>
        </View>
      </View>

      {/* START WALKING */}

      <TouchableOpacity
        style={styles.startButton}
        activeOpacity={0.8}
        onPress={() => router.push('/walking')}
      >
        <Text style={styles.startButtonText}>
          START WALKING
        </Text>

        <Text style={styles.arrow}>
          →
        </Text>
      </TouchableOpacity>

      {/* FOOTER */}

      <Text style={styles.footer}>
        C H A L E G A  I N D I A 🇮🇳
      </Text>

      <Text style={styles.footerSmall}>
        Chalo Health Banaye
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingHorizontal: 34,
    paddingTop: 55,
    paddingBottom: 45,
  },

  brand: {
    color: '#1976F3',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 18,
  },

  title: {
    color: '#111111',
    fontSize: 48,
    lineHeight: 55,
    fontWeight: '900',
  },

  subtitle: {
    color: '#777777',
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    marginTop: 14,
  },

  hero: {
    backgroundColor: '#1976F3',
    borderRadius: 30,
    paddingVertical: 45,
    paddingHorizontal: 25,
    marginTop: 40,
    alignItems: 'center',
  },

  heroEmoji: {
    fontSize: 65,
    marginBottom: 20,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
    textAlign: 'center',
  },

  heroText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 42,
    marginBottom: 20,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    minHeight: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 22,
    marginBottom: 16,
  },

  cardEmoji: {
    fontSize: 46,
    marginBottom: 20,
  },

  cardTitle: {
    color: '#111111',
    fontSize: 24,
    fontWeight: '900',
  },

  cardDescription: {
    color: '#777777',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 10,
  },

  learnMore: {
    color: '#1976F3',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 18,
  },

  habit: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 22,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  number: {
    color: '#1976F3',
    fontSize: 25,
    fontWeight: '900',
    width: 65,
  },

  habitContent: {
    flex: 1,
  },

  habitTitle: {
    color: '#111111',
    fontSize: 19,
    fontWeight: '900',
  },

  habitText: {
    color: '#777777',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginTop: 5,
  },

  startButton: {
    backgroundColor: '#111111',
    borderRadius: 20,
    minHeight: 70,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginLeft: 15,
  },

  footer: {
    color: '#1976F3',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 45,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 7,
  },
});