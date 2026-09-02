import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description: string;
};

const products: Product[] = [
  {
    id: '1',
    name: 'Chalega India Water Bottle',
    price: 399,
    category: 'Hydration',
    emoji: '💧',
    description: 'Reusable bottle for everyday hydration.',
  },
  {
    id: '2',
    name: 'Chalega India Walking T-Shirt',
    price: 699,
    category: 'Fitness',
    emoji: '👕',
    description: 'Comfortable T-shirt for walking and exercise.',
  },
  {
    id: '3',
    name: 'Healthy Snack Pack',
    price: 249,
    category: 'Healthy Food',
    emoji: '🥜',
    description: 'A convenient everyday healthy snack option.',
  },
  {
    id: '4',
    name: 'Fresh Fruit Box',
    price: 499,
    category: 'Fruits',
    emoji: '🍎',
    description: 'Seasonal fresh fruits packed for your home.',
  },
  {
    id: '5',
    name: 'Dry Fruits Wellness Pack',
    price: 599,
    category: 'Healthy Food',
    emoji: '🥜',
    description: 'A selection of dry fruits for everyday snacking.',
  },
  {
    id: '6',
    name: 'Morning Fruit Basket',
    price: 699,
    category: 'Fruits',
    emoji: '🍇',
    description: 'A family-friendly selection of fresh fruits.',
  },
  {
    id: '7',
    name: 'Walking Cap',
    price: 299,
    category: 'Fitness',
    emoji: '🧢',
    description: 'Lightweight cap for outdoor walks.',
  },
  {
    id: '8',
    name: 'Healthy Home Kit',
    price: 899,
    category: 'Home Health',
    emoji: '🏠',
    description: 'Simple essentials for a healthier home.',
  },
  {
    id: '9',
    name: 'Family Health Combo',
    price: 999,
    category: 'Health Combos',
    emoji: '🎁',
    description: 'A useful combination of everyday wellness products.',
  },
  {
    id: '10',
    name: 'Walking Starter Combo',
    price: 1199,
    category: 'Health Combos',
    emoji: '🚶',
    description: 'Everything you need to get started with walking.',
  },
];

