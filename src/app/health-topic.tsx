import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { awardOnce } from '@/lib/points';

type HealthTopic = {
  emoji: string;
  title: string;
  subtitle: string;
  tips: string[];
};

const healthData: Record<string, HealthTopic> = {
  Heart: {
    emoji: '❤️',
    title: 'Heart Health',
    subtitle:
      'Take care of your heart, one healthy habit at a time.',
    tips: [
      'Walk regularly and keep your body active.',
      'Choose more fruits, vegetables and whole foods.',
      'Limit foods that are very high in salt, sugar or unhealthy fats.',
      'Get enough sleep and make time to relax.',
      'If you have concerns about your heart, speak with a healthcare professional.',
    ],
  },

  Water: {
    emoji: '💧',
    title: 'Stay Hydrated',
    subtitle:
      'Water is an important part of a healthy daily routine.',
    tips: [
      'Keep a bottle of water with you during the day.',
      'Drink regularly rather than waiting until you are very thirsty.',
      'Drink more when the weather is hot or you are physically active.',
      'Choose water instead of sugary drinks more often.',
      'Your hydration needs can vary depending on your body and activity.',
    ],
  },

  Diet: {
    emoji: '🥗',
    title: 'Eat Better',
    subtitle:
      'Small changes in your daily food choices can make a difference.',
    tips: [
      'Add more seasonal fruits and vegetables to your meals.',
      'Choose a variety of nutritious foods.',
      'Include whole grains, pulses and other wholesome foods.',
      'Try to reduce highly processed foods and excess added sugar.',
      'Enjoy your food and aim for balance rather than perfection.',
    ],
  },

  Walking: {
    emoji: '🚶',
    title: 'Keep Walking',
    subtitle:
      'Every step is a step towards a more active lifestyle.',
    tips: [
      'Start with a comfortable amount of walking.',
      'Try to make walking part of your daily routine.',
      'Take short walking breaks during long periods of sitting.',
      'Walk with family or friends to make it more enjoyable.',
      'Gradually increase your activity as your fitness improves.',
    ],
  },

  Sleep: {
    emoji: '😴',
    title: 'Better Sleep',
    subtitle:
      'Good sleep gives your body and mind time to recover.',
    tips: [
      'Try to keep a regular sleep and wake-up schedule.',
      'Create a calm and comfortable bedtime routine.',
      'Reduce screen use close to bedtime when possible.',
      'Avoid heavy meals or excessive caffeine close to bedtime.',
      'If sleep problems continue, consider speaking with a healthcare professional.',
    ],
  },

  Mind: {
    emoji: '🧠',
    title: 'Mind & Wellbeing',
    subtitle:
      'Looking after your mind is part of looking after your health.',
    tips: [
      'Take a few minutes each day to slow down and relax.',
      'Spend time with people who make you feel supported.',
      'Get outside and enjoy a little fresh air and movement.',
      'Make time for hobbies and activities you enjoy.',
      'If you are struggling emotionally, consider talking to someone you trust or a healthcare professional.',
    ],
  },
};

