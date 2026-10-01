import { BRAND } from '@/lib/brand';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
    phone?: string;
  };

  address?: {
    address?: string;
    area?: string;
    pin?: string;
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

export default function OrdersScreen() {
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

      if (userError) throw userError;

      if (!user) {
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, order_id, customer_name, customer_phone, address, area, pin, products, total, delivery, status, created_at'
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedOrders: Order[] = (data || []).map((row: any) => ({
        id: row.id,
        orderId: row.order_id,
        customer: {
          name: row.customer_name,
          phone: row.customer_phone,
        },
        address: {
          address: row.address,
          area: row.area,
          pin: row.pin,
        },
        products: Array.isArray(row.products) ? row.products : [],
        items: Array.isArray(row.products)
          ? row.products.reduce(
              (sum: number, product: any) =>
                sum + Number(product?.quantity || 0),
              0
            )
          : 0,
        total: Number(row.total || 0),
        delivery: row.delivery,
        status: row.status || STATUS.RECEIVED,
        createdAt: row.created_at,
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.log('Could not load orders:', error);
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

  const getOrderId = (order: Order) =>
    order.orderId || order.id || 'Unknown Order';

  const getCustomerName = (order: Order) =>
    order.customer?.name || 'Customer';

  const getPhone = (order: Order) =>
    order.customer?.phone || '';

  const getStatus = (order: Order) =>
    order.status || STATUS.RECEIVED;

  const getStatusNumber = (status: string) => {
    switch (status) {
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

  const updateStatus = async (
    orderId: string,
    newStatus: string
  ) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Please sign in to manage this order.'
        );
        return;
      }

      const { error } = await supabase.rpc(
        'update_order_status',
        {
          p_order_id: orderId,
          p_status: newStatus,
        }
      );

      if (error) throw error;

      await loadOrders();

      Alert.alert(
        'Order Updated',
        `${orderId} is now "${newStatus}".`
      );
    } catch (error) {
      console.log('Could not update order:', error);

      Alert.alert(
        'Error',
        'Could not update the order status.'
      );
    }
  };
  const moveToNextStatus = (order: Order) => {
    const orderId = getOrderId(order);
    const currentStatus = getStatus(order);

    if (currentStatus === STATUS.RECEIVED) {
      updateStatus(
        orderId,
        STATUS.PREPARING
      );
      return;
    }

    if (currentStatus === STATUS.PREPARING) {
      updateStatus(
        orderId,
        STATUS.OUT_FOR_DELIVERY
      );
      return;
    }

    if (currentStatus === STATUS.OUT_FOR_DELIVERY) {
      updateStatus(
        orderId,
        STATUS.DELIVERED
      );
      return;
    }

    if (currentStatus === STATUS.DELIVERED) {
      updateStatus(
        orderId,
        STATUS.COMPLETED
      );
      return;
    }

    Alert.alert(
      'Order Completed',
      'This order has already been completed.'
    );
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case STATUS.RECEIVED:
        return 'MARK AS PREPARING  →';

      case STATUS.PREPARING:
        return 'MARK AS OUT FOR DELIVERY  →';

      case STATUS.OUT_FOR_DELIVERY:
        return 'MARK AS DELIVERED  →';

      case STATUS.DELIVERED:
        return 'MARK AS COMPLETED  →';

      case STATUS.COMPLETED:
        return 'ORDER COMPLETED  ✓';

      default:
        return 'MARK AS PREPARING  →';
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '';

    try {
      return new Date(value).toLocaleString('en-IN');
    } catch {
      return value;
    }
  };

  const callCustomer = (phone: string) => {
    if (!phone) {
      Alert.alert(
        'No phone number',
        'This order does not have a customer phone number.'
      );
      return;
    }

    Linking.openURL(`tel:${phone}`);
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) {
      Alert.alert(
        'No phone number',
        'This order does not have a customer phone number.'
      );
      return;
    }

    const cleanPhone =
      phone.replace(/[^0-9]/g, '');

    Linking.openURL(
      `https://wa.me/91${cleanPhone}`
    );
  };

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
            onPress={() => router.replace('/')}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.brand}>
              CHALEGA KOLKATA
            </Text>

            <Text style={styles.title}>
              Orders
            </Text>
          </View>
        </View>

        {/* BANNER */}

        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>
            📦
          </Text>

          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>
              Order Management
            </Text>

            <Text style={styles.bannerText}>
              Manage packing, customer details
              and delivery status.
            </Text>
          </View>
        </View>

        {/* LOADING */}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              size="large"
              color="#00D1A7"
            />

            <Text style={styles.loadingText}>
              Loading orders...
            </Text>
          </View>

        ) : orders.length === 0 ? (

          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>
              📦
            </Text>

            <Text style={styles.emptyTitle}>
              No orders yet
            </Text>

            <Text style={styles.emptyText}>
              Orders placed through the shop
              will appear here.
            </Text>
          </View>

        ) : (

          orders.map((order) => {
            const orderId = getOrderId(order);
            const customerName =
              getCustomerName(order);
            const phone = getPhone(order);
            const status = getStatus(order);
            const statusNumber =
              getStatusNumber(status);

            return (
              <View
                key={orderId}
                style={styles.orderCard}
              >

                {/* ORDER HEADER */}

                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.orderLabel}>
                      ORDER NUMBER
                    </Text>

                    <Text style={styles.orderNumber}>
                      {orderId}
                    </Text>

                    {order.createdAt && (
                      <Text style={styles.date}>
                        {formatDate(order.createdAt)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {status}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* CUSTOMER */}

                <Text style={styles.sectionLabel}>
                  CUSTOMER
                </Text>

                <Text style={styles.customerName}>
                  {customerName}
                </Text>

                {phone ? (
                  <Text style={styles.phone}>
                    📱 {phone}
                  </Text>
                ) : null}

                <View style={styles.contactRow}>

                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() =>
                      callCustomer(phone)
                    }
                  >
                    <Text style={styles.callButtonText}>
                      📞 CALL CUSTOMER
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() =>
                      openWhatsApp(phone)
                    }
                  >
                    <Text style={styles.whatsappButtonText}>
                      WHATSAPP
                    </Text>
                  </TouchableOpacity>

                </View>

                {/* PRODUCTS */}

                <Text style={styles.sectionLabel}>
                  PRODUCTS TO PACK
                </Text>

                <View style={styles.productsCard}>

                  {order.products &&
                  order.products.length > 0 ? (

                    order.products.map(
                      (product) => (
                        <View
                          key={product.id}
                          style={styles.productRow}
                        >

                          <View style={styles.productEmojiBox}>
                            <Text style={styles.productEmoji}>
                              {product.emoji}
                            </Text>
                          </View>

                          <View style={styles.productDetails}>

                            <Text style={styles.productName}>
                              {product.name}
                            </Text>

                            <Text style={styles.productQuantity}>
                              Quantity: {product.quantity}
                            </Text>

                            <Text style={styles.productPrice}>
                              ₹{Number(product.price || 0).toLocaleString('en-IN')} each
                            </Text>

                          </View>

                          <Text style={styles.productTotal}>
                            ₹{(Number(product.price || 0) * Number(product.quantity || 0)).toLocaleString('en-IN')}
                          </Text>

                        </View>
                      )
                    )

                  ) : (

                    <View style={styles.noProducts}>
                      <Text style={styles.noProductsText}>
                        Product details are not
                        available for this order.
                      </Text>
                    </View>

                  )}

                </View>

                {/* TOTAL */}

                <View style={styles.totalCard}>

                  <View>
                    <Text style={styles.totalItems}>
                      {order.items || 0} item
                      {(order.items || 0) === 1
                        ? ''
                        : 's'}
                    </Text>

                    <Text style={styles.totalLabel}>
                      TOTAL TO COLLECT
                    </Text>
                  </View>

                  <Text style={styles.totalAmount}>
                    ₹
                    {Number(
                      order.total || 0
                    ).toLocaleString('en-IN')}
                  </Text>

                </View>

                {/* ADDRESS */}

                <Text style={styles.sectionLabel}>
                  DELIVERY ADDRESS
                </Text>

                <View style={styles.addressCard}>

                  <Text style={styles.addressIcon}>
                    📍
                  </Text>

                  <View style={styles.addressInfo}>

                    <Text style={styles.addressText}>
                      {order.address?.address || ''}
                    </Text>

                    <Text style={styles.addressText}>
                      {order.address?.area || ''}
                    </Text>

                    <Text style={styles.pinText}>
                      PIN: {order.address?.pin || ''}
                    </Text>

                  </View>

                </View>

                {/* DELIVERY */}

                <Text style={styles.sectionLabel}>
                  DELIVERY METHOD
                </Text>

                <View style={styles.deliveryCard}>

                  <Text style={styles.deliveryEmoji}>
                    🛵
                  </Text>

                  <View>
                    <Text style={styles.deliveryTitle}>
                      {order.delivery || 'Standard'}
                    </Text>

                    <Text style={styles.deliveryText}>
                      Delivery for this order
                    </Text>
                  </View>

                </View>

                {/* STATUS TIMELINE */}

                <Text style={styles.sectionLabel}>
                  ORDER STATUS
                </Text>

                <View style={styles.timeline}>

                  <TimelineStep
                    number={1}
                    label="Order Received"
                    active={statusNumber >= 1}
                    completed={statusNumber > 1}
                  />

                  <View style={styles.verticalLine} />

                  <TimelineStep
                    number={2}
                    label="Preparing"
                    active={statusNumber >= 2}
                    completed={statusNumber > 2}
                  />

                  <View style={styles.verticalLine} />

                  <TimelineStep
                    number={3}
                    label="Out for Delivery"
                    active={statusNumber >= 3}
                    completed={statusNumber > 3}
                  />

                  <View style={styles.verticalLine} />

                  <TimelineStep
                    number={4}
                    label="Delivered"
                    active={statusNumber >= 4}
                    completed={statusNumber > 4}
                  />

                  <View style={styles.verticalLine} />

                  <TimelineStep
                    number={5}
                    label="Completed"
                    active={statusNumber >= 5}
                    completed={false}
                  />

                </View>

                {/* ACTION BUTTON */}

                <TouchableOpacity
                  style={
                    status === STATUS.COMPLETED
                      ? styles.disabledButton
                      : styles.actionButton
                  }
                  disabled={
                    status === STATUS.COMPLETED
                  }
                  onPress={() =>
                    moveToNextStatus(order)
                  }
                >
                  <Text
                    style={
                      status === STATUS.COMPLETED
                        ? styles.disabledButtonText
                        : styles.actionButtonText
                    }
                  >
                    {getButtonText(status)}
                  </Text>
                </TouchableOpacity>

              </View>
            );
          })
        )}

        <Text style={styles.footer}>
          CHALEGA KOLKATA
        </Text>

        <Text style={styles.footerSmall}>
          Order Management
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

