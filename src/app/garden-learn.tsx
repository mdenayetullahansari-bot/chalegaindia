import { BRAND } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
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
    slug: 'what-plants-need',
    emoji: '🌱',
    title: 'What Plants Need',
    time: '3 min',
    description:
      'Learn the basics: light, water, air, nutrients and the right growing space.',
    route: '/garden-lesson?lesson=what-plants-need',
  },
  {
    slug: 'choose-the-right-pot',
    emoji: '🪴',
    title: 'Choose the Right Pot',
    time: '3 min',
    description:
      'Understand pot size and drainage for healthier roots.',
    route: '/garden-lesson-pot',
  },
  {
    slug: 'how-to-water',
    emoji: '💧',
    title: 'How to Water',
    time: '3 min',
    description:
      'Learn how to check the soil before watering instead of watering automatically.',
    route: '/garden-lesson-water',
  },
  {
    slug: 'start-growing-food',
    emoji: '🥬',
    title: 'Start Growing Food',
    time: '5 min',
    description:
      'Simple ideas for herbs and vegetables in small Kolkata homes.',
    route: '/garden-lesson-food',
  },
  {
    slug: 'composting-101',
    emoji: '♻️',
    title: 'Composting 101',
    time: '5 min',
    description:
      'Learn how suitable kitchen and garden waste can become a useful garden resource.',
    route: '/garden-lesson-compost',
  },
  {
    slug: 'pests-and-plant-problems',
    emoji: '🐛',
    title: 'Pests & Plant Problems',
    time: '5 min',
    description:
      'Learn what to check when leaves change colour, curl or show damage.',
    route: '/garden-lesson-pests',
  },
];

export default function GardenLearnScreen() {
  const router = useRouter();
  const [completedSlugs, setCompletedSlugs] = React.useState<string[]>([]);
  const [progressLoading, setProgressLoading] = React.useState(true);

  const loadProgress = React.useCallback(async () => {
    setProgressLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setCompletedSlugs([]);
      setProgressLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      'get_my_garden_lesson_progress'
    );

    if (error) {
      console.error('GardenVerse progress load failed:', error);
      setCompletedSlugs([]);
    } else {
      setCompletedSlugs(
        (data ?? [])
          .map((row: { lesson_slug?: string }) => row.lesson_slug)
          .filter((slug: string | undefined): slug is string => Boolean(slug))
      );
    }

    setProgressLoading(false);
  }, []);

  React.useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const completedCount = completedSlugs.length;
  const allComplete = completedCount === lessons.length;
  const remainingCount = lessons.length - completedCount;

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

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressEyebrow}>YOUR PROGRESS</Text>
              <Text style={styles.progressTitle}>
                {progressLoading
                  ? 'Checking your lessons...'
                  : `${completedCount} / ${lessons.length} lessons completed`}
              </Text>
            </View>

            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {Math.round((completedCount / lessons.length) * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedCount / lessons.length) * 100}%` },
              ]}
            />
          </View>

          {!progressLoading && !allComplete && (
            <Text style={styles.progressHint}>
              {remainingCount === 1
                ? '1 more lesson to unlock your certificate.'
                : `${remainingCount} more lessons to unlock your certificate.`}
            </Text>
          )}

          {allComplete && (
            <Text style={styles.progressComplete}>
              🎉 All 6 lessons complete. Your certificate is ready!
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.certificateButton,
              !allComplete && styles.certificateButtonLocked,
            ]}
            onPress={() => router.push('/garden-certificate')}
          >
            <Text style={styles.certificateButtonText}>
              {allComplete
                ? '🏆 CLAIM YOUR CERTIFICATE'
                : '🔒 CERTIFICATE — COMPLETE ALL 6 LESSONS'}
            </Text>
          </TouchableOpacity>
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
                {completedSlugs.includes('what-plants-need')
                  ? 'REVIEW LESSON →'
                  : 'START LESSON →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>More lessons</Text>

        {lessons.slice(1).map((lesson) => {
          const completed = completedSlugs.includes(lesson.slug);

          return (
            <TouchableOpacity
              key={lesson.title}
              style={styles.lessonCard}
              activeOpacity={0.85}
              onPress={() => router.push(lesson.route)}
            >
              <View style={styles.lessonIcon}>
                <Text style={styles.lessonEmoji}>
                  {lesson.emoji}
                </Text>
              </View>

              <View style={styles.lessonBody}>
                <View style={styles.lessonMetaRow}>
                  <Text style={styles.lessonMeta}>
                    BEGINNER • {lesson.time.toUpperCase()}
                  </Text>
                  {completed && (
                    <Text style={styles.completedLabel}>✓ COMPLETE</Text>
                  )}
                </View>

                <Text style={styles.lessonTitle}>
                  {lesson.title}
                </Text>

                <Text style={styles.lessonDescription}>
                  {lesson.description}
                </Text>
              </View>

              <Text style={styles.arrow}>
                {completed ? '✓' : '›'}
              </Text>
            </TouchableOpacity>
          );
        })}

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

  progressCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 17,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BRAND.line,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  progressEyebrow: {
    color: BRAND.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  progressTitle: {
    marginTop: 4,
    color: BRAND.ink,
    fontSize: 16,
    fontWeight: '900',
  },

  progressBadge: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressBadgeText: {
    color: BRAND.green,
    fontSize: 12,
    fontWeight: '900',
  },

  progressTrack: {
    height: 9,
    marginTop: 14,
    borderRadius: 5,
    backgroundColor: '#E7ECE8',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: BRAND.green,
  },

  progressHint: {
    marginTop: 9,
    color: BRAND.muted,
    fontSize: 11,
    lineHeight: 16,
  },

  progressComplete: {
    marginTop: 9,
    color: BRAND.green,
    fontSize: 11,
    fontWeight: '800',
  },

  certificateButton: {
    marginTop: 13,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: BRAND.midnight,
    alignItems: 'center',
  },

  certificateButtonLocked: {
    backgroundColor: '#7A857D',
  },

  certificateButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
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

  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },

  completedLabel: {
    color: BRAND.green,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    color: BRAND.green,
    fontSize: 20,
    fontWeight: '800',
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
