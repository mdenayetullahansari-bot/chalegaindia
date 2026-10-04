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
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Order = {
  id?: string;
  orderId?: string;
  customer?: {
    name?: string;
  };
  products?: {
    id: string;
    name: string;
    price: number;
    emoji: string;
    quantity: number;
    total: number;
  }[];
  items?: number;
  total?: number;
  delivery?: string;
  status?: string;
  createdAt?: string;
};

const getStatusNumber = (status?: string) => {
  switch (status) {
    case 'Preparing':
      return 2;
    case 'Out for Delivery':
      return 3;
    case 'Delivered':
      return 4;
    case 'Completed':
      return 5;
    default:
      return 1;
  }
};

const getStatusText = (status?: string) => {
  switch (status) {
    case 'Preparing':
      return 'Preparing Your Order';
    case 'Out for Delivery':
      return 'Out for Delivery';
    case 'Delivered':
      return 'Delivered';
    case 'Completed':
      return 'Completed';
    default:
      return 'Order Received';
  }
};

const getStatusEmoji = (status?: string) => {
  switch (status) {
    case 'Preparing':
      return '📦';
    case 'Out for Delivery':
      return '🛵';
    case 'Delivered':
      return '✓';
    case 'Completed':
      return '✓';
    default:
      return '✓';
  }
};

