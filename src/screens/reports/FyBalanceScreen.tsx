import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { reportService } from '../../services/reportService';
import { FyRange } from '../../utils/fy';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { exportService } from '../../services/exportService';

export const FyBalanceScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [fyList, setFyList] = useState<FyRange[]>([]);
  const [selectedFy, setSelectedFy] = useState<string>('');
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!activeBusiness) return;
      const years = await reportService.getFinancialYearsList(activeBusiness.id);
      setFyList(years);
      if (years.length > 0) {
        setSelectedFy(years[0].label);
      }
    })();
  }, [activeBusiness]);

  useEffect(() => {
    (async () => {
      if (!activeBusiness || !selectedFy) return;
      const data = await reportService.getFyBalanceReport(activeBusiness.id, selectedFy);
      setReport(data);
    })();
  }, [selectedFy, activeBusiness]);


  const handleExport = async () => {
    if (!report) return;
    try {
      await exportService.exportCsv(`FY_Balance_${report.fy}`, [
        {
          title: `Financial Year Statement (FY ${report.fy})`,
          subtitle: `${activeBusiness?.name || ''} · ${report.from} to ${report.to}`,
          headers: ['Metric', 'Amount'],
          rows: [
            ['Total Sales', report.sales],
            ['Total Purchases', report.purchases],
            ['Receipts (Money In)', report.receipts],
            ['Payments (Money Out)', report.paidOut],
            ['Current Stock Value', report.stockValue],
            ['Gross Profit (Sales - Purchases)', report.grossProfit],
          ],
        },
      ]);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Financial Year Statement</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Annual turnover, collections, vendor payouts & gross margin
        </Text>

        {/* Year Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fyBar}>
          {fyList.map((y) => (
            <TouchableOpacity
              key={y.label}
              style={[
                styles.fyChip,
                {
                  backgroundColor:
                    selectedFy === y.label ? colors.palette.primary : colors.surfaceSubtle,
                },
              ]}
              onPress={() => setSelectedFy(y.label)}
            >
              <Text
                style={[
                  styles.fyText,
                  { color: selectedFy === y.label ? '#ffffff' : colors.text },
                ]}
              >
                FY {y.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {report && (
          <>
            <Button
              title={`Export FY ${report.fy} CSV`}
              icon="download-outline"
              size="sm"
              variant="outline"
              onPress={handleExport}
              style={{ marginBottom: 12 }}
            />
            {/* Turnover & Gross Margin Highlights */}
            <Card style={[styles.highlightCard, { backgroundColor: colors.palette.primaryLight }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.palette.primaryDark, textTransform: 'uppercase' }}>
                Total Revenue / Sales ({report.fy})
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.palette.primaryDark, marginTop: 4 }}>
                {formatCurrency(report.sales)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.palette.primaryDark, marginTop: 2 }}>
                Period: {formatDate(report.from)} to {formatDate(report.to)}
              </Text>
            </Card>

            {/* Financial Grid */}
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Annual Balance Sheet</Text>

              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Total Sales Turnover</Text>
                <Text style={{ fontWeight: '700', color: colors.palette.success }}>
                  +{formatCurrency(report.sales)}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Total Inventory Purchases</Text>
                <Text style={{ fontWeight: '700', color: colors.palette.danger }}>
                  -{formatCurrency(report.purchases)}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Gross Trading Margin</Text>
                <Text
                  style={{
                    fontWeight: '800',
                    color: report.grossProfit >= 0 ? colors.palette.primary : colors.palette.danger,
                  }}
                >
                  {formatCurrency(report.grossProfit)}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Cash & Bank Collections (In)</Text>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  {formatCurrency(report.receipts)}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Supplier Disbursements (Out)</Text>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  {formatCurrency(report.paidOut)}
                </Text>
              </View>

              <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
                <Text style={{ color: colors.text }}>Current Closing Stock Valuation</Text>
                <Text style={{ fontWeight: '700', color: colors.palette.accent }}>
                  {formatCurrency(report.stockValue)}
                </Text>
              </View>
            </Card>
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
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  fyBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  fyChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  fyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  highlightCard: {
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
