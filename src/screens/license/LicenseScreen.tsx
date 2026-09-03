import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';
import { stateLabel, TRIAL_DAYS } from '../../licensing/license';

/** Help → License Details. Shows plan, expiry, device id and renewal actions. */
export const LicenseScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { status, deviceId, removeKey, refresh } = useLicense();

  const rows: Array<[string, string]> = status
    ? [
        ['Status', stateLabel(status)],
        ['Plan', status.plan || '—'],
        ['Licensed To', status.client || (status.trial ? 'Trial User' : '—')],
        ['License ID', status.payload?.id || '—'],
        ['Issued On', status.payload?.issued || '—'],
        ['Valid Till', status.perpetual ? 'Never expires' : status.expires || '—'],
        ['Days Left', status.perpetual ? '∞' : status.daysLeft === null ? '—' : String(status.daysLeft)],
        ['Device Locked', status.payload?.machine ? 'Yes' : 'No'],
        ['Mode', status.readOnly ? 'Read-only' : 'Full read / write'],
      ]
    : [];

  const handleRemove = () => {
    Alert.alert(
      'Remove License',
      'The app will fall back to read-only mode until a new key is entered. Your data is untouched. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeKey();
            Alert.alert('Removed', 'License key removed from this device.');
          },
        },
      ]
    );
  };

  const badgeColor =
    status?.readOnly
      ? '#DC2626'
      : status?.state === 'expiring' || status?.state === 'trial-expiring'
      ? '#D97706'
      : '#059669';

  return (
    <ScreenWrapper title="License & Activation" subtitle="Device license & plan details">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Ionicons
              name={status?.readOnly ? 'lock-closed' : 'shield-checkmark'}
              size={22}
              color="#FFF"
            />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {status ? stateLabel(status) : 'Checking license…'}
          </Text>
          {status?.trial && (
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Every new install includes a {TRIAL_DAYS}-day free trial with full features.
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {rows.map(([k, v]) => (
            <View key={k} style={[styles.row, { borderBottomColor: colors.border }]}>
              <Text style={[styles.rowKey, { color: colors.textSecondary }]}>{k}</Text>
              <Text style={[styles.rowVal, { color: colors.text }]} numberOfLines={2}>
                {v}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>Device ID</Text>
          <View style={styles.deviceRow}>
            <Text style={[styles.deviceId, { color: colors.text }]} selectable>
              {deviceId || '—'}
            </Text>
            <TouchableOpacity
              onPress={() => Share.share({ message: `My FMCG Mobile Device ID: ${deviceId}` })}
            >
              <Ionicons name="share-outline" size={20} color={colors.palette.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.palette.primary }]}
          onPress={() => navigation.navigate('Activation')}
        >
          <Ionicons name="key-outline" size={18} color="#FFF" />
          <Text style={styles.btnText}>
            {status?.trial ? 'Enter License Key' : 'Enter New / Renewal Key'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: colors.border }]}
          onPress={refresh}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.text} />
          <Text style={[styles.btnOutlineText, { color: colors.text }]}>Re-check License</Text>
        </TouchableOpacity>

        {!status?.trial && (
          <TouchableOpacity style={[styles.btnOutline, { borderColor: '#DC2626' }]} onPress={handleRemove}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={[styles.btnOutlineText, { color: '#DC2626' }]}>Remove License Key</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.footNote, { color: colors.textMuted }]}>
          Keys are digitally signed (ed25519) and verified offline on this device. The same
          RightServe licensing portal issues keys for the desktop software and this app.
        </Text>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  hero: { borderWidth: 1, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 14 },
  badge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  heroSub: { fontSize: 12.5, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowKey: { fontSize: 12.5, fontWeight: '600' },
  rowVal: { fontSize: 12.5, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  deviceId: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 10, paddingVertical: 14, marginBottom: 10,
  },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14.5 },
  btnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 10, paddingVertical: 13, borderWidth: 1, marginBottom: 10,
  },
  btnOutlineText: { fontWeight: '700', fontSize: 14 },
  footNote: { fontSize: 11.5, lineHeight: 17, marginTop: 8, textAlign: 'center' },
});
