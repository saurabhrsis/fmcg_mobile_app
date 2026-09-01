import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { serialService } from '../../services/serialService';
import { SerialItem } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { SearchBar } from '../../components/common/SearchBar';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const SerialLookupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'sold'>('all');
  const [search, setSearch] = useState('');
  const [serials, setSerials] = useState<SerialItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, in_stock: 0, sold: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadSerials = async () => {
    if (!activeBusiness) return;
    try {
      const res = await serialService.getAllSerials(activeBusiness.id, {
        status: statusFilter,
        query: search,
      });
      setSerials(res.rows);
      setSummary(res.summary);
    } catch (e) {
      console.error('Failed to load serials:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSerials();
    }, [activeBusiness, statusFilter, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSerials();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Summary Counter Bar */}
        <View style={styles.statBar}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{summary.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Tracked</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.statNum, { color: '#15803d' }]}>{summary.in_stock}</Text>
            <Text style={[styles.statLabel, { color: '#15803d' }]}>In Stock</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#f1f5f9' }]}>
            <Text style={[styles.statNum, { color: '#475569' }]}>{summary.sold}</Text>
            <Text style={[styles.statLabel, { color: '#475569' }]}>Sold</Text>
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterBar}>
          {[
            { key: 'all', label: 'All Serials' },
            { key: 'in_stock', label: 'In Stock' },
            { key: 'sold', label: 'Sold Out' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    statusFilter === f.key ? colors.palette.primary : colors.surfaceSubtle,
                },
              ]}
              onPress={() => setStatusFilter(f.key as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === f.key ? '#ffffff' : colors.text },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search serial no, product name, SKU..."
            style={{ marginBottom: 0 }}
          />
        </View>

        {/* Serials List */}
        <FlatList
          data={serials}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="barcode-outline"
              title="No Serials Found"
              description="Purchase items with serial tracking enabled to populate serial registry"
            />
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serialNo, { color: colors.palette.primary }]}>
                    S/N: {item.serial_no}
                  </Text>
                  <Text style={[styles.itemName, { color: colors.text }]}>
                    {item.item_name} {item.sku ? `(${item.sku})` : ''}
                  </Text>
                </View>
                <Badge
                  label={item.status === 'in_stock' ? 'In Stock' : 'Sold'}
                  variant={item.status === 'in_stock' ? 'success' : 'neutral'}
                />
              </View>

              <View style={[styles.traceBox, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.traceItem}>
                  <Text style={[styles.traceLabel, { color: colors.textMuted }]}>Purchased In:</Text>
                  <Text style={[styles.traceVal, { color: colors.text }]}>
                    {item.purchase_invoice_no || 'Opening Stock / Manual'}
                  </Text>
                </View>
                <View style={styles.traceItem}>
                  <Text style={[styles.traceLabel, { color: colors.textMuted }]}>Sold In:</Text>
                  <Text style={[styles.traceVal, { color: item.sale_invoice_no ? colors.text : colors.textMuted }]}>
                    {item.sale_invoice_no || 'Not Sold Yet'}
                  </Text>
                </View>
              </View>

              {item.batch_no ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  Batch Lot: {item.batch_no}
                </Text>
              ) : null}
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
  statBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serialNo: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  traceBox: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
    gap: 4,
  },
  traceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  traceLabel: {
    fontSize: 11,
  },
  traceVal: {
    fontSize: 12,
    fontWeight: '700',
  },
});
