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

export default function GardenLessonPot() {
  const router = useRouter();

  const completeLesson = async () => {
    const { error } = await supabase.rpc(
      'complete_garden_lesson',
      { p_lesson_slug: 'choose-the-right-pot' }
    );

    if (error) {
      console.error('Lesson completion error:', error);
      return;
    }

    router.replace('/garden-lesson-complete?lesson=choose-the-right-pot');
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

          <Text style={styles.eyebrow}>GARDENVERSE • BEGINNER</Text>

          <Text style={styles.heroTitle}>
            Choose the Right Pot
          </Text>

          <Text style={styles.heroText}>
            The right container gives your plant enough space,
            drainage and room to grow.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🪴 Start with the container</Text>

          <Text style={styles.infoText}>
            A good pot is not just about appearance. Size, drainage
            and material can all affect how well a plant grows.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>4 things to check</Text>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>📏</Text>
          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>1. Size</Text>
            <Text style={styles.lessonText}>
              Choose a pot that gives the roots enough room without
              being unnecessarily large.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>💧</Text>
          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>2. Drainage</Text>
            <Text style={styles.lessonText}>
              Make sure excess water can escape. Waterlogged soil
              can create problems for plant roots.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🌱</Text>
          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>3. Root space</Text>
            <Text style={styles.lessonText}>
              Think about how large the plant can become and whether
              the container will support healthy root growth.
            </Text>
          </View>
        </View>

        <View style={styles.lessonCard}>
          <Text style={styles.lessonEmoji}>🏺</Text>
          <View style={styles.lessonBody}>
            <Text style={styles.lessonTitle}>4. Material</Text>
            <Text style={styles.lessonText}>
              Different pot materials behave differently. Consider
              weight, heat, moisture and where the pot will be kept.
            </Text>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionEyebrow}>TRY THIS TODAY</Text>

          <Text style={styles.actionTitle}>
            Check one pot at home.
          </Text>

          <Text style={styles.actionText}>
            Pick one container and check its size and drainage holes.
            Ask yourself whether it gives the plant enough room to grow.
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
            🌱 The right pot gives every plant a better start.
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
  },
});