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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

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
      const stored = await AsyncStorage.getItem('chalega_orders');

      if (!stored) {
        setOrders([]);
        return;
      }

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        setOrders([...parsed].reverse());
      } else {
        setOrders([]);
      }
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
      const stored =
        await AsyncStorage.getItem('chalega_orders');

      if (!stored) return;

      const existingOrders = JSON.parse(stored);

      const updatedOrders = existingOrders.map(
        (order: Order) => {
          const currentId =
            order.orderId || order.id;

          if (currentId === orderId) {
            return {
              ...order,
              status: newStatus,
            };
          }

          return order;
        }
      );

      await AsyncStorage.setItem(
        'chalega_orders',
        JSON.stringify(updatedOrders)
      );

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
              CHALEGA INDIA
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
              color="#1976F3"
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
                              ₹{product.price.toLocaleString('en-IN')} each
                            </Text>

                          </View>

                          <Text style={styles.productTotal}>
                            ₹{product.total.toLocaleString('en-IN')}
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
          CHALEGA INDIA 🇮🇳
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
    backgroundColor: '#F5F7FB',
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#1976F3',
    fontSize: 44,
    lineHeight: 48,
  },

  headerText: {
    marginLeft: 16,
  },

  brand: {
    color: '#1976F3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },

  title: {
    color: '#111111',
    fontSize: 38,
    fontWeight: '900',
    marginTop: 3,
  },

  banner: {
    backgroundColor: '#1976F3',
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
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 40,
    alignItems: 'center',
  },

  emptyEmoji: {
    fontSize: 55,
  },

  emptyTitle: {
    color: '#111111',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1976F3',
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
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginLeft: 8,
  },

  statusBadgeText: {
    color: '#1976F3',
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
    color: '#111111',
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
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },

  callButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  whatsappButton: {
    flex: 1,
    backgroundColor: '#EEF4FF',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },

  whatsappButtonText: {
    color: '#1976F3',
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
    backgroundColor: '#FFFFFF',
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
    color: '#111111',
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
    color: '#1976F3',
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
    backgroundColor: '#1976F3',
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
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },

  totalAmount: {
    color: '#FFFFFF',
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
    color: '#1976F3',
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
    color: '#111111',
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
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4D8DE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleActiveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  circleText: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '900',
  },

  timelineActive: {
    color: '#111111',
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
    backgroundColor: '#111111',
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 18,
  },

  actionButtonText: {
    color: '#FFFFFF',
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
    color: '#1976F3',
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