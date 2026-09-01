import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { itemService } from '../../services/itemService';
import { batchService } from '../../services/batchService';
import { Item, Batch } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

export const ItemDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const itemId = route.params?.id;

  const [item, setItem] = useState<Item | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activeBusiness || !itemId) return;
    try {
      const [it, bList] = await Promise.all([
        itemService.getItemById(itemId, activeBusiness.id),
        batchService.getBatchesForItem(itemId, activeBusiness.id),
      ]);
      setItem(it);
      setBatches(bList);
    } catch (e) {
      console.error('Failed to load item detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [itemId, activeBusiness]);

  const handleDelete = () => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${item?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (item) {
            await itemService.deleteItem(item.id);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Product Overview Card */}
        <Card>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{item?.name}</Text>
              <Text style={[styles.skuText, { color: colors.textMuted }]}>
                SKU: {item?.sku || 'N/A'} {item?.brand ? `• Brand: ${item.brand}` : ''}
              </Text>
            </View>
            <Badge
              label={item?.stock && item.stock > 0 ? 'In Stock' : 'Out of Stock'}
              variant={item?.stock && item.stock > 0 ? 'success' : 'danger'}
            />
          </View>

          {/* Aggregated Stock Display */}
          <View style={[styles.stockBox, { backgroundColor: colors.palette.primaryLight }]}>
            <View>
              <Text style={[styles.stockLabel, { color: colors.palette.primaryDark }]}>
                Total Stock Available
              </Text>
              <Text style={[styles.stockValue, { color: colors.palette.primaryDark }]}>
                {item?.stock_label || `${item?.stock || 0} ${item?.unit}`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.stockLabel, { color: colors.palette.primaryDark }]}>
                Moving Avg Cost
              </Text>
              <Text style={[styles.stockValue, { color: colors.palette.primaryDark }]}>
                {formatCurrency(item?.avg_cost || item?.purchase_price)}
              </Text>
            </View>
          </View>

          <View style={styles.grid2}>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Sale Price</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{formatCurrency(item?.sale_price)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Purchase Price</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{formatCurrency(item?.purchase_price)}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>GST Rate</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{item?.gst_rate}%</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>HSN Code</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{item?.hsn || '-'}</Text>
            </View>
          </View>
        </Card>

        {/* Packaging Ladder Engine Table */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Packaging Ladder (Multi-Units)</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            Conversion factors & unit-specific barcodes / prices
          </Text>

          {(item?.units || []).map((u, idx) => (
            <View
              key={idx}
              style={[
                styles.unitRow,
                { borderBottomColor: idx === (item?.units?.length || 0) - 1 ? 'transparent' : colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.unitName, { color: colors.text }]}>{u.unit_name}</Text>
                  {u.is_base === 1 && <Badge label="Base Unit" variant="primary" />}
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  1 {u.unit_name} = {u.factor} {item?.base_unit || 'base units'}
                  {u.barcode ? ` • Barcode: ${u.barcode}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  {formatCurrency(u.sale_price)}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>
                  Cost: {formatCurrency(u.purchase_price)}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Batches Overview */}
        <Card>
          <View style={styles.batchHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Batches in Stock ({batches.length})</Text>
            <Button
              title="+ New Batch"
              size="sm"
              variant="outline"
              onPress={() => navigation.navigate('BatchStock')}
            />
          </View>

          {batches.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontStyle: 'italic', paddingVertical: 8 }}>
              No active batches in stock
            </Text>
          ) : (
            batches.map((b, idx) => (
              <View
                key={idx}
                style={[
                  styles.batchRow,
                  { borderBottomColor: idx === batches.length - 1 ? 'transparent' : colors.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.batchNo, { color: colors.text }]}>Batch: {b.batch_no}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Exp: {b.expiry_date ? formatDate(b.expiry_date) : 'No Expiry'} • Cost: {formatCurrency(b.purchase_price)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.palette.primary }}>
                    {b.qty_available} {item?.base_unit}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>
                    Sold: {b.qty_sold || 0}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Button
            title="Edit Item Master"
            icon="create-outline"
            onPress={() => navigation.navigate('ItemForm', { id: item?.id })}
            style={{ flex: 1 }}
          />
          <Button
            title="Delete"
            variant="danger"
            icon="trash-outline"
            onPress={handleDelete}
            style={{ width: 100 }}
          />
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  skuText: {
    fontSize: 12,
    marginTop: 2,
  },
  stockBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  stockLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCol: {
    width: '46%',
  },
  metaLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 11,
    marginBottom: 8,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unitName: {
    fontSize: 14,
    fontWeight: '700',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  batchNo: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
