import { BRAND } from '@/lib/brand';
import React, { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';

export default function OrderConfirmedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const orderId =
    typeof params.orderId === 'string'
      ? params.orderId
      : '';
  const isCommunityOrder = params.source === 'community';
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'verified' | 'not_found' | 'error'>(isCommunityOrder ? 'checking' : 'verified');
  const [verifiedDeliveryDeadline, setVerifiedDeliveryDeadline] = useState('');
  const [verifiedPaymentMethod, setVerifiedPaymentMethod] = useState('');
  const [verifiedPaymentStatus, setVerifiedPaymentStatus] = useState('');

  useEffect(() => {
    if (!isCommunityOrder) return;
    let active = true;
    const verifyCommunityOrder = async () => {
      try {
        if (!orderId) {
          if (active) setVerificationStatus('not_found');
          return;
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          if (active) setVerificationStatus('not_found');
          return;
        }
        const { data, error } = await supabase
          .from('orders')
          .select('order_id, delivery_deadline, status, payment_method, payment_status')
          .eq('user_id', user.id)
          .eq('order_id', orderId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          if (active) setVerificationStatus('not_found');
          return;
        }
        if (active) {
          setVerifiedDeliveryDeadline(data.delivery_deadline || '');
          setVerifiedPaymentMethod(data.payment_method || '');
          setVerifiedPaymentStatus(data.payment_status || '');
          setVerificationStatus('verified');
        }
      } catch {
        if (active) setVerificationStatus('error');
      }
    };
    verifyCommunityOrder();
    return () => { active = false; };
  }, [isCommunityOrder, orderId]);

  const customerName =
    typeof params.name === 'string'
      ? params.name
      : '';

  const total =
    typeof params.total === 'string'
      ? params.total
      : '';

  const deliveryDeadline =
    typeof params.deliveryDeadline === 'string'
      ? params.deliveryDeadline
      : '';

  const formattedDeliveryDeadline = (() => {
    const deadlineToFormat = isCommunityOrder ? verifiedDeliveryDeadline : deliveryDeadline;
    if (!deadlineToFormat) return '';
    const date = new Date(deadlineToFormat);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  })();

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
          {isCommunityOrder && verificationStatus !== 'verified'
            ? verificationStatus === 'checking' ? 'Checking Your Order…' : 'Order Not Verified'
            : 'Order Confirmed!'}
        </Text>

        <Text style={styles.subtitle}>
          {isCommunityOrder && verificationStatus === 'checking'
            ? 'We are checking the saved order details.'
            : isCommunityOrder && verificationStatus === 'not_found'
            ? 'We could not verify this order for your account. Please check My Orders before placing it again.'
            : isCommunityOrder && verificationStatus === 'error'
            ? 'We could not check the saved order right now. Please check My Orders before trying again.'
            : 'Thank you for choosing Chalega.'}
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
            {isCommunityOrder && verificationStatus !== 'verified'
              ? 'Order status is not confirmed on this screen.'
              : isCommunityOrder && verifiedPaymentMethod.toUpperCase() === 'COD'
              ? 'Your order has been received. Payment is due on delivery.'
              : 'Your order has been successfully received.'}
          </Text>

          {isCommunityOrder && verificationStatus === 'verified' && verifiedPaymentStatus ? (
            <Text style={styles.orderMessage}>
              Payment status: {verifiedPaymentStatus.toLowerCase() === 'pending' && verifiedPaymentMethod.toUpperCase() === 'COD'
                ? 'Due on delivery'
                : verifiedPaymentStatus.replace(/_/g, ' ')}
            </Text>
          ) : null}

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

          {formattedDeliveryDeadline && (!isCommunityOrder || verificationStatus === 'verified') ? (
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>
                DELIVERY DEADLINE
              </Text>
              <Text style={styles.orderMessage}>
                {formattedDeliveryDeadline}
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

        {(!isCommunityOrder || verificationStatus === 'verified') && (
        <>
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
        </>
        )}

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
    paddingTop: 35,
    paddingBottom: 60,
    alignItems: 'center',
  },

  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIcon: {
    color: BRAND.white,
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
    color: BRAND.ink,
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
    color: BRAND.teal,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },

  orderCard: {
    width: '100%',
    backgroundColor: BRAND.white,
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
    color: BRAND.teal,
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
    color: BRAND.ink,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },

  trackButton: {
    width: '100%',
    backgroundColor: BRAND.teal,
    borderRadius: 17,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 17,
  },

  trackButtonText: {
    color: BRAND.white,
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
    color: BRAND.ink,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 28,
    marginBottom: 15,
  },

  timeline: {
    width: '100%',
    backgroundColor: BRAND.white,
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
    backgroundColor: BRAND.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: BRAND.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timelineIconText: {
    fontSize: 21,
    fontWeight: '900',
    color: BRAND.teal,
  },

  timelineText: {
    flex: 1,
    paddingLeft: 14,
  },

  timelineTitle: {
    color: BRAND.ink,
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
    backgroundColor: BRAND.teal,
    borderRadius: 22,
    padding: 22,
    marginTop: 20,
    alignItems: 'center',
  },

  healthEmoji: {
    fontSize: 34,
  },

  healthTitle: {
    color: BRAND.white,
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
    backgroundColor: BRAND.ink,
    borderRadius: 17,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 22,
  },

  secondaryButtonText: {
    color: BRAND.white,
    fontSize: 14,
    fontWeight: '900',
  },

  homeButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: BRAND.teal,
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },

  homeButtonText: {
    color: BRAND.teal,
    fontSize: 14,
    fontWeight: '900',
  },

  footer: {
    color: BRAND.teal,
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