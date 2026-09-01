import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { reportService } from '../../services/reportService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { DatePickerField } from '../../components/common/DatePickerField';
import { Button } from '../../components/common/Button';
import { exportService } from '../../services/exportService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const PurchaseRegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<{ rows: any[]; summary: any }>({
    rows: [],
    summary: { count: 0, totalPurchase: 0, totalTax: 0, totalTaxable: 0 },
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!activeBusiness) return;
    try {
      const res = await reportService.getPurchaseRegister(activeBusiness.id, from, to);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness, from, to]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };


  const handleExport = async () => {
    try {
      await exportService.exportCsv('Purchase_Register' + (from ? `_${from}` : '') + (to ? `_${to}` : ''), [
        {
          title: 'Purchase Register',
          subtitle: `${activeBusiness?.name || ''}${from || to ? ` · ${from || 'start'} to ${to || 'today'}` : ''}`,
          headers: ['Invoice No', 'Date', 'Party', 'GSTIN', 'Taxable', 'Tax', 'Total', 'Paid', 'Status'],
          rows: data.rows.map((r: any) => [
            r.invoice_no, r.date, r.party_name || 'Cash', r.party_gstin || '',
            r.subtotal, r.tax_total, r.total, r.paid, r.status,
          ]),
          footer: ['TOTAL', '', '', '', data.summary.totalTaxable, data.summary.totalTax, data.summary.totalPurchase, '', ''],
        },
      ]);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Date Filter Card */}
        <Card style={styles.filterCard}>
          <View style={styles.grid2}>
            <DatePickerField
              label="From Date"
              value={from}
              onChange={setFrom}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <DatePickerField
              label="To Date"
              value={to}
              onChange={setTo}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
          </View>
          <Button
            title="Export CSV"
            icon="download-outline"
            size="sm"
            variant="outline"
            onPress={handleExport}
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* Summary Card */}
        <Card style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
          <View style={styles.sumRow}>
            <View>
              <Text style={{ fontSize: 11, color: '#b45309', textTransform: 'uppercase' }}>
                Total Purchases ({data.summary.count} Bills)
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#b45309' }}>
                {formatCurrency(data.summary.totalPurchase)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: '#b45309', textTransform: 'uppercase' }}>
                Input Tax Credit (ITC)
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#b45309' }}>
                {formatCurrency(data.summary.totalTax)}
              </Text>
            </View>
          </View>
        </Card>

        {/* List */}
        <FlatList
          data={data.rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View>
                  <Text style={[styles.invNo, { color: colors.palette.warning }]}>{item.invoice_no}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.invTotal, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {item.party_name || 'Vendor'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Taxable: {formatCurrency(item.subtotal)} • ITC: {formatCurrency(item.tax_total)}
                </Text>
              </View>
            </Card>
          )}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 14,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCard: {
    padding: 12,
    marginBottom: 8,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invNo: {
    fontSize: 14,
    fontWeight: '700',
  },
  invTotal: {
    fontSize: 15,
    fontWeight: '800',
  },
});
