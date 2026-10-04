import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  getMyReferralCode,
  getMyReferralSummary,
  type ReferralSummary,
} from '@/services/referralService';

const NAVY = '#061B2E';
const TEAL = '#00D1A7';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const WHITE = '#FFFFFF';
const SOFT_TEAL = '#E8FBF6';

export default function ReferralScreen() {
  const router = useRouter();

  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReferralSummary>({
    totalReferrals: 0,
    pendingReferrals: 0,
    qualifiedReferrals: 0,
    rewardedReferrals: 0,
    coinsEarned: 0,
  });

  const loadReferralCode = useCallback(async () => {
    try {
      setLoading(true);

      const [code, referralSummary] = await Promise.all([
        getMyReferralCode(),
        getMyReferralSummary(),
      ]);

      setReferralCode(code);
      setSummary(referralSummary);
    } catch (error) {
      console.log('Could not load referral code:', error);

      Alert.alert(
        'Referral unavailable',
        'We could not load your referral code right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferralCode();
  }, [loadReferralCode]);

  const shareReferral = async () => {
    if (!referralCode) {
      return;
    }

    try {
      const referralLink =
        'https://chalegaindia.vercel.app/auth?ref=' +
        encodeURIComponent(referralCode);

      await Share.share({
        message:
          'Join me on Chalega Kolkata - walk, compete and connect.\n\n' +
          'Join using my referral link:\n' +
          referralLink +
          '\n\nReferral code: ' +
          referralCode +
          '\n\nChalega Kolkata',
      });
    } catch (error) {
      console.log('Referral sharing failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={NAVY}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CHALEGA KOLKATA</Text>
          <Text style={styles.title}>Refer & Grow</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="people"
              size={30}
              color={TEAL}
            />
          </View>

          <Text style={styles.heroTitle}>
            Bring your people to Chalega
          </Text>

          <Text style={styles.heroText}>
            Invite friends and family to walk, compete,
            connect and build healthier habits together.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>
          YOUR REFERRAL CODE
        </Text>

        <View style={styles.codeCard}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={TEAL}
            />
          ) : (
            <>
              <Text style={styles.code}>
                {referralCode || '—'}
              </Text>

              <Text style={styles.codeHint}>
                Share this code with someone joining Chalega.
              </Text>
            </>
          )}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {summary.totalReferrals}
            </Text>
            <Text style={styles.statLabel}>INVITED</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {summary.rewardedReferrals}
            </Text>
            <Text style={styles.statLabel}>REWARDED</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {summary.coinsEarned}
            </Text>
            <Text style={styles.statLabel}>COINS EARNED</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.shareButton,
            !referralCode && styles.shareButtonDisabled,
          ]}
          onPress={shareReferral}
          disabled={!referralCode}
          activeOpacity={0.85}
        >
          <Ionicons
            name="share-social"
            size={21}
            color={WHITE}
          />

          <Text style={styles.shareButtonText}>
            SHARE MY CODE
          </Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle"
              size={22}
              color={TEAL}
            />
          </View>

          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>
              How referrals work
            </Text>

            <Text style={styles.infoBody}>
              Share your personal referral code with
              someone you know. When they join through
              your referral and complete the first 1,000 steps,
              both of you receive 25 Chalega Coins.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: NAVY,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 2,
  },

  content: {
    padding: 20,
  },

  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#123149',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  heroTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },

  heroText: {
    color: '#C8D6E2',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 9,
  },

  sectionLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 9,
  },

  codeCard: {
    minHeight: 125,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  code: {
    color: NAVY,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 3,
  },

  codeHint: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 9,
    textAlign: 'center',
  },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 16,
    marginTop: 14,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    color: NAVY,
    fontSize: 20,
    fontWeight: '900',
  },

  statLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: LINE,
  },

  shareButton: {
    height: 56,
    borderRadius: 17,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  shareButtonDisabled: {
    opacity: 0.5,
  },

  shareButtonText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 9,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: SOFT_TEAL,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
  },

  infoIcon: {
    marginRight: 12,
    paddingTop: 1,
  },

  infoText: {
    flex: 1,
  },

  infoTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '900',
  },

  infoBody: {
    color: '#49616E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 5,
  },
});
