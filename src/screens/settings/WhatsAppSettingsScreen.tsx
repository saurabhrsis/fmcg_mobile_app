import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { whatsappService } from '../../services/whatsappService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Ionicons } from '@expo/vector-icons';

export const WhatsAppSettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [testPhone, setTestPhone] = useState('9876543210');

  const handleTestWhatsApp = async () => {
    if (!activeBusiness) return;
    const msg = `*RightServe FMCG WhatsApp Integration Test*\n\nHello from ${activeBusiness.name}!\nYour billing and invoice sharing is active and working.`;
    const ok = await whatsappService.sendWhatsApp(testPhone, msg);
    if (!ok) {
      Alert.alert('Error', 'Could not launch WhatsApp');
    }
  };

  return (
    <ScreenWrapper title="WhatsApp Integration" subtitle="Instant bill sharing & payment reminders">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>WhatsApp Sharing & Alerts</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Direct deep-link integration with WhatsApp Web and Mobile Apps
        </Text>

        <Card>
          <View style={styles.headerBox}>
            <Ionicons name="logo-whatsapp" size={32} color="#16a34a" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Instant Bill Sharing</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                No external API or monthly cost needed — sends bills directly via customer phone
              </Text>
            </View>
          </View>

          <Input
            label="Test Mobile Number"
            value={testPhone}
            onChangeText={setTestPhone}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            containerStyle={{ marginTop: 12 }}
          />

          <Button
            title="Send Test WhatsApp Message"
            variant="success"
            icon="logo-whatsapp"
            onPress={handleTestWhatsApp}
            style={{ marginTop: 4 }}
          />
        </Card>

        {/* Feature Highlights */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>
            Automated WhatsApp Formats
          </Text>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color={colors.palette.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Tax Invoice Summary:</Text> Sends item breakdown, total, paid, balance, bank details & UPI ID.
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color={colors.palette.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Payment Receipt:</Text> Acknowledges money received with receipt number and updated ledger balance.
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color={colors.palette.primary} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Outstanding Reminder:</Text> Polite reminder with total due balance and payment UPI ID.
            </Text>
          </View>
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
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
