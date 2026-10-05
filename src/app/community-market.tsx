import { BRAND } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Listing = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  unit: string;
  price: number;
  quantity_available: number;
  grower_display_name: string;
  locality: string | null;
  notes: string | null;
  fulfillment: string;
};

export default function CommunityMarketScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chalega_grower_listings')
      .select('id, title, emoji, category, unit, price, quantity_available, grower_display_name, locality, notes, fulfillment')
      .eq('status', 'approved')
      .gt('quantity_available', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Community market error:', error);
      Alert.alert('Community Market', 'We could not load community listings right now.');
      setListings([]);
    } else {
      setListings((data ?? []) as Listing[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>CHALEGA GARDENVERSE</Text>
          <Text style={styles.title}>COMMUNITY MARKET</Text>
          <Text style={styles.subtitle}>What Kolkata residents grow, Kolkata residents can discover.</Text>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNumber}>{listings.length}</Text>
            <Text style={styles.heroStatLabel}>APPROVED COMMUNITY LISTINGS</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🌱 BUY LOCAL. HELP A NEIGHBOUR GROW.</Text>
          <Text style={styles.infoText}>Every listing comes from a resident grower. CHALEGA is building the marketplace and last-mile network around Kolkata's home growers.</Text>
        </View>

        <TouchableOpacity style={styles.growButton} onPress={() => router.push('/grower')}>
          <View style={styles.growBody}>
            <Text style={styles.growEyebrow}>HAVE A BALCONY, TERRACE OR GARDEN?</Text>
            <Text style={styles.growTitle}>Become a Community Grower →</Text>
            <Text style={styles.growText}>Grow something. List it. Let CHALEGA help you reach customers.</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Fresh from the community</Text>

        {loading ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Finding community growers...</Text></View>
        ) : listings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌌</Text>
            <Text style={styles.emptyTitle}>The community market is about to bloom.</Text>
            <Text style={styles.emptyText}>Resident growers are joining GardenVerse. Approved listings will appear here.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => router.push('/grower')}>
              <Text style={styles.primaryText}>BECOME A GROWER</Text>
            </TouchableOpacity>
          </View>
        ) : listings.map(listing => (
          <View key={listing.id} style={styles.listingCard}>
            <View style={styles.icon}><Text style={styles.emoji}>{listing.emoji}</Text></View>
            <View style={styles.body}>
              <Text style={styles.category}>{listing.category}</Text>
              <Text style={styles.name}>{listing.title}</Text>
              <Text style={styles.price}>₹{Number(listing.price).toLocaleString('en-IN')} / {listing.unit}</Text>
              <Text style={styles.grower}>👩‍🌾 {listing.grower_display_name}{listing.locality ? ` · ${listing.locality}` : ''}</Text>
              {listing.notes ? <Text style={styles.notes}>{listing.notes}</Text> : null}
              <Text style={styles.stock}>{listing.quantity_available} available · CHALEGA pickup</Text>
              <TouchableOpacity style={styles.orderButton} onPress={() => router.push({ pathname: '/community-checkout', params: { listingId: listing.id } })}>
                <Text style={styles.orderButtonText}>ORDER THROUGH CHALEGA →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>FROM A BALCONY TO THE UNIVERSE.</Text>
          <Text style={styles.footerText}>The long-term goal: thousands of Kolkata homes growing, selling, sharing and earning through one community network.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  content: { paddingBottom: 60 },
  hero: { backgroundColor: BRAND.midnight, padding: 20, paddingTop: 12, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  eyebrow: { marginTop: 15, color: BRAND.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { marginTop: 5, color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 5, color: '#DCEBFA', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  heroStat: { marginTop: 17, padding: 13, borderRadius: 16, backgroundColor: '#FFFFFF12' },
  heroStatNumber: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  heroStatLabel: { marginTop: 2, color: '#BBD0E2', fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  infoCard: { margin: 18, padding: 15, borderRadius: 19, backgroundColor: '#EAF7EE', borderWidth: 1, borderColor: '#C9E5D1' },
  infoTitle: { color: '#175A2D', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  infoText: { marginTop: 6, color: '#4C6B57', fontSize: 12, lineHeight: 18 },
  growButton: { marginHorizontal: 18, padding: 15, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line },
  growBody: { flex: 1 },
  growEyebrow: { color: '#24633A', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  growTitle: { marginTop: 3, color: BRAND.ink, fontSize: 17, fontWeight: '900' },
  growText: { marginTop: 3, color: BRAND.muted, fontSize: 11, lineHeight: 16 },
  sectionTitle: { marginHorizontal: 18, marginTop: 22, marginBottom: 10, color: BRAND.ink, fontSize: 20, fontWeight: '900' },
  listingCard: { marginHorizontal: 18, marginBottom: 12, padding: 13, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line, flexDirection: 'row' },
  icon: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#F0F7F1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emoji: { fontSize: 36 },
  body: { flex: 1 },
  category: { color: '#6B7C8C', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  name: { marginTop: 3, color: BRAND.ink, fontSize: 16, fontWeight: '900' },
  price: { marginTop: 4, color: BRAND.midnight, fontSize: 15, fontWeight: '900' },
  grower: { marginTop: 5, color: '#477057', fontSize: 11, fontWeight: '700' },
  notes: { marginTop: 5, color: BRAND.muted, fontSize: 11, lineHeight: 16 },
  stock: { marginTop: 7, color: '#1C6337', fontSize: 10, fontWeight: '800' },
  orderButton: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: BRAND.midnight },
  orderButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  empty: { marginHorizontal: 18, padding: 27, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line, alignItems: 'center' },
  emptyEmoji: { fontSize: 43 },
  emptyTitle: { marginTop: 9, color: BRAND.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { marginTop: 6, color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primary: { marginTop: 16, minHeight: 45, paddingHorizontal: 16, borderRadius: 14, backgroundColor: BRAND.midnight, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  footer: { margin: 18, padding: 17, borderRadius: 20, backgroundColor: BRAND.midnight },
  footerTitle: { color: BRAND.green, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  footerText: { marginTop: 6, color: '#DCEBFA', fontSize: 11, lineHeight: 18 },
});