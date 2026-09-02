import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

type OrderProduct = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
  total: number;
};

type Order = {
  id?: string;
  orderId?: string;

  customer?: {
    name?: string;
  };

  products?: OrderProduct[];

  items?: number;
  total?: number;
  delivery?: string;
  status?: string;
  createdAt?: string;
};

const STATUS = {
  RECEIVED: 'Order Received',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
};

export default function TrackOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const orderId =
    typeof params.orderId === 'string'
      ? params.orderId
      : '';

  const loadOrder = async () => {
    try {
      const stored =
        await AsyncStorage.getItem('chalega_orders');

      if (!stored) {
        setOrder(null);
        return;
      }

      const orders = JSON.parse(stored);

      if (!Array.isArray(orders)) {
        setOrder(null);
        return;
      }

      const found = orders.find(
        (item: Order) =>
          (item.orderId || item.id) === orderId
      );

      setOrder(found || null);
    } catch (error) {
      console.log(
        'Could not load order:',
        error
      );

      setOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [orderId])
  );

  const refreshOrder = async () => {
    setRefreshing(true);
    await loadOrder();
  };

  const getStatusNumber = (
    currentStatus?: string
  ) => {
    switch (currentStatus) {
      case STATUS.PREPARING:
        return 2;

      case STATUS.OUT_FOR_DELIVERY:
        return 3;

      case STATUS.DELIVERED:
        return 4;

      case STATUS.COMPLETED:
        return 5;

      default:
        return 1;
    }
  };

  const status =
    order?.status || STATUS.RECEIVED;

  const statusNumber =
    getStatusNumber(status);

  const formatDate = (value?: string) => {
    if (!value) return '';

    try {
      return new Date(value).toLocaleString(
        'en-IN'
      );
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color="#1976F3"
          />

          <Text style={styles.loadingText}>
            Loading your order...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>
            📦
          </Text>

          <Text style={styles.notFoundTitle}>
            Order Not Found
          </Text>

          <Text style={styles.notFoundText}>
            We couldn't find this order.
            Please check your order number.
          </Text>

          <TouchableOpacity
            style={styles.backToShopButton}
            onPress={() =>
              router.replace('/shop')
            }
          >
            <Text style={styles.backToShopText}>
              BACK TO SHOP
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshOrder}
          />
        }
        contentContainerStyle={styles.content}
      >

        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace('/order-confirmed')
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.brand}>
              CHALEGA INDIA
            </Text>

            <Text style={styles.title}>
              Track Order
            </Text>
          </View>
        </View>

        {/* CURRENT STATUS */}

        <View style={styles.heroCard}>

          <View style={styles.heroCircle}>
            <Text style={styles.heroIcon}>
              {statusNumber >= 5
                ? '✓'
                : statusNumber >= 4
                ? '✓'
                : statusNumber >= 3
                ? '🛵'
                : statusNumber >= 2
                ? '📦'
                : '✓'}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {status === STATUS.COMPLETED
              ? 'Order Completed'
              : status === STATUS.DELIVERED
              ? 'Order Delivered'
              : status === STATUS.OUT_FOR_DELIVERY
              ? 'Out for Delivery'
              : status === STATUS.PREPARING
              ? 'Preparing Your Order'
              : 'Order Received'}
          </Text>

          <Text style={styles.heroText}>
            {status === STATUS.COMPLETED
              ? 'Your order has been completed.'
              : status === STATUS.DELIVERED
              ? 'Your order has been delivered successfully.'
              : status === STATUS.OUT_FOR_DELIVERY
              ? 'Your order is on its way to you.'
              : status === STATUS.PREPARING
              ? 'Your order is being prepared.'
              : 'We have received your order.'}
          </Text>

        </View>

        {/* ORDER NUMBER */}

        <View style={styles.orderCard}>

          <Text style={styles.orderLabel}>
            ORDER NUMBER
          </Text>

          <Text
            style={styles.orderNumber}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {order.orderId || order.id}
          </Text>

          {order.createdAt ? (
            <Text style={styles.date}>
              Placed {formatDate(order.createdAt)}
            </Text>
          ) : null}

        </View>

        {/* STATUS TIMELINE */}

        <Text style={styles.sectionTitle}>
          Order Status
        </Text>

        <View style={styles.timeline}>

          {/* ORDER RECEIVED */}

          <View style={styles.timelineRow}>

            <View
              style={
                statusNumber >= 1
                  ? styles.circleActive
                  : styles.circle
              }
            >
              <Text
                style={
                  statusNumber >= 1
                    ? styles.circleActiveText
                    : styles.circleText
                }
              >
                {statusNumber > 1
                  ? '✓'
                  : '1'}
              </Text>
            </View>

            <View style={styles.timelineInfo}>

              <Text
                style={
                  statusNumber >= 1
                    ? styles.timelineTitleActive
                    : styles.timelineTitle
                }
              >
                Order Received
              </Text>

              <Text style={styles.timelineDescription}>
                Your order has been received.
              </Text>

            </View>

          </View>

          <View
            style={
              statusNumber > 1
                ? styles.lineActive
                : styles.line
            }
          />

          {/* PREPARING */}

          <View style={styles.timelineRow}>

            <View
              style={
                statusNumber >= 2
                  ? styles.circleActive
                  : styles.circle
              }
            >
              <Text
                style={
                  statusNumber >= 2
                    ? styles.circleActiveText
                    : styles.circleText
                }
              >
                {statusNumber > 2
                  ? '✓'
                  : '2'}
              </Text>
            </View>

            <View style={styles.timelineInfo}>

              <Text
                style={
                  statusNumber >= 2
                    ? styles.timelineTitleActive
                    : styles.timelineTitle
                }
              >
                Preparing
              </Text>

              <Text style={styles.timelineDescription}>
                Your products are being prepared.
              </Text>

            </View>

          </View>

          <View
            style={
              statusNumber > 2
                ? styles.lineActive
                : styles.line
            }
          />

          {/* OUT FOR DELIVERY */}

          <View style={styles.timelineRow}>

            <View
              style={
                statusNumber >= 3
                  ? styles.circleActive
                  : styles.circle
              }
            >
              <Text
                style={
                  statusNumber >= 3
                    ? styles.circleActiveText
                    : styles.circleText
                }
              >
                {statusNumber > 3
                  ? '✓'
                  : '3'}
              </Text>
            </View>

            <View style={styles.timelineInfo}>

              <Text
                style={
                  statusNumber >= 3
                    ? styles.timelineTitleActive
                    : styles.timelineTitle
                }
              >
                Out for Delivery
              </Text>

              <Text style={styles.timelineDescription}>
                Your order is on the way.
              </Text>

            </View>

          </View>

          <View
            style={
              statusNumber > 3
                ? styles.lineActive
                : styles.line
            }
          />

          {/* DELIVERED */}

          <View style={styles.timelineRow}>

            <View
              style={
                statusNumber >= 4
                  ? styles.circleActive
                  : styles.circle
              }
            >
              <Text
                style={
                  statusNumber >= 4
                    ? styles.circleActiveText
                    : styles.circleText
                }
              >
                {statusNumber > 4
                  ? '✓'
                  : '4'}
              </Text>
            </View>

            <View style={styles.timelineInfo}>

              <Text
                style={
                  statusNumber >= 4
                    ? styles.timelineTitleActive
                    : styles.timelineTitle
                }
              >
                Delivered
              </Text>

              <Text style={styles.timelineDescription}>
                Your order has been delivered.
              </Text>

            </View>

          </View>

          <View
            style={
              statusNumber > 4
                ? styles.lineActive
                : styles.line
            }
          />

          {/* COMPLETED */}

          <View style={styles.timelineRow}>

            <View
              style={
                statusNumber >= 5
                  ? styles.circleActive
                  : styles.circle
              }
            >
              <Text
                style={
                  statusNumber >= 5
                    ? styles.circleActiveText
                    : styles.circleText
                }
              >
                {statusNumber >= 5
                  ? '✓'
                  : '5'}
              </Text>
            </View>

            <View style={styles.timelineInfo}>

              <Text
                style={
                  statusNumber >= 5
                    ? styles.timelineTitleActive
                    : styles.timelineTitle
                }
              >
                Completed
              </Text>

              <Text style={styles.timelineDescription}>
                Your order is complete.
              </Text>

            </View>

          </View>

        </View>

        {/* ORDER SUMMARY */}

        <Text style={styles.sectionTitle}>
          Order Summary
        </Text>

        <View style={styles.summaryCard}>

          {order.products &&
          order.products.length > 0 ? (

            order.products.map(
              (product) => (
                <View
                  key={product.id}
                  style={styles.productRow}
                >

                  <View
                    style={styles.productEmojiBox}
                  >
                    <Text style={styles.productEmoji}>
                      {product.emoji}
                    </Text>
                  </View>

                  <View style={styles.productInfo}>

                    <Text style={styles.productName}>
                      {product.name}
                    </Text>

                    <Text style={styles.productQuantity}>
                      Quantity: {product.quantity}
                    </Text>

                  </View>

                  <Text style={styles.productTotal}>
                    ₹
                    {Number(
                      product.total || 0
                    ).toLocaleString('en-IN')}
                  </Text>

                </View>
              )
            )

          ) : (

            <Text style={styles.noProducts}>
              Product details unavailable.
            </Text>

          )}

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>

            <Text style={styles.totalLabel}>
              TOTAL
            </Text>

            <Text style={styles.totalAmount}>
              ₹
              {Number(
                order.total || 0
              ).toLocaleString('en-IN')}
            </Text>

          </View>

        </View>

        {/* DELIVERY */}

        <View style={styles.deliveryCard}>

          <Text style={styles.deliveryEmoji}>
            🛵
          </Text>

          <View style={styles.deliveryInfo}>

            <Text style={styles.deliveryTitle}>
              {order.delivery || 'Standard'} Delivery
            </Text>

            <Text style={styles.deliveryText}>
              Chalega India delivery
            </Text>

          </View>

        </View>

        {/* REFRESH */}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshOrder}
        >
          <Text style={styles.refreshButtonText}>
            ↻  REFRESH ORDER STATUS
          </Text>
        </TouchableOpacity>

        {/* SHOP */}

        <TouchableOpacity
          style={styles.shopButton}
          onPress={() =>
            router.replace('/shop')
          }
        >
          <Text style={styles.shopButtonText}>
            CONTINUE SHOPPING
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          CHALEGA INDIA 🇮🇳
        </Text>

        <Text style={styles.footerSmall}>
          Chalo Health Banaye
        </Text>

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
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 60,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#777777',
    marginTop: 12,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  notFoundEmoji: {
    fontSize: 60,
  },

  notFoundTitle: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 15,
  },

  notFoundText: {
    color: '#777777',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },

  backToShopButton: {
    backgroundColor: '#111111',
    borderRadius: 17,
    paddingHorizontal: 30,
    paddingVertical: 16,
    marginTop: 25,
  },

  backToShopText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  backText: {
    color: '#1976F3',
    fontSize: 42,
    lineHeight: 46,
  },

  brand: {
    color: '#1976F3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },

  title: {
    color: '#111111',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 2,
  },

  heroCard: {
    backgroundColor: '#1976F3',
    borderRadius: 27,
    padding: 25,
    alignItems: 'center',
  },

  heroCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroIcon: {
    fontSize: 36,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 14,
  },

  heroText: {
    color: '#E6F0FF',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },

  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 21,
    alignItems: 'center',
    marginTop: 17,
  },

  orderLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  orderNumber: {
    color: '#1976F3',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 6,
    maxWidth: '100%',
  },

  date: {
    color: '#888888',
    fontSize: 11,
    marginTop: 6,
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 25,
    marginBottom: 13,
  },

  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 20,
  },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  circleActive: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D6DADF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleActiveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  circleText: {
    color: '#A0A5AB',
    fontSize: 14,
    fontWeight: '900',
  },

  timelineInfo: {
    flex: 1,
    marginLeft: 14,
  },

  timelineTitleActive: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  timelineTitle: {
    color: '#999999',
    fontSize: 15,
    fontWeight: '800',
  },

  timelineDescription: {
    color: '#888888',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  line: {
    width: 2,
    height: 25,
    backgroundColor: '#DCE1E7',
    marginLeft: 20,
    marginVertical: 3,
  },

  lineActive: {
    width: 2,
    height: 25,
    backgroundColor: '#1976F3',
    marginLeft: 20,
    marginVertical: 3,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 17,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },

  productEmojiBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productEmoji: {
    fontSize: 27,
  },

  productInfo: {
    flex: 1,
    paddingLeft: 12,
  },

  productName: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
  },

  productQuantity: {
    color: '#888888',
    fontSize: 11,
    marginTop: 4,
  },

  productTotal: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '900',
  },

  noProducts: {
    color: '#888888',
    fontSize: 12,
    padding: 10,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EA',
    marginVertical: 8,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
  },

  totalAmount: {
    color: '#1976F3',
    fontSize: 24,
    fontWeight: '900',
  },

  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
  },

  deliveryEmoji: {
    fontSize: 32,
    marginRight: 13,
  },

  deliveryInfo: {
    flex: 1,
  },

  deliveryTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  deliveryText: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },

  refreshButton: {
    backgroundColor: '#EEF4FF',
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },

  refreshButtonText: {
    color: '#1976F3',
    fontSize: 12,
    fontWeight: '900',
  },

  shopButton: {
    backgroundColor: '#111111',
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 10,
  },

  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  footer: {
    color: '#1976F3',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 30,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
});