import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { reportService } from '../../services/reportService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { exportService } from '../../services/exportService';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

export const TraceabilityScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ serials: any[]; batches: any[] }>({
    serials: [],
    batches: [],
  });

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!activeBusiness || !text.trim()) {
      setResults({ serials: [], batches: [] });
      return;
    }
    try {
      const data = await reportService.getTraceabilityReport(activeBusiness.id, text);
      setResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async () => {
    if (results.serials.length === 0 && results.batches.length === 0) {
      Alert.alert('Nothing to Export', 'Run a search first, then export the matched results.');
      return;
    }
    try {
      await exportService.exportCsv(`Traceability_${query.trim() || 'results'}`, [
        {
          title: 'Matched Serials',
          subtitle: `Search: ${query.trim()}`,
          headers: ['Serial No', 'Item', 'SKU', 'Batch', 'Status', 'Purchase Inv', 'Purchase Date', 'Supplier', 'Sale Inv', 'Sale Date', 'Customer'],
          rows: results.serials.map((r: any) => [
            r.serial_no, r.item_name, r.sku || '', r.batch_no || '', r.status || '',
            r.purchase_invoice_no || '', r.purchase_date || '', r.supplier_name || '',
            r.sale_invoice_no || '', r.sale_date || '', r.customer_name || '',
          ]),
        },
        {
          title: 'Matched Batches',
          subtitle: `Search: ${query.trim()}`,
          headers: ['Batch No', 'Item', 'SKU', 'Qty Available', 'Mfg Date', 'Expiry Date', 'Purchase Price', 'MRP'],
          rows: results.batches.map((b: any) => [
            b.batch_no, b.item_name, b.sku || '', b.qty_available, b.mfg_date || '', b.expiry_date || '',
            b.purchase_price, b.mrp || '',
          ]),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  return (
    <ScreenWrapper title="Traceability Audit" subtitle="Audit serials and batches from purchase to sale">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Serial & Batch Traceability</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Trace inward purchase voucher, batch lot, and outward sales voucher
        </Text>

        <SearchBar
          value={query}
          onChangeText={handleSearch}
          placeholder="Scan or type serial no, batch no, product..."
        />

        {(results.serials.length > 0 || results.batches.length > 0) && (
          <Button
            title="Export Results CSV"
            icon="download-outline"
            size="sm"
            variant="outline"
            onPress={handleExport}
            style={{ marginBottom: 12 }}
          />
        )}

        {/* Serials Audit Trail */}
        {results.serials.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Matched Serials ({results.serials.length})
            </Text>

            {results.serials.map((s, idx) => (
              <View
                key={idx}
                style={[
                  styles.traceCard,
                  {
                    borderBottomColor:
                      idx === results.serials.length - 1 ? 'transparent' : colors.border,
                  },
                ]}
              >
                <View style={styles.topRow}>
                  <Text style={[styles.serialNum, { color: colors.palette.primary }]}>
                    S/N: {s.serial_no}
                  </Text>
                  <Badge
                    label={s.status === 'in_stock' ? 'In Stock' : 'Sold'}
                    variant={s.status === 'in_stock' ? 'success' : 'neutral'}
                  />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 }}>
                  {s.item_name} {s.sku ? `(${s.sku})` : ''}
                </Text>

                <View style={[styles.timelineBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.timelineItem}>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>INWARD (PURCHASE)</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      Inv: {s.purchase_invoice_no || 'Opening Stock'}
                    </Text>
                    {s.supplier_name ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>From: {s.supplier_name}</Text>
                    ) : null}
                  </View>

                  <View style={[styles.timelineItem, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }]}>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>OUTWARD (SALE)</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      Inv: {s.sale_invoice_no || 'Not Sold Yet'}
                    </Text>
                    {s.customer_name ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>To: {s.customer_name}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Batches Audit */}
        {results.batches.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Matched Batches ({results.batches.length})
            </Text>

            {results.batches.map((b, idx) => (
              <View
                key={idx}
                style={[
                  styles.traceCard,
                  {
                    borderBottomColor:
                      idx === results.batches.length - 1 ? 'transparent' : colors.border,
                  },
                ]}
              >
                <Text style={[styles.serialNum, { color: colors.palette.accent }]}>
                  Batch Lot: {b.batch_no}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  {b.item_name}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Expiry: {b.expiry_date ? formatDate(b.expiry_date) : 'N/A'} • Available: {b.qty_available} / Received: {b.qty_in}
                </Text>
              </View>
            ))}
          </Card>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  traceCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serialNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineBox: {
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  timelineItem: {
    gap: 2,
  },
});
