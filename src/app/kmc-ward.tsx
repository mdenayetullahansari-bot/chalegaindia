import { BRAND } from '@/lib/brand';
import React, { useState } from 'react';
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
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const COLORS = {
  blue: BRAND.teal,
  navy: '#0B1F33',
  muted: '#6B7785',
  background: '#F7F5F0',
  white: COLORS.white,
  border: '#E4E8ED',
  green: '#247A3A',
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type WardAssignment = {
  success: boolean;
  ward_id: number;
  ward_number: number;
  boundary_version: string | null;
  assignment_method: string;
};

export default function KmcWardScreen() {
  const router = useRouter();

  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);
  const [wardAssignment, setWardAssignment] =
    useState<WardAssignment | null>(null);

  const goBackToProfileSettings = () => {
    router.replace('/profile-settings');
  };

  const findMyWard = async () => {
    if (locating) {
      return;
    }

    try {
      setLocating(true);
      setWardAssignment(null);
      setCoordinates(null);

      const servicesEnabled =
        await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          'Location is turned off',
          'Please turn on Location Services on your device and try again.',
        );
        return;
      }

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Chalega needs your location permission to find your KMC ward.',
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      /*
       * Keep the coordinates only in local React state for this
       * screen/session. They are not saved to the profile.
       *
       * The server-side RPC receives the coordinates and performs
       * the official KMC boundary match itself.
       */
      setCoordinates({
        latitude,
        longitude,
      });

      const { data, error } = await supabase.rpc(
        'assign_my_kmc_ward',
        {
          p_lat: latitude,
          p_lng: longitude,
        },
      );

      if (error) {
        console.warn(
          '[KMC WARD] Ward assignment RPC error:',
          error,
        );

        Alert.alert(
          'Could not determine your ward',
          error.message ||
            'Your location could not be matched to an active KMC ward.',
        );
        return;
      }

      const assignment = data as WardAssignment;

      if (
        !assignment ||
        assignment.success !== true ||
        typeof assignment.ward_number !== 'number'
      ) {
        Alert.alert(
          'Ward not found',
          'Your current location could not be matched to an active KMC ward.',
        );
        return;
      }

      setWardAssignment(assignment);

      Alert.alert(
        'KMC ward found',
        `You have been assigned to KMC Ward ${assignment.ward_number}.`,
      );
    } catch (error) {
      console.warn(
        '[KMC WARD] Location or assignment error:',
        error,
      );

      Alert.alert(
        'Could not get your ward',
        'Please make sure Location Services are enabled and try again.',
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBackToProfileSettings}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            FIND MY WARD
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="location"
              size={34}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.heroEyebrow}>
            KOLKATA MUNICIPAL CORPORATION
          </Text>

          <Text style={styles.heroTitle}>
            Find your KMC ward.
          </Text>

          <Text style={styles.heroText}>
            We can use your current location to
            determine which KMC ward you belong to.
          </Text>
        </View>

        {/* PRIVACY */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={COLORS.green}
            />
          </View>

          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>
              Your location stays private
            </Text>

            <Text style={styles.privacyText}>
              Chalega uses your current location
              only to determine your KMC ward. Your
              precise GPS coordinates are not permanently
              stored in your profile.
            </Text>
          </View>
        </View>

        {/* FIND BUTTON */}
        <TouchableOpacity
          style={[
            styles.findButton,
            locating && styles.findButtonDisabled,
          ]}
          onPress={findMyWard}
          activeOpacity={0.85}
          disabled={locating}
        >
          {locating ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.findButtonText}>
                FINDING YOUR WARD...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="navigate"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.findButtonText}>
                FIND MY WARD
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* LOCATION / WARD RESULT */}
        {coordinates && wardAssignment ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultIcon}>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={COLORS.green}
                />
              </View>

              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>
                  KMC ward identified
                </Text>

                <Text style={styles.resultSubtitle}>
                  Your location matched an official KMC ward boundary
                </Text>
              </View>
            </View>

            <View style={styles.resultDivider} />

            <View style={styles.wardResultRow}>
              <View>
                <Text style={styles.coordinateLabel}>
                  YOUR KMC WARD
                </Text>

                <Text style={styles.wardNumber}>
                  Ward {wardAssignment.ward_number}
                </Text>
              </View>

              <View style={styles.assignedBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.green}
                />

                <Text style={styles.assignedBadgeText}>
                  ASSIGNED
                </Text>
              </View>
            </View>

            <View style={styles.assignmentInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={COLORS.green}
              />

              <Text style={styles.assignmentInfoText}>
                Assigned using GPS and official KMC boundary data
              </Text>
            </View>
          </View>
        ) : coordinates ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultIcon}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.green}
                />
              </View>

              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>
                  Location captured
                </Text>

                <Text style={styles.resultSubtitle}>
                  Checking the official KMC ward boundary
                </Text>
              </View>
            </View>

            <View style={styles.resultDivider} />

            <Text style={styles.waitingText}>
              Your coordinates are being matched against
              the official KMC ward boundary data.
            </Text>
          </View>
        ) : null}

        {/* MATCHING STATUS */}
        <View style={styles.nextCard}>
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>
              {wardAssignment ? 'COMPLETE' : 'HOW IT WORKS'}
            </Text>
          </View>

          <Text style={styles.nextTitle}>
            {wardAssignment
              ? `You are assigned to Ward ${wardAssignment.ward_number}`
              : 'Official KMC boundary matching'}
          </Text>

          <Text style={styles.nextText}>
            {wardAssignment
              ? 'Your KMC ward has been saved to your Chalega profile. Your precise GPS coordinates are not stored as part of the ward assignment.'
              : 'Your location is matched against the official KMC ward boundary data. The server determines the matching ward before assigning it to your profile.'}
          </Text>

          <View style={styles.nextRow}>
            <Ionicons
              name={
                wardAssignment
                  ? 'checkmark-circle-outline'
                  : 'map-outline'
              }
              size={18}
              color={
                wardAssignment
                  ? COLORS.green
                  : COLORS.blue
              }
            />

            <Text
              style={[
                styles.nextRowText,
                wardAssignment && styles.nextRowTextSuccess,
              ]}
            >
              {wardAssignment
                ? `GPS -> KMC boundary -> Ward ${wardAssignment.ward_number}`
                : 'GPS -> KMC boundary -> Ward number'}
            </Text>
          </View>
        </View>

        {/* HOW IT WILL WORK */}
        <Text style={styles.sectionTitle}>
          HOW IT WORKS
        </Text>

        <View style={styles.stepsCard}>
          <Step
            number="1"
            icon="location-outline"
            title="Allow location"
            text="Give Chalega temporary access to your current location."
          />

          <Step
            number="2"
            icon="map-outline"
            title="Match the boundary"
            text="Your coordinates are checked against the official KMC ward boundaries on the server."
          />

          <Step
            number="3"
            icon="business-outline"
            title="Assign your ward"
            text="Your profile receives the appropriate KMC ward number."
          />

          <Step
            number="4"
            icon="people-outline"
            title="Join your community"
            text="Your ward can then connect you with the relevant Chalega community."
          />
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            CHALEGA KOLKATA
          </Text>

          <Text style={styles.footerTagline}>
            WALK • EARN • IMPROVE • REPEAT
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type StepProps = {
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};

