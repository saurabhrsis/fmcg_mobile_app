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

export const SalesRegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<{ rows: any[]; summary: any }>({
    rows: [],
    summary: { count: 0, totalSales: 0, totalTax: 0, totalTaxable: 0 },
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!activeBusiness) return;
    try {
      const res = await reportService.getSalesRegister(activeBusiness.id, from, to);
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
      await exportService.exportCsv('Sales_Register' + (from ? `_${from}` : '') + (to ? `_${to}` : ''), [
        {
          title: 'Sales Register',
          subtitle: `${activeBusiness?.name || ''}${from || to ? ` · ${from || 'start'} to ${to || 'today'}` : ''}`,
          headers: ['Invoice No', 'Date', 'Party', 'GSTIN', 'Bill Type', 'Taxable', 'Tax', 'Total', 'Paid', 'Status'],
          rows: data.rows.map((r: any) => [
            r.invoice_no, r.date, r.party_name || 'Walk-in', r.party_gstin || '',
            r.bill_type === 'non_gst' ? 'Non-GST' : r.gst_type === 'nil' ? 'Nil/Exempt' : 'GST',
            r.subtotal, r.tax_total, r.total, r.paid, r.status,
          ]),
          footer: ['TOTAL', '', '', '', '', data.summary.totalTaxable, data.summary.totalTax, data.summary.totalSales, '', ''],
        },
      ]);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  return (
    <ScreenWrapper title="Sales Register" subtitle="Voucher log and tax breakdown">
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
        <Card style={[styles.summaryCard, { backgroundColor: colors.palette.primaryLight }]}>
          <View style={styles.sumRow}>
            <View>
              <Text style={{ fontSize: 11, color: colors.palette.primaryDark, textTransform: 'uppercase' }}>
                Total Invoiced ({data.summary.count} Bills)
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.palette.primaryDark }}>
                {formatCurrency(data.summary.totalSales)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: colors.palette.primaryDark, textTransform: 'uppercase' }}>
                GST Collected
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.palette.primaryDark }}>
                {formatCurrency(data.summary.totalTax)}
              </Text>
            </View>
          </View>
          {data.summary.nonGstCount > 0 ? (
            <Text style={{ fontSize: 11, color: colors.palette.primaryDark, marginTop: 8 }}>
              Includes {data.summary.nonGstCount} non-GST bill{data.summary.nonGstCount === 1 ? '' : 's'} of{' '}
              {formatCurrency(data.summary.nonGstTotal)} (no tax, not part of GSTR-1)
            </Text>
          ) : null}
        </Card>

        {/* List */}
        <FlatList
          data={data.rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
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
                  <Text style={[styles.invNo, { color: colors.palette.primary }]}>{item.invoice_no}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {formatDate(item.date)}
                    {item.bill_type === 'non_gst' ? ' • NON-GST BILL' : item.gst_type === 'nil' ? ' • NIL / EXEMPT' : ''}
                  </Text>
                </View>
                <Text style={[styles.invTotal, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {item.party_name || 'Walk-in Customer'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {item.bill_type === 'non_gst' || item.gst_type === 'nil'
                    ? `Value: ${formatCurrency(item.subtotal)} • GST: not applicable`
                    : `Taxable: ${formatCurrency(item.subtotal)} • GST: ${formatCurrency(item.tax_total)}`}
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
