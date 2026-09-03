import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { gstr1Service } from '../../services/gstr1Service';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/formatters';

export const GstReportScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [summary, setSummary] = useState<any>(null);

  const loadReport = async () => {
    if (!activeBusiness) return;
    try {
      const data = await gstr1Service.generateGstr1Summary(activeBusiness.id, period);
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeBusiness, period]);

  const handleExportGstr1Json = async () => {
    if (!activeBusiness) return;
    try {
      const payload = await gstr1Service.generateGstr1Json(activeBusiness.id, period);
      const jsonStr = JSON.stringify(payload, null, 2);

      const fileUri = `${FileSystem.documentDirectory}GSTR1_${period}_${activeBusiness.gstin || 'GST'}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `GSTR-1 JSON (${period})`,
        });
      } else {
        Alert.alert('Exported', 'Saved to app files');
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message);
    }
  };

  return (
    <ScreenWrapper title="GST & GSTR-1" subtitle="Return periods & GST portal JSON">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>GST Returns & GSTR-1</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Period breakdown & GST Portal JSON generator
            </Text>
          </View>
        </View>

        {/* Period Selector Card */}
        <Card>
          <Input
            label="Return Period (YYYY-MM)"
            value={period}
            onChangeText={setPeriod}
            placeholder="2026-09"
          />
          <Button
            title="Download GSTR-1 Portal JSON"
            icon="download-outline"
            onPress={handleExportGstr1Json}
            style={{ marginTop: 6 }}
          />
        </Card>

        {/* Section Cards */}
        {summary && (
          <>
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>GSTR-1 Section Summary</Text>

              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>B2B (Registered Invoices)</Text>
                <Text style={[styles.countBadge, { color: colors.palette.primary }]}>
                  {summary.counts.b2b} Invoices
                </Text>
              </View>

              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>B2CL (Large Interstate Unregistered)</Text>
                <Text style={[styles.countBadge, { color: colors.palette.primary }]}>
                  {summary.counts.b2cl} Invoices
                </Text>
              </View>

              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>B2CS (Small Consumer Sales)</Text>
                <Text style={[styles.countBadge, { color: colors.palette.primary }]}>
                  {summary.counts.b2cs} Invoices
                </Text>
              </View>

              <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>CDNR (Credit/Debit Notes Registered)</Text>
                <Text style={[styles.countBadge, { color: colors.palette.primary }]}>
                  {summary.counts.cdnr} Notes
                </Text>
              </View>

              <View style={[styles.tableRow, { borderBottomColor: 'transparent' }]}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>CDNUR (Credit/Debit Notes Unregistered)</Text>
                <Text style={[styles.countBadge, { color: colors.palette.primary }]}>
                  {summary.counts.cdnur} Notes
                </Text>
              </View>
            </Card>

            {/* Non-GST bills are outside the return */}
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Outside GSTR-1</Text>
              <View style={[styles.tableRow, { borderBottomColor: 'transparent' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    Non-GST Bills / Nil-rated Supplies
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Bills of supply carry no tax, so they are excluded from every GSTR-1 table and
                    from the portal JSON.
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.countBadge, { color: colors.palette.warning }]}>
                    {summary.counts.nonGst || 0} Bills
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {formatCurrency(summary.nilTotal || 0)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* B2B Invoices Detail List */}
            {summary.b2b.length > 0 && (
              <Card>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
                  B2B Tax Invoices ({summary.b2b.length})
                </Text>
                {summary.b2b.map((inv: any, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.b2bRow,
                      { borderBottomColor: idx === summary.b2b.length - 1 ? 'transparent' : colors.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.invNo, { color: colors.palette.primary }]}>{inv.invoice_no}</Text>
                      <Text style={{ fontSize: 11, color: colors.text }}>{inv.party_name} ({inv.party_gstin})</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                        {formatCurrency(inv.total)}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Tax: {formatCurrency(inv.tax_total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  headerRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  b2bRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  invNo: {
    fontSize: 13,
    fontWeight: '700',
  },
});
