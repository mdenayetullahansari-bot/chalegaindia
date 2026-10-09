import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const BRAND = {
  midnight: '#0B2B1A',
  cream: '#F5F2E8',
  ink: '#183222',
  muted: '#6C776F',
  green: '#24633A',
  lightGreen: '#E8F3EA',
  white: '#FFFFFF',
};

export default function GardenCertificate() {
  const router = useRouter();

  const [certificateId, setCertificateId] = React.useState<string | null>(null);
  const [profileName, setProfileName] = React.useState('GardenVerse Home Gardener');
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setErrorMessage('Please sign in to access your GardenVerse certificate.');
          setLoading(false);
        }
        return;
      }

      const [{ data: profile }, { data, error }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.rpc('issue_garden_certificate'),
      ]);

      if (!mounted) return;

      const name =
        profile?.full_name?.trim() ||
        profile?.username?.trim() ||
        'GardenVerse Home Gardener';

      setProfileName(name);

      if (error) {
        const message = error.message || '';
        if (message.toLowerCase().includes('complete all 6')) {
          setErrorMessage('Complete all 6 GardenVerse Learn & Grow lessons first.');
        } else {
          setErrorMessage('Your certificate could not be issued yet. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!data?.certificate_id) {
        setErrorMessage('Your certificate could not be issued yet. Please try again.');
        setLoading(false);
        return;
      }

      setCertificateId(data.certificate_id);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const shareCertificate = async () => {
    if (!certificateId) return;

    await Share.share({
      message:
        '🌱 I completed the GardenVerse Learn & Grow training!\n\n' +
        'Certificate: GardenVerse Home Gardener\n' +
        `Certificate ID: ${certificateId}\n\n` +
        'Powered by CHALEGA KOLKATA',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.stateEmoji}>🌱</Text>
          <Text style={styles.stateTitle}>Checking your certificate...</Text>
          <Text style={styles.stateText}>One moment please.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !certificateId) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.stateContent}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lockCard}>
            <View style={styles.lockCircle}>
              <Text style={styles.lockEmoji}>🌿</Text>
            </View>

            <Text style={styles.lockTitle}>Certificate not ready yet</Text>

            <Text style={styles.lockText}>
              {errorMessage ||
                'Complete all 6 GardenVerse Learn & Grow lessons first.'}
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/garden-learn')}
            >
              <Text style={styles.primaryButtonText}>CONTINUE LEARN & GROW</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.certificate}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌱</Text>
          </View>

          <Text style={styles.brandName}>CHALEGA GARDENVERSE</Text>

          <Text style={styles.certificateLabel}>
            CERTIFICATE OF COMPLETION
          </Text>

          <View style={styles.divider} />

          <Text style={styles.awardedText}>
            This certificate is proudly awarded to
          </Text>

          <Text style={styles.name}>{profileName}</Text>

          <Text style={styles.bodyText}>
            for successfully completing the
          </Text>

          <Text style={styles.program}>LEARN & GROW</Text>

          <Text style={styles.bodyText}>
            beginner gardening training programme and learning
            the fundamentals of plant care, growing and composting.
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>🌿</Text>
            <Text style={styles.badgeText}>HOME GARDENER</Text>
          </View>

          <View style={styles.details}>
            <View>
              <Text style={styles.detailLabel}>CERTIFICATE ID</Text>
              <Text style={styles.detailValue}>{certificateId}</Text>
            </View>

            <View style={styles.detailRight}>
              <Text style={styles.detailLabel}>ISSUED</Text>
              <Text style={styles.detailValue}>2026</Text>
            </View>
          </View>

          <View style={styles.signatureArea}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>CHALEGA GARDENVERSE</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.shareButton} onPress={shareCertificate}>
          <Text style={styles.shareButtonText}>SHARE CERTIFICATE</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Your certificate can be shared with friends and family.
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
    paddingBottom: 40,
  },
  stateContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  stateEmoji: {
    fontSize: 42,
  },
  stateTitle: {
    marginTop: 16,
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    marginTop: 8,
    color: BRAND.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: BRAND.white,
    fontSize: 24,
    fontWeight: '700',
  },
  lockCard: {
    marginHorizontal: 18,
    marginTop: 30,
    padding: 28,
    borderRadius: 24,
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#B9D8C1',
    alignItems: 'center',
  },
  lockCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: BRAND.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 34,
  },
  lockTitle: {
    marginTop: 18,
    color: BRAND.midnight,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  lockText: {
    marginTop: 10,
    color: BRAND.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND.midnight,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  certificate: {
    marginHorizontal: 18,
    marginTop: 18,
    padding: 24,
    borderRadius: 24,
    backgroundColor: BRAND.white,
    borderWidth: 2,
    borderColor: '#B9D8C1',
    alignItems: 'center',
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: BRAND.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 30,
  },
  brandName: {
    marginTop: 10,
    color: BRAND.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  certificateLabel: {
    marginTop: 20,
    color: BRAND.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  divider: {
    width: 70,
    height: 2,
    marginTop: 12,
    backgroundColor: BRAND.green,
  },
  awardedText: {
    marginTop: 20,
    color: BRAND.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  name: {
    marginTop: 8,
    color: BRAND.midnight,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  bodyText: {
    marginTop: 10,
    color: BRAND.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  program: {
    marginTop: 8,
    color: BRAND.green,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badge: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: BRAND.lightGreen,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 18,
    marginRight: 7,
  },
  badgeText: {
    color: BRAND.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  details: {
    width: '100%',
    marginTop: 25,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E6E1',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailRight: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    color: BRAND.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  detailValue: {
    marginTop: 4,
    color: BRAND.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  signatureArea: {
    width: '100%',
    marginTop: 25,
    alignItems: 'center',
  },
  signatureLine: {
    width: 150,
    height: 1,
    backgroundColor: '#9AA79E',
  },
  signatureText: {
    marginTop: 6,
    color: BRAND.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shareButton: {
    marginHorizontal: 18,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND.midnight,
    alignItems: 'center',
  },
  shareButtonText: {
    color: BRAND.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  note: {
    marginHorizontal: 30,
    marginTop: 10,
    color: BRAND.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
