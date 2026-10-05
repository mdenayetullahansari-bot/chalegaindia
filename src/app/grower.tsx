import { BRAND } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import { products } from '@/data/products';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type GrowerProfile = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  space_type: string;
  locality: string | null;
  city: string;
  status: string;
  plants_grown: number;
  plants_sold: number;
};

type GrowerListing = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  unit: string;
  price: number;
  quantity_available: number;
  locality: string | null;
  status: string;
  notes: string | null;
};

const SPACE_TYPES = [
  ['balcony', '🏡 Balcony'],
  ['terrace', '🌤️ Terrace'],
  ['rooftop', '🌿 Rooftop'],
  ['courtyard', '🌱 Courtyard'],
  ['garden', '🌳 Garden'],
  ['community_space', '🤝 Community space'],
];

export default function GrowerScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<GrowerProfile | null>(null);
  const [listings, setListings] = useState<GrowerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [locality, setLocality] = useState('');
  const [spaceType, setSpaceType] = useState('balcony');
  const [bio, setBio] = useState('');

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('piece');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const nurseryChoices = useMemo(
    () => products.filter(p => p.category === 'Nursery & Plants' && p.available).slice(0, 12),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setProfile(null);
        return;
      }
      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('chalega_community_growers')
        .select('id, user_id, display_name, bio, space_type, locality, city, status, plants_grown, plants_sold')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        const p = profileData as GrowerProfile;
        setProfile(p);
        setDisplayName(p.display_name);
        setLocality(p.locality ?? '');
        setSpaceType(p.space_type);
        setBio(p.bio ?? '');

        const { data: listingData, error: listingError } = await supabase
          .from('chalega_grower_listings')
          .select('id, title, emoji, category, unit, price, quantity_available, locality, status, notes')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (listingError) throw listingError;
        setListings((listingData ?? []) as GrowerListing[]);
      } else {
        setProfile(null);
        setListings([]);
        setDisplayName(user.user_metadata?.full_name ?? '');
      }
    } catch (error) {
      console.log('Grower load error:', error);
      Alert.alert('Community Growers', 'We could not load your grower space right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveGrower = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to become a community grower.');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Add your name', 'Tell customers what name you want to show as your grower name.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('chalega_community_growers')
      .upsert({
        user_id: userId,
        display_name: displayName.trim(),
        locality: locality.trim() || null,
        city: 'Kolkata',
        space_type: spaceType,
        bio: bio.trim() || null,
      }, { onConflict: 'user_id' });

    setSaving(false);

    if (error) {
      console.log('Grower profile error:', error);
      Alert.alert('Could not join', error.message);
      return;
    }

    await load();
    Alert.alert('Welcome to GardenVerse', 'You are now a CHALLEGA Community Grower. You can start listing what you grow.');
  };

  const addListing = async () => {
    if (!profile || !userId) return;
    if (!title.trim() || !price || !quantity) {
      Alert.alert('Complete the listing', 'Add a product name, price and available quantity.');
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isInteger(numericQuantity) || numericQuantity < 1) {
      Alert.alert('Check the numbers', 'Price must be valid and quantity must be a whole number above zero.');
      return;
    }

    const selected = nurseryChoices.find(p => p.id === selectedProductId);
    setSaving(true);

    const { error } = await supabase.from('chalega_grower_listings').insert({
      user_id: userId,
      grower_id: profile.id,
      product_id: selected?.id ?? null,
      title: title.trim(),
      emoji: selected?.emoji ?? '🌱',
      category: selected?.category ?? 'Community Grown',
      unit: unit.trim() || 'piece',
      price: numericPrice,
      quantity_available: numericQuantity,
      grower_display_name: profile.display_name,
      locality: locality.trim() || profile.locality || null,
      notes: notes.trim() || null,
      fulfillment: 'chalega_pickup',
    });

    setSaving(false);

    if (error) {
      console.log('Grower listing error:', error);
      Alert.alert('Could not list', error.message);
      return;
    }

    setTitle('');
    setPrice('');
    setQuantity('');
    setNotes('');
    setSelectedProductId(null);
    await load();
    Alert.alert('Listing submitted', 'CHALLEGA will review the listing and then make it available in the Community Market.');
  };

  const pauseListing = async (listing: GrowerListing) => {
    const nextStatus = listing.status === 'paused' ? 'pending' : 'paused';
    const { error } = await supabase
      .from('chalega_grower_listings')
      .update({ status: nextStatus })
      .eq('id', listing.id)
      .eq('user_id', userId);

    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }
    await load();
  };

  const deleteListing = async (listing: GrowerListing) => {
    const { error } = await supabase
      .from('chalega_grower_listings')
      .delete()
      .eq('id', listing.id)
      .eq('user_id', userId);

    if (error) {
      Alert.alert('Could not remove', error.message);
      return;
    }
    await load();
  };

  if (!loading && !userId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🌱</Text>
          <Text style={styles.centerTitle}>Grow with CHALLEGA</Text>
          <Text style={styles.centerText}>Sign in to turn your balcony, terrace or garden into part of Kolkata's community marketplace.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>CHALLEGA GARDENVERSE</Text>
          <Text style={styles.title}>GROW & EARN</Text>
          <Text style={styles.subtitle}>Every home can grow. Every resident can participate.</Text>

          <View style={styles.heroBox}>
            <Text style={styles.heroBoxTitle}>🌌 FROM A BALCONY TO THE UNIVERSE</Text>
            <Text style={styles.heroBoxText}>
              Grow plants, seedlings, flowers or edible greens at home. CHALLEGA brings the customers, collection and delivery network.
            </Text>
          </View>
        </View>

        <View style={styles.flowCard}>
          <Text style={styles.cardTitle}>The CHALLEGA Green Loop</Text>
          <Text style={styles.flow}>🌱 YOU GROW  →  📦 YOU LIST  →  🛒 CUSTOMER ORDERS  →  🚚 CHALLEGA COLLECTS  →  💰 YOU EARN</Text>
          <Text style={styles.smallText}>You do not need a nursery. A balcony, terrace or small garden can be your starting point.</Text>
        </View>

        <TouchableOpacity style={styles.marketButton} onPress={() => router.push('/community-market')}>
          <View style={styles.marketBody}>
            <Text style={styles.marketEyebrow}>COMMUNITY MARKET</Text>
            <Text style={styles.marketTitle}>Shop what Kolkata residents grow</Text>
            <Text style={styles.marketText}>Discover approved plants and community-grown products.</Text>
          </View>
          <Text style={styles.marketArrow}>→</Text>
        </TouchableOpacity>

        {!profile ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionEyebrow}>STEP 01</Text>
            <Text style={styles.sectionTitle}>Become a Community Grower</Text>
            <Text style={styles.sectionText}>Joining is free. Start small. Grow only what your space and time allow.</Text>

            <Text style={styles.label}>GROWER NAME</Text>
            <TextInput value={displayName} onChangeText={setDisplayName} placeholder="e.g. Ayesha's Rooftop Garden" placeholderTextColor="#8794A0" style={styles.input} />

            <Text style={styles.label}>LOCALITY</Text>
            <TextInput value={locality} onChangeText={setLocality} placeholder="e.g. Entally" placeholderTextColor="#8794A0" style={styles.input} />

            <Text style={styles.label}>YOUR GROWING SPACE</Text>
            <View style={styles.chips}>
              {SPACE_TYPES.map(([value, label]) => (
                <TouchableOpacity key={value} style={[styles.chip, spaceType === value && styles.chipSelected]} onPress={() => setSpaceType(value)}>
                  <Text style={[styles.chipText, spaceType === value && styles.chipTextSelected]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>YOUR STORY (OPTIONAL)</Text>
            <TextInput value={bio} onChangeText={setBio} placeholder="What do you love growing?" placeholderTextColor="#8794A0" style={[styles.input, styles.textArea]} multiline />

            <TouchableOpacity style={styles.primary} onPress={saveGrower} disabled={saving}>
              <Text style={styles.primaryText}>{saving ? 'JOINING...' : 'JOIN THE GREEN NETWORK'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileIcon}><Text style={styles.profileEmoji}>👩‍🌾</Text></View>
              <View style={styles.profileBody}>
                <Text style={styles.profileEyebrow}>COMMUNITY GROWER · {profile.status.toUpperCase()}</Text>
                <Text style={styles.profileName}>{profile.display_name}</Text>
                <Text style={styles.profileMeta}>{profile.locality || 'Kolkata'} · {SPACE_TYPES.find(s => s[0] === profile.space_type)?.[1] ?? profile.space_type}</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionEyebrow}>STEP 02</Text>
              <Text style={styles.sectionTitle}>List something you grow</Text>
              <Text style={styles.sectionText}>Every new listing is reviewed before it becomes visible to customers.</Text>

              <Text style={styles.label}>QUICK START FROM CHALLEGA NURSERY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
                {nurseryChoices.map(product => (
                  <TouchableOpacity key={product.id} style={[styles.productChip, selectedProductId === product.id && styles.productChipSelected]} onPress={() => {
                    setSelectedProductId(product.id);
                    setTitle(product.name);
                    setPrice(String(product.price));
                    setUnit(product.unit);
                  }}>
                    <Text style={styles.productChipEmoji}>{product.emoji}</Text>
                    <Text style={styles.productChipName}>{product.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>WHAT ARE YOU SELLING?</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Home-grown Tomato Seedling" placeholderTextColor="#8794A0" style={styles.input} />

              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.label}>PRICE (₹)</Text>
                  <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="89" placeholderTextColor="#8794A0" style={styles.input} />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>QUANTITY</Text>
                  <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="10" placeholderTextColor="#8794A0" style={styles.input} />
                </View>
              </View>

              <Text style={styles.label}>UNIT</Text>
              <TextInput value={unit} onChangeText={setUnit} placeholder="piece / pack / kg" placeholderTextColor="#8794A0" style={styles.input} />

              <Text style={styles.label}>NOTES (OPTIONAL)</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="Care method, variety, expected ready date..." placeholderTextColor="#8794A0" style={[styles.input, styles.textArea]} multiline />

              <TouchableOpacity style={styles.primary} onPress={addListing} disabled={saving}>
                <Text style={styles.primaryText}>{saving ? 'SUBMITTING...' : 'LIST ON CHALLEGA'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeading}>Your listings</Text>
            {listings.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.bigEmoji}>🪴</Text>
                <Text style={styles.emptyTitle}>Your first listing is waiting.</Text>
                <Text style={styles.emptyText}>Start with 5–10 plants. Let demand grow with you.</Text>
              </View>
            ) : listings.map(listing => (
              <View key={listing.id} style={styles.listingCard}>
                <View style={styles.listingIcon}><Text style={styles.listingEmoji}>{listing.emoji}</Text></View>
                <View style={styles.listingBody}>
                  <Text style={styles.listingName}>{listing.title}</Text>
                  <Text style={styles.listingMeta}>₹{Number(listing.price).toLocaleString('en-IN')} / {listing.unit} · {listing.quantity_available} available</Text>
                  <Text style={[styles.status, listing.status === 'approved' ? styles.statusApproved : listing.status === 'paused' ? styles.statusPaused : styles.statusPending]}>
                    {listing.status === 'approved' ? 'LIVE IN COMMUNITY MARKET' : listing.status.toUpperCase()}
                  </Text>
                  <View style={styles.listingActions}>
                    <TouchableOpacity onPress={() => pauseListing(listing)}>
                      <Text style={styles.actionText}>{listing.status === 'paused' ? 'Resume' : 'Pause'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteListing(listing)}>
                      <Text style={styles.deleteText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.futureCard}>
              <Text style={styles.futureTitle}>🚀 WHAT COMES NEXT</Text>
              <Text style={styles.futureText}>Grow-to-order missions • Plant Passports • CHALLEGA pickup • automatic stock updates • seller earnings • CHALLEGA Coins • Green Map • Kolkata Green League.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  content: { paddingBottom: 70 },
  hero: { backgroundColor: BRAND.midnight, padding: 20, paddingTop: 12, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  eyebrow: { marginTop: 15, color: BRAND.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 5, color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 5, color: '#DCEBFA', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  heroBox: { marginTop: 17, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF12' },
  heroBoxTitle: { color: BRAND.green, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  heroBoxText: { marginTop: 5, color: '#DCEBFA', fontSize: 12, lineHeight: 18 },
  flowCard: { margin: 18, padding: 16, borderRadius: 20, backgroundColor: '#EAF7EE', borderWidth: 1, borderColor: '#C9E5D1' },
  cardTitle: { color: '#123C25', fontSize: 17, fontWeight: '900' },
  flow: { marginTop: 10, color: '#175A2D', fontSize: 11, lineHeight: 18, fontWeight: '900' },
  smallText: { marginTop: 8, color: '#4C6B57', fontSize: 11, lineHeight: 17 },
  marketButton: { marginHorizontal: 18, marginBottom: 2, padding: 15, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line, flexDirection: 'row', alignItems: 'center' },
  marketBody: { flex: 1 },
  marketEyebrow: { color: '#24633A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  marketTitle: { marginTop: 3, color: BRAND.ink, fontSize: 17, fontWeight: '900' },
  marketText: { marginTop: 3, color: BRAND.muted, fontSize: 11, lineHeight: 16 },
  marketArrow: { marginLeft: 10, color: BRAND.midnight, fontSize: 25, fontWeight: '900' },
  formCard: { margin: 18, marginBottom: 8, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line },
  sectionEyebrow: { color: '#24633A', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  sectionTitle: { marginTop: 4, color: BRAND.ink, fontSize: 20, fontWeight: '900' },
  sectionText: { marginTop: 5, color: BRAND.muted, fontSize: 12, lineHeight: 18 },
  label: { marginTop: 15, marginBottom: 6, color: '#52606D', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  input: { borderWidth: 1, borderColor: BRAND.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: BRAND.ink, fontSize: 13, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 76, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F5F7', borderWidth: 1, borderColor: '#E4E8ED' },
  chipSelected: { backgroundColor: BRAND.greenLight, borderColor: '#B9DCC3' },
  chipText: { color: '#596774', fontSize: 10, fontWeight: '800' },
  chipTextSelected: { color: '#1C6337' },
  primary: { marginTop: 16, minHeight: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: BRAND.midnight, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  profileCard: { margin: 18, marginBottom: 8, padding: 15, borderRadius: 20, backgroundColor: '#EAF7EE', borderWidth: 1, borderColor: '#C9E5D1', flexDirection: 'row', alignItems: 'center' },
  profileIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  profileEmoji: { fontSize: 27 },
  profileBody: { flex: 1 },
  profileEyebrow: { color: '#24633A', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  profileName: { marginTop: 3, color: '#123C25', fontSize: 18, fontWeight: '900' },
  profileMeta: { marginTop: 2, color: '#4C6B57', fontSize: 11 },
  horizontal: { paddingVertical: 3, gap: 8 },
  productChip: { width: 108, padding: 10, borderRadius: 14, backgroundColor: '#F5F8F6', borderWidth: 1, borderColor: '#E0E8E2' },
  productChipSelected: { backgroundColor: BRAND.greenLight, borderColor: '#B9DCC3' },
  productChipEmoji: { fontSize: 23 },
  productChipName: { marginTop: 5, color: BRAND.ink, fontSize: 10, lineHeight: 14, fontWeight: '800' },
  twoCol: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },
  sectionHeading: { marginHorizontal: 18, marginTop: 16, marginBottom: 10, color: BRAND.ink, fontSize: 20, fontWeight: '900' },
  listingCard: { marginHorizontal: 18, marginBottom: 11, padding: 13, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line, flexDirection: 'row' },
  listingIcon: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#F0F7F1', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  listingEmoji: { fontSize: 28 },
  listingBody: { flex: 1 },
  listingName: { color: BRAND.ink, fontSize: 15, fontWeight: '900' },
  listingMeta: { marginTop: 3, color: BRAND.muted, fontSize: 11 },
  status: { marginTop: 7, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, fontSize: 8, fontWeight: '900', overflow: 'hidden' },
  statusApproved: { color: '#17602E', backgroundColor: BRAND.greenLight },
  statusPaused: { color: '#765400', backgroundColor: '#FFF5D7' },
  statusPending: { color: '#6A5B22', backgroundColor: '#FFF7E2' },
  listingActions: { marginTop: 8, flexDirection: 'row', gap: 14 },
  actionText: { color: '#1A7040', fontSize: 10, fontWeight: '900' },
  deleteText: { color: '#A24B52', fontSize: 10, fontWeight: '800' },
  empty: { marginHorizontal: 18, padding: 25, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line, alignItems: 'center' },
  bigEmoji: { fontSize: 42 },
  emptyTitle: { marginTop: 8, color: BRAND.ink, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { marginTop: 5, color: BRAND.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  futureCard: { margin: 18, padding: 16, borderRadius: 20, backgroundColor: BRAND.midnight },
  futureTitle: { color: BRAND.green, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  futureText: { marginTop: 6, color: '#DCEBFA', fontSize: 11, lineHeight: 18 },
  center: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { marginTop: 12, color: BRAND.ink, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  centerText: { marginTop: 8, color: BRAND.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});