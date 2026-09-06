import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Profile = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  area: string | null;
  daily_step_goal: number | null;
  points: number | null;
  ward_id: number | null;
};

type WalkingData = {
  steps?: number;
  streak?: number;
  points?: number;
  goal?: number;
};

const WALKING_DATA_KEY = 'chalega_walking_data';

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [walking, setWalking] = useState<WalkingData>({});
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        setProfile(null);
        return;
      }

      setSignedIn(true);

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'full_name, username, avatar_url, area, daily_step_goal, points, ward_id'
        )
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Profile load error:', error.message);
      }

      if (data) {
        setProfile(data);
      } else {
        setProfile({
          full_name: user.user_metadata?.full_name ?? null,
          username: null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          area: null,
          daily_step_goal: 8000,
          points: 0,
          ward_id: null,
        });
      }

      try {
        const AsyncStorage = (
          await import('@react-native-async-storage/async-storage')
        ).default;

        const savedWalking = await AsyncStorage.getItem(WALKING_DATA_KEY);

        if (savedWalking) {
          setWalking(JSON.parse(savedWalking));
        }
      } catch (walkingError) {
        console.warn('Walking data load error:', walkingError);
      }
    } catch (error) {
      console.warn('Profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    'Chalega Member';

  const username = profile?.username
    ? `@${profile.username.replace(/^@/, '')}`
    : '@chalega_member';

  const wardLabel = profile?.ward_id
    ? `KMC Ward ${profile.ward_id}`
    : 'Ward not assigned';

  const steps = walking.steps ?? 0;
  const streak = walking.streak ?? 0;
  const points = Math.max(profile?.points ?? 0, walking.points ?? 0);
  const goal = walking.goal ?? profile?.daily_step_goal ?? 8000;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1D6FF2" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyEmoji}>👤</Text>
          </View>

          <Text style={styles.emptyTitle}>Create your Chalega profile</Text>

          <Text style={styles.emptyText}>
            Join Chalega India to save your progress, choose your KMC ward and
            build your healthy journey.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>CREATE FREE ACCOUNT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.topTitle}>MY PROFILE</Text>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() =>
              Alert.alert(
                'Profile Settings',
                'Profile editing and ward verification are coming next.'
              )
            }
            activeOpacity={0.8}
          >
            <Text style={styles.settingsText}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE HEADER */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRing}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.username}>{username}</Text>

          <View style={styles.wardBadge}>
            <Text style={styles.wardPin}>📍</Text>
            <Text style={styles.wardText}>{wardLabel}</Text>
          </View>

          <Text style={styles.bio}>
            Walking towards a healthier India.
          </Text>
        </View>

        {/* STATS */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{points.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>POINTS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{steps.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>STEPS</Text>
          </View>
        </View>

        {/* WARD */}
        <Text style={styles.sectionTitle}>YOUR COMMUNITY</Text>

        <TouchableOpacity
          style={styles.wardCard}
          onPress={() =>
            Alert.alert(
              'KMC Ward',
              profile?.ward_id
                ? `You are currently assigned to KMC Ward ${profile.ward_id}.`
                : 'Your KMC ward has not been assigned yet.'
            )
          }
          activeOpacity={0.85}
        >
          <View style={styles.wardIcon}>
            <Text style={styles.wardIconText}>🏙️</Text>
          </View>

          <View style={styles.wardContent}>
            <Text style={styles.wardCardEyebrow}>KOLKATA MUNICIPAL CORPORATION</Text>

            <Text style={styles.wardCardTitle}>{wardLabel}</Text>

            <Text style={styles.wardCardText}>
              Your ward will connect you with local Chalega India community
              activity and impact.
            </Text>
          </View>

          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* JOURNEY */}
        <Text style={styles.sectionTitle}>MY JOURNEY</Text>

        <View style={styles.journeyGrid}>
          <TouchableOpacity
            style={styles.journeyTile}
            onPress={() => router.push('/walking')}
            activeOpacity={0.85}
          >
            <View style={[styles.tileIcon, styles.blueTile]}>
              <Text style={styles.tileEmoji}>🚶</Text>
            </View>
            <Text style={styles.tileTitle}>Walking</Text>
            <Text style={styles.tileText}>
              {steps.toLocaleString('en-IN')} steps
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.journeyTile}
            onPress={() => router.push('/explore')}
            activeOpacity={0.85}
          >
            <View style={[styles.tileIcon, styles.greenTile]}>
              <Text style={styles.tileEmoji}>❤️</Text>
            </View>
            <Text style={styles.tileTitle}>Health</Text>
            <Text style={styles.tileText}>Your daily wellness</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.journeyTile}
            onPress={() => router.push('/missions')}
            activeOpacity={0.85}
          >
            <View style={[styles.tileIcon, styles.orangeTile]}>
              <Text style={styles.tileEmoji}>🎯</Text>
            </View>
            <Text style={styles.tileTitle}>Missions</Text>
            <Text style={styles.tileText}>Build better habits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.journeyTile}
            onPress={() => router.push('/rewards')}
            activeOpacity={0.85}
          >
            <View style={[styles.tileIcon, styles.goldTile]}>
              <Text style={styles.tileEmoji}>🏆</Text>
            </View>
            <Text style={styles.tileTitle}>Rewards</Text>
            <Text style={styles.tileText}>Use your points</Text>
          </TouchableOpacity>
        </View>

        {/* DAILY GOAL */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalEyebrow}>TODAY'S WALKING GOAL</Text>
              <Text style={styles.goalTitle}>
                {steps.toLocaleString('en-IN')} / {goal.toLocaleString('en-IN')}
              </Text>
            </View>

            <Text style={styles.goalPercent}>
              {Math.min(100, Math.round((steps / Math.max(goal, 1)) * 100))}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round((steps / Math.max(goal, 1)) * 100)
                  )}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* COMING NEXT */}
        <View style={styles.nextCard}>
          <Text style={styles.nextEyebrow}>COMING NEXT</Text>

          <Text style={styles.nextTitle}>CHALEGA CIRCLE</Text>

          <Text style={styles.nextText}>
            Invite friends, grow your community and earn Shop Credit from
            eligible purchases made by people you directly refer.
          </Text>

          <View style={styles.nextRow}>
            <Text style={styles.nextDot}>✓</Text>
            <Text style={styles.nextRowText}>Direct referrals</Text>
          </View>

          <View style={styles.nextRow}>
            <Text style={styles.nextDot}>✓</Text>
            <Text style={styles.nextRowText}>2% eligible Shop Credit</Text>
          </View>

          <View style={styles.nextRow}>
            <Text style={styles.nextDot}>✓</Text>
            <Text style={styles.nextRowText}>Use credit in Chalega Shop</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>CHALEGA INDIA™</Text>
          <Text style={styles.footerTagline}>
            WALK • EARN • IMPROVE • REPEAT
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0',
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: '#6B7785',
    fontSize: 13,
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
  },

  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#0B1F33',
    fontSize: 32,
    lineHeight: 35,
    fontWeight: '400',
  },

  topTitle: {
    color: '#0B1F33',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsText: {
    color: '#6B7785',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 20,
  },

  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#1D6FF2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
  },

  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarLetter: {
    color: '#1D6FF2',
    fontSize: 38,
    fontWeight: '900',
  },

  name: {
    color: '#0B1F33',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 13,
  },

  username: {
    color: '#6B7785',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  wardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 11,
  },

  wardPin: {
    fontSize: 12,
    marginRight: 5,
  },

  wardText: {
    color: '#247A3A',
    fontSize: 11,
    fontWeight: '900',
  },

  bio: {
    color: '#6B7785',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 24,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    color: '#0B1F33',
    fontSize: 20,
    fontWeight: '900',
  },

  statLabel: {
    color: '#8A95A0',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 4,
  },

  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#E4E8ED',
  },

  sectionTitle: {
    color: '#0B1F33',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },

  wardCard: {
    backgroundColor: '#0B1F33',
    borderRadius: 23,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  wardIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#12395A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  wardIconText: {
    fontSize: 25,
  },

  wardContent: {
    flex: 1,
    paddingLeft: 13,
  },

  wardCardEyebrow: {
    color: '#7EB1FF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  wardCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },

  wardCardText: {
    color: '#B9C9D8',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  chevron: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '300',
    marginLeft: 5,
  },

  journeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  journeyTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    minHeight: 130,
  },

  tileIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  blueTile: {
    backgroundColor: '#EAF2FF',
  },

  greenTile: {
    backgroundColor: '#EAF7EE',
  },

  orangeTile: {
    backgroundColor: '#FFF1E6',
  },

  goldTile: {
    backgroundColor: '#FFF7E3',
  },

  tileEmoji: {
    fontSize: 22,
  },

  tileTitle: {
    color: '#0B1F33',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 9,
  },

  tileText: {
    color: '#7A8691',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 3,
  },

  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
    marginBottom: 12,
  },

  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  goalEyebrow: {
    color: '#1D6FF2',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  goalTitle: {
    color: '#0B1F33',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },

  goalPercent: {
    color: '#1D6FF2',
    fontSize: 20,
    fontWeight: '900',
  },

  progressTrack: {
    height: 9,
    backgroundColor: '#E8EDF2',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 14,
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#1D6FF2',
    borderRadius: 10,
  },

  nextCard: {
    backgroundColor: '#FFF1E6',
    borderRadius: 22,
    padding: 19,
    marginTop: 10,
  },

  nextEyebrow: {
    color: '#C05C0C',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  nextTitle: {
    color: '#0B1F33',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },

  nextText: {
    color: '#6C5849',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  nextDot: {
    color: '#F47B20',
    fontSize: 13,
    fontWeight: '900',
    width: 20,
  },

  nextRowText: {
    color: '#4F4036',
    fontSize: 10,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    marginTop: 28,
  },

  footerBrand: {
    color: '#1D6FF2',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },

  footerTagline: {
    color: '#8A95A0',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 5,
  },

  emptyState: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyEmoji: {
    fontSize: 36,
  },

  emptyTitle: {
    color: '#0B1F33',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 18,
  },

  emptyText: {
    color: '#6B7785',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 9,
  },

  primaryButton: {
    backgroundColor: '#1D6FF2',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
    marginTop: 22,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});