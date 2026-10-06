import { BRAND } from '@/lib/brand';
import React, { useMemo, useState } from 'react';
import * as Location from 'expo-location';
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
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { products } from '@/data/products';
import { supabase } from '@/lib/supabase';
import { clearCart } from '@/lib/cart';

type Cart = Record<string, number>;

type DeliveryType = 'Chalega 24-Hour';

type PaymentMethod = 'cod' | 'online';

type RazorpayPaymentResult = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

type RazorpayOrderResponse = {
  success?: boolean;
  id?: string;
  entity?: string;
  amount?: number;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  receipt?: string;
  status?: string;
  key_id?: string;
  keyId?: string;
  chalega_order_id?: string;
};

type SupabaseOrder = {
  id: string;
  order_id: string;
  delivery_deadline: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
};
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
const getDeliveryDeadline = (createdAt: string) => {
  const created = new Date(createdAt);

  const deadline = new Date(
    created.getTime() + 24 * 60 * 60 * 1000,
  );

  return deadline.toISOString();
};

const generatePublicOrderId = () => {
  const year = new Date().getFullYear();
  const timestamp = String(Date.now()).slice(-8);
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');

  return `CI-${year}-${timestamp}${random}`;
};

export default function CheckoutScreen() {
  const router = useRouter();

  const {
    cart: cartParam,
    items: itemsParam,
  } = useLocalSearchParams<{
    cart?: string;    items?: string;
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

      for (const [productId, quantity] of Object.entries(parsed)) {
        if (
          typeof quantity === 'number' &&
          Number.isFinite(quantity) &&
          quantity > 0
        ) {
          safeCart[productId] = Math.floor(quantity);
        }
      }

      return safeCart;
    } catch {
      return {};
    }
  }, [cartParam]);

  const selectedProducts = useMemo(() => {
    return products
      .filter((product) => (cart[product.id] || 0) > 0)
      .map((product) => ({
        ...product,
        quantity: cart[product.id],
      }));
  }, [cart]);

  const itemCount = selectedProducts.reduce(
    (sum, product) => sum + (product.quantity || 0),
    0,
  );

  const subtotal = selectedProducts.reduce(
    (sum, product) =>
      sum + product.price * (product.quantity || 0),
    0,
  );

  const deliveryFee = getDeliveryFee(subtotal);
  const orderTotal = subtotal + deliveryFee;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [pin, setPin] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  const [delivery, setDelivery] =
    useState<DeliveryType>('Chalega 24-Hour');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cod');

  const [saving, setSaving] = useState(false);

  const pinCurrentLocation = async () => {
    try {
      setLocating(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        throw new Error('Location permission is required to pin your delivery location.');
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });

      setDeliveryLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy ?? null,
      });
      Alert.alert(
        'Location pinned',
        'Your current GPS location will be used for delivery matching.'
      );
    } catch (error: any) {
      Alert.alert(
        'Could not get location',
        error?.message || 'Please turn on Location Services and try again.'
      );
    } finally {
      setLocating(false);
    }
  };

  const finishOrder = async ({
    orderId,
    total,
    deliveryDeadline,
  }: {
    orderId: string;
    total: number;
    deliveryDeadline: string;
  }) => {
    await clearCart();

    router.replace({
      pathname: '/order-confirmed',
      params: {
        orderId,
        name: name.trim(),
        total: total.toString(),
        deliveryDeadline,
      },
    });
  };

  const createSupabaseOrder = async ({
    publicOrderId,
  }: {
    publicOrderId: string;
  }): Promise<SupabaseOrder> => {
    const cartItems = selectedProducts.map((product) => ({
      id: product.id,
      quantity: product.quantity || 1,
    }));

    const {
      data,
      error,
    } = await supabase.rpc(
      'create_chalega_order',
      {
        p_order_id: publicOrderId,
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_address: address.trim(),
        p_area: area.trim(),
        p_pin: pin.trim(),
        p_items: cartItems,
        p_delivery: delivery,
        p_payment_method:
          paymentMethod === 'online'
            ? 'Razorpay'
            : 'COD',
        p_latitude: deliveryLocation?.latitude ?? null,
        p_longitude: deliveryLocation?.longitude ?? null,
      },
    );

    if (error) {
      console.error(
        'Secure order creation error:',
        error,
      );

      if (
        error.code === '23505' ||
        error.message?.toLowerCase().includes('duplicate')
      ) {
        throw new Error(
          'We could not create a unique order number. Please try again.',
        );
      }

      throw new Error(
        error.message ||
          'We could not save your order. Please try again.',
      );
    }

    const createdOrder = Array.isArray(data)
      ? data[0]
      : data;

    if (
      !createdOrder?.id ||
      !createdOrder?.order_id
    ) {
      throw new Error(        'The order was created but its database ID was missing.',
      );
    }

    return createdOrder as SupabaseOrder;
  };
  const startOnlinePayment = async ({
    chalegaOrderId,
    publicOrderId,
  }: {
    chalegaOrderId: string;
    publicOrderId: string;
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error(
        'Your session has expired. Please sign in again.',
      );
    }

    const {
      data: razorpayOrder,
      error: createOrderError,
    } = await supabase.functions.invoke(
      'create-razorpay-order',
      {
        body: {
          order_id: chalegaOrderId,
        },
      },
    );

    if (createOrderError) {
      console.error(
        'Razorpay order creation error:',
        createOrderError,
      );

      throw new Error(
        'We could not start the online payment. Please try again.',
      );
    }

    const order =
      razorpayOrder as RazorpayOrderResponse;

    if (!order?.id) {
      console.error(
        'Invalid Razorpay order response:',
        order,
      );

      throw new Error(
        'Payment order could not be created.',
      );
    }

    const razorpayKey =
      order.key_id || order.keyId;

    if (!razorpayKey) {
      console.error(
        'Razorpay key ID missing from Edge Function response.',
      );

      throw new Error(
        'Payment configuration is incomplete. Please try again later.',
      );
    }

    const serverAmount = Number(order.amount);

    if (
      !Number.isFinite(serverAmount) ||
      serverAmount <= 0
    ) {
      console.error(
        'Invalid server-side Razorpay amount:',
        order.amount,
      );

      throw new Error(
        'Payment amount could not be confirmed.',
      );
    }

    let RazorpayCheckout: any;

    try {
      const RazorpayModule =
        require('react-native-razorpay');

      RazorpayCheckout =
        RazorpayModule?.default ||
        RazorpayModule;
    } catch (error) {
      console.error(        'Razorpay native module unavailable:',
        error,
      );

      throw new Error(
        'Online payment is available only in the Chalega development build, not Expo Go.',
      );
    }

    if (
      !RazorpayCheckout ||
      typeof RazorpayCheckout.open !== 'function'
    ) {
      throw new Error(
        'Razorpay payment module is not available in this app build.',
      );
    }

    const payment =
      (await RazorpayCheckout.open({
        key: razorpayKey,
        amount: serverAmount,
        currency: order.currency || 'INR',
        order_id: order.id,
        name: 'Chalega',
        description: 'Chalega Fresh order',
        prefill: {
          name: name.trim(),
          contact: phone.trim(),
        },
        notes: {
          chalega_order_id: publicOrderId,
          chalega_order_uuid: chalegaOrderId,
        },
        theme: {
          color: BRAND.teal,
        },
      })) as RazorpayPaymentResult;

    if (
      !payment?.razorpay_order_id ||
      !payment?.razorpay_payment_id ||
      !payment?.razorpay_signature
    ) {
      throw new Error(
        'Razorpay returned an incomplete payment response.',
      );
    }

    const {
      data: verification,
      error: verificationError,
    } = await supabase.functions.invoke(
      'verify-razorpay-payment',
      {
        body: {
          chalega_order_id: chalegaOrderId,
          razorpay_order_id:
            payment.razorpay_order_id,
          razorpay_payment_id:
            payment.razorpay_payment_id,
          razorpay_signature:
            payment.razorpay_signature,
        },
      },
    );

    if (verificationError) {
      console.error(
        'Payment verification error:',
        verificationError,
      );

      throw new Error(
        'Payment was received but could not be verified. Please do not place another order until we confirm the payment.',
      );
    }

    if (
      !verification ||
      verification.verified !== true
    ) {
      console.error(
        'Payment verification failed:',
        verification,
      );

      throw new Error(
        verification?.error ||
          'Payment verification failed. Please contact Chalega support before trying again.',
      );
    }

    return {
      razorpayOrderId:
        payment.razorpay_order_id,
      razorpayPaymentId:
        payment.razorpay_payment_id,
    };
  };
  const placeOrder = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert(
        'Your cart is empty',
        'Please return to Shop to Feed and add a product.',
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your name.',
      );
      return;
    }

    if (phone.trim().length !== 10) {
      Alert.alert(
        'Invalid mobile number',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Missing address',
        'Please enter your delivery address.',
      );
      return;
    }

    if (!area.trim()) {
      Alert.alert(
        'Missing area',
        'Please enter your area or locality.',
      );
      return;
    }

    if (pin.trim().length !== 6) {
      Alert.alert(
        'Invalid PIN code',
        'Please enter your 6-digit PIN code.',
      );
      return;
    }

    try {
      setSaving(true);

      const createdAt =
        new Date().toISOString();

      const deliveryDeadline =
        getDeliveryDeadline(createdAt);

      const orderId =
        generatePublicOrderId();

    const dbOrder =
  await createSupabaseOrder({
    publicOrderId: orderId,
  });

      if (paymentMethod === 'online') {
        await startOnlinePayment({
          chalegaOrderId: dbOrder.id,
          publicOrderId: dbOrder.order_id,
        });
      }

      await finishOrder({
        orderId: dbOrder.order_id,
        total: dbOrder.total,
        deliveryDeadline: dbOrder.delivery_deadline,
      });
    } catch (error: any) {
      console.error(
        'Order/payment error:',
        error,
      );
      const message =
        error?.message ||
        'We could not complete your order. Please try again.';

      if (
        message
          .toLowerCase()
          .includes('cancel')      ) {
        Alert.alert(
          'Payment Cancelled',
          'Your order was not placed. You can choose another payment method and try again.',
        );
      } else {
        Alert.alert(
          'Order / Payment Error',
          message,
        );
      }
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.content
          }
        >
          <View
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                router.replace('/shop')
              }
            >
              <Text
                style={styles.backText}
              >
                ‹
              </Text>
            </TouchableOpacity>

            <View
              style={styles.headerCenter}
            >
              <Text
                style={styles.headerTitle}
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
              style={styles.headerSpacer}
            />
          </View>

          <View
            style={styles.promiseHero}
          >
            <View
              style={styles.promiseIcon}
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
              style={styles.promiseBody}
            >
              <Text
                style={styles.promiseTitle}
              >
                CHALEGA 24-HOUR DELIVERY
              </Text>

              <Text
                style={styles.promiseText}
              >                Your fresh order will be
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
              onChangeText={(text) =>
                setPhone(
                  text.replace(/\D/g, ''),
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
              onChangeText={(text) =>
                setPin(
                  text.replace(/\D/g, ''),
                )
              }
              placeholder="6-digit PIN code"
              placeholderTextColor="#88939D"
              keyboardType="number-pad"              maxLength={6}
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.locationButton}
              onPress={pinCurrentLocation}
              disabled={locating}
              activeOpacity={0.85}
            >
              <Text style={styles.locationButtonText}>
                {locating
                  ? 'GETTING LOCATION...'
                  : deliveryLocation
                  ? '✓ DELIVERY LOCATION PINNED'
                  : 'USE MY CURRENT LOCATION'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.locationHint}>
              GPS helps Chalega match your order with nearby delivery partners.
            </Text>
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
                (product) => (
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
                          'en-IN',
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
                        (product.quantity ||                          0)
                      ).toLocaleString(
                        'en-IN',
                      )}
                    </Text>
                  </View>
                ),
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
                'Chalega 24-Hour',
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
                }              >
                ₹
                {subtotal.toLocaleString(
                  'en-IN',
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
              style={
                styles.freeDeliveryNote
              }
            >
              {subtotal >=
              FREE_DELIVERY_THRESHOLD
                ? '✓ You unlocked free delivery.'
                : `Add ₹${
                    FREE_DELIVERY_THRESHOLD -
                    subtotal
                  } more for free delivery.`}
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
                style={
                  styles.totalLabel
                }
              >
                Total
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                ₹
                {orderTotal.toLocaleString(
                  'en-IN',
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

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod ===
                  'online' &&
                  styles.paymentOptionSelected,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                setPaymentMethod(
                  'online',
                )
              }
            >
              <View                style={
                  styles.onlineIcon
                }
              >
                <Text
                  style={
                    styles.onlineIconText
                  }
                >
                  ₹
                </Text>
              </View>

              <View
                style={
                  styles.paymentBody
                }
              >
                <Text
                  style={
                    styles.paymentOptionTitle
                  }
                >
                  Pay Online
                </Text>

                <Text
                  style={
                    styles.paymentOptionText
                  }
                >
                  UPI, cards, net banking
                  and supported payment
                  methods.
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  paymentMethod ===
                    'online' &&
                    styles.radioOuterSelected,
                ]}
              >
                {paymentMethod ===
                  'online' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                styles.paymentOptionLast,
                paymentMethod === 'cod' &&
                  styles.paymentOptionSelected,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                setPaymentMethod('cod')
              }
            >
              <View
                style={styles.codIcon}
              >
                <Text>₹</Text>
              </View>

              <View
                style={
                  styles.paymentBody
                }
              >
                <Text
                  style={
                    styles.paymentOptionTitle
                  }
                >
                  Cash on Delivery
                </Text>

                <Text
                  style={
                    styles.paymentOptionText
                  }
                >
                  Pay when your order
                  arrives.
                </Text>
              </View>

              <View
                style={[
                  styles.radioOuter,                  paymentMethod ===
                    'cod' &&
                    styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === 'cod' && (
                  <View
                    style={
                      styles.radioInner
                    }
                  />
                )}
              </View>
            </TouchableOpacity>

            {paymentMethod ===
              'online' && (
              <View
                style={
                  styles.onlineNote
                }
              >
                <Text
                  style={
                    styles.onlineNoteTitle
                  }
                >
                  🔒 Secure online payment
                </Text>

                <Text
                  style={
                    styles.onlineNoteText
                  }
                >
                  Your payment is processed
                  securely through Razorpay.
                  Chalega verifies
                  the payment before
                  confirming your order.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              saving &&
                styles.placeOrderDisabled,
            ]}
            onPress={placeOrder}
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
                  ? paymentMethod ===
                    'online'
                    ? 'PROCESSING PAYMENT...'
                    : 'SAVING ORDER...'
                  : paymentMethod ===
                    'online'
                  ? 'PAY & PLACE ORDER'
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
                  'en-IN',
                )}
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={styles.orderNote}
          >            {itemsParam || itemCount}{' '}
            item
            {itemCount === 1 ? '' : 's'} •
            Fresh order • Chalega 24-hour
            delivery
          </Text>

          <Text
            style={styles.footer}
          >
            CHALEGA KOLKATA
            ♥
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.cream,
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
    backgroundColor: BRAND.white,
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
    color: BRAND.midnight,
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
    backgroundColor: BRAND.greenLight,
    borderWidth: 1,
    borderColor: '#C9E4D0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  promiseIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BRAND.white,
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
    backgroundColor: BRAND.white,
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

  locationButton: {
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BRAND.teal,
    backgroundColor: '#F2FBF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  locationButtonText: {
    color: BRAND.teal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  locationHint: {
    color: '#7A8791',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 6,
  },

  productsCard: {
    marginHorizontal: 18,
    borderRadius: 20,
    backgroundColor: BRAND.white,
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
    color: BRAND.midnight,
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
    backgroundColor: BRAND.white,
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
    backgroundColor: BRAND.greenLight,
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
    justifyContent: 'center',  },

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
    backgroundColor: BRAND.white,
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
    color: BRAND.midnight,
  },

  paymentCard: {
    marginHorizontal: 18,
    marginTop: 2,
    padding: 16,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: '#E3E8ED',
  },

  paymentTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#172630',
    marginBottom: 11,
  },

  paymentOption: {
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E4E8EC',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  paymentOptionLast: {
    marginBottom: 0,
  },

  paymentOptionSelected: {
    borderColor: '#2FA84F',    backgroundColor: '#F4FAF5',
  },

  onlineIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  onlineIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: BRAND.teal,
  },

  codIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  paymentBody: {
    flex: 1,
  },

  paymentOptionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#263540',
  },

  paymentOptionText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: '#77838D',
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#B8C2C9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: '#2FA84F',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2FA84F',
  },

  onlineNote: {
    marginTop: 11,
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#F1F6FF',
    borderWidth: 1,
    borderColor: '#D6E4FA',
  },

  onlineNoteTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#245B9B',
  },

  onlineNoteText: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: '#5A708A',
    fontWeight: '600',
  },

  placeOrderButton: {
    marginHorizontal: 18,
    marginTop: 17,
    minHeight: 60,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: BRAND.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',  },

  placeOrderDisabled: {
    opacity: 0.65,
  },

  placeOrderText: {
    fontSize: 14,
    fontWeight: '900',
    color: BRAND.white,
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
    color: BRAND.white,
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