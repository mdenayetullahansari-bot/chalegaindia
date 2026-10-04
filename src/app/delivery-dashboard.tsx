import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BRAND } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import {
  DeliveryPartner,
  getMyDeliveryAssignments,
  getMyDeliveryPartner,
  getMyDeliveryPayouts,
  setMyDeliveryAvailability,
  acceptMyDeliveryAssignment,
  rejectMyDeliveryAssignment,
  acceptMyDeliveryBatch,
  rejectMyDeliveryBatch,
  updateMyDeliveryJobStatus,
} from '@/services/deliveryService';
import { startDeliveryLocationTracking, stopDeliveryLocationTracking } from '@/services/deliveryLocation';

export default function DeliveryDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [deliveryActionError, setDeliveryActionError] = useState('');
  const [deliveryActionLoading, setDeliveryActionLoading] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      setAuthenticated(!!user);

      if (!user) {
        setPartner(null);
        setAssignments([]);
        setPayouts([]);
        return;
      }

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

  const handlePartnerLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setLoginError('Please enter your email and password.');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError('');

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      setPassword('');
      await load();
    } catch (error: any) {
      setLoginError(error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!partner || partner.status !== 'approved') return;
    if (partner.availability !== 'online' && partner.availability !== 'busy') return;

    let cancelled = false;

    startDeliveryLocationTracking().catch(async (error: any) => {
      if (cancelled) return;
      if (Platform.OS !== 'web') {
        try {
          await setMyDeliveryAvailability('offline');
          setPartner(prev => prev ? { ...prev, availability: 'offline' } : prev);
        } catch {
          // Leave the backend state unchanged if the safety fallback fails.
        }
      } else {
        setAvailabilityError(error?.message || 'Live location could not be refreshed.');
      }
      Alert.alert(
        'Location required',
        error?.message || 'Live location is required while you are online.'
      );
    });

    return () => {
      cancelled = true;
    };
  }, [partner?.id, partner?.status, partner?.availability]);

  const approved = partner?.status === 'approved';
  const online = partner?.availability === 'online';
  const busy = partner?.availability === 'busy';
  const active = online || busy;

  const changeAvailability = async () => {
    if (!partner || !approved || availabilityLoading) return;

    try {
      setAvailabilityLoading(true);
      setAvailabilityError('');

      if (online) {
        await stopDeliveryLocationTracking();
        await setMyDeliveryAvailability('offline');
        setPartner(prev => prev ? { ...prev, availability: 'offline' } : prev);
        return;
      }

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          await new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              async position => {
                try {
                  const { error } = await supabase.rpc('update_delivery_partner_location', {
                    p_latitude: position.coords.latitude,
                    p_longitude: position.coords.longitude,
                    p_accuracy_m: position.coords.accuracy ?? null,
                  });
                  if (error) throw error;
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
              error => reject(new Error(error.message || 'Browser location could not be read.')),
              { enableHighAccuracy: false, maximumAge: 300000, timeout: 30000 },
            );
          });
        } catch (locationError: any) {
          const locationMessage = locationError?.message || '';
          if (!/timeout|timed out/i.test(locationMessage)) throw locationError;
        }

        await setMyDeliveryAvailability('online');
        setPartner(prev => prev ? { ...prev, availability: 'online' } : prev);
        return;
      }

      await startDeliveryLocationTracking();
      await setMyDeliveryAvailability('online');
      setPartner(prev => prev ? { ...prev, availability: 'online' } : prev);
    } catch (error: any) {
      const message = error?.message || 'Please allow location access and try again.';
      setAvailabilityError(message);
      Alert.alert('Could not change availability', message);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleBatchAssignment = async (batchId: string, action: 'accept' | 'reject') => {
    try {
      setDeliveryActionError('');
      setDeliveryActionLoading(batchId + ':' + action);
      if (action === 'accept') {
        await acceptMyDeliveryBatch(batchId);
      } else {
        await rejectMyDeliveryBatch(batchId);
      }
      await load();
    } catch (error: any) {
      const message = error?.message || 'Please try again.';
      setDeliveryActionError(message);
      Alert.alert(
        action === 'accept' ? 'Could not accept batch' : 'Could not reject batch',
        message
      );
    } finally {
      setDeliveryActionLoading('');
    }
  };

  const handleAssignment = async (assignmentId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await acceptMyDeliveryAssignment(assignmentId);
      } else {
        await rejectMyDeliveryAssignment(assignmentId);
      }
      await load();
    } catch (error: any) {
      Alert.alert(action === 'accept' ? 'Could not accept job' : 'Could not reject job', error?.message || 'Please try again.');
    }
  };


  const handleProgress = async (
    jobId: string,
    status: 'picked_up' | 'out_for_delivery' | 'delivered'
  ) => {
    try {
      await updateMyDeliveryJobStatus(jobId, status);
      await load();
    } catch (error: any) {
      Alert.alert(
        'Could not update delivery',
        error?.message || 'Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator size="large" color={BRAND.teal} />
        <Text style={styles.loadingText}>Loading delivery dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
          <View style={styles.emptyIcon}>
            <Ionicons name="bicycle" size={34} color={BRAND.teal} />
          </View>
          <Text style={styles.title}>Delivery Partner Login</Text>
          <Text style={styles.body}>
            Sign in with the account linked to your approved Chalega delivery partner profile.
          </Text>
          <View style={styles.loginCard}>
            <Text style={styles.loginLabel}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="partner@example.com"
              placeholderTextColor="#9AA4B2"
              style={styles.loginInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.loginLabel}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#9AA4B2"
              style={styles.loginInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handlePartnerLogin}
            />
            {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
            <TouchableOpacity
              style={[styles.primary, loginLoading && styles.disabledButton]}
              onPress={handlePartnerLogin}
              disabled={loginLoading}
            >
              <Text style={styles.primaryText}>
                {loginLoading ? 'SIGNING IN...' : 'SIGN IN AS DELIVERY PARTNER'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.loginHint}>
            Only an authenticated account linked to an approved delivery partner can access delivery jobs.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.secondary}>
            <Text style={styles.secondaryText}>GO BACK</Text>
          </TouchableOpacity>
        </ScrollView>
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
              {approved ? (busy ? 'BUSY' : online ? 'ONLINE' : 'OFFLINE') : partner.status.toUpperCase()}
            </Text>
          </View>
          {approved && !busy && (
            <>
            <TouchableOpacity style={[styles.availabilityButton, online && styles.availabilityButtonOnline, availabilityLoading && styles.disabledButton]} onPress={changeAvailability} disabled={availabilityLoading}>
              <View style={[styles.availabilityDot, online && styles.availabilityDotOnline]} />
              <Text style={[styles.availabilityText, online && styles.availabilityTextOnline]}>
                {online ? 'GO OFFLINE' : 'GO ONLINE'}
              </Text>
            </TouchableOpacity>
            {availabilityError ? <Text style={styles.availabilityError}>{availabilityError}</Text> : null}
            </>
          )}
          {approved && busy ? <Text style={styles.busyHint}>DELIVERY IN PROGRESS — COMPLETE THE ACTIVE JOB TO GO OFFLINE.</Text> : null}
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
          <Row
            label="Live location"
            value={
              partner.location_updated_at
                ? 'GPS active'
                : active
                ? 'Waiting for GPS'
                : 'Offline'
            }
          />
        </View>

        <Text style={styles.section}>MY DELIVERIES</Text>
        {deliveryActionError ? <Text style={styles.deliveryActionError}>{deliveryActionError}</Text> : null}
        {assignments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={29} color={BRAND.teal} />
            <Text style={styles.emptyCardTitle}>No delivery jobs yet</Text>
            <Text style={styles.emptyCardText}>
              Approved partners will see assigned delivery jobs here.
            </Text>
          </View>
        ) : (
          (() => {
            const displayed: any[] = [];
            const seenBatches = new Set<string>();
            for (const item of assignments.slice(0, 20)) {
              const batchId = item.job?.batch_id;
              if (item.status === 'offered' && batchId) {
                if (seenBatches.has(batchId)) continue;
                seenBatches.add(batchId);
                const batchItems = assignments.filter(
                  candidate => candidate.status === 'offered' && candidate.job?.batch_id === batchId
                );
                const total = batchItems.reduce(
                  (sum, candidate) => sum + Number(candidate.job?.partner_earnings || 0),
                  0
                );
                displayed.push({ type: 'batch', item, batchItems, total });
              } else {
                displayed.push({ type: 'job', item });
              }
            }
            return displayed.slice(0, 10).map(entry => {
              if (entry.type === 'batch') {
                const { item, batchItems, total } = entry;
                return (
                  <View key={item.job.batch_id} style={styles.jobCard}>
                    <View style={styles.jobIcon}>
                      <Ionicons name="layers" size={22} color={BRAND.teal} />
                    </View>
                    <View style={styles.jobText}>
                      <Text style={styles.jobTitle}>BATCH OFFER</Text>
                      <Text style={styles.jobMeta}>{batchItems.length} DELIVERIES • EARN ₹{total.toFixed(0)}</Text>
                      {item.job?.drop_area ? <Text style={styles.jobAddress}>{item.job.drop_area}</Text> : null}
                      <Text style={styles.batchSubtext}>
                        {batchItems.map((candidate: any) => candidate.job?.order_id).filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                    {online && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleBatchAssignment(item.job.batch_id, 'reject')}
                          disabled={!!deliveryActionLoading}
                        >
                          <Text style={styles.rejectText}>{deliveryActionLoading === item.job.batch_id + ':reject' ? 'REJECTING...' : 'REJECT BATCH'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          onPress={() => handleBatchAssignment(item.job.batch_id, 'accept')}
                          disabled={!!deliveryActionLoading}
                        >
                          <Text style={styles.acceptText}>{deliveryActionLoading === item.job.batch_id + ':accept' ? 'ACCEPTING...' : 'ACCEPT BATCH'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              }

              const item = entry.item;
              return (
            <View key={item.id} style={styles.jobCard}>
              <View style={styles.jobIcon}>
                <Ionicons name="cube" size={22} color={BRAND.teal} />
              </View>
              <View style={styles.jobText}>
                <Text style={styles.jobTitle}>{item.job?.order_id || 'Delivery Job'}</Text>
                <Text style={styles.jobMeta}>{(item.job?.status || item.status).replaceAll('_', ' ').toUpperCase()}</Text>
                {item.job?.drop_area ? <Text style={styles.jobAddress}>{item.job.drop_area}</Text> : null}
                {item.job?.drop_pin ? <Text style={styles.jobAddress}>PIN {item.job.drop_pin}</Text> : null}
              </View>
              <Text style={styles.jobDate}>
                {new Date(item.offered_at).toLocaleDateString('en-IN')}
              </Text>
              {item.status === 'offered' && online && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleAssignment(item.id, 'reject')}>
                    <Text style={styles.rejectText}>REJECT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => handleAssignment(item.id, 'accept')}>
                    <Text style={styles.acceptText}>ACCEPT</Text>
                  </TouchableOpacity>
                </View>
              )}
              {active && item.job?.status === 'accepted' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleProgress(item.job.id, 'picked_up')}
                  >
                    <Text style={styles.acceptText}>PICK UP</Text>
                  </TouchableOpacity>
                </View>
              )}
              {active && item.job?.status === 'picked_up' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleProgress(item.job.id, 'out_for_delivery')}
                  >
                    <Text style={styles.acceptText}>OUT FOR DELIVERY</Text>
                  </TouchableOpacity>
                </View>
              )}
              {active && item.job?.status === 'out_for_delivery' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleProgress(item.job.id, 'delivered')}
                  >
                    <Text style={styles.acceptText}>DELIVERED</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
              );
            });
          })()
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
  loginContent: { flexGrow: 1, padding: 20, paddingTop: 70, paddingBottom: 50, alignItems: 'center', justifyContent: 'center' },
  loginCard: { width: '100%', maxWidth: 520, backgroundColor: BRAND.white, borderRadius: 20, padding: 20, marginTop: 18 },
  loginLabel: { color: BRAND.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginBottom: 7, marginTop: 5 },
  loginInput: { height: 52, borderWidth: 1, borderColor: '#E1E5EB', borderRadius: 14, paddingHorizontal: 15, color: BRAND.midnight, fontSize: 15, backgroundColor: BRAND.cream, marginBottom: 14 },
  loginError: { color: '#B42318', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  loginHint: { maxWidth: 520, textAlign: 'center', color: BRAND.muted, fontSize: 10, lineHeight: 15, marginTop: 15 },
  disabledButton: { opacity: 0.6 },
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
  busyStatusText: { color: '#A06C00', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  availabilityButton: { marginTop: 13, alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: BRAND.white, borderWidth: 1, borderColor: BRAND.teal, flexDirection: 'row', alignItems: 'center', gap: 8 },
  availabilityButtonOnline: { backgroundColor: BRAND.greenLight, borderColor: BRAND.green },
  availabilityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A06C00' },
  availabilityDotOnline: { backgroundColor: BRAND.green },
  availabilityText: { color: BRAND.teal, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  availabilityTextOnline: { color: BRAND.green },
  availabilityError: { color: '#B42318', fontSize: 10, lineHeight: 15, marginTop: 8, maxWidth: 420 },
  busyHint: { color: '#A06C00', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginTop: 10, maxWidth: 520 },
  deliveryActionError: { color: '#B42318', fontSize: 11, lineHeight: 16, marginBottom: 10, maxWidth: 700 },
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
  jobCard: { backgroundColor: BRAND.white, borderRadius: 18, padding: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 9 },
  jobIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: BRAND.greenLight, alignItems: 'center', justifyContent: 'center' },
  jobText: { flex: 1, paddingLeft: 12 },
  jobTitle: { color: BRAND.midnight, fontSize: 13, fontWeight: '900' },
  jobMeta: { color: BRAND.teal, fontSize: 9, fontWeight: '900', marginTop: 3 },
  jobDate: { color: BRAND.muted, fontSize: 9, fontWeight: '700' },
  jobAddress: { color: BRAND.muted, fontSize: 9, marginTop: 3 },
  batchSubtext: { color: BRAND.muted, fontSize: 8, marginTop: 5, lineHeight: 13 },
  actionRow: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 12 },
  rejectButton: { flex: 1, minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: '#D5DCE2', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: BRAND.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  acceptButton: { flex: 1, minHeight: 40, borderRadius: 13, backgroundColor: BRAND.teal, alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: BRAND.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
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
