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


type HealthTopic = {
  emoji: string;
  title: string;
  subtitle: string;
  tips: string[];
};

const healthData: Record<string, HealthTopic> = {
  Heart: {
    emoji: 'Ã¢ÂÂ¤Ã¯Â¸Â',
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
    emoji: 'Ã°Å¸â€™Â§',
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
    emoji: 'Ã°Å¸Â¥â€”',
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
    emoji: 'Ã°Å¸Å¡Â¶',
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
    emoji: 'Ã°Å¸ËœÂ´',
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
    emoji: 'Ã°Å¸Â§Â ',
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

   *
   * 1. Adding the points to the wallet.
   * 2. Recording the transaction in Points Activity.
   * 3. Preventing the same daily reward twice.
   */
  const completeHealthMission = () => {
    router.push('/daily-health-checkin');
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
          Ã¢â‚¬Â¹
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
          Ã¢ÂÂ¤Ã¯Â¸Â
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
            Ã¢ÂÂ¤Ã¯Â¸Â
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
                ? 'Ã¢Å“â€œ COMPLETED +10 POINTS'
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
          Ã¢â€ â€™
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
          Ã¢â€ â€™
        </Text>
      </TouchableOpacity>

      {/* FOOTER */}

      <Text style={styles.footer}>
        C H A L E G A  I N D I A Ã°Å¸â€¡Â®Ã°Å¸â€¡Â³
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
