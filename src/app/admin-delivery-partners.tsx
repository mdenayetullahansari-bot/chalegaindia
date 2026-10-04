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
import {
  AdminDeliveryPartner,
  getAdminDeliveryPartners,
  setAdminDeliveryPartnerStatus,
} from '@/services/adminDeliveryPartnerService';

const STATUS_TONES: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF6DC', text: '#A06C00' },
  approved: { bg: '#EAF8EF', text: '#208348' },
  suspended: { bg: '#FDECEC', text: '#B33A3A' },
  rejected: { bg: '#F0F2F5', text: '#687482' },
};

export default function AdminDeliveryPartners() {
  const router = useRouter();
  const [partners, setPartners] = useState<AdminDeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState('');

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setPartners(await getAdminDeliveryPartners());
    } catch (error: any) {
      alert(error?.message || 'Could not load delivery partners.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (
    partner: AdminDeliveryPartner,
    status: 'approved' | 'suspended' | 'rejected'
  ) => {
    const message =
      status === 'approved'
        ? 'Approve this delivery partner?'
        : status === 'suspended'
          ? 'Suspend this delivery partner?'
          : 'Reject this delivery partner?';

    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm(message)
        : true;

    if (!confirmed) return;

    try {
      setAction(partner.id + status);
      await setAdminDeliveryPartnerStatus(partner.id, status);
      await load(true);
    } catch (error: any) {
      alert(error?.message || 'Could not update partner status.');
    } finally {
      setAction('');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND.teal} />
        <Text style={styles.loadingText}>Loading delivery partners...</Text>
      </SafeAreaView>
    );
  }

  const pending = partners.filter(p => p.status === 'pending').length;
  const approved = partners.filter(p => p.status === 'approved').length;
  const online = partners.filter(
    p => p.status === 'approved' && p.availability === 'online'
  ).length;

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
          <Text style={styles.eyebrow}>DELIVERY NETWORK</Text>
          <Text style={styles.title}>Delivery Partners</Text>
          <Text style={styles.subtitle}>
            Approve partners, monitor availability and review delivery performance.
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat value={pending} label="PENDING" />
          <Stat value={approved} label="APPROVED" />
          <Stat value={online} label="ONLINE" />
        </View>

        <Text style={styles.section}>PARTNER ACCOUNTS</Text>

        {partners.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={32} color={BRAND.teal} />
            <Text style={styles.emptyTitle}>No delivery partners yet</Text>
            <Text style={styles.emptyText}>
              New delivery partner applications will appear here.
            </Text>
          </View>
        ) : (
          partners.map(partner => {
            const tone = STATUS_TONES[partner.status] || STATUS_TONES.rejected;
            const busy = action.startsWith(partner.id);
            return (
              <View key={partner.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={22} color={BRAND.teal} />
                  </View>
                  <View style={styles.identity}>
                    <Text style={styles.name}>{partner.full_name}</Text>
                    <Text style={styles.email}>{partner.email || 'No email'}</Text>
                    <Text style={styles.phone}>{partner.phone || 'No phone'}</Text>
                  </View>
                  <View style={[styles.status, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusText, { color: tone.text }]}>
                      {partner.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailGrid}>
                  <Detail label="VEHICLE" value={partner.vehicle_type} />
                  <Detail label="NUMBER" value={partner.vehicle_number || '—'} />
                  <Detail label="AREA" value={partner.city_area || '—'} />
                  <Detail label="AVAILABILITY" value={partner.availability.toUpperCase()} />
                  <Detail label="DELIVERED" value={String(partner.delivered_jobs_count)} />
                  <Detail label="PENDING PAYOUT" value={'₹' + Number(partner.pending_payout || 0).toFixed(0)} />
                </View>

                <View style={styles.actions}>
                  {partner.status !== 'approved' && (
                    <ActionButton
                      label={partner.status === 'pending' ? 'APPROVE' : 'RE-APPROVE'}
                      tone="approve"
                      disabled={busy}
                      onPress={() => changeStatus(partner, 'approved')}
                    />
                  )}
                  {partner.status === 'approved' && (
                    <ActionButton
                      label="SUSPEND"
                      tone="suspend"
                      disabled={busy}
                      onPress={() => changeStatus(partner, 'suspended')}
                    />
                  )}
                  {partner.status !== 'rejected' && partner.status !== 'approved' && (
                    <ActionButton
                      label="REJECT"
                      tone="reject"
                      disabled={busy}
                      onPress={() => changeStatus(partner, 'rejected')}
                    />
                  )}
                  {busy && <ActivityIndicator size="small" color={BRAND.teal} />}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

function ActionButton({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: 'approve' | 'suspend' | 'reject';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        tone === 'approve' && styles.approve,
        tone === 'suspend' && styles.suspend,
        tone === 'reject' && styles.reject,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  loading: { flex: 1, backgroundColor: BRAND.cream, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: BRAND.muted, fontSize: 12, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  topBar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: BRAND.midnight, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  header: { paddingTop: 25, paddingBottom: 20 },
  eyebrow: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: BRAND.midnight, fontSize: 29, fontWeight: '900', marginTop: 6 },
  subtitle: { color: BRAND.muted, fontSize: 12, lineHeight: 18, marginTop: 6, maxWidth: 650 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: BRAND.white, borderRadius: 18, padding: 16 },
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
  status: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, borderTopWidth: 1, borderTopColor: '#EDF0F3', paddingTop: 12 },
  detail: { width: '33.33%', paddingVertical: 7, paddingRight: 8 },
  detailLabel: { color: '#8A949E', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  detailValue: { color: BRAND.midnight, fontSize: 10, fontWeight: '800', marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  approve: { backgroundColor: BRAND.teal },
  suspend: { backgroundColor: '#FFF1D6' },
  reject: { backgroundColor: '#FDECEC' },
  actionText: { color: BRAND.midnight, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  disabled: { opacity: 0.5 },
  empty: { backgroundColor: BRAND.white, borderRadius: 20, padding: 30, alignItems: 'center' },
  emptyTitle: { color: BRAND.midnight, fontSize: 15, fontWeight: '900', marginTop: 10 },
  emptyText: { color: BRAND.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 4 },
});
