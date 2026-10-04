import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
  AdminDeliveryPayout,
  getAdminDeliveryPayouts,
  isChalegaAdmin,
  markDeliveryPayoutPaid,
} from '@/services/adminService';

export default function AdminPayouts() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<AdminDeliveryPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const allowed = await isChalegaAdmin();
      setAdmin(allowed);

      if (!allowed) {
        setPayouts([]);
        return;
      }

      setPayouts(await getAdminDeliveryPayouts());
    } catch (e: any) {
      setError(e?.message || 'Could not load admin payouts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const markPaid = async (payout: AdminDeliveryPayout) => {
    if (payout.status !== 'pending' || payingId) return;

    try {
      setPayingId(payout.id);
      setError('');
      await markDeliveryPayoutPaid(payout.id);
      await load();
      Alert.alert('Payout marked paid', `₹${Number(payout.amount || 0).toFixed(0)} is now marked as paid.`);
    } catch (e: any) {
      const message = e?.message || 'Could not mark payout as paid.';
      setError(message);
      Alert.alert('Could not mark payout paid', message);
    } finally {
      setPayingId('');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND.teal} />
        <Text style={styles.loadingText}>Loading admin payouts...</Text>
      </SafeAreaView>
    );
  }

  if (!admin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.denied}>
          <View style={styles.icon}>
            <Ionicons name="lock-closed" size={30} color={BRAND.teal} />
          </View>
          <Text style={styles.title}>Admin access required</Text>
          <Text style={styles.body}>
            This area is restricted to authorised Chalega administrators.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pending = payouts.filter(item => item.status === 'pending');
  const paid = payouts.filter(item => item.status === 'paid');
  const pendingTotal = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidTotal = paid.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={23} color={BRAND.midnight} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>ADMIN PAYOUTS</Text>
          <TouchableOpacity style={styles.refresh} onPress={refresh}>
            <Ionicons name="refresh" size={20} color={BRAND.teal} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>CHALEGA ADMIN</Text>
          <Text style={styles.title}>Delivery payouts</Text>
          <Text style={styles.body}>
            Review completed delivery earnings and mark partner payouts as paid.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pending.length}</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>₹{pendingTotal.toFixed(0)}</Text>
            <Text style={styles.statLabel}>TO PAY</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>₹{paidTotal.toFixed(0)}</Text>
            <Text style={styles.statLabel}>PAID</Text>
          </View>
        </View>

        <Text style={styles.section}>PENDING PAYOUTS</Text>
        {pending.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={30} color={BRAND.green} />
            <Text style={styles.emptyTitle}>No pending payouts</Text>
            <Text style={styles.emptyText}>All completed delivery payouts have been settled.</Text>
          </View>
        ) : (
          pending.map(item => (
            <View key={item.id} style={styles.payoutCard}>
              <View style={styles.payoutTop}>
                <View style={styles.amountWrap}>
                  <Text style={styles.amount}>₹{Number(item.amount || 0).toFixed(0)}</Text>
                  <Text style={styles.pending}>PENDING</Text>
                </View>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
              </View>

              <View style={styles.details}>
                <Detail label="Order" value={item.order_id || '—'} />
                <Detail label="Delivery" value={item.job_status?.replaceAll('_', ' ').toUpperCase() || '—'} />
                <Detail label="Partner area" value={item.partner_area || '—'} />
                <Detail label="Vehicle" value={item.vehicle_number || '—'} />
                <Detail label="Drop area" value={item.drop_area || '—'} />
                <Detail label="PIN" value={item.drop_pin || '—'} />
              </View>

              <TouchableOpacity
                style={[styles.payButton, payingId === item.id && styles.disabled]}
                onPress={() => markPaid(item)}
                disabled={!!payingId}
              >
                <Text style={styles.payText}>
                  {payingId === item.id ? 'MARKING PAID...' : 'MARK PAID'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.section}>RECENT PAID PAYOUTS</Text>
        {paid.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No paid payouts yet.</Text>
          </View>
        ) : (
          paid.slice(0, 10).map(item => (
            <View key={item.id} style={styles.paidCard}>
              <View>
                <Text style={styles.amount}>₹{Number(item.amount || 0).toFixed(0)}</Text>
                <Text style={styles.paidLabel}>PAID</Text>
              </View>
              <View style={styles.paidRight}>
                <Text style={styles.order}>{item.order_id || '—'}</Text>
                <Text style={styles.date}>
                  {item.paid_at ? new Date(item.paid_at).toLocaleDateString('en-IN') : '—'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  loading: { flex: 1, backgroundColor: BRAND.cream, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: BRAND.muted, fontSize: 12, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  topBar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  refresh: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: BRAND.midnight, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  header: { paddingTop: 25, paddingBottom: 20 },
  eyebrow: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: BRAND.midnight, fontSize: 28, fontWeight: '900', marginTop: 6 },
  body: { color: BRAND.muted, fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 620 },
  error: { color: '#B42318', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: BRAND.white, borderRadius: 18, padding: 15 },
  statValue: { color: BRAND.midnight, fontSize: 20, fontWeight: '900' },
  statLabel: { color: BRAND.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  section: { color: BRAND.midnight, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginTop: 6 },
  payoutCard: { backgroundColor: BRAND.white, borderRadius: 20, padding: 16, marginBottom: 12 },
  payoutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  amountWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  amount: { color: BRAND.midnight, fontSize: 20, fontWeight: '900' },
  pending: { color: BRAND.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  date: { color: BRAND.muted, fontSize: 9, fontWeight: '700' },
  details: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F4' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  detailLabel: { color: BRAND.muted, fontSize: 9, fontWeight: '700' },
  detailValue: { color: BRAND.midnight, fontSize: 10, fontWeight: '900', maxWidth: '65%', textAlign: 'right' },
  payButton: { marginTop: 14, minHeight: 48, borderRadius: 14, backgroundColor: BRAND.teal, alignItems: 'center', justifyContent: 'center' },
  payText: { color: BRAND.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  disabled: { opacity: 0.6 },
  emptyCard: { backgroundColor: BRAND.white, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 22 },
  emptyTitle: { color: BRAND.midnight, fontSize: 15, fontWeight: '900', marginTop: 8 },
  emptyText: { color: BRAND.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5 },
  paidCard: { backgroundColor: BRAND.white, borderRadius: 17, padding: 14, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paidLabel: { color: BRAND.green, fontSize: 8, fontWeight: '900', marginTop: 2 },
  paidRight: { alignItems: 'flex-end', maxWidth: '65%' },
  order: { color: BRAND.midnight, fontSize: 10, fontWeight: '900' },
  icon: { width: 72, height: 72, borderRadius: 23, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  denied: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  secondary: { marginTop: 16, padding: 12 },
  secondaryText: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
});
