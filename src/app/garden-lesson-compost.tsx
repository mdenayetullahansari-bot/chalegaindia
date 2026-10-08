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

export default function GardenLessonCompost() {
  const router = useRouter();

  const completeLesson = async () => {
    console.log('COMPOST LESSON BUTTON FIRED');

    const { error } = await supabase.rpc(
      'complete_garden_lesson',
      { p_lesson_slug: 'composting-101' }
    );

    if (error) {
      console.error('Compost lesson completion error:', error);
      return;
    }

    router.replace('/garden-learn');
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
            Composting 101
          </Text>

          <Text style={styles.heroText}>
            Learn how everyday organic waste can become a useful
            resource for your garden.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            ♻️ Turn waste into a resource
          </Text>

          <Text style={styles.infoText}>
            Composting is a natural process where suitable organic
            materials break down and become a soil-friendly resource
            for plants.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          5 things to remember
        </Text>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🥬</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              1. Use suitable organic material
            </Text>

            <Text style={styles.lessonText}>
              Fruit and vegetable scraps, dry leaves and other suitable
              plant material can become part of a composting routine.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🍂</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              2. Balance wet and dry material
            </Text>

            <Text style={styles.lessonText}>
              Fresh kitchen scraps are generally wetter, while dry
              leaves and other dry material help create a better mix.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>💨</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              3. Give it air
            </Text>

            <Text style={styles.lessonText}>
              Good airflow helps the composting process. Avoid creating
              a completely sealed, waterlogged mass.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>💧</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              4. Keep moisture balanced
            </Text>

            <Text style={styles.lessonText}>
              Compost should have some moisture, but excessive water
              can create unpleasant conditions and slow the process.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🌱</Text>

          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>
              5. Be patient
            </Text>

            <Text style={styles.lessonText}>
              Composting takes time. Regular observation and a balanced
              mix help organic material gradually break down.
            </Text>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionEyebrow}>
            TRY THIS TODAY
          </Text>

          <Text style={styles.actionTitle}>
            Start separating your scraps.
          </Text>

          <Text style={styles.actionText}>
            Choose a small container for suitable fruit and vegetable
            scraps and begin separating them from your regular waste.
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
            ♻️ Less waste. Healthier soil. Greener homes.
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