/* TIMELINE STEP */

function TimelineStep({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <View style={styles.timelineRow}>

      <View
        style={
          active
            ? styles.circleActive
            : styles.circle
        }
      >
        <Text
          style={
            active
              ? styles.circleActiveText
              : styles.circleText
          }
        >
          {completed ? '✓' : number}
        </Text>
      </View>

      <Text
        style={
          active
            ? styles.timelineActive
            : styles.timelineInactive
        }
      >
        {label}
      </Text>

    </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: BRAND.teal,
    fontSize: 44,
    lineHeight: 48,
  },

  headerText: {
    marginLeft: 16,
  },

  brand: {
    color: BRAND.teal,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },

  title: {
    color: BRAND.ink,
    fontSize: 38,
    fontWeight: '900',
    marginTop: 3,
  },

  banner: {
    backgroundColor: BRAND.teal,
    borderRadius: 25,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  bannerEmoji: {
    fontSize: 48,
    marginRight: 17,
  },

  bannerInfo: {
    flex: 1,
  },

  bannerTitle: {
    color: BRAND.white,
    fontSize: 22,
    fontWeight: '900',
  },

  bannerText: {
    color: '#E6F0FF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  loading: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    color: '#777777',
    marginTop: 12,
  },

  emptyCard: {
    backgroundColor: BRAND.white,
    borderRadius: 25,
    padding: 40,
    alignItems: 'center',
  },

  emptyEmoji: {
    fontSize: 55,
  },

  emptyTitle: {
    color: BRAND.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyText: {
    color: '#777777',
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },

  orderCard: {
    backgroundColor: BRAND.white,
    borderRadius: 27,
    padding: 20,
    marginBottom: 25,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  orderHeaderLeft: {
    flex: 1,
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
    marginTop: 5,
  },

  date: {
    color: '#888888',
    fontSize: 11,
    marginTop: 5,
  },

  statusBadge: {
    backgroundColor: BRAND.greenLight,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginLeft: 8,
  },

  statusBadgeText: {
    color: BRAND.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  divider: {
    height: 1,
    backgroundColor: '#E7E9ED',
    marginVertical: 20,
  },

  sectionLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 7,
    marginBottom: 8,
  },

  customerName: {
    color: BRAND.ink,
    fontSize: 22,
    fontWeight: '900',
  },

  phone: {
    color: '#555555',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },

  contactRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
    marginBottom: 15,
  },

  callButton: {
    flex: 1,
    backgroundColor: BRAND.ink,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },

  callButtonText: {
    color: BRAND.white,
    fontSize: 10,
    fontWeight: '900',
  },

  whatsappButton: {
    flex: 1,
    backgroundColor: BRAND.greenLight,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },

  whatsappButtonText: {
    color: BRAND.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  productsCard: {
    backgroundColor: '#F7F9FD',
    borderRadius: 19,
    padding: 12,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8ED',
  },

  productEmojiBox: {
    width: 55,
    height: 55,
    borderRadius: 14,
    backgroundColor: BRAND.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  productEmoji: {
    fontSize: 29,
  },

  productDetails: {
    flex: 1,
    paddingLeft: 11,
  },

  productName: {
    color: BRAND.ink,
    fontSize: 13,
    fontWeight: '900',
  },

  productQuantity: {
    color: '#555555',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  productPrice: {
    color: '#888888',
    fontSize: 10,
    marginTop: 2,
  },

  productTotal: {
    color: BRAND.teal,
    fontSize: 14,
    fontWeight: '900',
  },

  noProducts: {
    padding: 15,
  },

  noProductsText: {
    color: '#888888',
    textAlign: 'center',
    fontSize: 12,
  },

  totalCard: {
    backgroundColor: BRAND.teal,
    borderRadius: 19,
    padding: 18,
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalItems: {
    color: '#DCEAFF',
    fontSize: 11,
    fontWeight: '800',
  },

  totalLabel: {
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },

  totalAmount: {
    color: BRAND.white,
    fontSize: 25,
    fontWeight: '900',
  },

  addressCard: {
    backgroundColor: '#F7F9FD',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  addressIcon: {
    fontSize: 25,
  },

  addressInfo: {
    flex: 1,
    paddingLeft: 11,
  },

  addressText: {
    color: '#444444',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },

  pinText: {
    color: BRAND.teal,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },

  deliveryCard: {
    backgroundColor: '#F7F9FD',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  deliveryEmoji: {
    fontSize: 29,
    marginRight: 12,
  },

  deliveryTitle: {
    color: BRAND.ink,
    fontSize: 15,
    fontWeight: '900',
  },

  deliveryText: {
    color: '#777777',
    fontSize: 11,
    marginTop: 3,
  },

  timeline: {
    backgroundColor: '#F7F9FD',
    borderRadius: 19,
    padding: 17,
  },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  circleActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#D4D8DE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleActiveText: {
    color: BRAND.white,
    fontSize: 15,
    fontWeight: '900',
  },

  circleText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '900',
  },

  timelineActive: {
    color: BRAND.ink,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 13,
  },

  timelineInactive: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 13,
  },

  verticalLine: {
    width: 2,
    height: 19,
    backgroundColor: '#DCE7F8',
    marginLeft: 19,
    marginVertical: 3,
  },

  actionButton: {
    backgroundColor: BRAND.ink,
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 18,
  },

  actionButtonText: {
    color: BRAND.white,
    fontSize: 13,
    fontWeight: '900',
  },

  disabledButton: {
    backgroundColor: '#E8EBEF',
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 18,
  },

  disabledButtonText: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '900',
  },

  footer: {
    color: BRAND.teal,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 20,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
  },
});
