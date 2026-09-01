import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { reportService } from '../../services/reportService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
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

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Date Filter Card */}
        <Card style={styles.filterCard}>
          <View style={styles.grid2}>
            <Input
              label="From Date"
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Input
              label="To Date"
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
          </View>
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
                  <Text style={[styles.invNo, { color: colors.palette.primary }]}>{item.invoice_no}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.invTotal, { color: colors.text }]}>{formatCurrency(item.total)}</Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {item.party_name || 'Cash Customer'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Taxable: {formatCurrency(item.subtotal)} • GST: {formatCurrency(item.tax_total)}
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
