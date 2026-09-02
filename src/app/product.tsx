import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const PRODUCTS: Record<
  string,
  {
    name: string;
    price: number;
    emoji: string;
    category: string;
    description: string;
  }
> = {
  '1': {
    name: 'Chalega India Water Bottle',
    price: 399,
    emoji: '💧',
    category: 'Hydration',
    description:
      'A reusable everyday water bottle designed to help you stay hydrated throughout the day.',
  },
  '2': {
    name: 'Chalega India Walking T-Shirt',
    price: 699,
    emoji: '👕',
    category: 'Fitness',
    description:
      'Comfortable everyday walking wear for your morning and evening walks.',
  },
  '3': {
    name: 'Healthy Snack Pack',
    price: 249,
    emoji: '🥜',
    category: 'Healthy Food',
    description:
      'A convenient healthy snack option for busy days and active lifestyles.',
  },
  '4': {
    name: 'Fresh Fruit Box',
    price: 499,
    emoji: '🍎',
    category: 'Fruits',
    description:
      'A selection of seasonal fresh fruits packed for convenient home delivery.',
  },
  '5': {
    name: 'Dry Fruits Wellness Pack',
    price: 599,
    emoji: '🥜',
    category: 'Healthy Food',
    description:
      'A selection of dry fruits for everyday healthy snacking.',
  },
  '6': {
    name: 'Morning Fruit Basket',
    price: 699,
    emoji: '🍊',
    category: 'Fruits',
    description:
      'A family-friendly selection of fresh fruits for your home.',
  },
  '7': {
    name: 'Walking Cap',
    price: 299,
    emoji: '🧢',
    category: 'Fitness',
    description:
      'A lightweight cap designed for outdoor walks.',
  },
  '8': {
    name: 'Healthy Home Kit',
    price: 899,
    emoji: '🏠',
    category: 'Home Health',
    description:
      'Simple everyday wellness essentials for a healthier home.',
  },
  '9': {
    name: 'Family Health Combo',
    price: 999,
    emoji: '🎁',
    category: 'Health Combos',
    description:
      'A useful combination of everyday wellness products for the family.',
  },
  '10': {
    name: 'Walking Starter Combo',
    price: 1199,
    emoji: '🚶',
    category: 'Health Combos',
    description:
      'A complete starter combination for beginning your walking routine.',
  },
};

export default function ProductScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const product = PRODUCTS[id || '1'];

  const [quantity, setQuantity] = useState(1);

  const total = product.price * quantity;

  const addToCart = () => {
    Alert.alert(
      'Added to Cart',
      `${quantity} × ${product.name} added to your cart.`,
      [
        {
          text: 'Continue Shopping',
          onPress: () => router.back(),
        },
        {
          text: 'Go Back',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Product</Text>

        <View style={styles.headerSpace} />
      </View>

      <View style={styles.content}>
        <View style={styles.productImage}>
          <Text style={styles.productEmoji}>
            {product.emoji}
          </Text>
        </View>

        <Text style={styles.category}>
          {product.category.toUpperCase()}
        </Text>

        <Text style={styles.name}>{product.name}</Text>

        <Text style={styles.price}>
          ₹{product.price.toLocaleString('en-IN')}
        </Text>

        <Text style={styles.description}>
          {product.description}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.quantityTitle}>
          Quantity
        </Text>

        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              setQuantity(Math.max(1, quantity - 1))
            }
          >
            <Text style={styles.quantityButtonText}>−</Text>
          </TouchableOpacity>

          <Text style={styles.quantityNumber}>
            {quantity}
          </Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              setQuantity(quantity + 1)
            }
          >
            <Text style={styles.quantityButtonText}>+</Text>
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
          style={styles.addButton}
          onPress={addToCart}
        >
          <Text style={styles.addButtonText}>
            ADD TO CART
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  header: {
    height: 70,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 38,
    lineHeight: 40,
    color: '#1976F3',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111111',
  },

  headerSpace: {
    width: 45,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },

  productImage: {
    height: 300,
    borderRadius: 30,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  productEmoji: {
    fontSize: 120,
  },

  category: {
    color: '#1976F3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  name: {
    fontSize: 31,
    fontWeight: '900',
    color: '#111111',
    marginTop: 7,
  },

  price: {
    fontSize: 27,
    fontWeight: '900',
    color: '#1976F3',
    marginTop: 8,
  },

  description: {
    color: '#666666',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },

  divider: {
    height: 1,
    backgroundColor: '#DDDFE5',
    marginVertical: 22,
  },

  quantityTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111111',
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    fontSize: 25,
    fontWeight: '900',
    color: '#111111',
  },

  quantityNumber: {
    width: 55,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#111111',
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#666666',
  },

  total: {
    fontSize: 27,
    fontWeight: '900',
    color: '#111111',
  },

  addButton: {
    backgroundColor: '#1976F3',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 18,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});