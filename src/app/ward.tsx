import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { findKmcWardByPoint, saveKmcWardAssignment } from '../lib/kmcWard';

export default function WardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [wardNumber, setWardNumber] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const findMyWard = async () => {
    if (loading) return;

    setLoading(true);
    setWardNumber(null);
    setStatus(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus(
          'Location permission is needed to identify your KMC ward. You can enable it in your phone settings.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const result = await findKmcWardByPoint(
        position.coords.latitude,
        position.coords.longitude,
      );

      if (!result) {
        setStatus(
          'Official 209-ward GIS boundaries are not available in the app yet. Your location was not assigned to a ward.',
        );
        return;
      }

      await saveKmcWardAssignment(result.ward_id);
      setWardNumber(result.ward_number);
      setStatus('Your ward has been saved to your Chalega India profile.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to identify your ward right now.';
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  const confirmWard = () => {
    if (wardNumber == null) return;

    Alert.alert(
      `KMC Ward ${wardNumber}`,
      'This ward was identified from your current GPS location using the official GIS boundary loaded into Chalega India.',
      [{ text: 'Done', onPress: () => router.back() }],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>KMC COMMUNITY</Text>
          <Text style={styles.title}>Find My Ward</Text>
          <Text style={styles.subtitle}>
            Identify your Kolkata Municipal Corporation ward from your current location.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.cardTitle}>Your location stays private</Text>
          <Text style={styles.cardText}>
            Chalega India uses your current coordinates only to perform the ward lookup. We do not save your GPS coordinates.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={findMyWard}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Find My Ward</Text>
            )}
          </TouchableOpacity>
        </View>

        {wardNumber != null && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>YOUR KMC WARD</Text>
            <Text style={styles.resultNumber}>{wardNumber}</Text>
            <Text style={styles.resultTitle}>Ward {wardNumber}</Text>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmWard}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}

        {status && <Text style={styles.status}>{status}</Text>}

        <Text style={styles.note}>
          Ward boundaries are centrally managed so the same Find My Ward flow can support all 209 KMC wards when the official geometry is available.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  backText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#20252b',
  },
  header: {
    marginTop: 28,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#667085',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#667085',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e6e8ec',
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  resultCard: {
    marginTop: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe3e8',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#667085',
  },
  resultNumber: {
    marginTop: 4,
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '900',
    color: '#111827',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#344054',
  },
  confirmButton: {
    width: '100%',
    marginTop: 18,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  status: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 21,
    color: '#475467',
    textAlign: 'center',
  },
  note: {
    marginTop: 'auto',
    paddingTop: 24,
    fontSize: 12,
    lineHeight: 18,
    color: '#98a2b3',
    textAlign: 'center',
  },
});
