import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const BRAND = {
  midnight: '#0B2B1A',
  cream: '#F5F2E8',
  ink: '#183222',
  muted: '#6C776F',
  green: '#24633A',
  lightGreen: '#E8F3EA',
  white: '#FFFFFF',
};

export default function GardenLessonPests() {
  const router = useRouter();

  const completeLesson = async () => {
    console.log('PESTS LESSON BUTTON FIRED');

    const { error } = await supabase.rpc(
      'complete_garden_lesson',
      { p_lesson_slug: 'pests-and-plant-problems' }
    );

    if (error) {
      console.error('Pests lesson completion error:', error);
      return;
    }

    router.replace('/garden-lesson-complete?lesson=pests-and-plant-problems');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/garden-learn')}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>
            GARDENVERSE • BEGINNER
          </Text>

          <Text style={styles.heroTitle}>
            Pests & Plant Problems
          </Text>

          <Text style={styles.heroText}>
            Learn what to look for when leaves change colour, curl,
            develop spots or show signs of damage.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            🐛 Observe before you act
          </Text>

          <Text style={styles.infoText}>
            A damaged leaf does not always mean you have a pest problem.
            Check the plant, soil, light and watering conditions before
            deciding what action to take.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          5 things to remember
        </Text>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>👀</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              1. Inspect your plant
            </Text>

            <Text style={styles.lessonText}>
              Look at the leaves, stems and soil regularly. Early
              observation can help you notice changes before they
              become a bigger problem.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🍃</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              2. Check the leaves
            </Text>

            <Text style={styles.lessonText}>
              Curling, spots, holes or unusual colour can have different
              causes. Look closely before assuming it is an insect.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>💧</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              3. Check watering
            </Text>

            <Text style={styles.lessonText}>
              Too much or too little water can cause stress. Check the
              soil moisture and drainage before changing your routine.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>☀️</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              4. Check the growing conditions
            </Text>

            <Text style={styles.lessonText}>
              Light, airflow, temperature and overcrowding can all
              affect plant health. Make sure the plant has suitable
              conditions for growth.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🌱</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              5. Act gently
            </Text>

            <Text style={styles.lessonText}>
              Remove badly damaged leaves when appropriate and keep
              affected plants under observation. Avoid using treatments
              before you understand the problem.
            </Text>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionEyebrow}>
            TRY THIS TODAY
          </Text>

          <Text style={styles.actionTitle}>
            Inspect one plant carefully.
          </Text>

          <Text style={styles.actionText}>
            Choose one plant at home and inspect its leaves, stems and
            soil. Look for anything unusual and note what you observe
            before taking action.
          </Text>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={completeLesson}
          >
            <Text style={styles.completeButtonText}>
              LESSON COMPLETE ✓
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            🐛 Notice first. Understand the problem. Then act.
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
    paddingBottom: 50,
  },

  hero: {
    backgroundColor: BRAND.midnight,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  backText: {
    color: BRAND.white,
    fontSize: 24,
    fontWeight: '700',
  },

  eyebrow: {
    color: '#B8D9C0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  heroTitle: {
    marginTop: 7,
    color: BRAND.white,
    fontSize: 29,
    fontWeight: '900',
  },

  heroText: {
    marginTop: 8,
    color: '#D8E6DC',
    fontSize: 13,
    lineHeight: 20,
  },

  infoCard: {
    marginHorizontal: 18,
    marginTop: 18,
    padding: 17,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: '#C9E5D1',
  },

  infoTitle: {
    color: BRAND.ink,
    fontSize: 17,
    fontWeight: '900',
  },

  infoText: {
    marginTop: 7,
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 22,
    marginBottom: 10,
    color: BRAND.ink,
    fontSize: 17,
    fontWeight: '900',
  },

  lessonCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 15,
    borderRadius: 18,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: '#E0E6E1',
    flexDirection: 'row',
  },

  lessonEmoji: {
    fontSize: 25,
    width: 42,
  },

  lessonBody: {
    flex: 1,
  },

  lessonTitle: {
    color: BRAND.ink,
    fontSize: 14,
    fontWeight: '900',
  },

  lessonText: {
    marginTop: 4,
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  actionCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: BRAND.lightGreen,
    borderWidth: 1,
    borderColor: '#C9E5D1',
  },

  actionEyebrow: {
    color: BRAND.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  actionTitle: {
    marginTop: 5,
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: '900',
  },

  actionText: {
    marginTop: 6,
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  completeButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND.midnight,
  },

  completeButtonText: {
    color: BRAND.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  footerCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },

  footerText: {
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});