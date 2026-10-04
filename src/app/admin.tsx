import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BRAND } from '@/lib/brand';
import { getAdminDeliveryPayouts, isChalegaAdmin } from '@/services/adminService';

type CardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  tone: 'teal' | 'gold' | 'blue' | 'green';
  onPress: () => void;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const allowed = await isChalegaAdmin();
        setAdmin(allowed);

        if (allowed) {
          const payouts = await getAdminDeliveryPayouts();
          const pending = payouts.filter(item => item.status === 'pending');
          setPendingPayouts(pending.length);
          setPendingAmount(
            pending.reduce((sum, item) => sum + Number(item.amount || 0), 0)
          );
        }
      } catch {
        setAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND.teal} />
        <Text style={styles.loadingText}>Loading admin...</Text>
      </SafeAreaView>
    );
  }

  if (!admin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.denied}>
          <View style={styles.deniedIcon}>
            <Ionicons name="lock-closed" size={30} color={BRAND.teal} />
          </View>
          <Text style={styles.title}>Admin access required</Text>
          <Text style={styles.body}>
            This area is restricted to authorised Chalega administrators.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.backText}>GO HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const card = ({
    icon,
    title,
    subtitle,
    tone,
    onPress,
  }: CardProps) => (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View
        style={[
          styles.cardIcon,
          tone === 'gold' && styles.cardIconGold,
          tone === 'blue' && styles.cardIconBlue,
          tone === 'green' && styles.cardIconGreen,
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={
            tone === 'gold'
              ? '#C48700'
              : tone === 'blue'
                ? BRAND.blue
                : tone === 'green'
                  ? BRAND.green
                  : BRAND.teal
          }
        />
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={21} color={BRAND.teal} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backCircle}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={23} color={BRAND.midnight} />
          </TouchableOpacity>

          <Text style={styles.topTitle}>CHALEGA ADMIN</Text>

          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color={BRAND.teal} />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ADMINISTRATION</Text>
          <Text style={styles.title}>Operations Dashboard</Text>
          <Text style={styles.body}>
            One place to manage orders, delivery operations and partner payouts.
          </Text>
        </View>

        <View style={styles.snapshot}>
          <View style={styles.snapshotItem}>
            <Text style={styles.snapshotValue}>{pendingPayouts}</Text>
            <Text style={styles.snapshotLabel}>PENDING PAYOUTS</Text>
          </View>
          <View style={styles.snapshotItem}>
            <Text style={styles.snapshotValue}>₹{pendingAmount.toFixed(0)}</Text>
            <Text style={styles.snapshotLabel}>TO PAY</Text>
          </View>
        </View>

        <Text style={styles.section}>OPERATIONS</Text>

        {card({
          icon: 'receipt-outline',
          title: 'Orders',
          subtitle: 'View orders, customer details and move orders through fulfilment.',
          tone: 'blue',
          onPress: () => router.push('/orders'),
        })}

        {card({
          icon: 'bicycle-outline',
          title: 'Delivery Operations',
          subtitle: 'Open the delivery partner dashboard and manage active jobs.',
          tone: 'green',
          onPress: () => router.push('/delivery-dashboard'),
        })}

        {card({
          icon: 'cash-outline',
          title: 'Delivery Payouts',
          subtitle: pendingPayouts
            ? `${pendingPayouts} pending payout(s) • ₹${pendingAmount.toFixed(0)} to pay`
            : 'All delivery payouts are currently settled.',
          tone: 'gold',
          onPress: () => router.push('/admin-payouts'),
        })}

        {card({
          icon: 'people-outline',
          title: 'Delivery Partners',
          subtitle: 'Approve partners, monitor availability and review performance.',
          tone: 'teal',
          onPress: () => router.push('/admin-delivery-partners'),
        })}

        <Text style={styles.section}>NEXT ADMIN MODULES</Text>

        <View style={styles.plannedCard}>
          <View style={styles.plannedRow}>
            <Ionicons name="people-outline" size={20} color={BRAND.teal} />
            <View style={styles.plannedText}>
              <Text style={styles.plannedTitle}>Customers</Text>
              <Text style={styles.plannedSubtitle}>
                Customer accounts, activity and support tools.
              </Text>
            </View>
          </View>

          <View style={styles.plannedRow}>
            <Ionicons name="person-outline" size={20} color={BRAND.teal} />
            <View style={styles.plannedText}>
              <Text style={styles.plannedTitle}>Delivery Partners</Text>
              <Text style={styles.plannedSubtitle}>
                Approvals, availability and partner performance.
              </Text>
            </View>
          </View>

          <View style={styles.plannedRow}>
            <Ionicons name="stats-chart-outline" size={20} color={BRAND.teal} />
            <View style={styles.plannedText}>
              <Text style={styles.plannedTitle}>Business Overview</Text>
              <Text style={styles.plannedSubtitle}>
                Orders, revenue, delivery costs and growth metrics.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  loading: {
    flex: 1,
    backgroundColor: BRAND.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  content: { padding: 20, paddingBottom: 60 },
  topBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: BRAND.midnight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  header: { paddingTop: 25, paddingBottom: 20 },
  eyebrow: {
    color: BRAND.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: BRAND.midnight,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  body: {
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 620,
  },
  snapshot: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  snapshotItem: {
    flex: 1,
    backgroundColor: BRAND.white,
    borderRadius: 18,
    padding: 16,
  },
  snapshotValue: {
    color: BRAND.midnight,
    fontSize: 21,
    fontWeight: '900',
  },
  snapshotLabel: {
    color: BRAND.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  section: {
    color: BRAND.midnight,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 6,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#E8FBF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconGold: { backgroundColor: '#FFF6DC' },
  cardIconBlue: { backgroundColor: '#EAF2FF' },
  cardIconGreen: { backgroundColor: '#EAF8EF' },
  cardText: { flex: 1, marginHorizontal: 13 },
  cardTitle: { color: BRAND.midnight, fontSize: 15, fontWeight: '900' },
  cardSubtitle: {
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  plannedCard: {
    backgroundColor: BRAND.white,
    borderRadius: 20,
    padding: 16,
    gap: 18,
  },
  plannedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plannedText: { flex: 1, marginLeft: 12 },
  plannedTitle: {
    color: BRAND.midnight,
    fontSize: 12,
    fontWeight: '900',
  },
  plannedSubtitle: {
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  denied: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deniedIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  backButton: {
    marginTop: 18,
    backgroundColor: BRAND.teal,
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: BRAND.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
