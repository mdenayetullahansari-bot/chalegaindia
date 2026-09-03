import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Alert,
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

import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'success' | 'error' | ''
  >('');

  function showMessage(
    text: string,
    type: 'success' | 'error'
  ) {
    setMessage(text);
    setMessageType(type);

    if (Platform.OS !== 'web') {
      Alert.alert(
        type === 'success' ? 'Chalega India' : 'Error',
        text
      );
    }
  }

  async function handleAuthUrl(url: string | null) {
    if (!url) return;

    try {
      console.log('AUTH DEEP LINK:', url);

      const parsed = Linking.parse(url);
      const params = parsed.queryParams || {};
      const hash = url.includes('#') ? url.split('#')[1] : '';

      if (String(params.type || '') === 'recovery') {
        setIsRecovery(true);
        setIsLogin(false);
        setMessage('');
        setMessageType('');
      }

      // Supabase's normal native/PKCE email flow returns a one-time code.
      const code = params.code ? String(params.code) : '';

      if (code) {
        setLoading(true);

        const { error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        if (String(params.type || '') === 'recovery') {
          setIsRecovery(true);
          setIsLogin(false);
          showMessage(
            'Email verified. Please choose a new password.',
            'success'
          );
        } else {
          showMessage(
            'Email confirmed successfully. Welcome to Chalega India!',
            'success'
          );
        }

        return;
      }

      // Compatibility with Supabase links that return tokens in the URL hash.
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && refreshToken) {
          setLoading(true);

          const { error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (error) {
            throw error;
          }

          if (type === 'recovery') {
            setIsRecovery(true);
            setIsLogin(false);
            showMessage(
              'Email verified. Please choose a new password.',
              'success'
            );
          } else {
            showMessage(
              'Email confirmed successfully. Welcome to Chalega India!',
              'success'
            );
          }
        }
      }
    } catch (error: any) {
      console.error('AUTH DEEP LINK ERROR:', error);

      showMessage(
        error?.message ||
          'This email link could not be completed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    Linking.getInitialURL().then((url) => {
      if (mounted && url) {
        handleAuthUrl(url);
      }
    });

    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleAuthUrl(url);
      }
    );

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log('AUTH STATE EVENT:', event);

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setIsLogin(false);
        setMessage('');
        setMessageType('');
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  async function handleAuth() {
    console.log('AUTH BUTTON PRESSED');

    setMessage('');
    setMessageType('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage(
        'Please enter your email and password.',
        'error'
      );
      return;
    }

    if (!isLogin && !cleanName) {
      showMessage(
        'Please enter your name.',
        'error'
      );
      return;
    }

    if (password.length < 6) {
      showMessage(
        'Your password must contain at least 6 characters.',
        'error'
      );
      return;
    }

    try {
      setLoading(true);

      console.log(
        'Starting Supabase authentication...'
      );

      if (isLogin) {
        console.log(
          'Attempting login:',
          cleanEmail
        );

        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        console.log('Login result:', {
          user: data.user?.email,
          error: error?.message,
        });

        if (error) {
          throw error;
        }

        showMessage(
          'Login successful. Welcome back to Chalega India!',
          'success'
        );

        return;
      }

      console.log(
        'Attempting signup:',
        cleanEmail
      );

      const { data, error } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: Linking.createURL('/auth'),
            data: {
              full_name: cleanName,
            },
          },
        });

      console.log('Signup result:', {
        user: data.user?.email,
        session: !!data.session,
        error: error?.message,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        showMessage(
          'Account created successfully! You are now logged in.',
          'success'
        );
      } else {
        showMessage(
          'Account created. Please check your email to confirm your account, then log in.',
          'success'
        );
      }
    } catch (error: any) {
      console.error(
        'AUTH ERROR:',
        error
      );

      showMessage(
        error?.message ||
          'Something went wrong. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim().toLowerCase();

    setMessage('');
    setMessageType('');

    if (!cleanEmail) {
      showMessage(
        'Enter your email address first.',
        'error'
      );
      return;
    }

    try {
      setLoading(true);

      const redirectTo = Linking.createURL('/auth?type=recovery');

      console.log(
        'Password recovery redirect:',
        redirectTo
      );

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      showMessage(
        'Password reset email sent. Open the email on this phone and follow the link.',
        'success'
      );
    } catch (error: any) {
      console.error(
        'PASSWORD RECOVERY ERROR:',
        error
      );

      showMessage(
        error?.message ||
          'Unable to send the password reset email right now.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword() {
    setMessage('');
    setMessageType('');

    if (newPassword.length < 6) {
      showMessage(
        'Your new password must contain at least 6 characters.',
        'error'
      );
      return;
    }

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        throw error;
      }

      setNewPassword('');
      setPassword('');
      setIsRecovery(false);
      setIsLogin(true);

      showMessage(
        'Password changed successfully. You can now log in with your new password.',
        'success'
      );
    } catch (error: any) {
      console.error(
        'UPDATE PASSWORD ERROR:',
        error
      );

      showMessage(
        error?.message ||
          'Unable to change your password. Please open the reset email again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  if (isRecovery) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.logoCircle}>
              <Image source={require("../../assets/chalega-india-logo.png")} style={styles.logoImage} resizeMode="contain" />
            </View>

            <Text style={styles.brand}>
              CHALEGA INDIA
            </Text>

            <Text style={styles.title}>
              Set a new password
            </Text>

            <Text style={styles.subtitle}>
              Choose a new password for your Chalega India account.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                NEW PASSWORD
              </Text>

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

            {message !== '' && (
              <View
                style={[
                  styles.messageBox,
                  messageType === 'success'
                    ? styles.successBox
                    : styles.errorBox,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    messageType === 'success'
                      ? styles.successText
                      : styles.errorText,
                  ]}
                >
                  {message}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    color="#FFFFFF"
                  />

                  <Text style={styles.loadingText}>
                    PLEASE WAIT...
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  CHANGE PASSWORD
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoCircle}>
            <Image source={require("../../assets/chalega-india-logo.png")} style={styles.logoImage} resizeMode="contain" />
          </View>

          <Text style={styles.brand}>
            CHALEGA INDIA
          </Text>

          <Text style={styles.title}>
            {isLogin
              ? 'Welcome back 👋'
              : 'Join Chalega India'}
          </Text>

          <Text style={styles.subtitle}>
            {isLogin
              ? 'Sign in and continue your healthy journey.'
              : 'Walk more • Live better • Stay healthy'}
          </Text>

          {!isLogin && (
            <View style={styles.field}>
              <Text style={styles.label}>
                YOUR NAME
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#999"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>
              EMAIL
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#999"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              PASSWORD
            </Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#999"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {isLogin && (
            <Pressable
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </Pressable>
          )}

          {message !== '' && (
            <View
              style={[
                styles.messageBox,
                messageType === 'success'
                  ? styles.successBox
                  : styles.errorBox,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  messageType === 'success'
                    ? styles.successText
                    : styles.errorText,
                ]}
              >
                {message}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  color="#FFFFFF"
                />

                <Text style={styles.loadingText}>
                  PLEASE WAIT...
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                {isLogin
                  ? 'LOGIN'
                  : 'CREATE ACCOUNT'}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin
                ? "Don't have a Chalega account?"
                : 'Already have an account?'}
            </Text>

            <Pressable
              onPress={() => {
                setIsLogin(
                  (value) => !value
                );
                setPassword('');
                setMessage('');
                setMessageType('');
              }}
            >
              <Text style={styles.switchButton}>
                {isLogin
                  ? ' Sign up'
                  : ' Login'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Your Chalega profile, steps, points
            and achievements will stay connected
            to your account.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F7FB',
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

  logoImage: {
    width: 280,
    height: 180,
    marginBottom: 8,
  },

  logoCircle: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1976F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
  },

  brand: {
    textAlign: 'center',
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 5,
    marginBottom: 32,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 35,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111111',
  },

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
    paddingVertical: 6,
  },

  forgotText: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '700',
  },

  primaryButton: {
    height: 56,
    backgroundColor: '#1976F3',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    opacity: 0.6,
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

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  switchText: {
    color: '#777777',
    fontSize: 14,
  },

  switchButton: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 35,
  },
});