export default function HealthTopicScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const topicParam = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic;

  const missionParam = Array.isArray(params.mission)
    ? params.mission[0]
    : params.mission;

  const topic = topicParam || 'Heart';

  const data =
    healthData[topic] || healthData.Heart;

  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isHealthMission =
    missionParam === 'health' ||
    topic === 'Heart';

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
   * Load today's health mission status.
   */
  useEffect(() => {
    const loadCompletionStatus = async () => {
      if (!isHealthMission) {
        return;
      }

      try {
        const todayKey = getTodayKey();

        const missionKey =
          `chalega_daily_missions_${todayKey}`;

        const savedMissions =
          await AsyncStorage.getItem(missionKey);

        if (!savedMissions) {
          setCompleted(false);
          return;
        }

        const missions = JSON.parse(
          savedMissions
        );

        const healthMission = missions.find(
          (mission: any) =>
            mission.id === 'health'
        );

        if (healthMission?.completed) {
          setCompleted(true);
        } else {
          setCompleted(false);
        }
      } catch (error) {
        console.log(
          'Could not load health mission status:',
          error
        );
      }
    };

    loadCompletionStatus();
  }, [isHealthMission]);

  /*
   * Complete today's health mission.
   *
   * IMPORTANT:
   *
   * awardOnce() is now responsible for:
   *
   * 1. Adding the points to the wallet.
   * 2. Recording the transaction in Points Activity.
   * 3. Preventing the same daily reward twice.
   */
  const completeHealthMission = async () => {
    if (completing || completed) {
      return;
    }

    setCompleting(true);

    try {
      const todayKey = getTodayKey();

      const missionKey =
        `chalega_daily_missions_${todayKey}`;

      const savedMissions =
        await AsyncStorage.getItem(
          missionKey
        );

      const missions = savedMissions
        ? JSON.parse(savedMissions)
        : [
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

      const healthMission = missions.find(
        (mission: any) =>
          mission.id === 'health'
      );

      if (!healthMission) {
        Alert.alert(
          'Something went wrong',
          'The health mission could not be found.'
        );

        setCompleting(false);
        return;
      }

      /*
       * Extra protection against duplicate
       * completion from the mission data.
       */
      if (healthMission.completed) {
        setCompleted(true);
        setCompleting(false);

        Alert.alert(
          'Already completed',
          "You have already completed today's health check-in."
        );

        return;
      }

      /*
       * Award the points through the central
       * Chalega Points system.
       *
       * This creates BOTH:
       *
       * - wallet balance
       * - Points Activity transaction
       */
      const result = await awardOnce(
        'health_checkin',
        `health_checkin_${todayKey}`,
        healthMission.points,
        'Health Check-in',
        `health_checkin_${todayKey}`
      );

      /*
       * Mark today's health mission completed.
       */
      const updatedMissions =
        missions.map(
          (mission: any) =>
            mission.id === 'health'
              ? {
                  ...mission,
                  completed: true,
                }
              : mission
        );

      await AsyncStorage.setItem(
        missionKey,
        JSON.stringify(updatedMissions)
      );

      setCompleted(true);
      setCompleting(false);

      /*
       * If the points were already awarded,
       * do not award them again.
       */
      if (!result.awarded) {
        Alert.alert(
          'Already completed',
          "Today's health check-in has already been rewarded.",
          [
            {
              text: 'BACK TO MISSIONS',
              onPress: () =>
                router.replace('/missions'),
            },
          ]
        );

        return;
      }

      /*
       * Successful completion.
       */
      Alert.alert(
        '❤️ Health Check-in Complete!',
        `+${healthMission.points} Chalega Points\n\nYour total is now ${result.balance} Chalega Points.`,
        [
          {
            text: 'BACK TO MISSIONS',
            onPress: () =>
              router.replace('/missions'),
          },
        ]
      );
    } catch (error) {
      console.log(
        'Could not complete health mission:',
        error
      );

      setCompleting(false);

      Alert.alert(
        'Something went wrong',
        'We could not save your health check-in. Please try again.'
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* BACK */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.backArrow}>
          ‹
        </Text>

        <Text style={styles.backText}>
          Back
        </Text>
      </TouchableOpacity>

      {/* BRAND */}

      <Text style={styles.brand}>
        C H A L E G A  I N D I A
      </Text>

      {/* HERO */}

      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>
          {data.emoji}
        </Text>

        <Text style={styles.heroTitle}>
          {data.title}
        </Text>

        <Text style={styles.heroSubtitle}>
          {data.subtitle}
        </Text>
      </View>

      {/* TIPS */}

      <Text style={styles.sectionTitle}>
        Simple Tips
      </Text>

      {data.tips.map((tip, index) => (
        <View
          key={index}
          style={styles.tipCard}
        >
          <View style={styles.numberCircle}>
            <Text style={styles.number}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>

          <Text style={styles.tipText}>
            {tip}
          </Text>
        </View>
      ))}

      {/* MESSAGE */}

      <View style={styles.messageCard}>
        <Text style={styles.messageEmoji}>
          ❤️
        </Text>

        <Text style={styles.messageTitle}>
          Har kadam zaroori hai.
        </Text>

        <Text style={styles.messageText}>
          Healthy living is built from small choices
          made every day.
        </Text>
      </View>

      {/* HEALTH CHECK-IN */}

      {isHealthMission && (
        <View style={styles.missionCard}>
          <Text style={styles.missionEmoji}>
            ❤️
          </Text>

          <Text style={styles.missionTitle}>
            Complete your health check-in
          </Text>

          <Text style={styles.missionText}>
            You have taken a moment to learn about
            healthy habits. Complete today's check-in
            and earn 10 Chalega Points.
          </Text>

          <TouchableOpacity
            style={[
              styles.completeButton,
              completed &&
                styles.completeButtonDone,
            ]}
            activeOpacity={0.8}
            onPress={completeHealthMission}
            disabled={
              completing ||
              completed
            }
          >
            <Text
              style={[
                styles.completeButtonText,
                completed &&
                  styles.completeButtonTextDone,
              ]}
            >
              {completed
                ? '✓ COMPLETED +10 POINTS'
                : completing
                ? 'SAVING...'
                : 'COMPLETE HEALTH CHECK-IN +10'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WALK BUTTON */}

      <TouchableOpacity
        style={styles.walkButton}
        activeOpacity={0.8}
        onPress={() =>
          router.push('/walking')
        }
      >
        <Text style={styles.walkButtonText}>
          START WALKING
        </Text>

        <Text style={styles.arrow}>
          →
        </Text>
      </TouchableOpacity>

      {/* SHOP BUTTON */}

      <TouchableOpacity
        style={styles.shopButton}
        activeOpacity={0.8}
        onPress={() =>
          router.push('/shop')
        }
      >
        <Text style={styles.shopButtonText}>
          VISIT HEALTH SHOP
        </Text>

        <Text style={styles.shopArrow}>
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
    paddingTop: 45,
    paddingBottom: 100,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 28,
  },

  backArrow: {
    color: '#1976F3',
    fontSize: 38,
    lineHeight: 38,
    fontWeight: '500',
  },

  backText: {
    color: '#1976F3',
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 5,
  },

  brand: {
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 20,
  },

  hero: {
    backgroundColor: '#1976F3',
    borderRadius: 30,
    paddingHorizontal: 25,
    paddingVertical: 40,
    alignItems: 'center',
  },

  heroEmoji: {
    fontSize: 68,
    marginBottom: 20,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 43,
    fontWeight: '900',
    textAlign: 'center',
  },

  heroSubtitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 15,
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 38,
    marginBottom: 18,
  },

  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  numberCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  number: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '900',
  },

  tipText: {
    flex: 1,
    color: '#444444',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },

  messageCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 25,
    padding: 25,
    marginTop: 20,
    alignItems: 'center',
  },

  messageEmoji: {
    fontSize: 40,
  },

  messageTitle: {
    color: '#111111',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },

  messageText: {
    color: '#666666',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 25,
    marginTop: 22,
    alignItems: 'center',
  },

  missionEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },

  missionTitle: {
    color: '#111111',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    textAlign: 'center',
  },

  missionText: {
    color: '#666666',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },

  completeButton: {
    width: '100%',
    minHeight: 60,
    backgroundColor: '#111111',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },

  completeButtonDone: {
    backgroundColor: '#EAF8EF',
  },

  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  completeButtonTextDone: {
    color: '#228B45',
  },

  walkButton: {
    backgroundColor: '#111111',
    borderRadius: 20,
    minHeight: 68,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  walkButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    marginLeft: 15,
  },

  shopButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1976F3',
    borderRadius: 20,
    minHeight: 64,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shopButtonText: {
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '900',
  },

  shopArrow: {
    color: '#1976F3',
    fontSize: 27,
    fontWeight: '900',
    marginLeft: 13,
  },

  footer: {
    color: '#1976F3',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 45,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 7,
  },
});