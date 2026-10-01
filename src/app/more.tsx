import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  endGuestSession,
  hydrateGuestMode,
  subscribeToGuestMode,
} from '@/lib/guest-session';

import { BRAND } from '@/lib/brand';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

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

  const showComingSoon = (title: string) => {
    Alert.alert(
      title,
      'This Chalega feature is being prepared for the next release.'
    );
  };

  const MenuRow = ({
    icon,
    title,
    subtitle,
    onPress,
    tone = 'blue',
  }: {
    icon: IconName;
    title: string;
    subtitle: string;
    onPress: () => void;
    tone?: 'blue' | 'green' | 'gold' | 'grey';
  }) => (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View
        style={[
          styles.menuIcon,
          tone === 'green' && styles.menuIconGreen,
          tone === 'gold' && styles.menuIconGold,
          tone === 'grey' && styles.menuIconGrey,
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={
            tone === 'green'
              ? BRAND.green
              : tone === 'gold'
                ? '#C48700'
                : tone === 'grey'
                  ? BRAND.muted
                  : BRAND.blue
          }
        />
      </View>

      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={21}
        color={BRAND.teal}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CHALEGA KOLKATA</Text>

          <Text style={styles.title}>More</Text>

          <Text style={styles.subtitle}>
            Everything you need for your Chalega journey.
          </Text>
        </View>

        {/* PROFILE / JOURNEY */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={openProfile}
          activeOpacity={0.88}
        >
          <View style={styles.profileIcon}>
            <Ionicons
              name="person"
              size={27}
              color={BRAND.teal}
            />
          </View>

          <View style={styles.profileText}>
            <Text style={styles.profileTitle}>
              Your Healthy Journey
            </Text>

            <Text style={styles.profileSubtitle}>
              Profile • Progress • KMC Ward
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={25}
            color={BRAND.white}
          />
        </TouchableOpacity>

        {/* GUEST */}
        {guestMode && (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Ionicons
                name="person-add"
                size={22}
                color="#A06C00"
              />
            </View>

            <View style={styles.guestContent}>
              <Text style={styles.guestEyebrow}>
                EXPLORING AS A GUEST
              </Text>

              <Text style={styles.guestTitle}>
                Make your journey yours
              </Text>

              <Text style={styles.guestText}>
                Create a free account when you are ready.
                Your current progress stays on this device.
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

        {/* YOUR PROGRESS */}
        <Text style={styles.sectionTitle}>
          YOUR PROGRESS
        </Text>

        <MenuRow
          icon="trophy-outline"
          title="Rewards"
          subtitle="View your Chalega Points and unlock rewards."
          onPress={() => goTo('/rewards')}
        />

        <MenuRow
          icon="flag-outline"
          title="Daily Missions"
          subtitle="Complete healthy actions and earn points."
          onPress={() => goTo('/missions')}
        />

        <MenuRow
          icon="time-outline"
          title="Points Activity"
          subtitle="See everything you have earned and spent."
          onPress={() => goTo('/points-activity')}
          tone="green"
        />

        {/* SHOPPING */}
        <Text style={styles.sectionTitle}>
          SHOPPING
        </Text>

        <MenuRow
          icon="receipt-outline"
          title="My Orders"
          subtitle="View and track your Chalega orders."
          onPress={() => goTo('/customer-orders')}
          tone="grey"
        />

        <MenuRow
          icon="cart-outline"
          title="Health Shop"
          subtitle="Discover products for a healthier lifestyle."
          onPress={() => goTo('/shop')}
          tone="grey"
        />

        {/* COMMUNITY */}
        <Text style={styles.sectionTitle}>
          COMMUNITY
        </Text>

        <TouchableOpacity
          style={styles.communityCard}
          onPress={() =>
            showComingSoon('Chalega Community')
          }
          activeOpacity={0.86}
        >
          <View style={styles.communityIcon}>
            <Ionicons
              name="people"
              size={27}
              color={BRAND.green}
            />
          </View>

          <View style={styles.communityText}>
            <Text style={styles.communityTitle}>
              Chalega Circle
            </Text>

            <Text style={styles.communitySubtitle}>
              Connect, walk and improve together.
            </Text>

            <Text style={styles.communityStatus}>
              COMING NEXT
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color={BRAND.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.wardCard}
          onPress={() => showComingSoon('My KMC Ward')}
          activeOpacity={0.86}
        >
          <View style={styles.wardIcon}>
            <Ionicons
              name="location"
              size={24}
              color={BRAND.orange}
            />
          </View>

          <View style={styles.wardText}>
            <Text style={styles.wardTitle}>
              My KMC Ward
            </Text>

            <Text style={styles.wardSubtitle}>
              Find your ward and see local community activity.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={BRAND.orange}
          />
        </TouchableOpacity>

        {/* REFERRALS */}
        <Text style={styles.sectionTitle}>
          GROW WITH CHALEGA
        </Text>

        <MenuRow
          icon="people-outline"
          title="Refer & Grow"
          subtitle="Invite friends and family to join Chalega."
          onPress={() => goTo('/referral')}
          tone="green"
        />
        {/* HEALTH PARTNERS */}
        <Text style={styles.sectionTitle}>
          PARTNERSHIPS
        </Text>

        <View style={styles.partnerCard}>
          <View style={styles.partnerTop}>
            <View style={styles.partnerIcon}>
              <Ionicons
                name="heart"
                size={23}
                color={BRAND.teal}
              />
            </View>

            <View style={styles.partnerText}>
              <Text style={styles.partnerLabel}>
                HEALTH PARTNER PROGRAM
              </Text>

              <Text style={styles.partnerTitle}>
                Support healthier communities.
              </Text>

              <Text style={styles.partnerBody}>
                Businesses can sponsor missions,
                challenges and community rewards.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.partnerButton}
            onPress={() =>
              goTo('/partner')
            }
            activeOpacity={0.85}
          >
            <Text style={styles.partnerButtonText}>
              LEARN ABOUT PARTNERSHIPS
            </Text>
            <Ionicons
              name="arrow-forward"
              size={17}
              color={BRAND.white}
            />
          </TouchableOpacity>
        </View>

        {/* MORE FROM CHALEGA */}
        <Text style={styles.sectionTitle}>
          MORE FROM CHALEGA
        </Text>

        <View style={styles.smallGrid}>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => goTo('/explore')}
            activeOpacity={0.84}
          >
            <Ionicons
              name="heart-outline"
              size={24}
              color={BRAND.green}
            />
            <Text style={styles.smallTitle}>
              Health
            </Text>
            <Text style={styles.smallText}>
              Learn better habits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallCard}
            onPress={() =>
              showComingSoon('Chalega Circle')
            }
            activeOpacity={0.84}
          >
            <Ionicons
              name="people-outline"
              size={24}
              color={BRAND.teal}
            />
            <Text style={styles.smallTitle}>
              Community
            </Text>
            <Text style={styles.smallText}>
              Move together
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => goTo('/missions')}
            activeOpacity={0.84}
          >
            <Ionicons
              name="flame-outline"
              size={24}
              color={BRAND.orange}
            />
            <Text style={styles.smallTitle}>
              Streaks
            </Text>
            <Text style={styles.smallText}>
              Never break the chain
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => goTo('/competitions?from=more')}
            activeOpacity={0.84}
          >
            <Ionicons
              name="flag-outline"
              size={24}
              color={BRAND.gold}
            />
            <Text style={styles.smallTitle}>
              Challenges
            </Text>
            <Text style={styles.smallText}>
              Push yourself further
            </Text>
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            CHALEGA
          </Text>

          <Text style={styles.footerTagline}>
            MOVE PEOPLE • HEALTHY COMMUNITIES
          </Text>

          <Text style={styles.footerText}>
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
    backgroundColor: BRAND.cream,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 55,
  },

  header: {
    marginBottom: 20,
  },

  eyebrow: {
    color: BRAND.teal,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
  },

  title: {
    color: BRAND.midnight,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 5,
  },

  subtitle: {
    color: BRAND.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
    lineHeight: 19,
  },

  profileCard: {
    backgroundColor: BRAND.teal,
    borderRadius: 23,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  profileIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    flex: 1,
    paddingLeft: 14,
  },

  profileTitle: {
    color: BRAND.white,
    fontSize: 16,
    fontWeight: '900',
  },

  profileSubtitle: {
    color: '#D7F7F1',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  guestCard: {
    backgroundColor: BRAND.goldLight,
    borderRadius: 22,
    padding: 17,
    marginBottom: 24,
    flexDirection: 'row',
  },

  guestIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: BRAND.ink,
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
    backgroundColor: BRAND.ink,
    borderRadius: 11,
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  guestButtonText: {
    color: BRAND.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  sectionTitle: {
    color: BRAND.midnight,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 5,
    marginBottom: 10,
  },

  menuCard: {
    backgroundColor: BRAND.white,
    borderRadius: 19,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuIconGreen: {
    backgroundColor: BRAND.greenLight,
  },

  menuIconGold: {
    backgroundColor: BRAND.goldLight,
  },

  menuIconGrey: {
    backgroundColor: '#F0F2F5',
  },

  menuText: {
    flex: 1,
    paddingHorizontal: 13,
  },

  menuTitle: {
    color: BRAND.midnight,
    fontSize: 15,
    fontWeight: '900',
  },

  menuSubtitle: {
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  communityCard: {
    backgroundColor: BRAND.navy,
    borderRadius: 21,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  communityIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: '#12395A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  communityText: {
    flex: 1,
    paddingLeft: 14,
  },

  communityTitle: {
    color: BRAND.white,
    fontSize: 16,
    fontWeight: '900',
  },

  communitySubtitle: {
    color: '#C8D2DC',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  communityStatus: {
    color: '#75D98D',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 7,
  },

  wardCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  wardIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: BRAND.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  wardText: {
    flex: 1,
    paddingHorizontal: 13,
  },

  wardTitle: {
    color: BRAND.midnight,
    fontSize: 15,
    fontWeight: '900',
  },

  wardSubtitle: {
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  partnerCard: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 22,
    padding: 20,
    marginBottom: 25,
  },

  partnerTop: {
    flexDirection: 'row',
  },

  partnerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  partnerText: {
    flex: 1,
    paddingLeft: 13,
  },

  partnerLabel: {
    color: BRAND.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  partnerTitle: {
    color: BRAND.midnight,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 5,
  },

  partnerBody: {
    color: BRAND.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  partnerButton: {
    backgroundColor: BRAND.navy,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  partnerButtonText: {
    color: BRAND.white,
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
    backgroundColor: BRAND.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    minHeight: 110,
  },

  smallTitle: {
    color: BRAND.midnight,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 9,
  },

  smallText: {
    color: BRAND.muted,
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
    color: BRAND.teal,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
  },

  footerTagline: {
    color: BRAND.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },

  footerText: {
    color: '#9AA4AE',
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.4,
  },
});
