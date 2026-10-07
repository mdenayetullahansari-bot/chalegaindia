import { BRAND } from '@/lib/brand';
import { supabase } from '@/lib/supabase';
import { products } from '@/data/products';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

type GardenPlant = {
  id: string;
  product_id: string;
  plant_name: string;
  emoji: string;
  nickname: string | null;
  planted_date: string;
  last_watered_at: string | null;
  status: 'planned' | 'growing' | 'flowering' | 'harvested' | 'archived';
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const daysSince = (date: string) => {
  const start = new Date(`${date}T00:00:00`).getTime();
  const now = new Date(`${todayKey()}T00:00:00`).getTime();
  return Math.max(0, Math.floor((now - start) / 86400000));
};

export default function GardenScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ addProductId?: string }>();
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    typeof params.addProductId === 'string' ? params.addProductId : null,
  );

  const loadGarden = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlants([]);
        return;
      }

      const { data, error } = await supabase
        .from('chalega_garden_plants')
        .select('id, product_id, plant_name, emoji, nickname, planted_date, last_watered_at, status')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlants((data ?? []) as GardenPlant[]);
    } catch (error) {
      console.log('Could not load My Garden:', error);
      Alert.alert('My Garden', 'We could not load your garden right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPlant = useCallback(async (productId: string) => {
    const product = products.find(item => item.id === productId);
    if (!product || !['Nursery & Plants'].includes(product.category)) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to create your garden.');
      return;
    }

    const { error } = await supabase.from('chalega_garden_plants').insert({
      user_id: user.id,
      product_id: product.id,
      plant_name: product.name,
      emoji: product.emoji,
      nickname: nickname.trim() || null,
      planted_date: todayKey(),
      status: 'growing',
    });

    if (error) {
      console.log('Could not add garden plant:', error);
      Alert.alert('Could not add plant', 'Please try again.');
      return;
    }

    setNickname('');
    setShowAdd(false);
    await loadGarden();
  }, [loadGarden, nickname]);

  useEffect(() => {
    loadGarden();
  }, [loadGarden]);

  useEffect(() => {
    if (params.addProductId) {
      setSelectedProductId(params.addProductId);
      setShowAdd(true);
    }
  }, [params.addProductId]);

  const availablePlants = useMemo(
    () => products.filter(item => item.category === 'Nursery & Plants' && item.available),
    [],
  );

  const waterPlant = async (plant: GardenPlant) => {
    const { error } = await supabase
      .from('chalega_garden_plants')
      .update({ last_watered_at: new Date().toISOString() })
      .eq('id', plant.id);

    if (error) {
      Alert.alert('Could not update', 'Please try again.');
      return;
    }
    await loadGarden();
  };

  const archivePlant = async (plant: GardenPlant) => {
    Alert.alert('Remove plant?', 'It will leave your active garden but remain in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('chalega_garden_plants')
            .update({ status: 'archived' })
            .eq('id', plant.id);
          if (error) {
            Alert.alert('Could not remove', 'Please try again.');
            return;
          }
          await loadGarden();
        },
      },
    ]);
  };

  const gardenCount = plants.length;
  const growingCount = plants.filter(item => item.status === 'growing').length;
  const wateredToday = plants.filter(
    item => item.last_watered_at?.slice(0, 10) === todayKey(),
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.eyebrow}>CHALEGA GARDENVERSE</Text>
          <Text style={styles.title}>MY GARDEN</Text>
          <Text style={styles.subtitle}>From a balcony to the universe.</Text>

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statNumber}>{gardenCount}</Text><Text style={styles.statLabel}>PLANTS</Text></View>
            <View style={styles.stat}><Text style={styles.statNumber}>{growingCount}</Text><Text style={styles.statLabel}>GROWING</Text></View>
            <View style={styles.stat}><Text style={styles.statNumber}>{wateredToday}</Text><Text style={styles.statLabel}>WATERED</Text></View>
          </View>
        </View>

        <View style={styles.missionCard}>
          <Text style={styles.missionEyebrow}>MISSION 01</Text>
          <Text style={styles.missionTitle}>Grow your first living thing.</Text>
          <Text style={styles.missionText}>
            Add a plant, name it, care for it and watch your home become part of Kolkata's green network.
          </Text>
          <View style={styles.missionActions}>
            <TouchableOpacity style={styles.primary} onPress={() => setShowAdd(true)}>
              <Text style={styles.primaryText}>+ ADD A PLANT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => router.push('/grower')}>
              <Text style={styles.secondaryText}>🌱 GROW & EARN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.networkCard}>
          <View style={styles.networkBody}>
            <Text style={styles.networkEyebrow}>THE NEXT LEVEL OF GARDENVERSE</Text>
            <Text style={styles.networkTitle}>Grow for yourself. Grow to sell.</Text>
            <Text style={styles.networkText}>
              Turn your balcony, terrace or garden into a tiny community nursery. List what you grow and let CHALEGA connect you to customers.
            </Text>
          </View>
          <TouchableOpacity style={styles.networkButton} onPress={() => router.push('/grower')}>
            <Text style={styles.networkButtonText}>BECOME A GROWER →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.marketLink} onPress={() => router.push('/community-market')}>
            <Text style={styles.marketLinkText}>SHOP COMMUNITY-GROWN →</Text>
          </TouchableOpacity>
        </View>


        <Text style={styles.sectionTitle}>Your living ecosystem</Text>

        {loading ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Growing your garden...</Text></View>
        ) : plants.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>Your garden is waiting.</Text>
            <Text style={styles.emptyText}>Start with one plant. One balcony. One small ecosystem.</Text>
          </View>
        ) : (
          plants.map(plant => (
            <View key={plant.id} style={styles.plantCard}>
              <View style={styles.plantIcon}><Text style={styles.plantEmoji}>{plant.emoji}</Text></View>
              <View style={styles.plantBody}>
                <Text style={styles.plantName}>{plant.nickname || plant.plant_name}</Text>
                <Text style={styles.plantType}>{plant.nickname ? plant.plant_name : 'Your CHALEGA plant'}</Text>
                <Text style={styles.plantAge}>🌱 Growing for {daysSince(plant.planted_date)} day{daysSince(plant.planted_date) === 1 ? '' : 's'}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.waterButton} onPress={() => waterPlant(plant)}>
                    <Text style={styles.waterText}>
                      {plant.last_watered_at?.slice(0, 10) === todayKey() ? '✓ WATERED' : '💧 WATER'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => archivePlant(plant)}>
                    <Text style={styles.remove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.futureCard}>
          <Text style={styles.futureTitle}>🌌 GARDENVERSE IS JUST STARTING</Text>
          <Text style={styles.futureText}>
            Next: care reminders • harvest missions • CHALEGA Coins • community growers • Green Map • Kolkata Green League.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.cream },
  content: { paddingBottom: 50 },
  hero: { backgroundColor: BRAND.midnight, padding: 20, paddingTop: 12, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF22', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontSize: 32, lineHeight: 34 },
  eyebrow: { marginTop: 15, color: BRAND.green, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 5, color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 4, color: '#DCEBFA', fontSize: 15, fontWeight: '700' },
  stats: { marginTop: 18, flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF12' },
  statNumber: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  statLabel: { marginTop: 2, color: '#BBD0E2', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  missionCard: { margin: 18, padding: 18, borderRadius: 22, backgroundColor: '#EAF7EE', borderWidth: 1, borderColor: '#C9E5D1' },
  missionEyebrow: { color: '#24633A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  missionTitle: { marginTop: 5, color: '#123C25', fontSize: 21, fontWeight: '900' },
  missionText: { marginTop: 6, color: '#4C6B57', fontSize: 13, lineHeight: 19 },
  missionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 15, backgroundColor: BRAND.midnight },
  primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  secondary: { marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#B9DCC3' },
  secondaryText: { color: '#1C6337', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  networkCard: { marginHorizontal: 18, marginBottom: 8, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line },
  networkBody: {},
  networkEyebrow: { color: '#24633A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  networkTitle: { marginTop: 4, color: BRAND.ink, fontSize: 19, fontWeight: '900' },
  networkText: { marginTop: 5, color: BRAND.muted, fontSize: 12, lineHeight: 18 },
  networkButton: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, backgroundColor: BRAND.midnight },
  networkButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  marketLink: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 2, paddingVertical: 5 },
  marketLinkText: { color: '#1A7040', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  addCard: { marginHorizontal: 18, marginBottom: 12, padding: 15, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line },
  cardTitle: { color: BRAND.ink, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  plantChoice: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  choiceEmoji: { fontSize: 30, width: 48 },
  choiceBody: { flex: 1 },
  choiceName: { color: BRAND.ink, fontSize: 14, fontWeight: '900' },
  choiceMeta: { marginTop: 2, color: BRAND.muted, fontSize: 11 },
  choiceArrow: { color: '#1A7040', fontSize: 10, fontWeight: '900' },
  input: { marginTop: 12, borderWidth: 1, borderColor: BRAND.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: BRAND.ink, fontSize: 13 },
  sectionTitle: { marginHorizontal: 18, marginTop: 8, marginBottom: 10, color: BRAND.ink, fontSize: 20, fontWeight: '900' },
  plantCard: { marginHorizontal: 18, marginBottom: 12, padding: 14, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BRAND.line, flexDirection: 'row' },
  plantIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#F0F7F1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  plantEmoji: { fontSize: 38 },
  plantBody: { flex: 1 },
  plantName: { color: BRAND.ink, fontSize: 17, fontWeight: '900' },
  plantType: { marginTop: 2, color: BRAND.muted, fontSize: 11 },
  plantAge: { marginTop: 7, color: '#477057', fontSize: 12, fontWeight: '700' },
  actions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: BRAND.greenLight },
  waterText: { color: '#1C6337', fontSize: 10, fontWeight: '900' },
  remove: { color: '#9A4D52', fontSize: 10, fontWeight: '800' },
  empty: { marginHorizontal: 18, padding: 28, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: BRAND.line },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { marginTop: 9, color: BRAND.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { marginTop: 5, color: BRAND.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  futureCard: { margin: 18, padding: 16, borderRadius: 20, backgroundColor: BRAND.midnight },
  futureTitle: { color: BRAND.green, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  futureText: { marginTop: 7, color: '#DCEBFA', fontSize: 12, lineHeight: 18 },
});

        {showAdd && (
          <View style={styles.addCard}>
            <Text style={styles.cardTitle}>Choose a plant</Text>
            {availablePlants
              .filter(product => !selectedProductId || product.id === selectedProductId)
              .map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.plantChoice}
                onPress={() => setSelectedProductId(product.id)}
              >
                <Text style={styles.choiceEmoji}>{product.emoji}</Text>
                <View style={styles.choiceBody}>
                  <Text style={styles.choiceName}>{product.name}</Text>
                  <Text style={styles.choiceMeta}>₹{product.price.toLocaleString('en-IN')} / {product.unit}</Text>
                </View>
                <Text style={styles.choiceArrow}>
                  {selectedProductId === product.id ? 'SELECTED' : 'SELECT →'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.primary, !selectedProductId && { opacity: 0.45 }]}
              disabled={!selectedProductId}
              onPress={() => selectedProductId && addPlant(selectedProductId)}
            >
              <Text style={styles.primaryText}>ADD TO MY GARDEN</Text>
            </TouchableOpacity>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="Optional plant name, e.g. Maa's Tulsi"
              placeholderTextColor="#82909D"
              style={styles.input}
            />
          </View>
        )}

