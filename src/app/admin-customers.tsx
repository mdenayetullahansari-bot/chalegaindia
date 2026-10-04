import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { AdminCustomer, getAdminCustomers } from '@/services/adminCustomerService';

export default function AdminCustomers() {
  const router = useRouter();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setCustomers(await getAdminCustomers());
    } catch (error: any) {
      alert(error?.message || 'Could not load customers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND.teal} />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={BRAND.teal}
          />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={23} color={BRAND.midnight} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>CHALEGA ADMIN</Text>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={16} color={BRAND.teal} />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>CUSTOMER NETWORK</Text>
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>
            Review customer accounts, order activity and Chalega Points.
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>CUSTOMER ACCOUNTS</Text>
        </View>

        <Text style={styles.section}>CUSTOMER ACCOUNTS</Text>

        {customers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={32} color={BRAND.teal} />
            <Text style={styles.emptyTitle}>No customers yet</Text>
            <Text style={styles.emptyText}>
              Registered customer profiles will appear here.
            </Text>
          </View>
        ) : (
          customers.map(customer => (
            <View key={customer.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={22} color={BRAND.teal} />
                </View>
                <View style={styles.identity}>
                  <Text style={styles.name}>{customer.full_name}</Text>
                  <Text style={styles.email}>{customer.email || 'No email'}</Text>
                  <Text style={styles.phone}>{customer.phone || 'No phone recorded'}</Text>
                </View>
                <View style={styles.points}>
                  <Text style={styles.pointsValue}>{customer.points}</Text>
                  <Text style={styles.pointsLabel}>POINTS</Text>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <Detail label="AREA" value={customer.area || '—'} />
                <Detail label="WARD" value={customer.ward_id ? String(customer.ward_id) : '—'} />
                <Detail label="ORDERS" value={String(customer.orders_count)} />
                <Detail label="TOTAL SPEND" value={'₹' + Number(customer.total_spend || 0).toFixed(0)} />
                <Detail label="LAST ORDER" value={customer.last_order_status || 'No orders'} />
                <Detail
                  label="JOINED"
                  value={new Date(customer.created_at).toLocaleDateString('en-IN')}
                />
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
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  loadingText: { marginTop: 12, color: BRAND.muted, fontSize: 12, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  topBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
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
  eyebrow: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: BRAND.midnight, fontSize: 29, fontWeight: '900', marginTop: 6 },
  subtitle: { color: BRAND.muted, fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 650 },
  stat: { backgroundColor: BRAND.white, borderRadius: 18, padding: 16, marginBottom: 24 },
  statValue: { color: BRAND.midnight, fontSize: 21, fontWeight: '900' },
  statLabel: { color: BRAND.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  section: { color: BRAND.midnight, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: BRAND.white, borderRadius: 21, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#E8FBF7', alignItems: 'center', justifyContent: 'center' },
  identity: { flex: 1, marginLeft: 12 },
  name: { color: BRAND.midnight, fontSize: 15, fontWeight: '900' },
  email: { color: BRAND.muted, fontSize: 10, marginTop: 3 },
  phone: { color: BRAND.muted, fontSize: 10, marginTop: 2 },
  points: { minWidth: 58, alignItems: 'center' },
  pointsValue: { color: BRAND.teal, fontSize: 17, fontWeight: '900' },
  pointsLabel: { color: BRAND.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 2 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, borderTopWidth: 1, borderTopColor: '#EDF0F3', paddingTop: 12 },
  detail: { width: '33.33%', paddingVertical: 7, paddingRight: 8 },
  detailLabel: { color: '#8A949E', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  detailValue: { color: BRAND.midnight, fontSize: 10, fontWeight: '800', marginTop: 3 },
  empty: { backgroundColor: BRAND.white, borderRadius: 20, padding: 30, alignItems: 'center' },
  emptyTitle: { color: BRAND.midnight, fontSize: 15, fontWeight: '900', marginTop: 10 },
  emptyText: { color: BRAND.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 4 },
});
