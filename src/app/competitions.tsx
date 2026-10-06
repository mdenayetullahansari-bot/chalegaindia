import { BRAND } from '@/lib/brand';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  daily_step_goal: number | null;
  ward_id: string | null;
};

type Category = {
  id: string;
  code: string;
  gender: string;
  age_min: number;
  age_max: number | null;
  label: string;
};

type Competition = {
  id: string;
  name: string;
  competition_type: string;
  scope: string;
  status: string;
  scoring_method: string;
  starts_at: string;
  ends_at: string;
  first_place_points: number;
  second_place_points: number;
  third_place_points: number;
  rules_version: string | null;
  category_id: string | null;
};

type CompetitionResult = {
  id: string;
  competition_id: string;
  user_id: string;
  result_date: string;
  verified_steps: number;
  rank: number | null;
  status: 'pending' | 'qualified' | 'disqualified' | string;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  full_name: string | null;
  verified_steps: number;
  result_date: string;
};

type WardLeaderboardRow = {
  rank: number;
  ward_id: number;
  active_participants: number;
  verified_steps: number;
  average_verified_steps: number;
  activity_score: number;
};

type WardPrizeDistribution = {
  points_amount: number;
  status: 'pending' | 'issued' | 'cancelled' | string;
  issued_at: string | null;
};

function getIndiaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export default function CompetitionsScreen() {
  const params = useLocalSearchParams();
  const from = typeof params.from === "string" ? params.from : undefined;
  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(4000);
  const [streak, setStreak] = useState(0);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);
  const [submittedResult, setSubmittedResult] =
    useState<CompetitionResult | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [wardLeaderboard, setWardLeaderboard] = useState<WardLeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [wardPrizeDistribution, setWardPrizeDistribution] =
    useState<WardPrizeDistribution | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const todayKey = getIndiaDateKey();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const { data: todaySteps, error: stepsError } = await supabase
          .from('daily_steps')
          .select('steps')
          .eq('user_id', user.id)
          .eq('step_date', todayKey)
          .maybeSingle();

        if (stepsError) {
          throw stepsError;
        }

        if (mounted && todaySteps && typeof todaySteps.steps === 'number') {
          setSteps(Math.max(0, todaySteps.steps));
        }

        if (userError) {
          throw userError;
        }

        if (!user) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, age, gender, daily_step_goal, ward_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profileData) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const loadedProfile = profileData as Profile;

        if (mounted) {
          setProfile(loadedProfile);

          if (
            typeof loadedProfile.daily_step_goal === 'number' &&
            loadedProfile.daily_step_goal > 0
          ) {
            setGoal(loadedProfile.daily_step_goal);
          }
        }

        let loadedCategory: Category | null = null;

        if (
          typeof loadedProfile.age === 'number' &&
          !!loadedProfile.gender
        ) {
          const age = loadedProfile.age;
          const gender = loadedProfile.gender.toLowerCase();

          const { data: categoryRows, error: categoryError } = await supabase
            .from('competition_categories')
            .select('id, code, gender, age_min, age_max, label')
            .eq('gender', gender)
            .eq('active', true)
            .order('age_min', { ascending: true });

          if (categoryError) {
            throw categoryError;
          }

          loadedCategory =
            (categoryRows as Category[] | null)?.find(
              (candidate) =>
                age >= candidate.age_min &&
                (candidate.age_max === null || age <= candidate.age_max)
            ) || null;

          if (mounted) {
            setCategory(loadedCategory);
          }
        }

        let competitionQuery = supabase
          .from('competitions')
          .select(
            'id, name, competition_type, scope, status, scoring_method, starts_at, ends_at, first_place_points, second_place_points, third_place_points, rules_version, category_id'
          )
          .eq('status', 'active');

        if (loadedCategory) {
          competitionQuery = competitionQuery.or(
            `category_id.eq.${loadedCategory.id},and(category_id.is.null,scope.eq.global)`
          );
        } else {
          competitionQuery = competitionQuery
            .is('category_id', null)
            .eq('scope', 'global');
        }

        const { data: competitionData, error: competitionError } =
          await competitionQuery
            .order('starts_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (competitionError) {
          throw competitionError;
        }

        if (mounted && competitionData) {
          const loadedCompetition = competitionData as Competition;
          setCompetition(loadedCompetition);

          if (
            loadedCompetition.category_id === null &&
            loadedCompetition.scope === 'global'
          ) {
            const { data: prizeData, error: prizeError } = await supabase
              .from('ward_competition_prize_distributions')
              .select('points_amount, status, issued_at')
              .eq('competition_id', loadedCompetition.id)
              .maybeSingle();

            if (prizeError) {
              console.log(
                '[COMPETITIONS] Ward prize lookup error:',
                prizeError
              );
            } else if (mounted && prizeData) {
              setWardPrizeDistribution(prizeData as WardPrizeDistribution);
            }
          }

          const { data: participationData, error: participationError } =
            await supabase
              .from('competition_participants')
              .select('id')
              .eq('competition_id', loadedCompetition.id)
              .eq('user_id', user.id)
              .maybeSingle();

          if (!participationError && participationData) {
            setJoined(true);

            const todayKey = getIndiaDateKey();

            const {
              data: resultData,
              error: resultError,
            } = await supabase
              .from('competition_results')
              .select(
                'id, competition_id, user_id, result_date, verified_steps, rank, status'
              )
              .eq('competition_id', loadedCompetition.id)
              .eq('user_id', user.id)
              .eq('result_date', todayKey)
              .maybeSingle();

            if (resultError) {
              console.log(
                '[COMPETITIONS] Existing result lookup error:',
                resultError
              );
            } else if (mounted && resultData) {
              setSubmittedResult(resultData as CompetitionResult);
            }
          }
        }
      } catch (error) {
        console.log('[COMPETITIONS] Load error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLeaderboard = async () => {
      if (!competition) {
        if (mounted) {
          setLeaderboard([]);
          setWardLeaderboard([]);
        }
        return;
      }

      try {
        setLeaderboardLoading(true);

        const isWardCompetition =
          competition.category_id === null && competition.scope === 'global';

        if (isWardCompetition) {
          const { data, error } = await supabase.rpc(
            'get_ward_competition_leaderboard',
            {
              p_competition_id: competition.id,
            }
          );

          if (error) {
            throw error;
          }

          if (mounted) {
            setWardLeaderboard(
              Array.isArray(data)
                ? (data as WardLeaderboardRow[])
                : []
            );
            setLeaderboard([]);
          }
        } else {
          const todayKey = getIndiaDateKey();

          const { data, error } = await supabase.rpc(
            'get_competition_leaderboard',
            {
              p_competition_id: competition.id,
              p_result_date: todayKey,
            }
          );

          if (error) {
            throw error;
          }

          if (mounted) {
            setLeaderboard(
              Array.isArray(data)
                ? (data as LeaderboardRow[])
                : []
            );
            setWardLeaderboard([]);
          }
        }
      } catch (error) {
        console.log('[COMPETITIONS] Leaderboard load error:', error);

        if (mounted) {
          setLeaderboard([]);
          setWardLeaderboard([]);
        }
      } finally {
        if (mounted) {
          setLeaderboardLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      mounted = false;
    };
  }, [competition]);

  const progress = useMemo(() => {
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((steps / goal) * 100));
  }, [steps, goal]);

  const formattedEndTime = useMemo(() => {
    if (!competition?.ends_at) return '';

    return new Date(competition.ends_at).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [competition]);

  const handleJoin = async () => {
    if (!competition) return;

    try {
      setJoining(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in to join a Chalega competition.'
        );
        return;
      }

      const { error } = await supabase
        .from('competition_participants')
        .insert({
          competition_id: competition.id,
          user_id: user.id,
          status: 'active',
        });

      if (error) {
        if (error.code === '23505') {
          setJoined(true);
          return;
        }
        throw error;
      }

      setJoined(true);

      Alert.alert(
        'You are in! 🏆',
        isWardCompetition
          ? `You have joined ${competition.name}. Keep walking — verified activity will contribute to your ward's ranking.`
          : `You have joined ${competition.name}. Keep walking — verified steps will determine the podium.`
      );
    } catch (error) {
      console.log('[COMPETITIONS] Join error:', error);
      Alert.alert(
        'Could not join',
        'We could not join you to this competition right now. Please try again.'
      );
    } finally {
      setJoining(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!competition || !joined || submittedResult) {
      return;
    }

    try {
      setSubmittingResult(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in before submitting your walking result.'
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        'submit-competition-result',
        {
          body: {
            competition_id: competition.id,
            steps: Math.max(0, Math.floor(steps)),
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error || 'The competition result could not be submitted.'
        );
      }

      if (data.result) {
        setSubmittedResult(data.result as CompetitionResult);
      }

      Alert.alert(
        data.already_submitted ? 'Already submitted' : 'Result submitted',
        data.message ||
          'Your walking result has been submitted for verification.'
      );
    } catch (error) {
      console.log('[COMPETITIONS] Result submit error:', error);
      Alert.alert(
        'Could not submit result',
        'We could not submit your walking result right now. Please try again.'
      );
    } finally {
      setSubmittingResult(false);
    }
  };

  const displayCategory = category?.label || 'Competition category';
  const isWardCompetition =
    competition?.category_id === null && competition?.scope === 'global';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.replace(from === "more" ? "/more" : "/")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#0B2239" />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>CHALEGA KOLKATA</Text>
            <Text style={styles.title}>Competition HQ</Text>
          </View>

          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={22} color="#F28C28" />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroHeading}>
              <Text style={styles.heroEyebrow}>
                {competition?.competition_type === 'daily'
                  ? 'DAILY WALKING COMPETITION'
                  : 'WALKING COMPETITION'}
              </Text>
              <Text style={styles.heroTitle}>
                {competition ? 'Walk. Compete. Win.' : 'Competition HQ'}
              </Text>
            </View>

            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                {competition ? 'LIVE' : 'CHECKING'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroCopy}>
            {competition
              ? isWardCompetition
                ? `${competition.name} is active across participating wards. Verified walking activity determines each ward's position.`
                : `${competition.name} is active for the ${displayCategory} category. Your verified walking performance determines your position.`
              : 'Chalega competitions connect your verified walking performance with real rankings and rewards.'}
          </Text>

          <View style={styles.heroRule}>
            <Text style={styles.ruleText}>1st • 2nd • 3rd</Text>
            <Text style={styles.ruleSubtext}>
              Earn Chalega Points and redeem eligible rewards.
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#1769E0" />
            <Text style={styles.loadingText}>
              Loading your competition...
            </Text>
          </View>
        ) : competition ? (
          <>
            <View style={styles.categoryCard}>
              <View style={styles.categoryIcon}>
                <Ionicons name="people" size={22} color="#1769E0" />
              </View>

              <View style={styles.categoryContent}>
                <Text style={styles.categoryEyebrow}>
                  {isWardCompetition ? 'YOUR WARD' : 'YOUR CATEGORY'}
                </Text>
                <Text style={styles.categoryTitle}>
                  {isWardCompetition
                    ? profile?.ward_id
                      ? `Ward ${profile.ward_id}`
                      : 'Ward not assigned'
                    : displayCategory}
                </Text>
                <Text style={styles.categoryCopy}>
                  {isWardCompetition
                    ? 'Ward competition rankings are based on verified activity.'
                    : 'Based on your saved age and competition category.'}
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={22}
                color="#2E9D62"
              />
            </View>

            <View style={styles.competitionCard}>
              <View style={styles.competitionHeader}>
                <View style={styles.competitionBadge}>
                  <Ionicons name="flash" size={18} color="#F28C28" />
                </View>

                <View style={styles.competitionHeaderText}>
                  <Text style={styles.competitionEyebrow}>ACTIVE NOW</Text>
                  <Text style={styles.competitionName}>
                    {competition.name}
                  </Text>
                </View>
              </View>

              <View style={styles.rewardRow}>
                <View style={styles.rewardMini}>
                  <Text style={styles.rewardPlace}>1ST</Text>
                  <Text style={styles.rewardPoints}>
                    {competition.first_place_points}
                  </Text>
                  <Text style={styles.rewardUnit}>POINTS</Text>
                </View>

                <View style={styles.rewardMini}>
                  <Text style={styles.rewardPlace}>2ND</Text>
                  <Text style={styles.rewardPoints}>
                    {competition.second_place_points}
                  </Text>
                  <Text style={styles.rewardUnit}>POINTS</Text>
                </View>

                <View style={styles.rewardMini}>
                  <Text style={styles.rewardPlace}>3RD</Text>
                  <Text style={styles.rewardPoints}>
                    {competition.third_place_points}
                  </Text>
                  <Text style={styles.rewardUnit}>POINTS</Text>
                </View>
              </View>

              <Text style={styles.endsText}>
                Competition ends {formattedEndTime}
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={joining || joined}
                onPress={handleJoin}
                style={[
                  styles.joinButton,
                  joined && styles.joinButtonJoined,
                ]}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={joined ? 'checkmark-circle' : 'trophy'}
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.joinButtonText}>
                      {joined ? 'JOINED — KEEP WALKING' : 'JOIN COMPETITION'}
                    </Text>
                  </>
                )}
              </Pressable>

              {joined && !submittedResult ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={submittingResult}
                  onPress={handleSubmitResult}
                  style={styles.submitResultButton}
                >
                  {submittingResult ? (
                    <ActivityIndicator size="small" color="#1769E0" />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={19}
                        color="#1769E0"
                      />
                      <Text style={styles.submitResultButtonText}>
                        SUBMIT TODAY'S WALKING RESULT
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {submittedResult ? (
                <View style={styles.resultStatusCard}>
                  <View style={styles.resultStatusIcon}>
                    <Ionicons
                      name={
                        submittedResult.status === 'qualified'
                          ? 'checkmark-circle'
                          : 'time'
                      }
                      size={21}
                      color={
                        submittedResult.status === 'qualified'
                          ? '#2E9D62'
                          : '#B66B12'
                      }
                    />
                  </View>

                  <View style={styles.resultStatusContent}>
                    <Text style={styles.resultStatusTitle}>
                      {submittedResult.status === 'qualified'
                        ? 'VERIFIED RESULT'
                        : submittedResult.status === 'disqualified'
                          ? 'RESULT DISQUALIFIED'
                          : 'RESULT SUBMITTED'}
                    </Text>

                    <Text style={styles.resultStatusCopy}>
                      {submittedResult.verified_steps.toLocaleString('en-IN')}{' '}
                      steps •{' '}
                      {submittedResult.status === 'qualified'
                        ? 'eligible for ranking'
                        : 'awaiting verification'}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        ) : profile && !category ? (
          <View style={styles.emptyCard}>
            <Ionicons name="person-outline" size={30} color="#1769E0" />
            <Text style={styles.emptyTitle}>Competition category needed</Text>
            <Text style={styles.emptyCopy}>
              We could not find an active category matching your saved age and
              gender. Update your profile and try again.
            </Text>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/profile-settings')}
            >
              <Text style={styles.secondaryButtonText}>
                OPEN PROFILE SETTINGS
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={30} color="#1769E0" />
            <Text style={styles.emptyTitle}>
              No active competition yet
            </Text>
            <Text style={styles.emptyCopy}>
              Your category is ready. We will show the competition here when
              an eligible competition is active.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR PERFORMANCE</Text>
          <Text style={styles.sectionHint}>TODAY</Text>
        </View>

        <View style={styles.performanceCard}>
          {loading ? (
            <ActivityIndicator size="small" color="#1769E0" />
          ) : (
            <>
              <View style={styles.statRow}>
                <View style={styles.mainStat}>
                  <Text style={styles.statLabel}>YOUR STEPS</Text>
                  <Text style={styles.stepsNumber}>
                    {steps.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.statMeta}>
                    Daily goal {goal.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.streakStat}>
                  <Ionicons name="flame" size={24} color="#F28C28" />
                  <Text style={styles.streakNumber}>{streak}</Text>
                  <Text style={styles.streakLabel}>DAY STREAK</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {progress}% of today's walking goal
              </Text>
            </>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isWardCompetition ? 'WARD LEADERBOARD' : "TODAY'S PODIUM"}
          </Text>
          <Text style={styles.sectionHint}>TOP 3</Text>
        </View>

        <View style={styles.podiumCard}>
          <View style={styles.podiumIcon}>
            <Ionicons name="podium" size={30} color="#1769E0" />
          </View>

          <Text style={styles.podiumTitle}>
            {competition
              ? isWardCompetition
                ? 'Most active wards'
                : "Today's verified leaderboard"
              : 'Competition podium'}
          </Text>
          <Text style={styles.podiumCopy}>
            {competition
              ? isWardCompetition
                ? 'Ward rankings use verified steps and active participant activity.'
                : 'Rankings are based on verified walking results for today.'
              : 'Your eligible competition and verified results will appear here.'}
          </Text>

          {leaderboardLoading ? (
            <View style={styles.leaderboardLoading}>
              <ActivityIndicator size="small" color="#1769E0" />
              <Text style={styles.leaderboardLoadingText}>
                Loading verified rankings...
              </Text>
            </View>
          ) : isWardCompetition ? (
            wardLeaderboard.length === 0 ? (
              <View style={styles.noLeaderboard}>
                <Ionicons
                  name="podium-outline"
                  size={24}
                  color="#8B97A3"
                />
                <Text style={styles.noLeaderboardTitle}>
                  No ward results yet
                </Text>
                <Text style={styles.noLeaderboardCopy}>
                  Verified walking activity will appear here as ward results are calculated.
                </Text>
              </View>
            ) : (
              <>
                {wardLeaderboard.slice(0, 3).map((row) => (
                  <View
                    key={`${row.ward_id}-${row.rank}`}
                    style={[
                      styles.leaderboardRow,
                      row.ward_id.toString() === profile?.ward_id &&
                        styles.leaderboardRowYou,
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{row.rank}</Text>
                    </View>

                    <View style={styles.leaderboardName}>
                      <Text
                        style={styles.leaderboardNameText}
                        numberOfLines={1}
                      >
                        Ward {row.ward_id}
                      </Text>
                      <Text style={styles.leaderboardMeta}>
                        {row.active_participants.toLocaleString('en-IN')} active participants
                      </Text>
                    </View>

                    <View style={styles.leaderboardSteps}>
                      <Text style={styles.leaderboardStepsNumber}>
                        {row.verified_steps.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.leaderboardStepsLabel}>
                        VERIFIED STEPS
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )
          ) : leaderboard.length === 0 ? (
            <View style={styles.noLeaderboard}>
              <Ionicons
                name="podium-outline"
                size={24}
                color="#8B97A3"
              />
              <Text style={styles.noLeaderboardTitle}>
                No verified results yet
              </Text>
              <Text style={styles.noLeaderboardCopy}>
                Submit today's walking result to enter the verified leaderboard.
              </Text>
            </View>
          ) : (
            <>
              {leaderboard.slice(0, 3).map((row) => (
                <View
                  key={`${row.user_id}-${row.rank}`}
                  style={[
                    styles.leaderboardRow,
                    row.user_id === profile?.id &&
                      styles.leaderboardRowYou,
                  ]}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{row.rank}</Text>
                  </View>

                  <View style={styles.leaderboardName}>
                    <Text
                      style={styles.leaderboardNameText}
                      numberOfLines={1}
                    >
                      {row.user_id === profile?.id
                        ? 'You'
                        : row.full_name || 'Chalega Walker'}
                    </Text>
                    <Text style={styles.leaderboardMeta}>
                      {row.rank === 1
                        ? '🥇 1st place'
                        : row.rank === 2
                          ? '🥈 2nd place'
                          : '🥉 3rd place'}
                    </Text>
                  </View>

                  <View style={styles.leaderboardSteps}>
                    <Text style={styles.leaderboardStepsNumber}>
                      {row.verified_steps.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.leaderboardStepsLabel}>
                      VERIFIED STEPS
                    </Text>
                  </View>
                </View>
              ))}

              {submittedResult ? (
                <View style={styles.yourRankCard}>
                  <View>
                    <Text style={styles.yourRankEyebrow}>YOUR RANK</Text>
                    <Text style={styles.yourRankNumber}>
                      {submittedResult.rank
                        ? `#${submittedResult.rank}`
                        : 'Pending'}
                    </Text>
                  </View>
                  <View style={styles.yourRankRight}>
                    <Text style={styles.yourRankSteps}>
                      {submittedResult.verified_steps.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.yourRankLabel}>VERIFIED STEPS</Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>

        {isWardCompetition ? (
          <View style={styles.wardGuideCard}>
            <View style={styles.wardGuideHeader}>
              <View style={styles.wardGuideIcon}>
                <Ionicons name="walk" size={22} color="#1769E0" />
              </View>
              <View style={styles.wardGuideHeaderText}>
                <Text style={styles.wardGuideEyebrow}>HOW THE WARD CHAMPIONSHIP WORKS</Text>
                <Text style={styles.wardGuideTitle}>Every verified walk helps your ward</Text>
              </View>
            </View>
            <Text style={styles.wardGuideCopy}>
              Join the competition, keep walking, and submit your daily result. Only verified walking activity is used for ward rankings.
            </Text>
            <View style={styles.wardGuideStep}>
              <Text style={styles.wardGuideNumber}>1</Text>
              <View style={styles.wardGuideStepText}>
                <Text style={styles.wardGuideStepTitle}>Walk regularly</Text>
                <Text style={styles.wardGuideStepCopy}>Your walking activity builds your contribution to your ward.</Text>
              </View>
            </View>
            <View style={styles.wardGuideStep}>
              <Text style={styles.wardGuideNumber}>2</Text>
              <View style={styles.wardGuideStepText}>
                <Text style={styles.wardGuideStepTitle}>Submit verified results</Text>
                <Text style={styles.wardGuideStepCopy}>Unverified claims do not determine the ward ranking.</Text>
              </View>
            </View>
            <View style={styles.wardGuideStep}>
              <Text style={styles.wardGuideNumber}>3</Text>
              <View style={styles.wardGuideStepText}>
                <Text style={styles.wardGuideStepTitle}>Prize distribution follows the final result</Text>
                <Text style={styles.wardGuideStepCopy}>If your ward qualifies for a prize, individual shares are shown here when the distribution is created.</Text>
              </View>
            </View>
          </View>
        ) : null}

        {isWardCompetition && wardPrizeDistribution ? (
          <View style={styles.wardPrizeShareCard}>
            <View style={styles.wardPrizeShareIcon}>
              <Ionicons name="gift" size={23} color="#1769E0" />
            </View>
            <View style={styles.wardPrizeShareContent}>
              <Text style={styles.wardPrizeShareEyebrow}>YOUR WARD PRIZE SHARE</Text>
              <Text style={styles.wardPrizeShareTitle}>
                {wardPrizeDistribution.points_amount.toLocaleString('en-IN')} Chalega Points
              </Text>
              <Text style={styles.wardPrizeShareCopy}>
                {wardPrizeDistribution.status === 'issued'
                  ? 'Your share has been added to your Chalega Points wallet.'
                  : wardPrizeDistribution.status === 'pending'
                    ? 'Your ward has qualified for a prize. Your share is being processed.'
                    : 'The ward prize distribution is currently cancelled.'}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={styles.rewardCard}
          onPress={() => router.push('/rewards')}
        >
          <View style={styles.rewardIcon}>
            <Ionicons name="gift" size={25} color="#FFFFFF" />
          </View>

          <View style={styles.rewardContent}>
            <Text style={styles.rewardEyebrow}>REWARDS</Text>
            <Text style={styles.rewardTitle}>Win Chalega Points</Text>
            <Text style={styles.rewardCopy}>
              Competition winners can earn Points that may be redeemed for
              eligible Chalega products and fruit rewards.
            </Text>
          </View>
        </Pressable>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={22} color="#1769E0" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Verified walking comes first</Text>
            <Text style={styles.infoCopy}>
              Chalega competitions use verified walking results and published
              competition rules. Rankings are not based on unverified claims.
            </Text>
          </View>
        </View>

        <Text style={styles.footerTagline}>WALK • COMPETE • WIN • REPEAT</Text>
        <Text style={styles.footerBrand}>CHALEGA KOLKATA™</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F4EE',
  },
  container: {
    padding: 20,
    paddingBottom: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#1769E0',
    marginBottom: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B2239',
  },
  trophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF0DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: '#0B2239',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroHeading: {
    flex: 1,
  },
  heroEyebrow: {
    color: '#F7C56B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    color: BRAND.white,
    fontSize: 30,
    fontWeight: '900',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#173854',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6FD68B',
    marginRight: 6,
  },
  liveText: {
    color: BRAND.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroCopy: {
    color: '#DCE8F2',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
  },
  heroRule: {
    borderTopWidth: 1,
    borderTopColor: '#29435A',
    marginTop: 18,
    paddingTop: 15,
  },
  ruleText: {
    color: BRAND.white,
    fontSize: 18,
    fontWeight: '900',
  },
  ruleSubtext: {
    color: '#AFC4D6',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  loadingCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#667788',
    fontSize: 12,
    marginTop: 10,
  },
  categoryCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  categoryContent: {
    flex: 1,
  },
  categoryEyebrow: {
    color: '#1769E0',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  categoryTitle: {
    color: '#0B2239',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  categoryCopy: {
    color: '#6C7A88',
    fontSize: 10,
    marginTop: 3,
  },
  competitionCard: {
    backgroundColor: '#FFF8EE',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F5D9AE',
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  competitionBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  competitionHeaderText: {
    flex: 1,
  },
  competitionEyebrow: {
    color: '#B66B12',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  competitionName: {
    color: '#0B2239',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  rewardMini: {
    flex: 1,
    backgroundColor: BRAND.white,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  rewardPlace: {
    color: '#7B8793',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rewardPoints: {
    color: '#0B2239',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },
  rewardUnit: {
    color: '#1769E0',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  endsText: {
    color: '#6C7A88',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },
  joinButton: {
    backgroundColor: '#1769E0',
    borderRadius: 15,
    minHeight: 50,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  joinButtonJoined: {
    backgroundColor: '#2E9D62',
  },
  joinButtonText: {
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginLeft: 8,
  },
  submitResultButton: {
    backgroundColor: BRAND.white,
    borderRadius: 15,
    minHeight: 50,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#BFD5F4',
  },
  submitResultButtonText: {
    color: '#1769E0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginLeft: 8,
  },
  resultStatusCard: {
    backgroundColor: '#F3F8F4',
    borderRadius: 15,
    marginTop: 10,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  resultStatusContent: {
    flex: 1,
  },
  resultStatusTitle: {
    color: '#0B2239',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resultStatusCopy: {
    color: '#667788',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#0B2239',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyCopy: {
    color: '#6C7A88',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  secondaryButton: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#1769E0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#0B2239',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  sectionHint: {
    color: '#1769E0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  performanceCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  mainStat: {
    flex: 1,
  },
  statLabel: {
    color: '#7B8793',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  stepsNumber: {
    color: '#0B2239',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 3,
  },
  statMeta: {
    color: '#7B8793',
    fontSize: 11,
    marginTop: 2,
  },
  streakStat: {
    minWidth: 105,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E9ED',
  },
  streakNumber: {
    color: '#0B2239',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 1,
  },
  streakLabel: {
    color: '#7B8793',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8EEF4',
    overflow: 'hidden',
    marginTop: 18,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#1769E0',
  },
  progressText: {
    color: '#667788',
    fontSize: 11,
    marginTop: 8,
  },
  podiumCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  podiumIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  podiumTitle: {
    color: '#0B2239',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  podiumCopy: {
    color: '#6C7A88',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  podiumRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 18,
  },
  placeBox: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  placeEmoji: {
    fontSize: 24,
  },
  placeText: {
    color: '#0B2239',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },
  leaderboardLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  leaderboardLoadingText: {
    color: '#6C7A88',
    fontSize: 11,
    marginTop: 8,
  },
  noLeaderboard: {
    backgroundColor: '#F4F6F8',
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 18,
  },
  noLeaderboardTitle: {
    color: '#0B2239',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
  noLeaderboardCopy: {
    color: '#6C7A88',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 5,
  },
  leaderboardRow: {
    backgroundColor: '#F4F6F8',
    borderRadius: 15,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardRowYou: {
    borderWidth: 1,
    borderColor: '#9BC0F5',
    backgroundColor: '#EEF5FF',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankBadgeText: {
    color: '#1769E0',
    fontSize: 14,
    fontWeight: '900',
  },
  leaderboardName: {
    flex: 1,
    minWidth: 0,
  },
  leaderboardNameText: {
    color: '#0B2239',
    fontSize: 12,
    fontWeight: '900',
  },
  leaderboardMeta: {
    color: '#7B8793',
    fontSize: 9,
    marginTop: 3,
  },
  leaderboardSteps: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  leaderboardStepsNumber: {
    color: '#0B2239',
    fontSize: 16,
    fontWeight: '900',
  },
  leaderboardStepsLabel: {
    color: '#1769E0',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  yourRankCard: {
    backgroundColor: '#0B2239',
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yourRankEyebrow: {
    color: '#F7C56B',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  yourRankNumber: {
    color: BRAND.white,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  yourRankRight: {
    alignItems: 'flex-end',
  },
  yourRankSteps: {
    color: BRAND.white,
    fontSize: 17,
    fontWeight: '900',
  },
  yourRankLabel: {
    color: '#AFC4D6',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  wardGuideCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D9E5F2',
  },
  wardGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wardGuideIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wardGuideHeaderText: {
    flex: 1,
  },
  wardGuideEyebrow: {
    color: '#1769E0',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wardGuideTitle: {
    color: '#0B2239',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  wardGuideCopy: {
    color: '#667788',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  wardGuideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 13,
  },
  wardGuideNumber: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: '#EEF5FF',
    color: '#1769E0',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    paddingTop: 6,
    marginRight: 10,
  },
  wardGuideStepText: {
    flex: 1,
  },
  wardGuideStepTitle: {
    color: '#0B2239',
    fontSize: 11,
    fontWeight: '900',
  },
  wardGuideStepCopy: {
    color: '#6C7A88',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  wardPrizeShareCard: {
    backgroundColor: '#EEF5FF',
    borderRadius: 20,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFD5F4',
  },
  wardPrizeShareIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wardPrizeShareContent: {
    flex: 1,
  },
  wardPrizeShareEyebrow: {
    color: '#1769E0',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wardPrizeShareTitle: {
    color: '#0B2239',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  wardPrizeShareCopy: {
    color: '#667788',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  rewardCard: {
    backgroundColor: '#1769E0',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    marginBottom: 14,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#0F55B7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  rewardContent: {
    flex: 1,
  },
  rewardEyebrow: {
    color: '#CFE0FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  rewardTitle: {
    color: BRAND.white,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  rewardCopy: {
    color: '#E4EDFF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  infoCard: {
    backgroundColor: BRAND.white,
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#0B2239',
    fontSize: 14,
    fontWeight: '900',
  },
  infoCopy: {
    color: '#6C7A88',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  footerTagline: {
    textAlign: 'center',
    color: '#8B97A3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginTop: 28,
  },
  footerBrand: {
    textAlign: 'center',
    color: '#1769E0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.4,
    marginTop: 7,
  },
});
