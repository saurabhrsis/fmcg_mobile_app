import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { exportService } from '../../services/exportService';
import { Ionicons } from '@expo/vector-icons';

export const ReportsHomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const [exporting, setExporting] = useState(false);

  const handleExportAll = async () => {
    if (!activeBusiness) return;
    setExporting(true);
    try {
      await exportService.exportAllReports(activeBusiness);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  const reportSections = [
    {
      title: 'Sales Register',
      desc: 'Complete sale voucher log, party-wise breakdowns, tax analysis',
      icon: 'receipt-outline' as const,
      color: colors.palette.primary,
      screen: 'SalesRegister',
    },
    {
      title: 'Purchase Register',
      desc: 'Vendor bills, inward inventory cost analysis, input tax credit',
      icon: 'basket-outline' as const,
      color: colors.palette.warning,
      screen: 'PurchaseRegister',
    },
    {
      title: 'GST Returns & GSTR-1',
      desc: 'B2B, B2CL, B2CS, CDNR tables & GST Portal offline JSON export',
      icon: 'document-text-outline' as const,
      color: colors.palette.success,
      screen: 'GstReport',
    },
    {
      title: 'Table 12 HSN Summary',
      desc: 'HSN/SAC wise quantities, taxable value, CGST/SGST/IGST totals',
      icon: 'grid-outline' as const,
      color: colors.palette.accent,
      screen: 'HsnSummary',
    },
    {
      title: 'Outstanding & Aging',
      desc: 'Customer receivables & vendor payables balances with WhatsApp reminder',
      icon: 'wallet-outline' as const,
      color: colors.palette.danger,
      screen: 'OutstandingReport',
    },
    {
      title: 'Financial Year Balance',
      desc: 'FY comparison, annual turnover, net margin, auto-rollover tracking',
      icon: 'calendar-outline' as const,
      color: colors.palette.primary,
      screen: 'FyBalance',
    },
    {
      title: 'Serial & Batch Traceability',
      desc: 'Audit trail of physical serial numbers & batch lots across sales/purchases',
      icon: 'search-outline' as const,
      color: colors.palette.accent,
      screen: 'Traceability',
    },
  ];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Reports & GST Intelligence</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Tax compliance, audit registers, stock valuation & financial statements
        </Text>

        <Button
          title="Export All Reports (PDF Pack)"
          icon="download-outline"
          onPress={handleExportAll}
          loading={exporting}
          style={{ marginBottom: 14 }}
        />
        <Text style={{ fontSize: 10.5, color: colors.textMuted, marginTop: -8, marginBottom: 12 }}>
          One PDF with FY summary, sales & purchase registers, outstanding lists and HSN summary.
          Each report below also has its own CSV export.
        </Text>

        <View style={styles.grid}>
          {reportSections.map((r, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={[
                styles.reportCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate(r.screen)}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${r.color}15` }]}>
                <Ionicons name={r.icon} size={24} color={r.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reportTitle, { color: colors.text }]}>{r.title}</Text>
                <Text style={[styles.reportDesc, { color: colors.textMuted }]}>{r.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
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
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  grid: {
    gap: 10,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reportDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
});
