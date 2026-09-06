import React, {
  useEffect,
  useState,
} from 'react';

import {
  Tabs,
  Redirect,
  usePathname,
} from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActivityIndicator,
  View,
} from 'react-native';

import {
  Session,
} from '@supabase/supabase-js';

import {
  supabase,
} from '@/lib/supabase';

import {
  hydrateGuestMode,
  subscribeToGuestMode,
} from '@/lib/guest-session';

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  const pathname =
    usePathname();

  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    guestMode,
    setGuestMode,
  ] =
    useState(false);

  /*
   * ----------------------------------------------------
   * LOAD SUPABASE SESSION
   * ----------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    const loadSession =
      async () => {
        const [
          {
            data,
            error,
          },
          isGuest,
        ] =
          await Promise.all([
            supabase.auth.getSession(),
            hydrateGuestMode(),
          ]);

        if (error) {
          console.log(
            'Supabase session error:',
            error.message
          );
        }

        if (mounted) {
          setSession(
            data.session
          );

          setGuestMode(
            isGuest
          );

          setLoading(
            false
          );
        }
      };

    loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          newSession
        ) => {
          if (mounted) {
            setSession(
              newSession
            );
          }
        }
      );

    const unsubscribeGuest =
      subscribeToGuestMode(
        setGuestMode
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();

      unsubscribeGuest();
    };
  }, []);

  /*
   * ----------------------------------------------------
   * LOADING
   * ----------------------------------------------------
   */

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#1976F3"
        />
      </View>
    );
  }

  /*
   * ----------------------------------------------------
   * NOT LOGGED IN
   * ----------------------------------------------------
   */

  if (
    !session &&
    !guestMode &&
    pathname !== '/auth'
  ) {
    return (
      <Redirect
        href="/auth"
      />
    );
  }

  /*
   * ----------------------------------------------------
   * AUTH SCREEN
   * ----------------------------------------------------
   */

  if (
    !session &&
    !guestMode &&
    pathname === '/auth'
  ) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,

          tabBarStyle: {
            display: 'none',
          },
        }}
      >
        <Tabs.Screen
          name="auth"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  /*
   * ----------------------------------------------------
   * MAIN CHALEGA INDIA NAVIGATION
   * ----------------------------------------------------
   *
   * ONLY THESE FIVE APPEAR:
   *
   * Home
   * Walk
   * Health
   * Shop
   * More
   *
   * All other routes are hidden.
   */

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          '#1976F3',

        tabBarInactiveTintColor:
          '#888888',

        tabBarStyle: {
          height:
            56 +
            insets.bottom,

          paddingTop: 8,

          paddingBottom:
            Math.max(
              8,
              insets.bottom
            ),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },

        tabBarHideOnKeyboard:
          true,
      }}
    >

      {/* =================================================
       * MAIN TAB — HOME
       * ================================================= */}

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="home"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =================================================
       * MAIN TAB — WALK
       * ================================================= */}

      <Tabs.Screen
        name="walking"
        options={{
          title: 'Walk',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="walk"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =================================================
       * MAIN TAB — HEALTH
       * ================================================= */}

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Health',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="heart"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =================================================
       * MAIN TAB — SHOP
       * ================================================= */}

      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="cart"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =================================================
       * MAIN TAB — MORE
       * ================================================= */}

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              name="ellipsis-horizontal-circle"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* =================================================
       * HIDDEN — PROFILE
       * ================================================= */}

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — BACKUP MORE SCREEN
       *
       * This file exists only as a backup.
       * It must never appear as a navigation tab.
       * ================================================= */}

      <Tabs.Screen
        name="more_before_profile"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — REWARDS
       * ================================================= */}

      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — POINTS ACTIVITY
       * ================================================= */}

      <Tabs.Screen
        name="points-activity"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — MISSIONS
       * ================================================= */}

      <Tabs.Screen
        name="missions"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — PRODUCT
       * ================================================= */}

      <Tabs.Screen
        name="product"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — CHECKOUT
       * ================================================= */}

      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — ORDER CONFIRMED
       * ================================================= */}

      <Tabs.Screen
        name="order-confirmed"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — TRACK ORDER
       * ================================================= */}

      <Tabs.Screen
        name="track-order"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — ORDERS
       * ================================================= */}

      <Tabs.Screen
        name="orders"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — CUSTOMER ORDERS
       * ================================================= */}

      <Tabs.Screen
        name="customer-orders"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — HEALTH TOPIC
       * ================================================= */}

      <Tabs.Screen
        name="health-topic"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — DAILY HEALTH CHECK-IN
       * ================================================= */}

      <Tabs.Screen
        name="daily-health-checkin"
        options={{
          href: null,
        }}
      />

      {/* =================================================
       * HIDDEN — AUTH
       * ================================================= */}

      <Tabs.Screen
        name="auth"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}

/*
 * ======================================================
 * STYLES
 * ======================================================
 */

const styles = {
  loadingContainer: {
    flex: 1,

    justifyContent:
      'center' as const,

    alignItems:
      'center' as const,

    backgroundColor:
      '#F5F7FB',
  },
};