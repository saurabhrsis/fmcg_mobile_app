import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { SUPPORT } from '../../constants/support';

/** Short, tappable how-to topics so users can self-serve common questions. */
const FAQS: Array<{ icon: keyof typeof Ionicons.glyphMap; q: string; a: string }> = [
  {
    icon: 'key-outline',
    q: 'How do I activate my license?',
    a: 'Go to More → License & Subscription → Enter License Key and paste the key we sent you. Internet is needed only once, at activation — after that the app works fully offline.',
  },
  {
    icon: 'sync-outline',
    q: 'How do I copy data from my desktop?',
    a: 'On the PC open Settings → Mobile Sync and keep the pairing QR on screen. On this phone go to More → Desktop Portal Sync, tap “Scan QR to connect”, then “Full Sync”. Your firm, items, parties and bills come across automatically.',
  },
  {
    icon: 'shield-checkmark-outline',
    q: 'How do I back up my data?',
    a: 'Go to More → Data Backup & Import → Backup & Restore and tap “Generate & Share Backup”. Keep the file safe — you can restore it on any phone.',
  },
  {
    icon: 'cloud-upload-outline',
    q: 'How do I import my old product list?',
    a: 'Go to More → Data Backup & Import → CSV Import. Pick Products or Parties, choose your CSV file (from Marg, Vyapar, Tally or Excel) and confirm the preview.',
  },
  {
    icon: 'receipt-outline',
    q: 'How is GST picked on a bill?',
    a: 'It is chosen automatically from your firm’s state and the customer’s state — CGST + SGST within the state, IGST outside. You can change it on the bill for special cases like SEZ.',
  },
];

export const SupportScreen: React.FC = () => {
  const { colors } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <ScreenWrapper title="Help & Support" subtitle="We're here to help">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>How can we help you?</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Call, WhatsApp or email us — we usually reply within minutes
        </Text>

        {/* Support Contact Card */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Contact Support</Text>

          <TouchableOpacity
            style={[styles.contactRow, { backgroundColor: colors.palette.primary }]}
            onPress={() => Linking.openURL(`tel:${SUPPORT.phones[0].tel}`)}
          >
            <Ionicons name="call-outline" size={20} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>Call Us</Text>
              <Text style={styles.contactSub}>{SUPPORT.phones.map((p) => p.label).join('  •  ')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactRow, { backgroundColor: '#16A34A' }]}
            onPress={() =>
              Linking.openURL(
                `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent('Hi, I need help with the FMCG Mobile app.')}`
              )
            }
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>WhatsApp</Text>
              <Text style={styles.contactSub}>{SUPPORT.phones[0].label}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactRow, { borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => Linking.openURL(`mailto:${SUPPORT.email}?subject=FMCG%20Mobile%20Support`)}
          >
            <Ionicons name="mail-outline" size={20} color={colors.palette.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Email</Text>
              <Text style={[styles.contactSub, { color: colors.textMuted }]}>{SUPPORT.email}</Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Quick help topics */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Quick Help</Text>
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <View key={i}>
                <TouchableOpacity
                  style={styles.faqRow}
                  activeOpacity={0.7}
                  onPress={() => setOpenFaq(open ? null : i)}
                >
                  <Ionicons name={f.icon} size={18} color={colors.palette.primary} />
                  <Text style={[styles.faqQ, { color: colors.text }]}>{f.q}</Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                {open && (
                  <Text style={[styles.faqA, { color: colors.textSecondary }]}>{f.a}</Text>
                )}
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  contactRow: {
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
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  faqQ: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  faqA: {
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 10,
    paddingRight: 26,
  },
});
