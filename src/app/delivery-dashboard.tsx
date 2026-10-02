import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  DeliveryPartner,
  getMyDeliveryAssignments,
  getMyDeliveryPartner,
  getMyDeliveryPayouts,
} from '@/services/deliveryService';

export default function DeliveryDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const current = await getMyDeliveryPartner();
      setPartner(current);

      if (current) {
        const [nextAssignments, nextPayouts] = await Promise.all([
          getMyDeliveryAssignments(),
          getMyDeliveryPayouts(),
        ]);
        setAssignments(nextAssignments);
        setPayouts(nextPayouts);
      }
    } catch (error: any) {
      Alert.alert('Could not load delivery account', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approved = partner?.status === 'approved';
  const online = partner?.availability === 'online';

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND.teal} />
        <Text style={styles.loadingText}>Loading delivery dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bicycle" size={34} color={BRAND.teal} />
          </View>
          <Text style={styles.title}>Become a Delivery Partner</Text>
          <Text style={styles.body}>
            Deliver Chalega orders around Kolkata and earn from completed jobs.
          </Text>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => router.push('/delivery-partner')}
          >
            <Text style={styles.primaryText}>START APPLICATION</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.secondary}>
            <Text style={styles.secondaryText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalPaid = payouts
    .filter(item => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={23} color={BRAND.midnight} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>DELIVERY PARTNER</Text>
          <TouchableOpacity style={styles.refresh} onPress={load}>
            <Ionicons name="refresh" size={20} color={BRAND.teal} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>CHALEGA DELIVERY</Text>
          <Text style={styles.title}>Your delivery dashboard</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, approved && styles.dotApproved]} />
            <Text style={styles.statusText}>
              {approved ? (online ? 'ONLINE' : 'OFFLINE') : partner.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {!approved && (
          <View style={styles.pending}>
            <Ionicons name="time-outline" size={23} color="#A06C00" />
            <View style={styles.pendingText}>
              <Text style={styles.pendingTitle}>Application under review</Text>
              <Text style={styles.pendingBody}>
                Your delivery account is not active yet. Once approved, delivery jobs will appear here.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{assignments.length}</Text>
            <Text style={styles.statLabel}>JOBS</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>₹{totalPaid.toFixed(0)}</Text>
            <Text style={styles.statLabel}>PAID</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{payouts.filter(p => p.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>
        </View>

        <Text style={styles.section}>DELIVERY ACCOUNT</Text>
        <View style={styles.card}>
          <Row label="Vehicle" value={partner.vehicle_type} />
          <Row label="Vehicle number" value={partner.vehicle_number || 'Not provided'} />
          <Row label="Area" value={partner.city_area || 'Not provided'} />
          <Row label="Phone" value={partner.phone || 'Not provided'} />
        </View>

        <Text style={styles.section}>MY DELIVERIES</Text>
        {assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={29} color={BRAND.teal} />
            <Text style={styles.emptyCardTitle}>No delivery jobs yet</Text>
            <Text style={styles.emptyCardText}>
              Approved partners will see assigned delivery jobs here.
            </Text>
          </View>
        ) : (
          assignments.slice(0, 10).map(item => (
            <View key={item.id} style={styles.jobCard}>
              <View style={styles.jobIcon}>
                <Ionicons name="cube" size={22} color={BRAND.teal} />
              </View>
              <View style={styles.jobText}>
                <Text style={styles.jobTitle}>Delivery Job</Text>
                <Text style={styles.jobMeta}>{item.status.replaceAll('_', ' ').toUpperCase()}</Text>
              </View>
              <Text style={styles.jobDate}>
                {new Date(item.offered_at).toLocaleDateString('en-IN')}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.section}>PAYOUTS</Text>
        <View style={styles.card}>
          {payouts.length === 0 ? (
            <Text style={styles.muted}>No payouts yet.</Text>
          ) : (
            payouts.slice(0, 5).map(item => (
              <View key={item.id} style={styles.payoutRow}>
                <View>
                  <Text style={styles.payoutAmount}>₹{Number(item.amount).toFixed(0)}</Text>
                  <Text style={styles.payoutStatus}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.jobDate}>
                  {new Date(item.created_at).toLocaleDateString('en-IN')}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  loading: { flex: 1, backgroundColor: BRAND.cream, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: BRAND.muted, fontSize: 12, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 50 },
  topBar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  refresh: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: BRAND.midnight, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  header: { paddingTop: 25, paddingBottom: 20 },
  eyebrow: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: BRAND.midnight, fontSize: 28, fontWeight: '900', marginTop: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#A06C00' },
  dotApproved: { backgroundColor: BRAND.green },
  statusText: { color: BRAND.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pending: { backgroundColor: BRAND.goldLight, borderRadius: 18, padding: 15, flexDirection: 'row', gap: 10, marginBottom: 18 },
  pendingText: { flex: 1 },
  pendingTitle: { color: BRAND.ink, fontSize: 14, fontWeight: '900' },
  pendingBody: { color: '#665B42', fontSize: 10, lineHeight: 15, marginTop: 3 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 23 },
  stat: { flex: 1, backgroundColor: BRAND.white, borderRadius: 18, padding: 15 },
  statValue: { color: BRAND.midnight, fontSize: 20, fontWeight: '900' },
  statLabel: { color: BRAND.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  section: { color: BRAND.midnight, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginTop: 5 },
  card: { backgroundColor: BRAND.white, borderRadius: 20, padding: 16, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  rowLabel: { color: BRAND.muted, fontSize: 10, fontWeight: '700' },
  rowValue: { color: BRAND.midnight, fontSize: 11, fontWeight: '900', textTransform: 'capitalize', maxWidth: '58%', textAlign: 'right' },
  emptyCard: { backgroundColor: BRAND.white, borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 20 },
  emptyCardTitle: { color: BRAND.midnight, fontSize: 15, fontWeight: '900', marginTop: 9 },
  emptyCardText: { color: BRAND.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 4 },
  jobCard: { backgroundColor: BRAND.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  jobIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: BRAND.greenLight, alignItems: 'center', justifyContent: 'center' },
  jobText: { flex: 1, paddingLeft: 12 },
  jobTitle: { color: BRAND.midnight, fontSize: 13, fontWeight: '900' },
  jobMeta: { color: BRAND.teal, fontSize: 9, fontWeight: '900', marginTop: 3 },
  jobDate: { color: BRAND.muted, fontSize: 9, fontWeight: '700' },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  payoutAmount: { color: BRAND.midnight, fontSize: 14, fontWeight: '900' },
  payoutStatus: { color: BRAND.teal, fontSize: 8, fontWeight: '900', marginTop: 2 },
  muted: { color: BRAND.muted, fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { width: 72, height: 72, borderRadius: 23, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  body: { color: BRAND.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 330 },
  primary: { marginTop: 22, backgroundColor: BRAND.teal, minHeight: 54, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: BRAND.white, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  secondary: { marginTop: 12, padding: 12 },
  secondaryText: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
});
