import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const SupportScreen: React.FC = () => {
  const { colors } = useTheme();

  return (
    <ScreenWrapper title="Help & Support" subtitle="Product info & customer service">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Help & System License</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Product info, license & developer support
        </Text>

        {/* License Status Card */}
        <Card>
          <View style={styles.licTop}>
            <View>
              <Text style={[styles.licTitle, { color: colors.text }]}>RightServe FMCG Mobile Edition</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Version 1.0.0 (Expo 54 Offline SQLite)</Text>
            </View>
            <Badge label="Active Perpetual" variant="success" />
          </View>

          <View style={[styles.licInfoBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={{ fontSize: 12, color: colors.text }}>
              Developed by: <Text style={{ fontWeight: '700' }}>RightServe Infotech System & LivePro Solutions</Text>
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              Offline-first ERP with complete parity to the Desktop Edition.
            </Text>
          </View>
        </Card>

        {/* Support Contact Card */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Developer & Customer Support</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
            Have questions or need assistance with custom deployment?
          </Text>

          <View style={{ gap: 8 }}>
            <Button
              title="Email: rightserveinfotechsystems@gmail.com"
              icon="mail-outline"
              variant="secondary"
              onPress={() => Linking.openURL('mailto:rightserveinfotechsystems@gmail.com')}
            />
            <Button
              title="Call: +91 86693 08888 / +91 94044 84560"
              icon="call-outline"
              variant="outline"
              onPress={() => Linking.openURL('tel:+918669308888')}
            />
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
  licTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  licTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  licInfoBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
});
