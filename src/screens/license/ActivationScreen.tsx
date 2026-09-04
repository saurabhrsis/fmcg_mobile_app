import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';
import { useBusiness } from '../../context/BusinessContext';
import { TRIAL_DAYS } from '../../licensing/license';
import { SUPPORT } from '../../constants/support';

export const ActivationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { status, deviceId, activateKey } = useLicense();
  const { businesses } = useBusiness();

  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  /** After a key is activated, desktop owners can copy all their PC data in one go. */
  const offerDesktopCopy = () => {
    const freshPhone = businesses.length === 0;
    Alert.alert(
      'License Activated',
      freshPhone
        ? 'Your license is active. Do you use the RightServe Desktop app on your PC? Copy your firm, items, parties and bills straight from it — no need to type anything.'
        : 'Your license is active. You can also copy the latest data from your RightServe Desktop app at any time.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => navigation.goBack() },
        {
          text: 'Copy from Desktop',
          onPress: () => navigation.replace('DesktopSync', { welcome: freshPhone }),
        },
      ]
    );
  };

  const handleActivate = async () => {
    if (!key.trim()) {
      Alert.alert('License Key Required', 'Paste the license key you received from RightServe.');
      return;
    }
    setBusy(true);
    try {
      const res = await activateKey(key);
      if (res.ok) {
        offerDesktopCopy();
      } else {
        Alert.alert('Activation Failed', res.reason || 'The key could not be verified.');
      }
    } finally {
      setBusy(false);
    }
  };

  const shareDeviceId = async () => {
    try {
      await Share.share({ message: `My FMCG Mobile Device ID: ${deviceId}` });
    } catch (_) {
      /* ignore */
    }
  };

  const trialEnded = status?.state === 'trial-expired';
  const buying = status?.trial || trialEnded;

  return (
    <ScreenWrapper title="Buy / Activate License" subtitle="Unlock full billing access">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.palette.primary }]}>
            <Ionicons name="key" size={34} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {buying ? 'Buy or Activate Your License' : 'Activate Your License'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trialEnded
              ? `Your ${TRIAL_DAYS}-day free trial has ended. Enter your Mobile license key to continue creating invoices.`
              : 'Already have a key? Paste it below. Want to buy? Call or message us — we activate in minutes.'}
          </Text>
        </View>

        {!!status?.reason && (
          <View style={[styles.notice, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="alert-circle" size={18} color="#B45309" />
            <Text style={[styles.noticeText, { color: '#92400E' }]}>{status.reason}</Text>
          </View>
        )}

        {/* ---- Contact sales: call, WhatsApp, email ---- */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>Buy / Renew — Talk to Us</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 10 }]}>
            Share your business name with our team and we'll issue your Mobile license key right away.
          </Text>

          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: colors.palette.primary }]}
            onPress={() => Linking.openURL(`tel:${SUPPORT.phones[0].tel}`)}
          >
            <Ionicons name="call-outline" size={19} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>Call Sales & Support</Text>
              <Text style={styles.contactSub}>{SUPPORT.phones.map((p) => p.label).join('  •  ')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: '#16A34A' }]}
            onPress={() =>
              Linking.openURL(
                `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(
                  'Hi, I want to buy the FMCG Mobile app license. My Device ID: ' + deviceId
                )}`
              )
            }
          >
            <Ionicons name="logo-whatsapp" size={19} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>WhatsApp Us</Text>
              <Text style={styles.contactSub}>{SUPPORT.phones[0].label} — fastest reply</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactBtn, { borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => Linking.openURL(`mailto:${SUPPORT.email}?subject=FMCG%20Mobile%20License`)}
          >
            <Ionicons name="mail-outline" size={19} color={colors.palette.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Email Us</Text>
              <Text style={[styles.contactSub, { color: colors.textMuted }]}>{SUPPORT.email}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ---- Key entry ---- */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>License Key</Text>
          <TextInput
            style={[
              styles.keyInput,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="RSL1.xxxxxxxx.yyyyyyyy"
            placeholderTextColor={colors.textMuted}
            value={key}
            onChangeText={setKey}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.palette.primary }]}
            onPress={handleActivate}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Activate License</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Device ID */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>Your Device ID</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Share this with us when buying a device-locked key.
          </Text>
          <View style={[styles.deviceRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.deviceId, { color: colors.text }]} selectable>
              {deviceId || '—'}
            </Text>
            <TouchableOpacity onPress={shareDeviceId} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={20} color={colors.palette.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>
            Already have the Desktop app?
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Desktop and mobile are licensed separately. After activating your{' '}
            <Text style={{ fontWeight: '700' }}>Mobile</Text> key here, you can copy your firm, items,
            parties and bills from the PC in one tap — Desktop Sync will be offered automatically.
          </Text>
        </View>

        {trialEnded && (
          <TouchableOpacity style={styles.laterLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.laterText, { color: colors.textSecondary }]}>
              Continue in read-only mode
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', marginTop: 14 },
  subtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 10 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  keyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 96,
    fontSize: 12,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 14,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 12.5, lineHeight: 19 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  contactTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  contactSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, marginTop: 1 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  deviceId: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  shareBtn: { padding: 4 },
  laterLink: { alignItems: 'center', paddingVertical: 12 },
  laterText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
