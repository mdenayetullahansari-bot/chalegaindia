import { BRAND } from '@/lib/brand';
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
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { supabase } from '@/lib/supabase';

type OrderProduct = {
  id: string;
  name: string;
  price: number;
  emoji: string;
  quantity: number;
  total?: number;
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
      if (!orderId) {
        setOrder(null);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setOrder(null);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_id, customer_name, products, total, delivery, status, created_at'
        )
        .eq('user_id', user.id)
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // Home Kitchen orders live in their own table.
        // Fall back here so the shared Track Order page can track them too.
        const {
          data: homeOrder,
          error: homeOrderError,
        } = await supabase
          .from('chalega_home_kitchen_orders')
          .select(
            'id, order_id, item_id, quantity, customer_name, total, delivery_fee, status, created_at'
          )
          .eq('customer_id', user.id)
          .eq('order_id', orderId)
          .maybeSingle();

        if (homeOrderError) {
          throw homeOrderError;
        }

        if (!homeOrder) {
          setOrder(null);
          return;
        }

        const {
          data: homeItem,
          error: homeItemError,
        } = await supabase
          .from('chalega_home_kitchen_items')
          .select('id, title, price, emoji')
          .eq('id', homeOrder.item_id)
          .maybeSingle();

        if (homeItemError) {
          throw homeItemError;
        }

        const homeStatus =
          homeOrder.status === 'preparing'
            ? STATUS.PREPARING
            : homeOrder.status === 'ready'
            ? STATUS.OUT_FOR_DELIVERY
            : homeOrder.status === 'delivered'
            ? STATUS.DELIVERED
            : homeOrder.status === 'completed'
            ? STATUS.COMPLETED
            : STATUS.RECEIVED;

        const homeProducts = homeItem
          ? [
              {
                id: homeItem.id,
                name: homeItem.title,
                price: Number(homeItem.price || 0),
                emoji: homeItem.emoji || '🍲',
                quantity: Number(homeOrder.quantity || 0),
              },
            ]
          : [];

        setOrder({
          id: homeOrder.id,
          orderId: homeOrder.order_id,
          customer: {
            name: homeOrder.customer_name || '',
          },
          products: homeProducts,
          items: Number(homeOrder.quantity || 0),
          total: Number(homeOrder.total || 0),
          delivery: 'Home Kitchen Delivery',
          status: homeStatus,
          createdAt: homeOrder.created_at,
        });
        return;
      }

      const products = Array.isArray(data.products)
        ? data.products
        : [];

      const items = products.reduce(
        (sum: number, product: any) =>
          sum + Number(product?.quantity || 0),
        0
      );

      setOrder({
        id: data.id,
        orderId: data.order_id || data.id,
        customer: {
          name: data.customer_name || '',
        },
        products,
        items,
        total: Number(data.total || 0),
        delivery: data.delivery || 'Standard',
        status: data.status || STATUS.RECEIVED,
        createdAt: data.created_at,
      });
    } catch (error) {
      console.log(
        'Could not load order from Supabase:',
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
        // Delivery is the final customer-facing milestone in the current
        // order model. COD collection settles the delivery while the order
        // remains stored as `delivered`, so show Completed as reached too.
        return 5;

      case STATUS.COMPLETED:
        return 5;

      default:
        return 1;
    }
  };

  const status =
    order?.status || STATUS.RECEIVED;

  const deliveryLabel =
    order?.delivery && /delivery$/i.test(order.delivery)
      ? order.delivery
      : `${order?.delivery || 'Standard'} Delivery`;

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
            color="#00D1A7"
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
              router.replace('/customer-orders')
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.brand}>
              CHALEGA KOLKATA
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
              (product) => {
                const productTotal =
                  Number(product.price || 0) *
                  Number(product.quantity || 0);

                return (
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
                      {productTotal.toLocaleString(
                        'en-IN'
                      )}
                    </Text>
                  </View>
                );
              }
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
              {deliveryLabel}
            </Text>

            <Text style={styles.deliveryText}>
              Chalega delivery
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
          CHALEGA KOLKATA
        </Text>

        <Text style={styles.footerSmall}>
          MOVE PEOPLE • HEALTHY COMMUNITIES
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.cream,
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
    color: BRAND.ink,
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
    backgroundColor: BRAND.ink,
    borderRadius: 17,
    paddingHorizontal: 30,
    paddingVertical: 16,
    marginTop: 25,
  },

  backToShopText: {
    color: BRAND.white,
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
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  backText: {
    color: BRAND.teal,
    fontSize: 42,
    lineHeight: 46,
  },

  brand: {
    color: BRAND.teal,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },

  title: {
    color: BRAND.ink,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 2,
  },

  heroCard: {
    backgroundColor: BRAND.teal,
    borderRadius: 27,
    padding: 25,
    alignItems: 'center',
  },

  heroCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroIcon: {
    fontSize: 36,
  },

  heroTitle: {
    color: BRAND.white,
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
    backgroundColor: BRAND.white,
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
    color: BRAND.teal,
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
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 25,
    marginBottom: 13,
  },

  timeline: {
    backgroundColor: BRAND.white,
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
    backgroundColor: BRAND.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#D6DADF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleActiveText: {
    color: BRAND.white,
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
    color: BRAND.ink,
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
    backgroundColor: BRAND.teal,
    marginLeft: 20,
    marginVertical: 3,
  },

  summaryCard: {
    backgroundColor: BRAND.white,
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
    backgroundColor: BRAND.cream,
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
    color: BRAND.ink,
    fontSize: 13,
    fontWeight: '900',
  },

  productQuantity: {
    color: '#888888',
    fontSize: 11,
    marginTop: 4,
  },

  productTotal: {
    color: BRAND.teal,
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
    color: BRAND.ink,
    fontSize: 13,
    fontWeight: '900',
  },

  totalAmount: {
    color: BRAND.teal,
    fontSize: 24,
    fontWeight: '900',
  },

  deliveryCard: {
    backgroundColor: BRAND.white,
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
    color: BRAND.ink,
    fontSize: 15,
    fontWeight: '900',
  },

  deliveryText: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },

  refreshButton: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },

  refreshButtonText: {
    color: BRAND.teal,
    fontSize: 12,
    fontWeight: '900',
  },

  shopButton: {
    backgroundColor: BRAND.ink,
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 10,
  },

  shopButtonText: {
    color: BRAND.white,
    fontSize: 13,
    fontWeight: '900',
  },

  footer: {
    color: BRAND.teal,
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