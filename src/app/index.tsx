import React, { useEffect, useState } from 'react';
import {
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
import { getPoints } from '@/lib/points';
import { BRAND } from '@/lib/brand';

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getStreakFromSteps = (
  rows: Array<{ step_date: string; steps: number | null }>,
  today: string,
) => {
  const stepsByDate = new Map<string, number>();

  for (const row of rows) {
    stepsByDate.set(row.step_date, Math.max(0, Number(row.steps) || 0));
  }

  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);

  while (true) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    if ((stepsByDate.get(dateKey) ?? 0) <= 0) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export default function HomeScreen() {
  const router = useRouter();

  const [steps, setSteps] = useState(0);
  const [goal, setGoal] = useState(4000);
  const [water, setWater] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [mood, setMood] = useState('');
  const [activity, setActivity] = useState('');
  const [sleep, setSleep] = useState('');
  const [lastCheckInDate, setLastCheckInDate] = useState('');
  const [missionCompleted, setMissionCompleted] = useState(false);

  const loadData = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setSteps(0);
        setGoal(4000);
        setWater(0);
        setStreak(0);
        setPoints(0);
        setMood('');
        setActivity('');
        setSleep('');
        setLastCheckInDate('');
        setMissionCompleted(false);
        return;
      }

      const todayKey = getLocalDateKey();

      const startDate = new Date(`${todayKey}T00:00:00`);
      startDate.setDate(startDate.getDate() - 30);
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const startDateKey = `${startYear}-${startMonth}-${startDay}`;

      const [
        { data: stepRows, error: stepsError },
        { data: profile, error: profileError },
        { data: healthCheckIn, error: healthError },
      ] = await Promise.all([
        supabase
          .from('daily_steps')
          .select('step_date, steps')
          .eq('user_id', user.id)
          .gte('step_date', startDateKey)
          .lte('step_date', todayKey)
          .order('step_date', { ascending: false }),
        supabase
          .from('profiles')
          .select('daily_step_goal')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('daily_health_checkins')
          .select('checkin_date, mood, water, activity, sleep')
          .eq('user_id', user.id)
          .eq('checkin_date', todayKey)
          .maybeSingle(),
      ]);

      if (stepsError) {
        throw stepsError;
      }

      if (profileError) {
        throw profileError;
      }

      if (healthError) {
        throw healthError;
      }

      const todaySteps =
        (stepRows ?? []).find(row => row.step_date === todayKey)?.steps ?? 0;

      const dailyGoal =
        typeof profile?.daily_step_goal === 'number' &&
        profile.daily_step_goal > 0
          ? profile.daily_step_goal
          : 4000;

      setSteps(Math.max(0, Number(todaySteps) || 0));
      setGoal(dailyGoal);
      setStreak(
        getStreakFromSteps(
          (stepRows ?? []).map(row => ({
            step_date: row.step_date,
            steps: row.steps,
          })),
          todayKey,
        ),
      );

      if (healthCheckIn) {
        setWater(Math.max(0, Number(healthCheckIn.water) || 0));
        setMood(
          typeof healthCheckIn.mood === 'string'
            ? healthCheckIn.mood
            : '',
        );
        setActivity(
          typeof healthCheckIn.activity === 'string'
            ? healthCheckIn.activity
            : '',
        );
        setSleep(
          typeof healthCheckIn.sleep === 'string'
            ? healthCheckIn.sleep
            : '',
        );
        setLastCheckInDate(healthCheckIn.checkin_date);
      } else {
        setWater(0);
        setMood('');
        setActivity('');
        setSleep('');
        setLastCheckInDate('');
      }

      const storedPoints = await getPoints();
      setPoints(storedPoints);

      const { data: missionRows, error: missionError } = await supabase
        .from('daily_steps')
        .select('steps')
        .eq('user_id', user.id)
        .eq('step_date', todayKey)
        .maybeSingle();

      if (missionError) {
        throw missionError;
      }

      setMissionCompleted(
        Math.max(0, Number(missionRows?.steps) || 0) >= dailyGoal,
      );
    } catch (error) {
      console.log('Could not load Chalega home data:', error);
    }
  };

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const safeGoal =
    goal > 0 ? goal : 4000;

  const stepProgress = Math.min(
    steps / safeGoal,
    1,
  );

  const remainingSteps = Math.max(
    safeGoal - steps,
    0,
  );

  /*
   * ----------------------------------------------------
   * CANONICAL HEALTH SCORE
   * ----------------------------------------------------
   *
   * This uses the same scoring model as the Health tab.
   *
   * Walking       30 points
   * Hydration     20 points
   * Mood          15 points
   * Activity      15 points
   * Sleep         10 points
   * Streak         5 points
   * Check-in       5 points
   *
   * Total = 100
   */

  const waterProgress =
    Math.min(water / 8, 1);

  const walkingScore = Math.round(
    stepProgress * 30,
  );

  const hydrationScore = Math.round(
    waterProgress * 20,
  );

  const moodScore =
    mood === 'great'
      ? 15
      : mood === 'good'
      ? 13
      : mood === 'okay'
      ? 9
      : mood === 'care'
      ? 6
      : 0;

  const activityScore =
    activity === 'walked'
      ? 15
      : activity === 'movement'
      ? 11
      : activity === 'not-yet'
      ? 3
      : 0;

  const sleepScore =
    sleep === 'good'
      ? 10
      : sleep === 'okay'
      ? 7
      : sleep === 'not-enough'
      ? 4
      : 0;

  const streakScore = Math.min(
    streak,
    5,
  );

  const todayKey = getLocalDateKey();

  const checkInCompletedToday =
    lastCheckInDate === todayKey;

  const checkInScore =
    checkInCompletedToday
      ? 5
      : 0;

  const healthScore = Math.min(
    100,
    walkingScore +
      hydrationScore +
      moodScore +
      activityScore +
      sleepScore +
      streakScore +
      checkInScore,
  );

  const missionProgress = missionCompleted
    ? 100
    : Math.round(stepProgress * 100);

  const missionMessage = missionCompleted
    ? '🎉 Mission complete!'
    : `${remainingSteps.toLocaleString(
        'en-IN'
      )} steps remaining`;

  const openMissions = () => {
    router.push('/missions');
  };

  const openWalking = () => {
    router.push('/walking');
  };

  const openCompetitions = () => {
    router.push('/competitions');
  };

  const openRewards = () => {
    router.push('/rewards');
  };

  const openPointsActivity = () => {
    router.push('/points-activity');
  };

  const openHealth = () => {
    router.push('/explore');
  };

  const openShop = () => {
    router.push('/shop');
  };

  const openOrders = () => {
    router.push('/orders');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Image
              source={require("../../assets/chalega-india-logo.png")}
              style={styles.homeLogo}
              resizeMode="contain"
            />

            <Text style={styles.greeting}>
              Good morning 👋
            </Text>

            <Text style={styles.subtitle}>
              Chalo Health Banaye
            </Text>
          </View>

          <TouchableOpacity
            style={styles.pointsButton}
            onPress={openRewards}
          >
            <Text style={styles.pointsIcon}>
              🏆
            </Text>

            <Text style={styles.pointsNumber}>
              {points}
            </Text>

            <Text style={styles.pointsLabel}>
              POINTS
            </Text>
          </TouchableOpacity>
        </View>

        {/* HEALTH SCORE */}

        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.cardEyebrow}>
              YOUR HEALTH TODAY
            </Text>

            <Text style={styles.scoreNumber}>
              {healthScore}
              <Text style={styles.scoreOutOf}>
                /100
              </Text>
            </Text>

            <Text style={styles.scoreMessage}>
              {healthScore >= 90
                ? 'Outstanding! You are building a great healthy routine.'
                : healthScore >= 80
                ? 'Excellent work. Keep your healthy routine going!'
                : healthScore >= 65
                ? 'Good progress. A few small habits can make it even better.'
                : healthScore >= 45
                ? 'You are moving in the right direction. Keep building your habits.'
                : 'Every healthy choice counts.'}
            </Text>
          </View>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleText}>
              {healthScore}
            </Text>

            <Text style={styles.scoreCircleLabel}>
              HEALTH
            </Text>
          </View>
        </View>

        {/* COMPETITION HQ */}

        <TouchableOpacity
          style={styles.competitionCard}
          onPress={openCompetitions}
          activeOpacity={0.9}
        >
          <View style={styles.competitionIconBox}>
            <Text style={styles.competitionEmoji}>🏆</Text>
          </View>

          <View style={styles.competitionText}>
            <Text style={styles.competitionEyebrow}>
              CHALEGA COMPETITION
            </Text>

            <Text style={styles.competitionTitle}>
              Walk. Compete. Win.
            </Text>

            <Text style={styles.competitionSubtitle}>
              Your verified steps can put you on today's podium.
            </Text>

            <View style={styles.competitionMetaRow}>
              <Text style={styles.competitionMeta}>
                1st • 2nd • 3rd
              </Text>

              <Text style={styles.competitionOpen}>
                OPEN →
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* TODAY'S MISSION */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            TODAY'S MISSION
          </Text>

          <TouchableOpacity
            onPress={openMissions}
          >
            <Text style={styles.viewAll}>
              VIEW ALL →
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.missionCard,
            missionCompleted &&
              styles.missionCardComplete,
          ]}
          onPress={openMissions}
          activeOpacity={0.9}
        >
          <View style={styles.missionTop}>
            <View
              style={[
                styles.missionIcon,
                missionCompleted &&
                  styles.missionIconComplete,
              ]}
            >
              <Text style={styles.missionEmoji}>
                {missionCompleted
                  ? '🏆'
                  : '🎯'}
              </Text>
            </View>

            <View style={styles.missionText}>
              <Text style={styles.missionTitle}>
                {missionCompleted
                  ? 'Mission complete!'
                  : `Walk ${safeGoal.toLocaleString(
                      'en-IN'
                    )} steps`}
              </Text>

              <Text style={styles.missionSubtitle}>
                {missionCompleted
                  ? 'Amazing work. Keep your streak alive.'
                  : 'Complete your walking mission today.'}
              </Text>
            </View>

            <Text style={styles.missionArrow}>
              ›
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                missionCompleted &&
                  styles.progressComplete,
                {
                  width: `${missionProgress}%`,
                },
              ]}
            />
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {steps.toLocaleString('en-IN')} steps
            </Text>

            <Text style={styles.progressText}>
              +40 POINTS
            </Text>
          </View>

          <View style={styles.missionBottom}>
            <Text style={styles.remainingText}>
              {missionMessage}
            </Text>

            <Text style={styles.openText}>
              OPEN →
            </Text>
          </View>
        </TouchableOpacity>

        {/* CONNECTION STATUS */}

        <View style={styles.connectedCard}>
          <View style={styles.connectedDot} />

          <View style={styles.connectedText}>
            <Text style={styles.connectedTitle}>
              CHALEGA SYSTEM CONNECTED
            </Text>

            <Text style={styles.connectedSubtitle}>
              Walking • Missions • Points • Rewards
            </Text>
          </View>

          <TouchableOpacity
            onPress={openRewards}
          >
            <Text style={styles.connectedArrow}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS */}

        <Text style={styles.sectionTitle}>
          QUICK ACTIONS
        </Text>

        <View style={styles.quickGrid}>

          <TouchableOpacity
            style={[
              styles.quickCard,
              styles.quickWalking,
            ]}
            onPress={openWalking}
          >
            <Image
              source={require("../../assets/quick-actions/walking.png")}
              style={styles.quickImage}
              resizeMode="contain"
            />

            <Text style={styles.quickTitle}>
              Walking
            </Text>

            <Text style={styles.quickText}>
              {steps.toLocaleString('en-IN')} steps
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickCard,
              styles.quickMissions,
            ]}
            onPress={openMissions}
          >
            <Image
              source={require("../../assets/quick-actions/missions.png")}
              style={styles.quickImage}
              resizeMode="contain"
            />

            <Text style={styles.quickTitle}>
              Missions
            </Text>

            <Text style={styles.quickText}>
              {missionCompleted
                ? 'Completed today'
                : '+93 points available'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickCard,
              styles.quickHealth,
            ]}
            onPress={openHealth}
          >
            <Image
              source={require("../../assets/quick-actions/health.png")}
              style={styles.quickImage}
              resizeMode="contain"
            />

            <Text style={styles.quickTitle}>
              Health
            </Text>

            <Text style={styles.quickText}>
              Learn & improve
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickCard,
              styles.quickRewards,
            ]}
            onPress={openRewards}
          >
            <Image
              source={require("../../assets/quick-actions/rewards.png")}
              style={styles.quickImage}
              resizeMode="contain"
            />

            <Text style={styles.quickTitle}>
              Rewards
            </Text>

            <Text style={styles.quickText}>
              {points} points
            </Text>
          </TouchableOpacity>

        </View>

        {/* HYDRATION */}

        <View style={styles.hydrationCard}>

          <View style={styles.hydrationHeader}>
            <View>
              <Text style={styles.hydrationEyebrow}>
                HYDRATION
              </Text>

              <Text style={styles.hydrationTitle}>
                Drink more water 💧
              </Text>
            </View>

            <Text style={styles.hydrationCount}>
              {water}/8
            </Text>
          </View>

          <View style={styles.waterRow}>
            {Array.from(
              { length: 8 },
              (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.waterGlass,
                    index < water &&
                      styles.waterGlassFilled,
                  ]}
                >
                  <Text style={styles.waterGlassText}>
                    {index < water
                      ? '💧'
                      : '○'}
                  </Text>
                </View>
              )
            )}
          </View>

          <Text style={styles.hydrationHint}>
            Hydration contributes to your Health Score.
          </Text>

        </View>

        {/* STREAK */}

        <TouchableOpacity
          style={styles.streakCard}
          onPress={openMissions}
          activeOpacity={0.9}
        >
          <View style={styles.streakIconBox}>
            <Text style={styles.streakEmoji}>
              🔥
            </Text>
          </View>

          <View style={styles.streakText}>
            <Text style={styles.streakLabel}>
              YOUR STREAK
            </Text>

            <Text style={styles.streakNumber}>
              {streak} DAYS
            </Text>

            <Text style={styles.streakMessage}>
              Keep your healthy habit alive today.
            </Text>
          </View>

          <Text style={styles.streakArrow}>
            ›
          </Text>
        </TouchableOpacity>

        {/* COMMUNITY */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            CHALEGA COMMUNITY
          </Text>

          <Text style={styles.sectionTitle}>
            TOGETHER
          </Text>
        </View>

        <View style={styles.communityCard}>

          <View style={styles.communityIcon}>
            <Text style={styles.communityEmoji}>
              🏙️
            </Text>
          </View>

          <View style={styles.communityText}>
            <Text style={styles.communityTitle}>
              You're not walking alone.
            </Text>

            <Text style={styles.communitySubtitle}>
              1,284 people are moving today.
            </Text>

            <View
              style={styles.communityProgress}
            >
              <View
                style={styles.communityProgressFill}
              />
            </View>

            <Text style={styles.communityNumbers}>
              76,420 / 100,000 community steps
            </Text>
          </View>

        </View>

        {/* AD SPACE */}

        <View style={styles.adCard}>

          <Text style={styles.adLabel}>
            HEALTH PARTNER
          </Text>

          <View style={styles.adInner}>

            <View style={styles.adIconBox}>
              <Text style={styles.adIcon}>
                📢
              </Text>
            </View>

            <View style={styles.adTextBox}>
              <Text style={styles.adTitle}>
                YOUR BUSINESS HERE
              </Text>

              <Text style={styles.adText}>
                Sponsor a healthy mission and reach
                people in your community.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.adButton}
              onPress={() => {
                router.push('/missions');
              }}
            >
              <Text style={styles.adButtonText}>
                EXPLORE
              </Text>
            </TouchableOpacity>

          </View>

        </View>

        {/* SHOP */}

        <TouchableOpacity
          style={styles.shopPromo}
          onPress={openShop}
          activeOpacity={0.9}
        >

          <View style={styles.shopPromoText}>

            <Text style={styles.shopPromoEyebrow}>
              CHALEGA INDIA HEALTH SHOP
            </Text>

            <Text style={styles.shopPromoTitle}>
              Products that support a healthier
              lifestyle.
            </Text>

            <Text style={styles.shopPromoButton}>
              EXPLORE SHOP →
            </Text>

          </View>

          <Text style={styles.shopPromoEmoji}>
            🛍️
          </Text>

        </TouchableOpacity>

        {/* ORDERS */}

        <TouchableOpacity
          style={styles.ordersButton}
          onPress={openOrders}
        >

          <Text style={styles.ordersIcon}>
            📦
          </Text>

          <View style={styles.ordersText}>
            <Text style={styles.ordersTitle}>
              My Orders
            </Text>

            <Text style={styles.ordersSubtitle}>
              Track your Chalega India purchases
            </Text>
          </View>

          <Text style={styles.ordersArrow}>
            ›
          </Text>

        </TouchableOpacity>

        {/* FOOTER */}

        <View style={styles.footer}>

          <Text style={styles.footerBrand}>
            C H A L E G A  I N D I A
          </Text>

          <Text style={styles.footerTagline}>
            Chalo Health Banaye
          </Text>

          <Text style={styles.footerText}>
            Walk more • Live better • Stay healthy
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

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 60,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
  },

  homeLogo: {
    width: 180,
    height: 90,
    marginBottom: 4,
  },

  brand: {
    color: '#1D6FF2',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  greeting: {
    color: BRAND.ink,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },

  subtitle: {
    color: BRAND.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 3,
  },

  pointsButton: {
    width: 70,
    minHeight: 76,
    backgroundColor: BRAND.white,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  pointsIcon: {
    fontSize: 21,
  },

  pointsNumber: {
    color: BRAND.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },

  pointsLabel: {
    color: BRAND.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  scoreCard: {
    backgroundColor: BRAND.blue,
    borderRadius: 25,
    padding: 23,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: BRAND.blue,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 5,
  },

  scoreLeft: {
    flex: 1,
  },

  cardEyebrow: {
    color: '#DCEAFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 47,
    fontWeight: '900',
    marginTop: 2,
  },

  scoreOutOf: {
    fontSize: 19,
    fontWeight: '700',
    color: '#DCEAFF',
  },

  scoreMessage: {
    color: '#E8F1FF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 3,
    maxWidth: 190,
  },

  scoreCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: BRAND.white,
    borderWidth: 7,
    borderColor: BRAND.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  scoreCircleText: {
    color: BRAND.blue,
    fontSize: 28,
    fontWeight: '900',
  },

  scoreCircleLabel: {
    color: BRAND.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 27,
    marginBottom: 12,
  },

  sectionTitle: {
    color: BRAND.ink,
    fontSize: 18,
    fontWeight: '900',
  },

  viewAll: {
    color: '#1D6FF2',
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 2,
  },

  competitionCard: {
    backgroundColor: '#102A43',
    borderRadius: 23,
    padding: 18,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  competitionIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: BRAND.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  competitionEmoji: {
    fontSize: 29,
  },

  competitionText: {
    flex: 1,
    paddingLeft: 14,
  },

  competitionEyebrow: {
    color: '#FFB347',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  competitionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },

  competitionSubtitle: {
    color: '#DCEAFF',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  competitionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 9,
  },

  competitionMeta: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  competitionOpen: {
    color: '#7FE3A5',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  missionCard: {
    backgroundColor: BRAND.white,
    borderRadius: 23,
    padding: 20,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  missionCardComplete: {
    backgroundColor: BRAND.greenLight,
  },

  missionTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  missionIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: BRAND.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  missionIconComplete: {
    backgroundColor: BRAND.greenLight,
  },

  missionEmoji: {
    fontSize: 26,
  },

  missionText: {
    flex: 1,
    paddingLeft: 13,
  },

  missionTitle: {
    color: BRAND.ink,
    fontSize: 16,
    fontWeight: '900',
  },

  missionSubtitle: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  missionArrow: {
    color: '#1D6FF2',
    fontSize: 30,
    fontWeight: '300',
  },

  progressBackground: {
    height: 10,
    backgroundColor: '#E7EBEF',
    borderRadius: 5,
    marginTop: 20,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: BRAND.blue,
    borderRadius: 5,
  },

  progressComplete: {
    backgroundColor: BRAND.green,
  },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  progressText: {
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: '700',
  },

  missionBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 13,
    alignItems: 'center',
  },

  remainingText: {
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: '700',
  },

  openText: {
    color: '#1D6FF2',
    fontSize: 10,
    fontWeight: '900',
  },

  connectedCard: {
    backgroundColor: '#EAF8F0',
    borderRadius: 16,
    padding: 13,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  connectedDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BRAND.green,
  },

  connectedText: {
    flex: 1,
    paddingLeft: 9,
  },

  connectedTitle: {
    color: BRAND.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  connectedSubtitle: {
    color: BRAND.muted,
    fontSize: 9,
    marginTop: 2,
  },

  connectedArrow: {
    color: BRAND.green,
    fontSize: 25,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  quickCard: {
    width: '48.2%',
    backgroundColor: BRAND.white,
    borderRadius: 22,
    padding: 17,
    marginBottom: 12,
    minHeight: 132,
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 1,
  },

  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    shadowColor: BRAND.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  quickWalking: {
    backgroundColor: BRAND.blue,
  },

  quickMissions: {
    backgroundColor: BRAND.orange,
  },

  quickHealth: {
    backgroundColor: BRAND.green,
  },

  quickRewards: {
    backgroundColor: BRAND.gold,
  },

  quickImage: {
    width: 64,
    height: 64,
    marginBottom: -2,
  },

  quickTitle: {
    color: BRAND.white,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 10,
  },

  quickText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    marginTop: 3,
  },

  hydrationCard: {
    backgroundColor: BRAND.white,
    borderRadius: 22,
    padding: 20,
    marginTop: 8,
  },

  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  hydrationEyebrow: {
    color: '#1D6FF2',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  hydrationTitle: {
    color: BRAND.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },

  hydrationCount: {
    color: '#1D6FF2',
    fontSize: 23,
    fontWeight: '900',
  },

  waterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  waterGlass: {
    width: 30,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  waterGlassFilled: {
    backgroundColor: '#DDF3E5',
  },

  waterGlassText: {
    fontSize: 17,
  },

  hydrationHint: {
    color: '#999999',
    fontSize: 10,
    marginTop: 12,
  },

  streakCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 22,
    padding: 18,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  streakIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  streakEmoji: {
    fontSize: 28,
  },

  streakText: {
    flex: 1,
    paddingLeft: 14,
  },

  streakLabel: {
    color: '#A06C00',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  streakNumber: {
    color: BRAND.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },

  streakMessage: {
    color: BRAND.muted,
    fontSize: 11,
    marginTop: 2,
  },

  streakArrow: {
    color: '#A06C00',
    fontSize: 28,
  },

  communityCard: {
    backgroundColor: '#10202F',
    borderRadius: 23,
    padding: 20,
    flexDirection: 'row',
  },

  communityIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },

  communityEmoji: {
    fontSize: 25,
  },

  communityText: {
    flex: 1,
    paddingLeft: 14,
  },

  communityTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  communitySubtitle: {
    color: '#BDBDBD',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  communityProgress: {
    height: 7,
    backgroundColor: '#333333',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },

  communityProgressFill: {
    width: '76%',
    height: '100%',
    backgroundColor: BRAND.white,
    borderRadius: 4,
  },

  communityNumbers: {
    color: '#AAAAAA',
    fontSize: 9,
    marginTop: 5,
  },

  adCard: {
    marginTop: 20,
  },

  adLabel: {
    color: '#999999',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },

  adInner: {
    backgroundColor: BRAND.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E8ED',
    borderStyle: 'dashed',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  adIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: BRAND.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adIcon: {
    fontSize: 21,
  },

  adTextBox: {
    flex: 1,
    paddingHorizontal: 11,
  },

  adTitle: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  adText: {
    color: BRAND.muted,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },

  adButton: {
    backgroundColor: '#10202F',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },

  adButtonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },

  shopPromo: {
    backgroundColor: BRAND.blue,
    borderRadius: 23,
    padding: 21,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  shopPromoText: {
    flex: 1,
  },

  shopPromoEyebrow: {
    color: '#CFE2FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  shopPromoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    marginTop: 6,
  },

  shopPromoButton: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 13,
  },

  shopPromoEmoji: {
    fontSize: 48,
    marginLeft: 8,
  },

  ordersButton: {
    backgroundColor: BRAND.white,
    borderRadius: 22,
    padding: 17,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  ordersIcon: {
    fontSize: 24,
  },

  ordersText: {
    flex: 1,
    paddingLeft: 13,
  },

  ordersTitle: {
    color: BRAND.ink,
    fontSize: 15,
    fontWeight: '900',
  },

  ordersSubtitle: {
    color: BRAND.muted,
    fontSize: 10,
    marginTop: 3,
  },

  ordersArrow: {
    color: '#1D6FF2',
    fontSize: 28,
  },

  footer: {
    alignItems: 'center',
    marginTop: 35,
    paddingBottom: 15,
  },

  footerBrand: {
    color: '#1D6FF2',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },

  footerTagline: {
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  footerText: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 5,
  },
});