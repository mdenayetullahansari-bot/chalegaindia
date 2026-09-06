import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ENTALLY_ASSEMBLY } from '../data/entallyAssembly';

const actions = [
  { icon: 'walk-outline' as const, title: 'Walk', text: 'Join walking challenges and build a daily habit.', route: '/walking' },
  { icon: 'heart-outline' as const, title: 'Health', text: 'Take simple health and wellness challenges.', route: '/explore' },
  { icon: 'people-outline' as const, title: 'Community', text: 'See what people around Entally are doing together.' },
  { icon: 'flag-outline' as const, title: 'Civic', text: 'Report local issues and follow community action.' },
  { icon: 'happy-outline' as const, title: 'Happiness', text: 'Small ideas to make neighbours and neighbourhoods happier.' },
];

export default function EntallyScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Ionicons name="location" size={15} color="#fff" />
          <Text style={styles.badgeText}>ENTALLY • ASSEMBLY 163</Text>
        </View>
        <Text style={styles.title}>Chalega India</Text>
        <Text style={styles.heroTitle}>{ENTALLY_ASSEMBLY.copy.title}</Text>
        <Text style={styles.subtitle}>{ENTALLY_ASSEMBLY.copy.subtitle}</Text>
      </View>

      <View style={styles.wardCard}>
        <View style={styles.wardIcon}>
          <Ionicons name="map-outline" size={22} color="#111827" />
        </View>
        <View style={styles.wardCopy}>
          <Text style={styles.wardLabel}>KMC 2026 WARD</Text>
          <Text style={styles.wardStatus}>Being verified</Text>
          <Text style={styles.wardNote}>{ENTALLY_ASSEMBLY.copy.wardNotice}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Entally community</Text>
      <Text style={styles.sectionText}>A local space for walking, health, happiness and civic participation.</Text>

      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.title}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => action.route && router.push(action.route as never)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon} size={23} color="#111827" />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionText}>{action.text}</Text>
            <Ionicons name="arrow-forward" size={17} color="#6b7280" style={styles.arrow} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footerCard}>
        <Ionicons name="information-circle-outline" size={21} color="#374151" />
        <Text style={styles.footerText}>
          Ward boundaries are being kept separate from the Assembly layer so the final KMC 2026 notification can be added without rebuilding the community experience.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f7f9' },
  content: { padding: 18, paddingBottom: 36 },
  hero: { backgroundColor: '#111827', borderRadius: 26, padding: 24, marginBottom: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700', opacity: 0.72, marginBottom: 5 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: '#e5e7eb', fontSize: 15, lineHeight: 22 },
  wardCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 17, marginBottom: 24 },
  wardIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  wardCopy: { flex: 1 },
  wardLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: '#6b7280' },
  wardStatus: { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 2 },
  wardNote: { fontSize: 12, lineHeight: 17, color: '#6b7280', marginTop: 3 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sectionText: { color: '#6b7280', fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 14 },
  grid: { gap: 11 },
  actionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 17, minHeight: 128 },
  pressed: { opacity: 0.72 },
  actionIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  actionTitle: { color: '#111827', fontSize: 17, fontWeight: '900' },
  actionText: { color: '#6b7280', fontSize: 13, lineHeight: 18, marginTop: 4, paddingRight: 28 },
  arrow: { position: 'absolute', right: 17, top: 20 },
  footerCard: { flexDirection: 'row', gap: 10, backgroundColor: '#e5e7eb', borderRadius: 18, padding: 15, marginTop: 18 },
  footerText: { flex: 1, color: '#4b5563', fontSize: 12, lineHeight: 17 },
});
