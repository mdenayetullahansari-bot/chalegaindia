import React, { useMemo, useState } from 'react';
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
import { products } from '@/data/products';

type Cart = Record<string, number>;

type DeliveryType = 'Chalega 24-Hour';

const FREE_DELIVERY_THRESHOLD = 499;

const getDeliveryFee = (subtotal: number) => {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return 0;
  }

  if (subtotal >= 299) {
    return 29;
  }

  return 49;
};

const getDeliveryDeadline = (
  createdAt: string
) => {
  const created = new Date(createdAt);
  const deadline = new Date(
    created.getTime() + 24 * 60 * 60 * 1000
  );

  return deadline.toISOString();
};

const formatDeliveryDate = (
  value: string
) => {
  const date = new Date(value);

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function CheckoutScreen() {
  const router = useRouter();

  const {
    cart: cartParam,
    items: itemsParam,
  } = useLocalSearchParams<{
    cart?: string;
    items?: string;
  }>();

  const cart = useMemo<Cart>(() => {
    if (!cartParam) {
      return {};
    }

    try {
      const parsed = JSON.parse(cartParam);

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return {};
      }

      const safeCart: Cart = {};

      for (const [productId, quantity] of Object.entries(
        parsed
      )) {
        if (
          typeof quantity === 'number' &&
          Number.isFinite(quantity) &&
          quantity > 0
        ) {
          safeCart[productId] =
            Math.floor(quantity);
        }
      }

      return safeCart;
    } catch {
      return {};
    }
  }, [cartParam]);

  const selectedProducts = useMemo(() => {
    return products
      .filter(
        product => (cart[product.id] || 0) > 0
      )
      .map(product => ({
        ...product,
        quantity: cart[product.id],
      }));
  }, [cart]);

  const itemCount = selectedProducts.reduce(
    (sum, product) =>
      sum + (product.quantity || 0),
    0
  );

  const subtotal = selectedProducts.reduce(
    (sum, product) =>
      sum +
      product.price *
        (product.quantity || 0),
    0
  );

  const deliveryFee =
    getDeliveryFee(subtotal);

  const orderTotal =
    subtotal + deliveryFee;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] =
    useState('');
  const [area, setArea] = useState('');
  const [pin, setPin] = useState('');

  const [
    delivery,
    setDelivery,
  ] = useState<DeliveryType>(
    'Chalega 24-Hour'
  );

  const [saving, setSaving] =
    useState(false);

  const placeOrder = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert(
        'Your cart is empty',
        'Please return to Shop to Feed and add a product.'
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your name.'
      );
      return;
    }

    if (phone.trim().length !== 10) {
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

    if (pin.trim().length !== 6) {
      Alert.alert(
        'Invalid PIN code',
        'Please enter your 6-digit PIN code.'
      );
      return;
    }

    try {
      setSaving(true);

      const existingOrdersText =
        await AsyncStorage.getItem(
          'chalega_orders'
        );

      let existingOrders: any[] = [];

      if (existingOrdersText) {
        try {
          const parsed =
            JSON.parse(existingOrdersText);

          if (Array.isArray(parsed)) {
            existingOrders = parsed;
          }
        } catch {
          existingOrders = [];
        }
      }

      const orderNumber =
        existingOrders.length + 1;

      const createdAt =
        new Date().toISOString();

      const deliveryDeadline =
        getDeliveryDeadline(createdAt);

      const orderId =
        `CI-${new Date().getFullYear()}-${String(
          orderNumber
        ).padStart(4, '0')}`;

      const newOrder = {
        id: orderId,
        orderId,

        customer: {
          name: name.trim(),
          phone: phone.trim(),
        },

        address: {
          address: address.trim(),
          area: area.trim(),
          pin: pin.trim(),
        },

        products: selectedProducts.map(
          product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            category: product.category,
            emoji: product.emoji,
            quantity:
              product.quantity || 1,
          })
        ),

        items: itemCount,

        subtotal,

        deliveryFee,

        total: orderTotal,

        delivery,

        deliveryPromise:
          'Within 24 hours',

        createdAt,

        deliveryDeadline,

        deliveryWindow:
          'Within 24 hours of order placement',

        status: 'Order Received',
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
        pathname:
          '/order-confirmed',
        params: {
          orderId,
          name: name.trim(),
          total:
            orderTotal.toString(),
          deliveryDeadline,
        },
      });
    } catch (error) {
      console.log(
        'Order save error:',
        error
      );

      Alert.alert(
        'Order error',
        'We could not save your order. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.content
          }
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.backText
                }
              >
                ‹
              </Text>
            </TouchableOpacity>

            <View
              style={
                styles.headerCenter
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                Checkout
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Shop to Feed
              </Text>
            </View>

            <View
              style={
                styles.headerSpacer
              }
            />
          </View>

          <View
            style={styles.promiseHero}
          >
            <View
              style={
                styles.promiseIcon
              }
            >
              <Text
                style={
                  styles.promiseIconText
                }
              >
                🚚
              </Text>
            </View>

            <View
              style={
                styles.promiseBody
              }
            >
              <Text
                style={
                  styles.promiseTitle
                }
              >
                CHALEGA 24-HOUR DELIVERY
              </Text>

              <Text
                style={
                  styles.promiseText
                }
              >
                Your fresh order will be
                delivered within 24 hours
                of order placement.
              </Text>
            </View>
          </View>

          <Text
            style={styles.sectionTitle}
          >
            Your Details
          </Text>

          <View
            style={styles.formCard}
          >
            <Text
              style={styles.inputLabel}
            >
              Full Name
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#88939D"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text
              style={styles.inputLabel}
            >
              Mobile Number
            </Text>

            <TextInput
              value={phone}
              onChangeText={text =>
                setPhone(
                  text.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="10-digit mobile number"
              placeholderTextColor="#88939D"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
            />

            <Text
              style={styles.inputLabel}
            >
              Delivery Address
            </Text>

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="House / flat / street"
              placeholderTextColor="#88939D"
              style={[
                styles.input,
                styles.textarea,
              ]}
              multiline
            />

            <Text
              style={styles.inputLabel}
            >
              Area / Locality
            </Text>

            <TextInput
              value={area}
              onChangeText={setArea}
              placeholder="Area or locality"
              placeholderTextColor="#88939D"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text
              style={styles.inputLabel}
            >
              PIN Code
            </Text>

            <TextInput
              value={pin}
              onChangeText={text =>
                setPin(
                  text.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder="6-digit PIN code"
              placeholderTextColor="#88939D"
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />
          </View>

          <Text
            style={styles.sectionTitle}
          >
            Your Products
          </Text>

          <View
            style={styles.productsCard}
          >
            {selectedProducts.length ===
            0 ? (
              <Text
                style={
                  styles.emptyProducts
                }
              >
                No products found in
                this order.
              </Text>
            ) : (
              selectedProducts.map(
                product => (
                  <View
                    key={product.id}
                    style={
                      styles.productRow
                    }
                  >
                    <View
                      style={
                        styles.productEmoji
                      }
                    >
                      <Text>
                        {
                          product.emoji
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.productInfo
                      }
                    >
                      <Text
                        style={
                          styles.productName
                        }
                      >
                        {product.name}
                      </Text>

                      <Text
                        style={
                          styles.productUnit
                        }
                      >
                        {product.quantity}{' '}
                        × ₹
                        {product.price.toLocaleString(
                          'en-IN'
                        )}{' '}
                        / {product.unit}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.productTotal
                      }
                    >
                      ₹
                      {(
                        product.price *
                        (product.quantity ||
                          0)
                      ).toLocaleString(
                        'en-IN'
                      )}
                    </Text>
                  </View>
                )
              )
            )}
          </View>

          <Text
            style={styles.sectionTitle}
          >
            Delivery
          </Text>

          <TouchableOpacity
            style={[
              styles.deliveryOption,
              styles.deliveryOptionSelected,
            ]}
            activeOpacity={0.85}
            onPress={() =>
              setDelivery(
                'Chalega 24-Hour'
              )
            }
          >
            <View
              style={
                styles.deliveryOptionIcon
              }
            >
              <Text>
                🚚
              </Text>
            </View>

            <View
              style={
                styles.deliveryOptionBody
              }
            >
              <Text
                style={
                  styles.deliveryOptionTitle
                }
              >
                Chalega 24-Hour Delivery
              </Text>

              <Text
                style={
                  styles.deliveryOptionText
                }
              >
                Guaranteed delivery
                within 24 hours of
                order placement.
              </Text>
            </View>

            <View
              style={
                styles.selectedRadio
              }
            >
              <View
                style={
                  styles.selectedRadioDot
                }
              />
            </View>
          </TouchableOpacity>

          <Text
            style={styles.sectionTitle}
          >
            Order Summary
          </Text>

          <View
            style={styles.summaryCard}
          >
            <View
              style={styles.summaryRow}
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Items
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                ₹
                {subtotal.toLocaleString(
                  'en-IN'
                )}
              </Text>
            </View>

            <View
              style={styles.summaryRow}
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Delivery
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  deliveryFee === 0 &&
                    styles.freeValue,
                ]}
              >
                {deliveryFee === 0
                  ? 'FREE'
                  : `₹${deliveryFee}`}
              </Text>
            </View>

            <Text
              style={styles.freeDeliveryNote}
            >
              {subtotal >=
              FREE_DELIVERY_THRESHOLD
                ? '✓ You unlocked free delivery.'
                : `Add ₹${(
                    FREE_DELIVERY_THRESHOLD -
                    subtotal
                  ).toLocaleString(
                    'en-IN'
                  )} more for free delivery.`}
            </Text>

            <View
              style={
                styles.summaryDivider
              }
            />

            <View
              style={styles.summaryRow}
            >
              <Text
                style={styles.totalLabel}
              >
                Total
              </Text>

              <Text
                style={styles.totalValue}
              >
                ₹
                {orderTotal.toLocaleString(
                  'en-IN'
                )}
              </Text>
            </View>
          </View>

          <View
            style={styles.paymentCard}
          >
            <Text
              style={styles.paymentTitle}
            >
              Payment
            </Text>

            <View
              style={
                styles.codOption
              }
            >
              <View
                style={
                  styles.codIcon
                }
              >
                <Text>₹</Text>
              </View>

              <View
                style={
                  styles.codBody
                }
              >
                <Text
                  style={
                    styles.codTitle
                  }
                >
                  Cash on Delivery
                </Text>

                <Text
                  style={
                    styles.codText
                  }
                >
                  Pay when your order
                  arrives.
                </Text>
              </View>

              <View
                style={
                  styles.selectedRadio
                }
              >
                <View
                  style={
                    styles.selectedRadioDot
                  }
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              saving &&
                styles.placeOrderDisabled,
            ]}
            onPress={
              placeOrder
            }
            disabled={saving}
            activeOpacity={0.85}
          >
            <View>
              <Text
                style={
                  styles.placeOrderText
                }
              >
                {saving
                  ? 'SAVING ORDER...'
                  : 'PLACE ORDER'}
              </Text>

              {!saving && (
                <Text
                  style={
                    styles.placeOrderSubtext
                  }
                >
                  Delivered within 24 hours
                </Text>
              )}
            </View>

            {!saving && (
              <Text
                style={
                  styles.placeOrderTotal
                }
              >
                ₹
                {orderTotal.toLocaleString(
                  'en-IN'
                )}
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={styles.orderNote}
          >
            {itemsParam ||
              itemCount}{' '}
            item
            {itemCount === 1
              ? ''
              : 's'} · Fresh order ·
            Chalega 24-hour delivery
          </Text>

          <Text
            style={styles.footer}
          >
            C H A L E G A  I N D I A 🇮🇳
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
    paddingBottom: 45,
  },

  header: {
    height: 72,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 34,
    lineHeight: 38,
    color: '#123B2A',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#162530',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#7A8793',
  },

  headerSpacer: {
    width: 43,
  },

  promiseHero: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 15,
    borderRadius: 20,
    backgroundColor: '#EAF6EE',
    borderWidth: 1,
    borderColor: '#C9E4D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  promiseIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  promiseIconText: {
    fontSize: 23,
  },

  promiseBody: {
    flex: 1,
  },

  promiseTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#14592C',
  },

  promiseText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#536A5A',
    fontWeight: '600',
  },

  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 21,
    marginBottom: 9,
    fontSize: 18,
    fontWeight: '900',
    color: '#172630',
  },

  formCard: {
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8ED',
  },

  inputLabel: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#596875',
  },

  input: {
    minHeight: 46,
    marginBottom: 14,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DCE2E8',
    backgroundColor: '#FAFBFC',
    fontSize: 14,
    color: '#192832',
  },

  textarea: {
    minHeight: 82,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  productsCard: {
    marginHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8ED',
    overflow: 'hidden',
  },

  productRow: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },

  productEmoji: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  productInfo: {
    flex: 1,
    paddingRight: 10,
  },

  productName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1B2934',
  },

  productUnit: {
    marginTop: 3,
    fontSize: 10,
    color: '#78858F',
    fontWeight: '700',
  },

  productTotal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#123B2A',
  },

  emptyProducts: {
    padding: 20,
    fontSize: 13,
    textAlign: 'center',
    color: '#71808D',
  },

  deliveryOption: {
    marginHorizontal: 18,
    padding: 15,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E7EC',
    flexDirection: 'row',
    alignItems: 'center',
  },

  deliveryOptionSelected: {
    borderColor: '#2FA84F',
    backgroundColor: '#F4FAF5',
  },

  deliveryOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF6EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  deliveryOptionBody: {
    flex: 1,
  },

  deliveryOptionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#183129',
  },

  deliveryOptionText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#607168',
  },

  selectedRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#2FA84F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2FA84F',
  },

  summaryCard: {
    marginHorizontal: 18,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8ED',
  },

  summaryRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  summaryLabel: {
    fontSize: 13,
    color: '#687681',
    fontWeight: '700',
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2934',
  },

  freeValue: {
    color: '#25773D',
  },

  freeDeliveryNote: {
    marginTop: 6,
    fontSize: 11,
    color: '#6A6F57',
    fontWeight: '700',
  },

  summaryDivider: {
    height: 1,
    marginVertical: 6,
    backgroundColor: '#E8ECEF',
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A2731',
  },

  totalValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#123B2A',
  },

  paymentCard: {
    marginHorizontal: 18,
    marginTop: 2,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8ED',
  },

  paymentTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#172630',
    marginBottom: 11,
  },

  codOption: {
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E4E8EC',
    flexDirection: 'row',
    alignItems: 'center',
  },

  codIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  codBody: {
    flex: 1,
  },

  codTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#263540',
  },

  codText: {
    marginTop: 2,
    fontSize: 10,
    color: '#77838D',
  },

  placeOrderButton: {
    marginHorizontal: 18,
    marginTop: 17,
    minHeight: 60,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#1976F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  placeOrderDisabled: {
    opacity: 0.65,
  },

  placeOrderText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  placeOrderSubtext: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    color: '#DCEAFF',
  },

  placeOrderTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  orderNote: {
    marginHorizontal: 18,
    marginTop: 12,
    textAlign: 'center',
    fontSize: 10,
    color: '#7B8791',
    fontWeight: '700',
  },

  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 3,
    color: '#8A96A0',
  },
});