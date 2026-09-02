import React from 'react';
import {
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

export default function OrderConfirmedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderId =
    typeof params.orderId === 'string'
      ? params.orderId
      : '';

  const customerName =
    typeof params.name === 'string'
      ? params.name
      : '';

  const total =
    typeof params.total === 'string'
      ? params.total
      : '';

  const trackOrder = () => {
    if (!orderId) {
      router.replace('/shop');
      return;
    }

    router.push({
      pathname: '/track-order',
      params: {
        orderId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* SUCCESS */}

        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>
            ✓
          </Text>
        </View>

        <Text style={styles.celebration}>
          🎉
        </Text>

        <Text style={styles.title}>
          Order Confirmed!
        </Text>

        <Text style={styles.subtitle}>
          Thank you for choosing Chalega India.
        </Text>

        {customerName ? (
          <Text style={styles.customerGreeting}>
            Thank you, {customerName}!
          </Text>
        ) : null}

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
            {orderId || 'Order Confirmed'}
          </Text>

          <Text style={styles.orderMessage}>
            Your order has been successfully received.
          </Text>

          {total ? (
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>
                ORDER TOTAL
              </Text>

              <Text style={styles.totalAmount}>
                ₹{Number(total).toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* TRACK ORDER */}

        <TouchableOpacity
          style={styles.trackButton}
          onPress={trackOrder}
        >
          <Text style={styles.trackButtonText}>
            TRACK MY ORDER  →
          </Text>
        </TouchableOpacity>

        <Text style={styles.trackHint}>
          Check your order status anytime.
        </Text>

        {/* WHAT'S NEXT */}

        <Text style={styles.sectionTitle}>
          What's next?
        </Text>

        <View style={styles.timeline}>

          <View style={styles.timelineRow}>
            <View style={styles.timelineIconActive}>
              <Text style={styles.timelineIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.timelineText}>
              <Text style={styles.timelineTitle}>
                Order Received
              </Text>

              <Text style={styles.timelineDescription}>
                We've received your order.
              </Text>
            </View>
          </View>

          <View style={styles.line} />

          <View style={styles.timelineRow}>
            <View style={styles.timelineIcon}>
              <Text style={styles.timelineIconText}>
                📦
              </Text>
            </View>

            <View style={styles.timelineText}>
              <Text style={styles.timelineTitle}>
                Preparing Your Order
              </Text>

              <Text style={styles.timelineDescription}>
                Your products will be prepared for delivery.
              </Text>
            </View>
          </View>

          <View style={styles.line} />

          <View style={styles.timelineRow}>
            <View style={styles.timelineIcon}>
              <Text style={styles.timelineIconText}>
                🛵
              </Text>
            </View>

            <View style={styles.timelineText}>
              <Text style={styles.timelineTitle}>
                Out for Delivery
              </Text>

              <Text style={styles.timelineDescription}>
                Your order will be delivered to you.
              </Text>
            </View>
          </View>

          <View style={styles.line} />

          <View style={styles.timelineRow}>
            <View style={styles.timelineIcon}>
              <Text style={styles.timelineIconText}>
                ✓
              </Text>
            </View>

            <View style={styles.timelineText}>
              <Text style={styles.timelineTitle}>
                Delivered
              </Text>

              <Text style={styles.timelineDescription}>
                Your order will arrive at your address.
              </Text>
            </View>
          </View>

        </View>

        {/* HEALTH MESSAGE */}

        <View style={styles.healthCard}>
          <Text style={styles.healthEmoji}>
            ❤️
          </Text>

          <Text style={styles.healthTitle}>
            Every healthy choice matters.
          </Text>

          <Text style={styles.healthText}>
            Keep walking, keep moving and keep choosing
            healthier habits.
          </Text>
        </View>

        {/* BUTTONS */}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/shop')}
        >
          <Text style={styles.secondaryButtonText}>
            CONTINUE SHOPPING
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeButtonText}>
            GO TO HOME
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
    paddingTop: 35,
    paddingBottom: 60,
    alignItems: 'center',
  },

  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIcon: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '900',
  },

  celebration: {
    fontSize: 35,
    marginTop: 18,
  },

  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#111111',
    textAlign: 'center',
    marginTop: 5,
  },

  subtitle: {
    color: '#777777',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 7,
  },

  customerGreeting: {
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },

  orderCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginTop: 25,
    alignItems: 'center',
  },

  orderLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },

  orderNumber: {
    color: '#1976F3',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 7,
    maxWidth: '100%',
  },

  orderMessage: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },

  totalBox: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
    alignItems: 'center',
  },

  totalLabel: {
    color: '#888888',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  totalAmount: {
    color: '#111111',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },

  trackButton: {
    width: '100%',
    backgroundColor: '#1976F3',
    borderRadius: 17,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 17,
  },

  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  trackHint: {
    color: '#888888',
    fontSize: 11,
    marginTop: 7,
  },

  sectionTitle: {
    width: '100%',
    color: '#111111',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 28,
    marginBottom: 15,
  },

  timeline: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
  },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timelineIconActive: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineIconText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1976F3',
  },

  timelineText: {
    flex: 1,
    paddingLeft: 14,
  },

  timelineTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  timelineDescription: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  line: {
    width: 2,
    height: 24,
    backgroundColor: '#DCE7F8',
    marginLeft: 22,
    marginVertical: 4,
  },

  healthCard: {
    width: '100%',
    backgroundColor: '#1976F3',
    borderRadius: 22,
    padding: 22,
    marginTop: 20,
    alignItems: 'center',
  },

  healthEmoji: {
    fontSize: 34,
  },

  healthTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
  },

  healthText: {
    color: '#E7F0FF',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },

  secondaryButton: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 22,
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  homeButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#1976F3',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },

  homeButtonText: {
    color: '#1976F3',
    fontSize: 14,
    fontWeight: '900',
  },

  footer: {
    color: '#1976F3',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 35,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 12,
    marginTop: 5,
  },
});