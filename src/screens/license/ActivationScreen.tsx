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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';
import { TRIAL_DAYS } from '../../licensing/license';

export const ActivationScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { status, deviceId, activateKey } = useLicense();

  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) {
      Alert.alert('License Key Required', 'Paste the license key you received from RightServe.');
      return;
    }
    setBusy(true);
    try {
      const res = await activateKey(key);
      if (res.ok) {
        Alert.alert('Activated', 'Your license is active. Thank you!', [
          { text: 'Continue', onPress: () => navigation.goBack() },
        ]);
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

  return (
    <ScreenWrapper title="Activate License" subtitle="Unlock full billing access">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.palette.primary }]}>
            <Ionicons name="key" size={34} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Activate Your License</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trialEnded
              ? `Your ${TRIAL_DAYS}-day free trial has ended. Enter your Mobile license key to continue creating invoices.`
              : 'Paste the Mobile license key issued to your business to unlock full access on this phone.'}
          </Text>
        </View>

        {!!status?.reason && (
          <View style={[styles.notice, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="alert-circle" size={18} color="#B45309" />
            <Text style={[styles.noticeText, { color: '#92400E' }]}>{status.reason}</Text>
          </View>
        )}

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
            Share this with RightServe when requesting a device-locked key.
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
          <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>How to get a key</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            1. Contact RightServe sales with your business name and Device ID.{'\n'}
            2. They generate a signed key from the RightServe licensing portal — the same portal
            used for the desktop software.{'\n'}
            3. Paste the key above. Internet is needed only once, at activation; afterwards the app
            works fully offline.
          </Text>
        </View>

        {/* Desktop and mobile are separate products — one key unlocks one device */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>
            Mobile key ≠ Desktop key
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            A licence activates ONE device, so the phone and the PC need their own keys. Ask
            RightServe for the <Text style={{ fontWeight: '700' }}>Mobile app</Text> product (or
            “Desktop + Mobile”, which issues two keys for the same client).{'\n'}
            A desktop key pasted here is rejected with the message “This key is for the RightServe
            desktop app”, and the desktop app rejects a mobile key the same way. Renew each product
            separately.
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
