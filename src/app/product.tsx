import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  products,
  Product,
} from '@/data/products';
import { addToCart } from '@/lib/cart';

export default function ProductScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const product = useMemo<Product | undefined>(
    () => products.find(item => item.id === id),
    [id]
  );

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>
            🔎
          </Text>

          <Text style={styles.notFoundTitle}>
            Product not found
          </Text>

          <Text style={styles.notFoundText}>
            This product is no longer available.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              GO BACK
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total = product.price * quantity;

  const addProductToCart = async () => {
    try {
      setAdding(true);

      await addToCart(
        product.id,
        quantity
      );

      Alert.alert(
        'Added to Cart',
        `${quantity} × ${product.name} added to your cart.`,
        [
          {
            text: 'Continue Shopping',
            onPress: () => router.back(),
          },
          {
            text: 'View Shop',
            onPress: () =>
              router.replace('/shop'),
          },
        ]
      );
    } catch (error) {
      console.log(
        'Product cart error:',
        error
      );

      Alert.alert(
        'Could not add to cart',
        'Please try again.'
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Product
          </Text>

          <View style={styles.headerSpace} />
        </View>

        <View style={styles.productHero}>
          <View style={styles.productImage}>
            <Text style={styles.productEmoji}>
              {product.emoji}
            </Text>
          </View>

          <View style={styles.availabilityBadge}>
            <View style={styles.availabilityDot} />

            <Text style={styles.availabilityText}>
              AVAILABLE TODAY
            </Text>
          </View>
        </View>

        <View style={styles.productBody}>
          <View style={styles.metaRow}>
            <Text style={styles.category}>
              {product.category.toUpperCase()}
            </Text>

            {product.seasonal && (
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeText}>
                  SEASONAL
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {product.name}
          </Text>

          <Text style={styles.description}>
            {product.description}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{product.price.toLocaleString('en-IN')}
            </Text>

            <Text style={styles.unit}>
              / {product.unit}
            </Text>
          </View>

          <View style={styles.promiseCard}>
            <Text style={styles.promiseEmoji}>
              🚚
            </Text>

            <View style={styles.promiseBody}>
              <Text style={styles.promiseTitle}>
                CHALEGA 24-HOUR DELIVERY
              </Text>

              <Text style={styles.promiseText}>
                Order today and receive your fresh
                essentials within 24 hours.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.quantityTitle}>
            Quantity
          </Text>

          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setQuantity(
                  Math.max(1, quantity - 1)
                )
              }
              disabled={adding}
              activeOpacity={0.8}
            >
              <Text style={styles.quantityButtonText}>
                −
              </Text>
            </TouchableOpacity>

            <Text style={styles.quantityNumber}>
              {quantity}
            </Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setQuantity(quantity + 1)
              }
              disabled={adding}
              activeOpacity={0.8}
            >
              <Text style={styles.quantityButtonText}>
                +
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.total}>
              ₹{total.toLocaleString('en-IN')}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              adding && styles.addButtonDisabled,
            ]}
            onPress={addProductToCart}
            disabled={adding}
            activeOpacity={0.85}
          >
            <Text style={styles.addButtonText}>
              {adding
                ? 'ADDING...'
                : 'ADD TO CART'}
            </Text>

            {!adding && (
              <Text style={styles.addButtonTotal}>
                ₹{total.toLocaleString('en-IN')}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.impactCard}>
            <Text style={styles.impactEmoji}>
              ❤️
            </Text>

            <View style={styles.impactBody}>
              <Text style={styles.impactTitle}>
                SHOP WITH PURPOSE
              </Text>

              <Text style={styles.impactText}>
                Your purchase supports Chalega's
                community food initiatives.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingBottom: 35,
  },

  header: {
    height: 70,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 38,
    lineHeight: 40,
    color: '#123B2A',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#152330',
  },

  headerSpace: {
    width: 45,
  },

  productHero: {
    paddingHorizontal: 18,
    paddingTop: 18,
    alignItems: 'center',
  },

  productImage: {
    width: 180,
    height: 180,
    borderRadius: 34,
    backgroundColor: '#EAF6EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFE6D5',
  },

  productEmoji: {
    fontSize: 88,
  },

  availabilityBadge: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#EAF6EE',
    flexDirection: 'row',
    alignItems: 'center',
  },

  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: '#2FA84F',
  },

  availabilityText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#246C39',
  },

  productBody: {
    paddingHorizontal: 18,
  },

  metaRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  category: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
    color: '#73808B',
  },

  seasonBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EAF6EE',
  },

  seasonBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2E7D43',
  },

  name: {
    marginTop: 7,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    color: '#172530',
  },

  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#697783',
  },

  priceRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  price: {
    fontSize: 28,
    fontWeight: '900',
    color: '#123B2A',
  },

  unit: {
    marginLeft: 7,
    fontSize: 13,
    color: '#6E7A85',
    fontWeight: '700',
  },

  promiseCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE8E0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  promiseEmoji: {
    fontSize: 24,
    marginRight: 11,
  },

  promiseBody: {
    flex: 1,
  },

  promiseTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#175A2D',
  },

  promiseText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#5E7064',
  },

  divider: {
    height: 1,
    marginVertical: 22,
    backgroundColor: '#E5E9ED',
  },

  quantityTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A2732',
  },

  quantityRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
    height: 45,
    borderRadius: 13,
    backgroundColor: '#EEF4FF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  quantityButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D6FF2',
  },

  quantityNumber: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    color: '#1D2B36',
  },

  totalRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#66747F',
  },

  total: {
    fontSize: 23,
    fontWeight: '900',
    color: '#123B2A',
  },

  addButton: {
    marginTop: 14,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: '#1976F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  addButtonDisabled: {
    opacity: 0.65,
  },

  addButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  addButtonTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  impactCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF6F7',
    borderWidth: 1,
    borderColor: '#F1D9DC',
    flexDirection: 'row',
    alignItems: 'center',
  },

  impactEmoji: {
    fontSize: 22,
    marginRight: 11,
  },

  impactBody: {
    flex: 1,
  },

  impactTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#7B1E27',
  },

  impactText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#6E5A5D',
  },

  primaryButton: {
    marginTop: 18,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  notFound: {
    flex: 1,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notFoundEmoji: {
    fontSize: 45,
  },

  notFoundTitle: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: '900',
    color: '#152330',
  },

  notFoundText: {
    marginTop: 7,
    fontSize: 13,
    textAlign: 'center',
    color: '#6F7C87',
    textAlignVertical: 'center',
  },
});