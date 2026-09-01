import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { reportService } from '../../services/reportService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { formatCurrency } from '../../utils/formatters';

export const HsnSummaryScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!activeBusiness) return;
    try {
      const list = await reportService.getHsnSummary(activeBusiness.id, from, to);
      setRows(list);
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

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  rows.forEach((r) => {
    totalTaxable += r.total_taxable;
    totalCgst += r.cgst;
    totalSgst += r.sgst;
    totalIgst += r.igst;
  });

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

        {/* Totals Banner */}
        <Card style={[styles.banner, { backgroundColor: colors.palette.primaryLight }]}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={{ fontSize: 10, color: colors.palette.primaryDark, textTransform: 'uppercase' }}>
                Total Taxable
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.palette.primaryDark }}>
                {formatCurrency(totalTaxable)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.palette.primaryDark, textTransform: 'uppercase' }}>
                CGST + SGST
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.palette.primaryDark }}>
                {formatCurrency(totalCgst + totalSgst)}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.palette.primaryDark, textTransform: 'uppercase' }}>
                IGST
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.palette.primaryDark }}>
                {formatCurrency(totalIgst)}
              </Text>
            </View>
          </View>
        </Card>

        {/* HSN Table */}
        <FlatList
          data={rows}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.primary]}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.hsnCard}>
              <View style={styles.hsnTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hsnTitle, { color: colors.palette.primary }]}>
                    HSN: {item.hsn}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                  {item.total_qty} {item.uqc}
                </Text>
              </View>

              <View style={[styles.hsnGrid, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.hsnCol}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Taxable</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    {formatCurrency(item.total_taxable)}
                  </Text>
                </View>
                <View style={styles.hsnCol}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Rate</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                    {item.gst_rate}%
                  </Text>
                </View>
                <View style={styles.hsnCol}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>CGST</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                    {formatCurrency(item.cgst)}
                  </Text>
                </View>
                <View style={styles.hsnCol}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>SGST</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                    {formatCurrency(item.sgst)}
                  </Text>
                </View>
                {item.igst > 0 && (
                  <View style={styles.hsnCol}>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>IGST</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {formatCurrency(item.igst)}
                    </Text>
                  </View>
                )}
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
  banner: {
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 12,
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hsnCard: {
    padding: 12,
    marginBottom: 8,
  },
  hsnTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  hsnTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  hsnGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  hsnCol: {
    alignItems: 'center',
  },
});
