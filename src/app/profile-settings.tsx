import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const BRAND = {
  blue: '#1D6FF2',
  navy: '#0B1F33',
  muted: '#6B7785',
  background: '#F7F5F0',
  white: '#FFFFFF',
  border: '#E4E8ED',
  green: '#247A3A',
  greenBackground: '#EAF7EE',
};

export default function ProfileSettingsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [area, setArea] = useState('');
  const [dailyGoal, setDailyGoal] = useState('8000');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in to edit your Chalega profile.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/auth'),
            },
          ]
        );
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, area, daily_step_goal')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn(
          '[PROFILE SETTINGS] Load error:',
          error.message
        );

        Alert.alert(
          'Could not load profile',
          'Please try again.'
        );

        return;
      }

      setFullName(
        data?.full_name?.trim() ||
          user.user_metadata?.full_name ||
          ''
      );

      setUsername(
        data?.username?.trim() || ''
      );

      setArea(
        data?.area?.trim() || ''
      );

      setDailyGoal(
        String(data?.daily_step_goal || 8000)
      );
    } catch (error) {
      console.warn(
        '[PROFILE SETTINGS] Unexpected load error:',
        error
      );

      Alert.alert(
        'Something went wrong',
        'We could not load your profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const cleanedName = fullName.trim();

    const cleanedUsername = username
      .trim()
      .replace(/^@/, '')
      .toLowerCase();

    const cleanedArea = area.trim();

    const goalNumber = Number(
      dailyGoal.replace(/,/g, '').trim()
    );

    if (!cleanedName) {
      Alert.alert(
        'Name required',
        'Please enter your full name.'
      );
      return;
    }

    if (cleanedName.length < 2) {
      Alert.alert(
        'Name too short',
        'Please enter at least 2 characters for your name.'
      );
      return;
    }

    if (!cleanedUsername) {
      Alert.alert(
        'Username required',
        'Please choose a username.'
      );
      return;
    }

    if (!/^[a-z0-9._]{3,30}$/.test(cleanedUsername)) {
      Alert.alert(
        'Invalid username',
        'Use 3–30 characters: lowercase letters, numbers, dots or underscores.'
      );
      return;
    }

    if (
      !Number.isFinite(goalNumber) ||
      !Number.isInteger(goalNumber)
    ) {
      Alert.alert(
        'Invalid step goal',
        'Please enter a whole number for your daily step goal.'
      );
      return;
    }

    if (
      goalNumber < 1000 ||
      goalNumber > 50000
    ) {
      Alert.alert(
        'Invalid step goal',
        'Your daily step goal must be between 1,000 and 50,000 steps.'
      );
      return;
    }

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Your session has expired. Please sign in again.'
        );
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: cleanedName,
          username: cleanedUsername,
          area: cleanedArea || null,
          daily_step_goal: goalNumber,
        })
        .eq('id', user.id);

      if (error) {
        console.warn(
          '[PROFILE SETTINGS] Save error:',
          error
        );

        const message =
          error.code === '23505'
            ? 'That username is already being used. Please choose another one.'
            : error.message ||
              'We could not save your profile.';

        Alert.alert(
          'Could not save profile',
          message
        );

        return;
      }

      Alert.alert(
        'Profile Updated',
        'Your Chalega profile has been updated successfully.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.warn(
        '[PROFILE SETTINGS] Unexpected save error:',
        error
      );

      Alert.alert(
        'Something went wrong',
        'We could not save your profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const openWardFinder = () => {
    router.push('/kmc-ward');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={BRAND.blue}
        />

        <Text style={styles.loadingText}>
          Loading your profile...
        </Text>
      </SafeAreaView>
    );
  }

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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color={BRAND.navy}
              />
            </TouchableOpacity>

            <Text style={styles.topTitle}>
              PROFILE SETTINGS
            </Text>

            <View style={styles.topSpacer} />
          </View>

          {/* INTRO */}
          <View style={styles.intro}>
            <Text style={styles.introEyebrow}>
              YOUR CHALEGA INDIA PROFILE
            </Text>

            <Text style={styles.introTitle}>
              Make it yours.
            </Text>

            <Text style={styles.introText}>
              Update your profile information and
              choose the walking goal that works
              best for you.
            </Text>
          </View>

          {/* BASIC INFORMATION */}
          <Text style={styles.sectionTitle}>
            BASIC INFORMATION
          </Text>

          <View style={styles.card}>
            <Field
              label="FULL NAME"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              autoCorrect={false}
            />

            <View style={styles.divider} />

            <Field
              label="USERNAME"
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
              prefix="@"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />

            <Text style={styles.helperText}>
              Your username can use lowercase
              letters, numbers, dots and underscores.
            </Text>

            <View style={styles.divider} />

            <Field
              label="AREA / LOCALITY"
              value={area}
              onChangeText={setArea}
              placeholder="e.g. Park Street"
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* WALKING */}
          <Text style={styles.sectionTitle}>
            WALKING
          </Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>
              DAILY STEP GOAL
            </Text>

            <View style={styles.goalInputRow}>
              <TextInput
                value={dailyGoal}
                onChangeText={setDailyGoal}
                placeholder="8000"
                placeholderTextColor="#9AA4AE"
                keyboardType="number-pad"
                style={styles.goalInput}
                maxLength={5}
              />

              <Text style={styles.goalUnit}>
                STEPS / DAY
              </Text>
            </View>

            <Text style={styles.helperText}>
              Choose a goal between 1,000 and
              50,000 steps per day.
            </Text>

            <View style={styles.goalSuggestions}>
              {[
                '4000',
                '6000',
                '8000',
                '10000',
              ].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.goalChip,
                    dailyGoal === value &&
                      styles.goalChipActive,
                  ]}
                  onPress={() =>
                    setDailyGoal(value)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.goalChipText,
                      dailyGoal === value &&
                        styles.goalChipTextActive,
                    ]}
                  >
                    {Number(value).toLocaleString(
                      'en-IN'
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* WARD */}
          <Text style={styles.sectionTitle}>
            KMC WARD
          </Text>

          <TouchableOpacity
            style={styles.wardCard}
            onPress={openWardFinder}
            activeOpacity={0.88}
          >
            <View style={styles.wardIcon}>
              <Ionicons
                name="location"
                size={23}
                color="#69D88A"
              />
            </View>

            <View style={styles.wardContent}>
              <Text style={styles.wardTitle}>
                Find and verify your ward
              </Text>

              <Text style={styles.wardText}>
                Use your current location to find
                your KMC ward. Your exact location
                will not be stored as your ward data.
              </Text>
            </View>

            <View style={styles.wardArrow}>
              <Ionicons
                name="chevron-forward"
                size={19}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>

          {/* SAVE */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              saving &&
                styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.saveText}>
                SAVE PROFILE
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.bottomNote}>
            Your Points, walking history and
            Chalega activity are not changed
            when you edit your profile.
          </Text>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  prefix?: string;
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';
  autoCorrect?: boolean;
  maxLength?: number;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  maxLength,
}: FieldProps) {
  return (
    <View>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View style={styles.inputRow}>
        {prefix ? (
          <Text style={styles.inputPrefix}>
            {prefix}
          </Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA4AE"
          style={[
            styles.input,
            prefix && styles.inputWithPrefix,
          ]}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
  },

  keyboard: {
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: BRAND.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: BRAND.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 50,
  },

  topBar: {
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

  topTitle: {
    color: BRAND.navy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  topSpacer: {
    width: 42,
    height: 42,
  },

  intro: {
    paddingTop: 25,
    paddingBottom: 25,
  },

  introEyebrow: {
    color: BRAND.blue,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },

  introTitle: {
    color: BRAND.navy,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 7,
  },

  introText: {
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    marginTop: 7,
    maxWidth: 340,
  },

  sectionTitle: {
    color: BRAND.navy,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: BRAND.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 24,
  },

  fieldLabel: {
    color: '#7A8691',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputPrefix: {
    color: BRAND.blue,
    fontSize: 18,
    fontWeight: '900',
    marginRight: 2,
  },

  input: {
    flex: 1,
    color: BRAND.navy,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 7,
    paddingHorizontal: 0,
  },

  inputWithPrefix: {
    paddingLeft: 0,
  },

  divider: {
    height: 1,
    backgroundColor: BRAND.border,
    marginVertical: 17,
  },

  helperText: {
    color: '#8A95A0',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 5,
  },

  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingBottom: 7,
  },

  goalInput: {
    flex: 1,
    color: BRAND.navy,
    fontSize: 25,
    fontWeight: '900',
    paddingVertical: 4,
  },

  goalUnit: {
    color: BRAND.blue,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  goalSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    gap: 8,
  },

  goalChip: {
    backgroundColor: '#EEF2F6',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  goalChipActive: {
    backgroundColor: '#EAF2FF',
  },

  goalChipText: {
    color: '#6B7785',
    fontSize: 10,
    fontWeight: '800',
  },

  goalChipTextActive: {
    color: BRAND.blue,
  },

  wardCard: {
    backgroundColor: BRAND.navy,
    borderRadius: 22,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  wardIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#12395A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  wardContent: {
    flex: 1,
    paddingLeft: 13,
    paddingRight: 8,
  },

  wardTitle: {
    color: BRAND.white,
    fontSize: 14,
    fontWeight: '900',
  },

  wardText: {
    color: '#B9C9D8',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    fontWeight: '600',
  },

  wardArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#173F2A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButton: {
    height: 56,
    borderRadius: 19,
    backgroundColor: BRAND.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveText: {
    color: BRAND.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  bottomNote: {
    color: '#8A95A0',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 14,
    paddingHorizontal: 15,
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