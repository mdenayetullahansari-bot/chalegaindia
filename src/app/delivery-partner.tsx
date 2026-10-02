import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BRAND } from '@/lib/brand';
import {
  applyAsDeliveryPartner,
  DeliveryVehicleType,
} from '@/services/deliveryService';

const VEHICLES: Array<{
  value: DeliveryVehicleType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { value: 'bike', label: 'Bike', icon: 'bicycle' },
  { value: 'scooter', label: 'Scooter', icon: 'bicycle' },
  { value: 'car', label: 'Car', icon: 'car' },
  { value: 'bicycle', label: 'Cycle', icon: 'bicycle' },
];

export default function DeliveryPartnerOnboarding() {
  const router = useRouter();
  const [vehicleType, setVehicleType] = useState<DeliveryVehicleType>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [cityArea, setCityArea] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!phone.trim()) {
      Alert.alert('Phone required', 'Please enter the phone number you will use for deliveries.');
      return;
    }

    if (!cityArea.trim()) {
      Alert.alert('Area required', 'Please enter your main delivery area.');
      return;
    }

    setSaving(true);
    try {
      await applyAsDeliveryPartner({
        vehicleType,
        vehicleNumber,
        phone,
        cityArea,
      });

      Alert.alert(
        'Application Submitted',
        'Your Chalega Delivery Partner application has been received. Your account will remain offline until it is approved.',
        [{ text: 'Done', onPress: () => router.replace('/delivery-dashboard') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Could not submit',
        error?.message || 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={23} color={BRAND.midnight} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>DELIVERY PARTNER</Text>
            <View style={styles.spacer} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="bicycle" size={31} color={BRAND.teal} />
            </View>
            <Text style={styles.eyebrow}>CHALEGA KOLKATA</Text>
            <Text style={styles.title}>Earn while you move.</Text>
            <Text style={styles.subtitle}>
              Join the local Chalega delivery network and take delivery jobs when you are available.
            </Text>
          </View>

          <Text style={styles.section}>VEHICLE</Text>
          <View style={styles.vehicleGrid}>
            {VEHICLES.map(vehicle => {
              const active = vehicleType === vehicle.value;
              return (
                <TouchableOpacity
                  key={vehicle.value}
                  style={[styles.vehicleCard, active && styles.vehicleActive]}
                  onPress={() => setVehicleType(vehicle.value)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={vehicle.icon}
                    size={25}
                    color={active ? BRAND.white : BRAND.teal}
                  />
                  <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]}>
                    {vehicle.label}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color={BRAND.white} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.section}>YOUR DETAILS</Text>
          <View style={styles.card}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9AA4AE"
              keyboardType="phone-pad"
              style={styles.input}
              maxLength={15}
            />

            <View style={styles.divider} />

            <Text style={styles.label}>VEHICLE NUMBER</Text>
            <TextInput
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. WB01AB1234"
              placeholderTextColor="#9AA4AE"
              autoCapitalize="characters"
              style={styles.input}
              maxLength={20}
            />

            <View style={styles.divider} />

            <Text style={styles.label}>MAIN DELIVERY AREA</Text>
            <TextInput
              value={cityArea}
              onChangeText={setCityArea}
              placeholder="e.g. Entally / Park Street"
              placeholderTextColor="#9AA4AE"
              autoCapitalize="words"
              style={styles.input}
              maxLength={80}
            />
          </View>

          <View style={styles.note}>
            <Ionicons name="shield-checkmark" size={21} color={BRAND.green} />
            <Text style={styles.noteText}>
              Your application is reviewed before delivery jobs can be accepted. You can remain offline whenever you are not delivering.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={submit}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={BRAND.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>APPLY AS DELIVERY PARTNER</Text>
                <Ionicons name="arrow-forward" size={18} color={BRAND.white} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: BRAND.cream },
  content: { padding: 20, paddingBottom: 50 },
  topBar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 42 },
  topTitle: { color: BRAND.midnight, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  hero: { paddingTop: 25, paddingBottom: 25 },
  heroIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: BRAND.white, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  eyebrow: { color: BRAND.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: BRAND.midnight, fontSize: 31, fontWeight: '900', marginTop: 6 },
  subtitle: { color: BRAND.muted, fontSize: 13, lineHeight: 20, fontWeight: '600', marginTop: 7 },
  section: { color: BRAND.midnight, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginTop: 5 },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  vehicleCard: { width: '48%', minHeight: 76, borderRadius: 18, backgroundColor: BRAND.white, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  vehicleActive: { backgroundColor: BRAND.teal },
  vehicleLabel: { flex: 1, color: BRAND.midnight, fontSize: 13, fontWeight: '900' },
  vehicleLabelActive: { color: BRAND.white },
  card: { backgroundColor: BRAND.white, borderRadius: 22, padding: 18, marginBottom: 16 },
  label: { color: '#7A8691', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  input: { color: BRAND.midnight, fontSize: 16, fontWeight: '700', paddingVertical: 7 },
  divider: { height: 1, backgroundColor: '#E9EDF1', marginVertical: 16 },
  note: { backgroundColor: BRAND.greenLight, borderRadius: 18, padding: 15, flexDirection: 'row', gap: 10, marginBottom: 18 },
  noteText: { flex: 1, color: BRAND.muted, fontSize: 10, lineHeight: 16, fontWeight: '600' },
  button: { minHeight: 56, borderRadius: 19, backgroundColor: BRAND.teal, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: BRAND.white, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
});