function Step({
  number,
  icon,
  title,
  text,
}: StepProps) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.stepIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.blue}
        />
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text style={styles.stepText}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
  },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  headerSpacer: {
    width: 42,
    height: 42,
  },

  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 27,
    padding: 24,
    marginTop: 20,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#173B5C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  heroEyebrow: {
    color: '#69D88A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
    marginTop: 8,
  },

  heroText: {
    color: '#B9C9D8',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 8,
  },

  privacyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 17,
    flexDirection: 'row',
    marginTop: 16,
  },

  privacyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAF7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  privacyContent: {
    flex: 1,
    paddingLeft: 12,
  },

  privacyTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  privacyText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 4,
  },

  findButton: {
    height: 57,
    borderRadius: 19,
    backgroundColor: COLORS.blue,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },

  findButtonDisabled: {
    opacity: 0.7,
  },

  findButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    marginTop: 16,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EAF7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultHeaderText: {
    flex: 1,
    paddingLeft: 12,
  },

  resultTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  resultSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  resultDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },

  coordinateLabel: {
    color: '#8A95A0',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  wardResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  wardNumber: {
    color: COLORS.navy,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 5,
  },

  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7EE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },

  assignedBadgeText: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  assignmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 7,
  },

  assignmentInfoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '700',
  },

  waitingText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
  },

  nextCard: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 22,
    padding: 19,
    marginTop: 16,
  },

  nextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 11,
  },

  nextBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  nextTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: '900',
  },

  nextText: {
    color: '#5F6D7A',
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 6,
  },

  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },

  nextRowText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: '900',
  },

  nextRowTextSuccess: {
    color: COLORS.green,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 27,
    marginBottom: 10,
  },

  stepsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 78,
  },

  stepNumber: {
    width: 27,
    height: 27,
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  stepIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  stepContent: {
    flex: 1,
    paddingLeft: 11,
  },

  stepTitle: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: '900',
  },

  stepText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 3,
  },

  footer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },

  footerBrand: {
    color: COLORS.blue,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
  },

  footerTagline: {
    color: '#A1A8AF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 7,
  },
});