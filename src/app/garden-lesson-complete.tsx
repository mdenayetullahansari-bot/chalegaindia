import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const lessons = [
  {
    slug: 'what-plants-need',
    emoji: '🌱',
    title: 'What Plants Need',
    route: '/garden-lesson?lesson=what-plants-need',
  },
  {
    slug: 'choose-the-right-pot',
    emoji: '🪴',
    title: 'Choose the Right Pot',
    route: '/garden-lesson-pot',
  },
  {
    slug: 'how-to-water',
    emoji: '💧',
    title: 'How to Water',
    route: '/garden-lesson-water',
  },
  {
    slug: 'start-growing-food',
    emoji: '🥬',
    title: 'Start Growing Food',
    route: '/garden-lesson-food',
  },
  {
    slug: 'composting-101',
    emoji: '♻️',
    title: 'Composting 101',
    route: '/garden-lesson-compost',
  },
  {
    slug: 'pests-and-plant-problems',
    emoji: '🐛',
    title: 'Pests & Plant Problems',
    route: '/garden-lesson-pests',
  },
];

export default function GardenLessonComplete() {
  const router = useRouter();
  const { lesson } = useLocalSearchParams<{ lesson?: string }>();
  const [completedCount, setCompletedCount] = React.useState<number | null>(null);
  const [completedSlugs, setCompletedSlugs] = React.useState<string[]>([]);

  const current = lessons.find((item) => item.slug === lesson) ?? lessons[0];

  React.useEffect(() => {
    const loadProgress = async () => {
      const { data, error } = await supabase.rpc(
        'get_my_garden_lesson_progress'
      );

      if (!error) {
        const completed = new Set(
          (data ?? [])
            .map((row: { lesson_slug?: string }) => row.lesson_slug)
            .filter(Boolean)
        );
        const slugs = lessons
          .filter((item) => completed.has(item.slug))
          .map((item) => item.slug);

        // The lesson was just completed. If the progress read briefly lags,
        // include the lesson from the current route so the success screen
        // never shows stale progress immediately after completion.
        if (lesson && lessons.some((item) => item.slug === lesson) && !slugs.includes(lesson)) {
          slugs.push(lesson);
        }

        setCompletedSlugs(slugs);
        setCompletedCount(slugs.length);
      }
    };

    loadProgress();
  }, []);

  const isComplete = completedCount === lessons.length;
  const currentIndex = lessons.findIndex((item) => item.slug === lesson);
  const nextLesson =
    lessons
      .slice(currentIndex >= 0 ? currentIndex + 1 : 0)
      .find((item) => !completedSlugs.includes(item.slug)) ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{isComplete ? '🏆' : '🌱'}</Text>
        </View>

        <Text style={styles.eyebrow}>
          GARDENVERSE • {isComplete ? 'MILESTONE UNLOCKED' : 'LESSON COMPLETE'}
        </Text>

        <Text style={styles.title}>
          {isComplete ? 'You did it!' : 'Great job!'}
        </Text>

        <Text style={styles.subtitle}>
          {isComplete
            ? 'You completed all 6 GardenVerse Learn & Grow lessons.'
            : `You completed “${current.title}”. One more step toward becoming a confident home gardener.`}
        </Text>

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
          <Text style={styles.progressValue}>
            {completedCount === null
              ? 'Updating...'
              : `${completedCount} / ${lessons.length} lessons completed`}
          </Text>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${((completedCount ?? 0) / lessons.length) * 100}%`,
                },
              ]}
            />
          </View>

          {completedCount !== null && (
            <Text style={styles.progressHint}>
              {isComplete
                ? '🎉 Your GardenVerse certificate is ready.'
                : `${lessons.length - completedCount} more ${lessons.length - completedCount === 1 ? 'lesson' : 'lessons'} to unlock your certificate.`}
            </Text>
          )}
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextEyebrow}>
            {isComplete ? 'NEXT MILESTONE' : 'KEEP GROWING'}
          </Text>

          {isComplete ? (
            <>
              <Text style={styles.nextTitle}>🏆 Claim your certificate</Text>
              <Text style={styles.nextText}>
                You have completed the full GardenVerse Learn & Grow program.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/garden-certificate')}
              >
                <Text style={styles.primaryButtonText}>
                  CLAIM CERTIFICATE →
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.nextTitle}>
                {nextLesson?.emoji} {nextLesson?.title}
              </Text>
              <Text style={styles.nextText}>
                Continue with the next lesson and keep building your gardening knowledge.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  nextLesson
                    ? router.replace(nextLesson.route as any)
                    : router.replace('/garden-learn')
                }
              >
                <Text style={styles.primaryButtonText}>
                  NEXT LESSON →
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/garden-learn')}
        >
          <Text style={styles.secondaryButtonText}>
            BACK TO LEARN & GROW
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.cream,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  iconCircle: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: BRAND.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 44,
  },
  eyebrow: {
    color: BRAND.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textAlign: 'center',
  },
  title: {
    marginTop: 7,
    color: BRAND.ink,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 9,
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  progressCard: {
    marginTop: 22,
    padding: 17,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: '#DDE7DF',
  },
  progressLabel: {
    color: BRAND.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressValue: {
    marginTop: 5,
    color: BRAND.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  track: {
    height: 9,
    marginTop: 12,
    borderRadius: 5,
    backgroundColor: '#E7ECE8',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: BRAND.green,
  },
  progressHint: {
    marginTop: 8,
    color: BRAND.muted,
    fontSize: 11,
  },
  nextCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: BRAND.lightGreen,
    borderWidth: 1,
    borderColor: '#C9E5D1',
  },
  nextEyebrow: {
    color: BRAND.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  nextTitle: {
    marginTop: 5,
    color: BRAND.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  nextText: {
    marginTop: 5,
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 13,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: BRAND.midnight,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: BRAND.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: BRAND.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