export default function CustomerOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_id, customer_name, products, total, delivery, status, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mappedOrders: Order[] = (data || []).map((row: any) => {
        const products = Array.isArray(row.products)
          ? row.products
          : [];

        const items = products.reduce(
          (sum: number, product: any) =>
            sum + Number(product?.quantity || 0),
          0
        );

        return {
          id: row.id,
          orderId: row.order_id || row.id,
          products,
          items,
          total: Number(row.total || 0),
          delivery: row.delivery || 'Standard',
          status: row.status || 'Order Received',
          createdAt: row.created_at,
        };
      });

      setOrders(mappedOrders);
    } catch (error) {
      console.log(
        'Could not load customer orders from Supabase:',
        error
      );

      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const refreshOrders = async () => {
    setRefreshing(true);
    await loadOrders();
  };

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

  const trackOrder = (order: Order) => {
    const orderId = order.orderId || order.id;

    if (!orderId) return;

    router.push({
      pathname: '/track-order',
      params: {
        orderId,
      },
    });
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
            Loading your orders...
          </Text>
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
            onRefresh={refreshOrders}
          />
        }
        contentContainerStyle={styles.content}
      >

        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/shop')}
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
              My Orders
            </Text>
          </View>
        </View>

        {/* EMPTY */}

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>
              🛍️
            </Text>

            <Text style={styles.emptyTitle}>
              No Orders Yet
            </Text>

            <Text style={styles.emptyText}>
              Your orders will appear here after
              you place your first order.
            </Text>

            <TouchableOpacity
              style={styles.shopButton}
              onPress={() =>
                router.replace('/shop')
              }
            >
              <Text style={styles.shopButtonText}>
                START SHOPPING
              </Text>
            </TouchableOpacity>
          </View>
        ) : (

          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>
                Your Orders
              </Text>

              <Text style={styles.introText}>
                Track your Chalega orders
                anytime.
              </Text>
            </View>

            {/* ORDER LIST */}

            {orders.map((order, index) => {
              const orderId =
                order.orderId || order.id || 'Order';

              const status =
                order.status || 'Order Received';

              const statusNumber =
                getStatusNumber(status);

              return (
                <View
                  key={`${orderId}-${index}`}
                  style={styles.orderCard}
                >

                  {/* ORDER HEADER */}

                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeaderLeft}>

                      <Text style={styles.orderLabel}>
                        ORDER
                      </Text>

                      <Text
                        style={styles.orderNumber}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {orderId}
                      </Text>

                    </View>

                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusEmoji(status)}
                      </Text>

                      <Text style={styles.statusBadgeLabel}>
                        {getStatusText(status)}
                      </Text>
                    </View>
                  </View>

                  {/* DATE */}

                  {order.createdAt ? (
                    <Text style={styles.date}>
                      Placed {formatDate(order.createdAt)}
                    </Text>
                  ) : null}

                  {/* MINI PROGRESS */}

                  <View style={styles.progressContainer}>

                    {[1, 2, 3, 4, 5].map(
                      (stage) => (
                        <React.Fragment key={stage}>

                          <View
                            style={
                              stage <= statusNumber
                                ? styles.progressDotActive
                                : styles.progressDot
                            }
                          />

                          {stage < 5 ? (
                            <View
                              style={
                                stage < statusNumber
                                  ? styles.progressLineActive
                                  : styles.progressLine
                              }
                            />
                          ) : null}

                        </React.Fragment>
                      )
                    )}

                  </View>

                  {/* ITEMS */}

                  <View style={styles.infoRow}>

                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>
                        ITEMS
                      </Text>

                      <Text style={styles.infoValue}>
                        {order.items || 0}
                      </Text>
                    </View>

                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>
                        TOTAL
                      </Text>

                      <Text style={styles.totalValue}>
                        ₹
                        {Number(
                          order.total || 0
                        ).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>
                        DELIVERY
                      </Text>

                      <Text style={styles.infoValue}>
                        {order.delivery || 'Standard'}
                      </Text>
                    </View>

                  </View>

                  {/* PRODUCTS */}

                  {order.products &&
                  order.products.length > 0 ? (
                    <View style={styles.productsBox}>

                      {order.products
                        .slice(0, 3)
                        .map((product) => (
                          <View
                            key={product.id}
                            style={styles.productRow}
                          >

                            <Text style={styles.productEmoji}>
                              {product.emoji}
                            </Text>

                            <View style={styles.productInfo}>
                              <Text
                                style={styles.productName}
                                numberOfLines={1}
                              >
                                {product.name}
                              </Text>

                              <Text
                                style={styles.productQuantity}
                              >
                                Qty: {product.quantity}
                              </Text>
                            </View>

                            <Text style={styles.productPrice}>
                              ₹
                              {(Number(product.price || 0) * Number(product.quantity || 0)).toLocaleString('en-IN')}
                            </Text>

                          </View>
                        ))}

                      {order.products.length > 3 ? (
                        <Text style={styles.moreProducts}>
                          + {order.products.length - 3} more
                          product(s)
                        </Text>
                      ) : null}

                    </View>
                  ) : null}

                  {/* TRACK BUTTON */}

                  <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => trackOrder(order)}
                  >
                    <Text style={styles.trackButtonText}>
                      TRACK ORDER  →
                    </Text>
                  </TouchableOpacity>

                </View>
              );
            })}
          </>
        )}

        {/* FOOTER */}

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

  introCard: {
    backgroundColor: BRAND.teal,
    borderRadius: 24,
    padding: 22,
    marginBottom: 17,
  },

  introTitle: {
    color: BRAND.white,
    fontSize: 22,
    fontWeight: '900',
  },

  introText: {
    color: '#E7F0FF',
    fontSize: 13,
    marginTop: 5,
  },

  emptyCard: {
    backgroundColor: BRAND.white,
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    marginTop: 15,
  },

  emptyEmoji: {
    fontSize: 60,
  },

  emptyTitle: {
    color: BRAND.ink,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 15,
  },

  emptyText: {
    color: '#777777',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 13,
    marginTop: 7,
  },

  shopButton: {
    backgroundColor: BRAND.ink,
    borderRadius: 17,
    paddingHorizontal: 28,
    paddingVertical: 16,
    marginTop: 22,
  },

  shopButtonText: {
    color: BRAND.white,
    fontSize: 13,
    fontWeight: '900',
  },

  orderCard: {
    backgroundColor: BRAND.white,
    borderRadius: 23,
    padding: 18,
    marginBottom: 16,
  },

  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  orderHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },

  orderLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },

  orderNumber: {
    color: BRAND.teal,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 145,
  },

  statusBadgeText: {
    fontSize: 14,
    marginRight: 5,
  },

  statusBadgeLabel: {
    color: BRAND.teal,
    fontSize: 9,
    fontWeight: '900',
    flexShrink: 1,
  },

  date: {
    color: '#888888',
    fontSize: 10,
    marginTop: 8,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
    marginBottom: 16,
  },

  progressDotActive: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: BRAND.teal,
  },

  progressDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#D8DDE4',
  },

  progressLineActive: {
    height: 3,
    flex: 1,
    backgroundColor: BRAND.teal,
  },

  progressLine: {
    height: 3,
    flex: 1,
    backgroundColor: '#D8DDE4',
  },

  infoRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ECEEF1',
    paddingVertical: 13,
  },

  infoBlock: {
    flex: 1,
  },

  infoLabel: {
    color: '#999999',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  infoValue: {
    color: BRAND.ink,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },

  totalValue: {
    color: BRAND.teal,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },

  productsBox: {
    marginTop: 9,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },

  productEmoji: {
    width: 38,
    fontSize: 23,
  },

  productInfo: {
    flex: 1,
    paddingRight: 8,
  },

  productName: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '800',
  },

  productQuantity: {
    color: '#999999',
    fontSize: 10,
    marginTop: 2,
  },

  productPrice: {
    color: BRAND.teal,
    fontSize: 12,
    fontWeight: '900',
  },

  moreProducts: {
    color: '#888888',
    fontSize: 10,
    paddingTop: 4,
  },

  trackButton: {
    backgroundColor: BRAND.ink,
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },

  trackButtonText: {
    color: BRAND.white,
    fontSize: 12,
    fontWeight: '900',
  },

  footer: {
    color: BRAND.teal,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 25,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
});