export default function CheckoutScreen() {
  const router = useRouter();

  const {
    total,
    items,
    cart,
  } = useLocalSearchParams<{
    total?: string;
    items?: string;
    cart?: string;
  }>();

  const orderTotal = Number(total || 0);
  const itemCount = Number(items || 0);

  let cartQuantities: Record<string, number> = {};

  try {
    if (cart) {
      cartQuantities = JSON.parse(cart);
    }
  } catch {
    cartQuantities = {};
  }

  const selectedProducts = products
    .filter((product) => (cartQuantities[product.id] || 0) > 0)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      quantity: cartQuantities[product.id],
      total:
        product.price * cartQuantities[product.id],
    }));

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [pin, setPin] = useState('');
  const [delivery, setDelivery] = useState('Standard');
  const [saving, setSaving] = useState(false);

  const placeOrder = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your name.'
      );
      return;
    }

    if (phone.length !== 10) {
      Alert.alert(
        'Invalid mobile number',
        'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Missing address',
        'Please enter your delivery address.'
      );
      return;
    }

    if (!area.trim()) {
      Alert.alert(
        'Missing area',
        'Please enter your area or locality.'
      );
      return;
    }

    if (pin.length !== 6) {
      Alert.alert(
        'Invalid PIN code',
        'Please enter your 6-digit PIN code.'
      );
      return;
    }

    try {
      setSaving(true);

      const existingOrdersText =
        await AsyncStorage.getItem('chalega_orders');

      const existingOrders = existingOrdersText
        ? JSON.parse(existingOrdersText)
        : [];

      const orderNumber =
        existingOrders.length + 1;

      const orderId =
        `CI-${new Date().getFullYear()}-${String(
          orderNumber
        ).padStart(4, '0')}`;

      const newOrder = {
        id: orderId,

        customer: {
          name: name.trim(),
          phone: phone.trim(),
        },

        address: {
          address: address.trim(),
          area: area.trim(),
          pin: pin.trim(),
        },

        products: selectedProducts,

        items: itemCount,

        total: orderTotal,

        delivery,

        status: 'Order Received',

        createdAt: new Date().toISOString(),
      };

      const updatedOrders = [
        ...existingOrders,
        newOrder,
      ];

      await AsyncStorage.setItem(
        'chalega_orders',
        JSON.stringify(updatedOrders)
      );

      router.replace({
        pathname: '/order-confirmed',
        params: {
          orderId,
          name: name.trim(),
          total: orderTotal.toString(),
        },
      });
    } catch (error) {
      console.log('Order save error:', error);

      Alert.alert(
        'Order error',
        'We could not save your order. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <View>
              <Text style={styles.brand}>
                C H A L E G A  I N D I A
              </Text>

              <Text style={styles.title}>
                Checkout
              </Text>
            </View>
          </View>

          {/* TOTAL */}

          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>
                ORDER TOTAL
              </Text>

              <Text style={styles.summaryAmount}>
                ₹{orderTotal.toLocaleString('en-IN')}
              </Text>

              <Text style={styles.summaryItems}>
                {itemCount} item
                {itemCount === 1 ? '' : 's'}
              </Text>
            </View>

            <Text style={styles.summaryEmoji}>
              🛒
            </Text>
          </View>

          {/* PRODUCTS */}

          <Text style={styles.sectionTitle}>
            Your Products
          </Text>

          <View style={styles.productsCard}>
            {selectedProducts.length === 0 ? (
              <Text style={styles.emptyProducts}>
                No products found in this order.
              </Text>
            ) : (
              selectedProducts.map((product) => (
                <View
                  key={product.id}
                  style={styles.productRow}
                >
                  <View style={styles.productEmojiBox}>
                    <Text style={styles.productEmoji}>
                      {product.emoji}
                    </Text>
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>
                      {product.name}
                    </Text>

                    <Text style={styles.quantityText}>
                      Quantity: {product.quantity}
                    </Text>

                    <Text style={styles.priceText}>
                      ₹{product.price.toLocaleString('en-IN')}
                      {' '}each
                    </Text>
                  </View>

                  <Text style={styles.productTotal}>
                    ₹{product.total.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* CUSTOMER */}

          <Text style={styles.sectionTitle}>
            Your Details
          </Text>

          <Text style={styles.label}>
            Full Name
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor="#999999"
            style={styles.input}
          />

          <Text style={styles.label}>
            Mobile Number
          </Text>

          <TextInput
            value={phone}
            onChangeText={(text) =>
              setPhone(
                text.replace(/[^0-9]/g, '')
              )
            }
            placeholder="10-digit mobile number"
            placeholderTextColor="#999999"
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
          />

          {/* ADDRESS */}

          <Text style={styles.sectionTitle}>
            Delivery Address
          </Text>

          <Text style={styles.label}>
            House / Street / Building
          </Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="House number, street, building..."
            placeholderTextColor="#999999"
            multiline
            style={[
              styles.input,
              styles.addressInput,
            ]}
          />

          <Text style={styles.label}>
            Area / Locality
          </Text>

          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder="e.g. Park Circus"
            placeholderTextColor="#999999"
            style={styles.input}
          />

          <Text style={styles.label}>
            PIN Code
          </Text>

          <TextInput
            value={pin}
            onChangeText={(text) =>
              setPin(
                text.replace(/[^0-9]/g, '')
              )
            }
            placeholder="6-digit PIN code"
            placeholderTextColor="#999999"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />

          {/* DELIVERY */}

          <Text style={styles.sectionTitle}>
            Delivery
          </Text>

          <TouchableOpacity
            style={[
              styles.option,
              delivery === 'Standard' &&
                styles.optionSelected,
            ]}
            onPress={() =>
              setDelivery('Standard')
            }
          >
            <View>
              <Text style={styles.optionTitle}>
                🛵 Standard Delivery
              </Text>

              <Text style={styles.optionText}>
                Delivery within Kolkata
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                delivery === 'Standard' &&
                  styles.radioSelected,
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              delivery === 'Express' &&
                styles.optionSelected,
            ]}
            onPress={() =>
              setDelivery('Express')
            }
          >
            <View>
              <Text style={styles.optionTitle}>
                ⚡ Express Delivery
              </Text>

              <Text style={styles.optionText}>
                Faster delivery where available
              </Text>
            </View>

            <View
              style={[
                styles.radio,
                delivery === 'Express' &&
                  styles.radioSelected,
              ]}
            />
          </TouchableOpacity>

          {/* PAYMENT */}

          <Text style={styles.sectionTitle}>
            Payment
          </Text>

          <View style={styles.paymentCard}>
            <Text style={styles.paymentEmoji}>
              💵
            </Text>

            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>
                Cash on Delivery
              </Text>

              <Text style={styles.paymentText}>
                Payment gateway can be connected later.
              </Text>
            </View>
          </View>

          {/* FINAL TOTAL */}

          <View style={styles.finalTotal}>
            <Text style={styles.finalLabel}>
              Total to Pay
            </Text>

            <Text style={styles.finalAmount}>
              ₹{orderTotal.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* BUTTON */}

          <TouchableOpacity
            style={[
              styles.placeButton,
              saving && styles.disabledButton,
            ]}
            onPress={placeOrder}
            disabled={saving}
          >
            <Text style={styles.placeButtonText}>
              {saving
                ? 'SAVING ORDER...'
                : 'PLACE ORDER →'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Your order will be saved on this device.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  keyboard: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  backText: {
    color: '#1976F3',
    fontSize: 38,
    lineHeight: 40,
  },

  brand: {
    color: '#1976F3',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  title: {
    color: '#111111',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 2,
  },

  summaryCard: {
    backgroundColor: '#1976F3',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryLabel: {
    color: '#DCEAFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 3,
  },

  summaryItems: {
    color: '#E6F0FF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  summaryEmoji: {
    fontSize: 48,
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 25,
    marginBottom: 13,
  },

  productsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  productEmojiBox: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productEmoji: {
    fontSize: 31,
  },

  productInfo: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 7,
  },

  productName: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
  },

  quantityText: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  priceText: {
    color: '#888888',
    fontSize: 10,
    marginTop: 2,
  },

  productTotal: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '900',
  },

  emptyProducts: {
    color: '#777777',
    padding: 15,
    textAlign: 'center',
  },

  label: {
    color: '#444444',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minHeight: 54,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111111',
    marginBottom: 15,
  },

  addressInput: {
    minHeight: 90,
    paddingTop: 15,
    textAlignVertical: 'top',
  },

  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 10,
  },

  optionSelected: {
    borderColor: '#1976F3',
  },

  optionTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  optionText: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#BBBBBB',
  },

  radioSelected: {
    borderColor: '#1976F3',
    backgroundColor: '#1976F3',
  },

  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },

  paymentEmoji: {
    fontSize: 30,
    marginRight: 13,
  },

  paymentInfo: {
    flex: 1,
  },

  paymentTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  paymentText: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },

  finalTotal: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  finalLabel: {
    color: '#555555',
    fontSize: 16,
    fontWeight: '800',
  },

  finalAmount: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '900',
  },

  placeButton: {
    backgroundColor: '#111111',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.6,
  },

  placeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  note: {
    color: '#999999',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});