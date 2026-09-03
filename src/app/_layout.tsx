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

  /*
   * ----------------------------------------------------
   * LOAD SUPABASE SESSION
   * ----------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    const loadSession =
      async () => {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

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

    return () => {
      mounted = false;

      subscription.unsubscribe();
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
   *
   * Send users to authentication unless
   * they are already on /auth.
   */

  if (
    !session &&
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
   * LOGGED-IN USER
   * ----------------------------------------------------
   *
   * Main Chalega India navigation:
   *
   * Home
   * Walk
   * Health
   * Shop
   * More
   *
   * All other screens are hidden from
   * the bottom navigation.
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
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(8, insets.bottom),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },

        tabBarHideOnKeyboard:
          true,
      }}
    >

      {/* ------------------------------------------------
       * HOME
       * ------------------------------------------------ */}

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

      {/* ------------------------------------------------
       * WALK
       * ------------------------------------------------ */}

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

      {/* ------------------------------------------------
       * HEALTH
       * ------------------------------------------------ */}

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

      {/* ------------------------------------------------
       * SHOP
       * ------------------------------------------------ */}

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

      {/* ------------------------------------------------
       * MORE
       * ------------------------------------------------ */}

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
       * HIDDEN SCREENS
       * =================================================
       *
       * These screens can still be opened using
       * router.push(), router.back(), etc.
       *
       * They simply do NOT appear in the bottom
       * navigation bar.
       * ================================================= */}

      {/* Rewards */}

      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
        }}
      />

      {/* Points Activity */}

      <Tabs.Screen
        name="points-activity"
        options={{
          href: null,
        }}
      />

      {/* Missions */}

      <Tabs.Screen
        name="missions"
        options={{
          href: null,
        }}
      />

      {/* Product */}

      <Tabs.Screen
        name="product"
        options={{
          href: null,
        }}
      />

      {/* Checkout */}

      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
        }}
      />

      {/* Order Confirmed */}

      <Tabs.Screen
        name="order-confirmed"
        options={{
          href: null,
        }}
      />

      {/* Track Order */}

      <Tabs.Screen
        name="track-order"
        options={{
          href: null,
        }}
      />

      {/* Orders */}

      <Tabs.Screen
        name="orders"
        options={{
          href: null,
        }}
      />

      {/* Customer Orders */}

      <Tabs.Screen
        name="customer-orders"
        options={{
          href: null,
        }}
      />

      {/* Health Topic */}

      <Tabs.Screen
        name="health-topic"
        options={{
          href: null,
        }}
      />

      {/* Auth */}

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