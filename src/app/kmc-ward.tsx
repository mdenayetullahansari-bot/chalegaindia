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

const BRAND = {
  blue: '#1D6FF2',
  navy: '#0B1F33',
  muted: '#6B7785',
  background: '#F7F5F0',
  white: '#FFFFFF',
  border: '#E4E8ED',
  green: '#247A3A',
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function KmcWardScreen() {
  const router = useRouter();

  const [locating, setLocating] = useState(false);
  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const goBackToProfileSettings = () => {
    router.replace('/profile-settings');
  };

  const findMyWard = async () => {
    if (locating) {
      return;
    }

    try {
      setLocating(true);

      const servicesEnabled =
        await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          'Location is turned off',
          'Please turn on Location Services on your iPhone and try again.'
        );
        return;
      }

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Chalega India needs your location permission to find your KMC ward.'
        );
        return;
      }

      const position =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const nextCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCoordinates(nextCoordinates);

      Alert.alert(
        'Location captured',
        'Your location was captured successfully. The next step is to match it against the official KMC ward boundaries.'
      );
    } catch (error) {
      console.warn(
        '[KMC WARD] Location error:',
        error
      );

      Alert.alert(
        'Could not get your location',
        'Please make sure Location Services are enabled and try again.'
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
              color={BRAND.navy}
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
              color={BRAND.green}
            />
          </View>

          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>
              Your location stays private
            </Text>

            <Text style={styles.privacyText}>
              Chalega India will use your location
              for ward verification. We do not need
              to permanently store your precise GPS
              coordinates as your ward information.
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
                FINDING LOCATION...
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
                FIND MY LOCATION
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* LOCATION RESULT */}
        {coordinates ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultIcon}>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={BRAND.green}
                />
              </View>

              <View style={styles.resultHeaderText}>
                <Text style={styles.resultTitle}>
                  Location captured
                </Text>

                <Text style={styles.resultSubtitle}>
                  Ready for KMC ward matching
                </Text>
              </View>
            </View>

            <View style={styles.resultDivider} />

            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>
                LATITUDE
              </Text>

              <Text style={styles.coordinateValue}>
                {coordinates.latitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.coordinateRow}>
              <Text style={styles.coordinateLabel}>
                LONGITUDE
              </Text>

              <Text style={styles.coordinateValue}>
                {coordinates.longitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.localOnlyBadge}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={BRAND.muted}
              />

              <Text style={styles.localOnlyText}>
                Displayed locally for this test
              </Text>
            </View>
          </View>
        ) : null}

        {/* IMPORTANT NEXT STEP */}
        <View style={styles.nextCard}>
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>
              NEXT
            </Text>
          </View>

          <Text style={styles.nextTitle}>
            Official KMC boundary matching
          </Text>

          <Text style={styles.nextText}>
            Location alone does not tell us your
            municipal ward. Chalega India must
            match your coordinates against the
            official KMC ward boundary data before
            assigning a ward.
          </Text>

          <View style={styles.nextRow}>
            <Ionicons
              name="map-outline"
              size={18}
              color={BRAND.blue}
            />

            <Text style={styles.nextRowText}>
              GPS → KMC boundary → Ward number
            </Text>
          </View>
        </View>

        {/* HOW IT WILL WORK */}
        <Text style={styles.sectionTitle}>
          HOW IT WILL WORK
        </Text>

        <View style={styles.stepsCard}>
          <Step
            number="1"
            icon="location-outline"
            title="Allow location"
            text="Give Chalega India temporary access to your current location."
          />

          <Step
            number="2"
            icon="map-outline"
            title="Match the boundary"
            text="Your coordinates will be checked against the official KMC ward boundaries."
          />

          <Step
            number="3"
            icon="business-outline"
            title="Assign your ward"
            text="Your profile will receive the appropriate KMC ward number."
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
            CHALEGA INDIA™
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
          color={BRAND.blue}
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
    backgroundColor: BRAND.background,
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
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: BRAND.navy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  headerSpacer: {
    width: 42,
    height: 42,
  },

  hero: {
    backgroundColor: BRAND.navy,
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
    color: BRAND.white,
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
    backgroundColor: BRAND.white,
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
    color: BRAND.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  privacyText: {
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 4,
  },

  findButton: {
    height: 57,
    borderRadius: 19,
    backgroundColor: BRAND.blue,
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
    color: BRAND.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  resultCard: {
    backgroundColor: BRAND.white,
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
    color: BRAND.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  resultSubtitle: {
    color: BRAND.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },

  resultDivider: {
    height: 1,
    backgroundColor: BRAND.border,
    marginVertical: 17,
  },

  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  coordinateLabel: {
    color: '#8A95A0',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  coordinateValue: {
    color: BRAND.navy,
    fontSize: 12,
    fontWeight: '800',
  },

  localOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 5,
  },

  localOnlyText: {
    color: BRAND.muted,
    fontSize: 9,
    fontWeight: '700',
  },

  nextCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 22,
    padding: 19,
    marginTop: 16,
  },

  nextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BRAND.blue,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 11,
  },

  nextBadgeText: {
    color: BRAND.white,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  nextTitle: {
    color: BRAND.navy,
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
    color: BRAND.blue,
    fontSize: 10,
    fontWeight: '900',
  },

  sectionTitle: {
    color: BRAND.navy,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 27,
    marginBottom: 10,
  },

  stepsCard: {
    backgroundColor: BRAND.white,
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
    backgroundColor: BRAND.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberText: {
    color: BRAND.white,
    fontSize: 10,
    fontWeight: '900',
  },

  stepIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  stepContent: {
    flex: 1,
    paddingLeft: 11,
  },

  stepTitle: {
    color: BRAND.navy,
    fontSize: 12,
    fontWeight: '900',
  },

  stepText: {
    color: BRAND.muted,
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
    color: BRAND.blue,
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