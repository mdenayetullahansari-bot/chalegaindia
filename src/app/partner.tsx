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

import {
  submitMyPartnerApplication,
  type PartnerApplicationInput,
} from '@/services/partnerService';

const NAVY = '#061B2E';
const TEAL = '#00D1A7';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const WHITE = '#FFFFFF';
const SOFT_TEAL = '#E8FBF6';

const PARTNERSHIP_OPTIONS: {
  value: PartnerApplicationInput['partnershipType'];
  label: string;
}[] = [
  {
    value: 'sponsor_missions',
    label: 'Sponsor Missions',
  },
  {
    value: 'sponsor_challenges',
    label: 'Sponsor Challenges',
  },
  {
    value: 'offer_rewards',
    label: 'Offer Rewards',
  },
  {
    value: 'health_wellness',
    label: 'Health & Wellness',
  },
  {
    value: 'community_partner',
    label: 'Community Partner',
  },
];

export default function PartnerScreen() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cityArea, setCityArea] = useState('');
  const [partnershipType, setPartnershipType] =
    useState<PartnerApplicationInput['partnershipType']>(
      'sponsor_missions'
    );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitApplication = async () => {
    if (submitting) {
      return;
    }

    if (
      !businessName.trim() ||
      !contactName.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      Alert.alert(
        'Missing information',
        'Please complete the required fields before submitting.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const application: PartnerApplicationInput = {
        businessName,
        contactName,
        phone,
        email,
        cityArea,
        partnershipType,
        message,
      };

      await submitMyPartnerApplication(application);

      Alert.alert(
        'Application received',
        'Thank you for your interest in partnering with Chalega Kolkata. Our team will get in touch with you.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.log(
        'Partner application submission failed:',
        error
      );

      Alert.alert(
        'Could not submit',
        error instanceof Error
          ? error.message
          : 'We could not submit your application right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={NAVY}
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                CHALEGA KOLKATA
              </Text>
              <Text style={styles.title}>
                Partner With Us
              </Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="people-outline"
                size={30}
                color={TEAL}
              />
            </View>

            <Text style={styles.heroTitle}>
              Build healthier communities together.
            </Text>

            <Text style={styles.heroText}>
              Partner with Chalega Kolkata to sponsor
              missions, support challenges, offer rewards
              or create meaningful community programmes.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle"
              size={22}
              color={TEAL}
            />

            <Text style={styles.infoBody}>
              Tell us a little about your organisation and
              how you would like to work with Chalega.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>
            BUSINESS DETAILS
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Business / organisation name *"
            placeholderTextColor={MUTED}
            value={businessName}
            onChangeText={setBusinessName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Contact person *"
            placeholderTextColor={MUTED}
            value={contactName}
            onChangeText={setContactName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number *"
            placeholderTextColor={MUTED}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Email address *"
            placeholderTextColor={MUTED}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="City / area"
            placeholderTextColor={MUTED}
            value={cityArea}
            onChangeText={setCityArea}
            autoCapitalize="words"
          />

          <Text style={styles.sectionLabel}>
            HOW WOULD YOU LIKE TO PARTNER?
          </Text>

          <View style={styles.options}>
            {PARTNERSHIP_OPTIONS.map((option) => {
              const selected =
                partnershipType === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    selected && styles.optionSelected,
                  ]}
                  onPress={() =>
                    setPartnershipType(option.value)
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected ? (
                      <View
                        style={styles.radioDot}
                      />
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      selected &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>
            TELL US MORE
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.messageInput,
            ]}
            placeholder="Tell us about your idea or partnership..."
            placeholderTextColor={MUTED}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting &&
                styles.submitButtonDisabled,
            ]}
            onPress={submitApplication}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={NAVY}
              />
            ) : (
              <>
                <Text style={styles.submitText}>
                  SUBMIT PARTNERSHIP REQUEST
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={NAVY}
                />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Your information will only be used to respond
            to your partnership enquiry.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHITE,
  },

  keyboard: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: NAVY,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 2,
  },

  heroCard: {
    backgroundColor: NAVY,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#123149',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  heroTitle: {
    color: WHITE,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },

  heroText: {
    color: '#C8D6E2',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 9,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SOFT_TEAL,
    borderRadius: 18,
    padding: 16,
    marginBottom: 26,
  },

  infoBody: {
    flex: 1,
    color: '#49616E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginLeft: 12,
  },

  sectionLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 9,
    marginTop: 4,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 15,
    color: NAVY,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 11,
  },

  messageInput: {
    minHeight: 120,
    paddingTop: 15,
    paddingBottom: 15,
  },

  options: {
    marginBottom: 18,
  },

  option: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 9,
  },

  optionSelected: {
    borderColor: TEAL,
    backgroundColor: SOFT_TEAL,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  radioSelected: {
    borderColor: TEAL,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TEAL,
  },

  optionText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
  },

  optionTextSelected: {
    fontWeight: '900',
  },

  submitButton: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginRight: 9,
  },

  footerText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
  },
});
