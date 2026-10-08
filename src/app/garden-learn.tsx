import { BRAND } from '@/lib/brand';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const categories = [
  ['🌱', 'Gardening Basics'],
  ['♻️', 'Composting'],
  ['🪴', 'Plant Care'],
  ['🥬', 'Growing Food'],
  ['🐛', 'Pests & Problems'],
];

const lessons = [
  {
    emoji: '🌱',
    title: 'What Plants Need',
    time: '3 min',
    description:
      'Learn the basics: light, water, air, nutrients and the right growing space.',
  },
  {
    emoji: '🪴',
    title: 'Choose the Right Pot',
    time: '3 min',
    description:
      'Understand pot size and drainage for healthier roots.',
  },
  {
    emoji: '💧',
    title: 'How to Water',
    time: '3 min',
    description:
      'Learn how to check the soil before watering instead of watering automatically.',
  },
  {
    emoji: '🥬',
    title: 'Start Growing Food',
    time: '5 min',
    description:
      'Simple ideas for herbs and vegetables in small Kolkata homes.',
  },
  {
    emoji: '♻️',
    title: 'Composting 101',
    time: '5 min',
    description:
      'Learn how suitable kitchen and garden waste can become a useful garden resource.',
  },
  {
    emoji: '🐛',
    title: 'Pests & Plant Problems',
    time: '5 min',
    description:
      'Learn what to check when leaves change colour, curl or show damage.',
  },
];

export default function GardenLearnScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <TouchableOpacity
            onPress={() => router.replace('/garden')}
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>CHALEGA GARDENVERSE</Text>

          <Text style={styles.title}>LEARN & GROW</Text>

          <Text style={styles.subtitle}>
            Practical gardening knowledge for every Kolkata home.
          </Text>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            Learn something. Try it. Grow.
          </Text>

          <Text style={styles.introText}>
            Short, practical lessons to help you grow plants, reduce waste
            and build a greener home.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Explore</Text>

        <View style={styles.categoryGrid}>
          {categories.map(([emoji, label]) => (
            <View key={label} style={styles.categoryCard}>
              <Text style={styles.categoryEmoji}>{emoji}</Text>
              <Text style={styles.categoryText}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Start here</Text>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>🌱</Text>
          </View>

          <View style={styles.featureBody}>
            <Text style={styles.lessonMeta}>
              BEGINNER • 3 MIN
            </Text>

            <Text style={styles.featureTitle}>
              What Plants Need
            </Text>

            <Text style={styles.featureText}>
              Start with the essentials before you add another plant
              to your garden.
            </Text>

           <TouchableOpacity
  style={styles.primaryButton}
  onPress={() => router.push('/garden-lesson?lesson=what-plants-need')}
>
              <Text style={styles.primaryButtonText}>
                START LESSON →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>More lessons</Text>

        {lessons.slice(1).map((lesson) => (
        <TouchableOpacity
  key={lesson.title}
  style={styles.lessonCard}
  activeOpacity={0.85}
 onPress={() => {
  if (lesson.title === 'Choose the Right Pot') {
    router.push('/garden-lesson-pot');
  }

  if (lesson.title === 'How to Water') {
    router.push('/garden-lesson-water');
  }
if (lesson.title === 'Start Growing Food') {
  router.push('/garden-lesson-food');
}

if (lesson.title === 'Composting 101') {
  router.push('/garden-lesson-compost');
}

if (lesson.title === 'Pests & Plant Problems') {
  router.push('/garden-lesson-pests');
}
}}
>
            <View style={styles.lessonIcon}>
              <Text style={styles.lessonEmoji}>
                {lesson.emoji}
              </Text>
            </View>

            <View style={styles.lessonBody}>
              <Text style={styles.lessonMeta}>
                BEGINNER • {lesson.time.toUpperCase()}
              </Text>

              <Text style={styles.lessonTitle}>
                {lesson.title}
              </Text>

              <Text style={styles.lessonDescription}>
                {lesson.description}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomCard}>
          <Text style={styles.bottomTitle}>
            🌿 LEARN BY DOING
          </Text>

          <Text style={styles.bottomText}>
            GardenVerse will gradually connect lessons with simple
            actions you can complete in My Garden.
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
    padding: 20,
    paddingTop: 12,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 34,
  },

  eyebrow: {
    marginTop: 15,
    color: BRAND.green,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  title: {
    marginTop: 5,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },

  subtitle: {
    marginTop: 5,
    color: '#DCEBFA',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  introCard: {
    margin: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#EAF7EE',
    borderWidth: 1,
    borderColor: '#C9E5D1',
  },

  introTitle: {
    color: '#123C25',
    fontSize: 20,
    fontWeight: '900',
  },

  introText: {
    marginTop: 6,
    color: '#4C6B57',
    fontSize: 13,
    lineHeight: 19,
  },

  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 10,
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: '900',
  },

  categoryGrid: {
    marginHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  categoryCard: {
    width: '48%',
    minHeight: 82,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.line,
    justifyContent: 'center',
  },

  categoryEmoji: {
    fontSize: 24,
  },

  categoryText: {
    marginTop: 6,
    color: BRAND.ink,
    fontSize: 12,
    fontWeight: '900',
  },

  featureCard: {
    marginHorizontal: 18,
    padding: 15,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.line,
    flexDirection: 'row',
  },

  featureIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#F0F7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  featureEmoji: {
    fontSize: 30,
  },

  featureBody: {
    flex: 1,
  },

  lessonMeta: {
    color: '#24633A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  featureTitle: {
    marginTop: 3,
    color: BRAND.ink,
    fontSize: 17,
    fontWeight: '900',
  },

  featureText: {
    marginTop: 4,
    color: BRAND.muted,
    fontSize: 11,
    lineHeight: 17,
  },

  primaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: BRAND.midnight,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  lessonCard: {
    marginHorizontal: 18,
    marginBottom: 9,
    padding: 13,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.line,
    flexDirection: 'row',
    alignItems: 'center',
  },

  lessonIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F8F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  lessonEmoji: {
    fontSize: 25,
  },

  lessonBody: {
    flex: 1,
  },

  lessonTitle: {
    marginTop: 3,
    color: BRAND.ink,
    fontSize: 14,
    fontWeight: '900',
  },

  lessonDescription: {
    marginTop: 3,
    color: BRAND.muted,
    fontSize: 11,
    lineHeight: 16,
  },

  arrow: {
    marginLeft: 8,
    color: '#24633A',
    fontSize: 25,
    fontWeight: '400',
  },

  bottomCard: {
    margin: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: BRAND.midnight,
  },

  bottomTitle: {
    color: BRAND.green,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  bottomText: {
    marginTop: 6,
    color: '#DCEBFA',
    fontSize: 12,
    lineHeight: 18,
  },
});