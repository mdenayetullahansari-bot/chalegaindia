import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  endGuestSession,
  hydrateGuestMode,
  subscribeToGuestMode,
} from '@/lib/guest-session';

export default function MoreScreen() {
  const router = useRouter();
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    hydrateGuestMode().then(setGuestMode);
    return subscribeToGuestMode(setGuestMode);
  }, []);

  const goTo = (route: string) => {
    router.push(route as any);
  };

  const openProfile = () => {
    router.push('/profile');
  };

  const createAccount = async () => {
    await endGuestSession();
    router.replace('/auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.brand}>
            C H A L E G A  I N D I A
          </Text>

          <Text style={styles.title}>
            More
          </Text>

          <Text style={styles.subtitle}>
            Everything you need for your Chalega journey.
          </Text>
        </View>

        {/* PROFILE / JOURNEY CARD */}

        <TouchableOpacity
          style={styles.journeyCard}
          onPress={openProfile}
          activeOpacity={0.88}
        >
          <View style={styles.journeyIcon}>
            <Text style={styles.journeyEmoji}>
              🚶
            </Text>
          </View>

          <View style={styles.journeyText}>
            <Text style={styles.journeyTitle}>
              Your Healthy Journey
            </Text>

            <Text style={styles.journeySubtitle}>
              Walk • Earn • Improve • Repeat
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        {guestMode && (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Text style={styles.guestEmoji}>🔒</Text>
            </View>

            <View style={styles.guestContent}>
              <Text style={styles.guestEyebrow}>
                EXPLORING AS A GUEST
              </Text>

              <Text style={styles.guestTitle}>
                Make your journey yours
              </Text>

              <Text style={styles.guestText}>
                Create a free account when you are ready. Your current progress stays on this device.
              </Text>

              <TouchableOpacity
                style={styles.guestButton}
                onPress={createAccount}
                activeOpacity={0.85}
              >
                <Text style={styles.guestButtonText}>
                  CREATE FREE ACCOUNT
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* REWARDS */}

        <Text style={styles.sectionTitle}>
          YOUR PROGRESS
        </Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => goTo('/rewards')}
          activeOpacity={0.85}
        >
          <View style={styles.iconBlue}>
            <Text style={styles.iconText}>
              🏅
            </Text>
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>
              Rewards
            </Text>

            <Text style={styles.menuSubtitle}>
              View your Chalega Points and unlock rewards.
            </Text>
          </View>

          <Text style={styles.menuArrow}>
            ›
          </Text>
        </TouchableOpacity>

        {/* MISSIONS */}

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => goTo('/missions')}
          activeOpacity={0.85}
        >
          <View style={styles.iconBlue}>
            <Text style={styles.iconText}>
              🏃
            </Text>
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>
              Daily Missions
            </Text>

            <Text style={styles.menuSubtitle}>
              Complete healthy actions and earn points.
            </Text>
          </View>

          <Text style={styles.menuArrow}>
            ›
          </Text>
        </TouchableOpacity>

        {/* ORDERS */}

        <Text style={styles.sectionTitle}>
          SHOPPING
        </Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => goTo('/orders')}
          activeOpacity={0.85}
        >
          <View style={styles.iconGrey}>
            <Text style={styles.iconText}>
              📦
            </Text>
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>
              My Orders
            </Text>

            <Text style={styles.menuSubtitle}>
              View and track your Chalega India orders.
            </Text>
          </View>

          <Text style={styles.menuArrow}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => goTo('/shop')}
          activeOpacity={0.85}
        >
          <View style={styles.iconGrey}>
            <Text style={styles.iconText}>
              🛒
            </Text>
          </View>

          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>
              Health Shop
            </Text>

            <Text style={styles.menuSubtitle}>
              Discover products for a healthier lifestyle.
            </Text>
          </View>

          <Text style={styles.menuArrow}>
            ›
          </Text>
        </TouchableOpacity>

        {/* COMMUNITY */}

        <Text style={styles.sectionTitle}>
          COMMUNITY
        </Text>

        <View style={styles.communityCard}>
          <View style={styles.communityIcon}>
            <Text style={styles.communityEmoji}>
              🇮🇳
            </Text>
          </View>

          <View style={styles.communityText}>
            <Text style={styles.communityTitle}>
              Chalega India
            </Text>

            <Text style={styles.communitySubtitle}>
              A healthier India starts with small
              actions by all of us.
            </Text>
          </View>
        </View>

        {/* SPONSOR */}

        <View style={styles.sponsorCard}>

          <Text style={styles.sponsorLabel}>
            HEALTH PARTNER PROGRAM
          </Text>

          <Text style={styles.sponsorTitle}>
            Want to support healthy people?
          </Text>

          <Text style={styles.sponsorText}>
            Businesses can sponsor missions,
            challenges and community rewards.
          </Text>

          <TouchableOpacity
            style={styles.sponsorButton}
            onPress={() => goTo('/missions')}
            activeOpacity={0.85}
          >
            <Text style={styles.sponsorButtonText}>
              BECOME A HEALTH PARTNER →
            </Text>
          </TouchableOpacity>

        </View>

        {/* FUTURE FEATURES */}

        <Text style={styles.sectionTitle}>
          MORE FROM CHALEGA
        </Text>

        <View style={styles.smallGrid}>

          <View style={styles.smallCard}>
            <Text style={styles.smallEmoji}>
              ❤️
            </Text>

            <Text style={styles.smallTitle}>
              Health
            </Text>

            <Text style={styles.smallText}>
              Learn better habits
            </Text>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.smallEmoji}>
              👥
            </Text>

            <Text style={styles.smallTitle}>
              Community
            </Text>

            <Text style={styles.smallText}>
              Move together
            </Text>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.smallEmoji}>
              🔥
            </Text>

            <Text style={styles.smallTitle}>
              Streaks
            </Text>

            <Text style={styles.smallText}>
              Never break the chain
            </Text>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.smallEmoji}>
              🏆
            </Text>

            <Text style={styles.smallTitle}>
              Challenges
            </Text>

            <Text style={styles.smallText}>
              Push yourself further
            </Text>
          </View>

        </View>

        {/* FOOTER */}

        <View style={styles.footer}>

          <Text style={styles.footerBrand}>
            C H A L E G A  I N D I A
          </Text>

          <Text style={styles.footerTagline}>
            Chalo Health Banaye 🇮🇳
          </Text>

          <Text style={styles.footerText}>
            Walk • Earn • Unlock • Repeat
          </Text>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 50,
  },

  header: {
    marginBottom: 20,
  },

  brand: {
    color: '#1976F3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  title: {
    color: '#111111',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 5,
  },

  subtitle: {
    color: '#777777',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
    lineHeight: 19,
  },

  journeyCard: {
    backgroundColor: '#1976F3',
    borderRadius: 23,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  journeyIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  journeyEmoji: {
    fontSize: 28,
  },

  journeyText: {
    flex: 1,
    paddingLeft: 14,
  },

  journeyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  journeySubtitle: {
    color: '#DCEAFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  guestCard: {
    backgroundColor: '#FFF7E3',
    borderRadius: 22,
    padding: 17,
    marginBottom: 24,
    flexDirection: 'row',
  },

  guestIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  guestEmoji: {
    fontSize: 23,
  },

  guestContent: {
    flex: 1,
    paddingLeft: 13,
  },

  guestEyebrow: {
    color: '#A06C00',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  guestTitle: {
    color: '#10202F',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },

  guestText: {
    color: '#665B42',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  guestButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#10202F',
    borderRadius: 11,
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 30,
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 5,
    marginBottom: 10,
  },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBlue: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconGrey: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    fontSize: 24,
  },

  menuText: {
    flex: 1,
    paddingHorizontal: 13,
  },

  menuTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  menuSubtitle: {
    color: '#888888',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  menuArrow: {
    color: '#1976F3',
    fontSize: 29,
  },

  communityCard: {
    backgroundColor: '#111111',
    borderRadius: 21,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  communityIcon: {
    width: 53,
    height: 53,
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
    fontSize: 16,
    fontWeight: '900',
  },

  communitySubtitle: {
    color: '#BBBBBB',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  sponsorCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 22,
    padding: 20,
    marginTop: 5,
    marginBottom: 25,
  },

  sponsorLabel: {
    color: '#1976F3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  sponsorTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 7,
  },

  sponsorText: {
    color: '#666666',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  sponsorButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 15,
  },

  sponsorButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  smallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  smallCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    minHeight: 105,
  },

  smallEmoji: {
    fontSize: 23,
  },

  smallTitle: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },

  smallText: {
    color: '#888888',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },

  footer: {
    alignItems: 'center',
    marginTop: 25,
    paddingBottom: 10,
  },

  footerBrand: {
    color: '#1976F3',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  footerTagline: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },

  footerText: {
    color: '#AAAAAA',
    fontSize: 9,
    marginTop: 4,
  },
});