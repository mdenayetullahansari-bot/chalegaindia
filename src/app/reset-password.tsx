import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  function showMessage(text: string, isError = false) {
    setMessage(text);
    setError(isError);

    if (Platform.OS !== 'web') {
      Alert.alert(isError ? 'Password Reset' : 'Chalega', text);
    }
  }

  async function completeRecovery(url: string | null) {
    try {
      let query: Record<string, string> = {};
      let hash = '';

      if (url) {
        const parsed = Linking.parse(url);
        query = Object.fromEntries(
          Object.entries(parsed.queryParams || {}).map(([key, value]) => [
            key,
            String(value ?? ''),
          ])
        );
        hash = url.includes('#') ? url.split('#')[1] : '';
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const browserQuery = new URLSearchParams(window.location.search);
        query = {
          ...query,
          ...Object.fromEntries(browserQuery.entries()),
        };

        const browserHash = window.location.hash.replace(/^#/, '');
        if (browserHash) hash = browserHash;
      }

      const code = query.code;

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) throw exchangeError;
      }

      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) throw sessionError;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        throw new Error(
          'The reset link was opened, but the recovery session was not created. Please request a fresh reset email.'
        );
      }

      setReady(true);
      showMessage('Your reset link is verified. Choose a new password.');
    } catch (err: any) {
      console.error('RESET PASSWORD ERROR:', err);
      const message =
        err?.message ||
        'This reset link could not be completed. Please request a new one.';

      showMessage(
        message.includes('expired') || message.includes('invalid')
          ? 'This reset link has already been used or expired. Please request a fresh password-reset email and use the newest email only.'
          : message,
        true
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      // On web, the browser URL is authoritative. Expo Linking may return
      // null even though Supabase has already redirected this tab here.
      const initialUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.href
          : await Linking.getInitialURL();

      if (mounted) {
        await completeRecovery(initialUrl);
      }
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setLoading(false);
        showMessage('Your reset link is verified. Choose a new password.');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword() {
    setMessage('');
    setError(false);

    if (newPassword.length < 6) {
      showMessage('Your new password must contain at least 6 characters.', true);
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) throw updateError;

      await supabase.auth.signOut();

      setNewPassword('');
      setReady(false);
      showMessage('Password changed successfully. You can now log in.');

      setTimeout(() => {
        router.replace('/auth');
      }, 900);
    } catch (err: any) {
      console.error('UPDATE PASSWORD ERROR:', err);
      showMessage(
        err?.message ||
          'Unable to change the password. Please request a fresh reset email.',
        true
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.brand}>CHALEGA KOLKATA</Text>

          <Text style={styles.title}>Reset your password</Text>

          <Text style={styles.subtitle}>
            We have separated password recovery from the main login screen so
            reset links have a dedicated place to land.
          </Text>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={BRAND.teal} />
              <Text style={styles.loadingText}>VERIFYING RESET LINK...</Text>
            </View>
          )}

          {!loading && ready && (
            <View style={styles.field}>
              <Text style={styles.label}>NEW PASSWORD</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#999"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {message !== '' && (
            <View
              style={[
                styles.messageBox,
                error ? styles.errorBox : styles.successBox,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  error ? styles.errorText : styles.successText,
                ]}
              >
                {message}
              </Text>
            </View>
          )}

          {!loading && ready && (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
              onPress={handleUpdatePassword}
            >
              <Text style={styles.primaryButtonText}>CHANGE PASSWORD</Text>
            </Pressable>
          )}

          {!loading && !ready && (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.replace('/auth')}
            >
              <Text style={styles.secondaryButtonText}>BACK TO LOGIN</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.cream,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 45,
    paddingBottom: 40,
  },
  logoCircle: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BRAND.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoImage: {
    width: 280,
    height: 180,
  },
  brand: {
    textAlign: 'center',
    color: BRAND.teal,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 5,
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: BRAND.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 25,
  },
  loadingText: {
    marginTop: 12,
    color: BRAND.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#555555',
    marginBottom: 8,
  },
  input: {
    height: 54,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: BRAND.ink,
  },
  messageBox: {
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 15,
    borderWidth: 1,
  },
  successBox: {
    backgroundColor: '#E9F8EF',
    borderColor: '#A8DDBA',
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderColor: '#F0B5B5',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  successText: {
    color: '#19733A',
  },
  errorText: {
    color: '#B42318',
  },
  primaryButton: {
    height: 56,
    backgroundColor: BRAND.teal,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: BRAND.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 56,
    backgroundColor: BRAND.white,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: BRAND.line,
  },
  secondaryButtonText: {
    color: BRAND.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
