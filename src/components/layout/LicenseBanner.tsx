import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';

/**
 * Thin status strip shown across the top of the app while the user is on the
 * free trial, close to expiry, or locked into read-only mode — the mobile
 * equivalent of the desktop yellow banner.
 */
export const LicenseBanner: React.FC = () => {
  const { status } = useLicense();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  if (!status) return null;

  let bg = '';
  let fg = '';
  let icon: keyof typeof Ionicons.glyphMap = 'information-circle';
  let text = '';
  let cta = 'Activate';

  switch (status.state) {
    case 'trial':
      bg = '#ECFDF5';
      fg = '#065F46';
      icon = 'time-outline';
      text = `Free trial — ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'} remaining`;
      cta = 'Buy License';
      break;
    case 'trial-expiring':
      bg = '#FEF3C7';
      fg = '#92400E';
      icon = 'alert-circle-outline';
      text = `Trial ends in ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'}`;
      cta = 'Buy License';
      break;
    case 'trial-expired':
      bg = '#FEE2E2';
      fg = '#991B1B';
      icon = 'lock-closed-outline';
      text = 'Trial ended — read-only mode';
      break;
    case 'expiring':
      bg = '#FEF3C7';
      fg = '#92400E';
      icon = 'alert-circle-outline';
      text = `License expires in ${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'}`;
      cta = 'Renew';
      break;
    case 'expired':
      bg = '#FEE2E2';
      fg = '#991B1B';
      icon = 'lock-closed-outline';
      text = `License expired on ${status.expires} — read-only`;
      cta = 'Renew';
      break;
    case 'needs-activation':
      bg = '#FEE2E2';
      fg = '#991B1B';
      icon = 'key-outline';
      text = 'Activation required on this device';
      break;
    case 'invalid':
      bg = '#FEE2E2';
      fg = '#991B1B';
      icon = 'close-circle-outline';
      text = status.reason || 'Invalid license';
      break;
    default:
      return null; // fully licensed — no banner
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.bar, { backgroundColor: bg }]}
      onPress={() => navigation.navigate('Activation')}
    >
      <Ionicons name={icon} size={15} color={fg} />
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
      <View style={[styles.cta, { borderColor: fg }]}>
        <Text style={[styles.ctaText, { color: fg }]}>{cta}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  text: { flex: 1, fontSize: 12, fontWeight: '600' },
  cta: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  ctaText: { fontSize: 11, fontWeight: '700' },
});
