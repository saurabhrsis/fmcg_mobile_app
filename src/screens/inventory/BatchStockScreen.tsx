import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { batchService } from '../../services/batchService';
import { itemService } from '../../services/itemService';
import { Batch, Item } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { SearchBar } from '../../components/common/SearchBar';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const BatchStockScreen: React.FC = () => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [filter, setFilter] = useState<'all' | 'available' | 'expiring' | 'expired'>('available');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [batchNo, setBatchNo] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [mrp, setMrp] = useState('0');
  const [qty, setQty] = useState('10');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!activeBusiness) return;
    try {
      const [bList, iList] = await Promise.all([
        batchService.getAllBatches(activeBusiness.id, filter, search),
        itemService.getAllItems(activeBusiness.id),
      ]);
      setBatches(bList);
      setItems(iList);
    } catch (e) {
      console.error('Failed to load batches:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeBusiness, filter, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenAdd = () => {
    setEditingBatch(null);
    setSelectedItemId(items[0]?.id || null);
    setBatchNo(`B-${Date.now().toString().slice(-4)}`);
    setMfgDate(new Date().toISOString().slice(0, 10));
    setExpiryDate('');
    setPurchasePrice(String(items[0]?.purchase_price || 0));
    setMrp(String(items[0]?.sale_price || 0));
    setQty('10');
    setModalVisible(true);
  };

  const handleOpenEdit = (b: Batch) => {
    setEditingBatch(b);
    setSelectedItemId(b.item_id);
    setBatchNo(b.batch_no);
    setMfgDate(b.mfg_date);
    setExpiryDate(b.expiry_date);
    setPurchasePrice(String(b.purchase_price));
    setMrp(String(b.mrp));
    setQty(String(b.qty_available));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!batchNo.trim() || !selectedItemId) {
      Alert.alert('Validation Error', 'Item and Batch number are required');
      return;
    }
    setLoading(true);
    try {
      if (editingBatch) {
        await batchService.updateBatch(editingBatch.id, {
          batch_no: batchNo,
          mfg_date: mfgDate,
          expiry_date: expiryDate,
          purchase_price: parseFloat(purchasePrice) || 0,
          mrp: parseFloat(mrp) || 0,
          qty_available: parseFloat(qty) || 0,
        });
      } else {
        await batchService.createBatch(activeBusiness!.id, {
          item_id: selectedItemId,
          batch_no: batchNo,
          mfg_date: mfgDate,
          expiry_date: expiryDate,
          purchase_price: parseFloat(purchasePrice) || 0,
          mrp: parseFloat(mrp) || 0,
          qty_available: parseFloat(qty) || 0,
        });
      }
      setModalVisible(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (b: Batch) => {
    Alert.alert('Delete Batch', `Delete batch "${b.batch_no}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await batchService.deleteBatch(b.id);
          await loadData();
        },
      },
    ]);
  };

  const isExpired = (exp: string) => {
    if (!exp) return false;
    return new Date(exp) < new Date();
  };

  const isExpiringSoon = (exp: string) => {
    if (!exp) return false;
    const diffDays = (new Date(exp).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 30;
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Filters */}
        <View style={styles.filterBar}>
          {[
            { key: 'available', label: 'In Stock' },
            { key: 'expiring', label: 'Expiring 30D' },
            { key: 'expired', label: 'Expired' },
            { key: 'all', label: 'All Batches' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filter === f.key ? colors.palette.primary : colors.surfaceSubtle,
                },
              ]}
              onPress={() => setFilter(f.key as any)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f.key ? '#ffffff' : colors.text },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search & Add */}
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by batch no, item name..."
            style={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.palette.primary }]}
            onPress={handleOpenAdd}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Batches List */}
        <FlatList
          data={batches}
          keyExtractor={(b) => String(b.id)}
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
              icon="time-outline"
              title="No Batches Found"
              description="Create a new batch or purchase stock to add lots"
              actionTitle="+ Add Batch"
              onAction={handleOpenAdd}
            />
          }
          renderItem={({ item }) => {
            const exp = isExpired(item.expiry_date);
            const expSoon = isExpiringSoon(item.expiry_date);

            return (
              <Card>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.item_name}</Text>
                    <Text style={[styles.batchNo, { color: colors.palette.primary }]}>
                      Batch: {item.batch_no}
                    </Text>
                  </View>
                  {exp ? (
                    <Badge label="Expired" variant="danger" />
                  ) : expSoon ? (
                    <Badge label="Expiring Soon" variant="warning" />
                  ) : (
                    <Badge label={item.qty_available > 0 ? 'Active' : 'Sold Out'} variant={item.qty_available > 0 ? 'success' : 'neutral'} />
                  )}
                </View>

                <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Available Qty</Text>
                    <Text style={[styles.metaVal, { color: colors.palette.primary }]}>
                      {item.qty_available} {item.unit}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Cost / Unit</Text>
                    <Text style={[styles.metaVal, { color: colors.text }]}>
                      {formatCurrency(item.purchase_price)}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Expiry Date</Text>
                    <Text
                      style={[
                        styles.metaVal,
                        { color: exp ? colors.palette.danger : expSoon ? '#b45309' : colors.text },
                      ]}
                    >
                      {item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Received: {item.qty_in} • Sold: {item.qty_sold || 0}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => handleOpenEdit(item)}>
                      <Ionicons name="pencil" size={18} color={colors.palette.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={18} color={colors.palette.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          }}
        />

        {/* Create / Edit Batch Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingBatch ? 'Edit Batch Stock' : 'Add New Batch Stock'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {!editingBatch && (
                  <Select
                    label="Select Item *"
                    value={selectedItemId}
                    onChange={(val) => {
                      setSelectedItemId(val);
                      const it = items.find((x) => x.id === val);
                      if (it) {
                        setPurchasePrice(String(it.purchase_price));
                        setMrp(String(it.sale_price));
                      }
                    }}
                    options={items.map((it) => ({ label: it.name, value: it.id }))}
                  />
                )}

                <Input
                  label="Batch Number *"
                  value={batchNo}
                  onChangeText={setBatchNo}
                  placeholder="e.g. B-101"
                />

                <View style={styles.grid2}>
                  <Input
                    label="Mfg Date (YYYY-MM-DD)"
                    value={mfgDate}
                    onChangeText={setMfgDate}
                    placeholder="2026-01-01"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Expiry Date (YYYY-MM-DD)"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    placeholder="2026-12-31"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <View style={styles.grid3}>
                  <Input
                    label="Stock Qty"
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Cost Price"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="MRP"
                    value={mrp}
                    onChangeText={setMrp}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <Button
                  title={editingBatch ? 'Save Changes' : 'Create Batch'}
                  onPress={handleSave}
                  loading={loading}
                  style={{ marginTop: 12 }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  batchNo: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  metaCol: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
});
