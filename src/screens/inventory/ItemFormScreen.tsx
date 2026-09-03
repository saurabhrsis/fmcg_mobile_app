import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';
import { useBusiness } from '../../context/BusinessContext';
import { itemService } from '../../services/itemService';
import { lookupService } from '../../services/lookupService';
import { Item, Category, ItemUnit, HsnEntry } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Ionicons } from '@expo/vector-icons';

export const ItemFormScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { ensureWritable } = useLicense();
  const { activeBusiness } = useBusiness();
  const editId = route.params?.id;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hsn, setHsn] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [mrp, setMrp] = useState('0');
  const [lowStockAlert, setLowStockAlert] = useState('10');
  const [trackSerials, setTrackSerials] = useState(false);
  const [baseUnit, setBaseUnit] = useState('PCS');
  const [openingStock, setOpeningStock] = useState('0');

  // Packaging ladder units
  const [unitLadder, setUnitLadder] = useState<Partial<ItemUnit>[]>([
    { unit_name: 'Piece', factor: 1, is_base: 1, purchase_price: 0, sale_price: 0, barcode: '' },
  ]);

  // HSN Lookup Modal
  const [hsnModal, setHsnModal] = useState(false);
  const [hsnSearch, setHsnSearch] = useState('');
  const [hsnResults, setHsnResults] = useState<HsnEntry[]>([]);

  // Add unit modal
  const [unitModal, setUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitFactor, setNewUnitFactor] = useState('12');
  const [newUnitPurchasePrice, setNewUnitPurchasePrice] = useState('0');
  const [newUnitSalePrice, setNewUnitSalePrice] = useState('0');
  const [newUnitBarcode, setNewUnitBarcode] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const cats = await itemService.getAllCategories();
      setCategories(cats);

      if (editId && activeBusiness) {
        const it = await itemService.getItemById(editId, activeBusiness.id);
        if (it) {
          setName(it.name);
          setSku(it.sku);
          setBrand(it.brand || '');
          setCategoryId(it.category_id);
          setHsn(it.hsn);
          setGstRate(String(it.gst_rate));
          setPurchasePrice(String(it.purchase_price));
          setSalePrice(String(it.sale_price));
          setMrp(String(it.mrp || 0));
          setLowStockAlert(String(it.low_stock_alert));
          setTrackSerials(!!it.track_serials);
          setBaseUnit(it.base_unit || it.unit || 'PCS');

          if (it.units && it.units.length > 0) {
            setUnitLadder(it.units);
          }
        }
      }
    })();
  }, [editId, activeBusiness]);

  const handleSearchHsn = (text: string) => {
    setHsnSearch(text);
    const results = lookupService.searchHsn(text);
    setHsnResults(results);
  };

  const handleSelectHsn = (entry: HsnEntry) => {
    setHsn(entry.hsn);
    setGstRate(String(entry.gst));
    setHsnModal(false);
  };

  const handleAddUnitLevel = () => {
    if (!newUnitName.trim() || Number(newUnitFactor) <= 1) {
      Alert.alert('Invalid Unit', 'Please specify unit name and factor greater than 1');
      return;
    }

    const newUnit: Partial<ItemUnit> = {
      unit_name: newUnitName.trim(),
      factor: parseFloat(newUnitFactor) || 1,
      is_base: 0,
      purchase_price: parseFloat(newUnitPurchasePrice) || (parseFloat(purchasePrice) * parseFloat(newUnitFactor)),
      sale_price: parseFloat(newUnitSalePrice) || (parseFloat(salePrice) * parseFloat(newUnitFactor)),
      barcode: newUnitBarcode.trim(),
    };

    setUnitLadder([...unitLadder, newUnit]);
    setNewUnitName('');
    setNewUnitFactor('12');
    setNewUnitPurchasePrice('0');
    setNewUnitSalePrice('0');
    setNewUnitBarcode('');
    setUnitModal(false);
  };

  const handleRemoveUnit = (index: number) => {
    if (unitLadder[index].is_base === 1) {
      Alert.alert('Base Unit', 'Cannot remove the base unit');
      return;
    }
    setUnitLadder(unitLadder.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Licensing gate: trial expired / license expired => read-only mode.
    const gate = ensureWritable();
    if (!gate.allowed) {
      Alert.alert('Read-Only Mode', gate.reason || 'Your license is not active.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Product Name is required');
      return;
    }

    setLoading(true);
    try {
      const pp = parseFloat(purchasePrice) || 0;
      const sp = parseFloat(salePrice) || 0;

      // Update base unit prices in ladder
      const ladder = [...unitLadder];
      const baseIdx = ladder.findIndex((u) => u.is_base === 1 || u.factor === 1);
      if (baseIdx >= 0) {
        ladder[baseIdx] = {
          ...ladder[baseIdx],
          unit_name: baseUnit.trim() || 'PCS',
          factor: 1,
          is_base: 1,
          purchase_price: pp,
          sale_price: sp,
        };
      } else {
        ladder.unshift({
          unit_name: baseUnit.trim() || 'PCS',
          factor: 1,
          is_base: 1,
          purchase_price: pp,
          sale_price: sp,
          barcode: '',
        });
      }

      if (editId) {
        await itemService.updateItem(
          editId,
          activeBusiness!.id,
          {
            name,
            sku,
            brand,
            category_id: categoryId,
            hsn,
            gst_rate: parseFloat(gstRate) || 0,
            purchase_price: pp,
            sale_price: sp,
            mrp: parseFloat(mrp) || 0,
            low_stock_alert: parseFloat(lowStockAlert) || 0,
            track_serials: trackSerials ? 1 : 0,
            base_unit: baseUnit.trim(),
            unit: baseUnit.trim(),
          },
          ladder
        );
      } else {
        await itemService.createItem(
          activeBusiness!.id,
          {
            name,
            sku,
            brand,
            category_id: categoryId,
            hsn,
            gst_rate: parseFloat(gstRate) || 0,
            purchase_price: pp,
            sale_price: sp,
            mrp: parseFloat(mrp) || 0,
            low_stock_alert: parseFloat(lowStockAlert) || 0,
            track_serials: trackSerials ? 1 : 0,
            base_unit: baseUnit.trim(),
            unit: baseUnit.trim(),
          },
          ladder,
          parseFloat(openingStock) || 0
        );
      }

      Alert.alert('Success', `Product "${name}" saved successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          {editId ? 'Edit Product' : 'Add New Product'}
        </Text>

        {/* Master Details */}
        <Card>
          <Input
            label="Product Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Cola 500ml"
          />

          <View style={styles.grid2}>
            <Input
              label="SKU / Item Code"
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. BEV001"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Coca-Cola"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <Select
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { label: 'None (Top Level)', value: null },
              ...categories.map((c) => ({ label: c.path || c.name, value: c.id })),
            ]}
          />

          {/* HSN & GST Rate with Smart Lookup */}
          <View style={styles.grid2}>
            <View style={{ flex: 1.2 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>HSN Code</Text>
              <TouchableOpacity
                style={[styles.hsnBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => {
                  setHsnResults(lookupService.searchHsn(''));
                  setHsnModal(true);
                }}
              >
                <Text style={{ color: hsn ? colors.text : colors.textMuted, fontSize: 14 }}>
                  {hsn || 'Search HSN...'}
                </Text>
                <Ionicons name="search" size={16} color={colors.palette.primary} />
              </TouchableOpacity>
            </View>

            <Select
              label="GST Rate"
              value={gstRate}
              onChange={setGstRate}
              options={[
                { label: '0%', value: '0' },
                { label: '5%', value: '5' },
                { label: '12%', value: '12' },
                { label: '18%', value: '18' },
                { label: '28%', value: '28' },
              ]}
              containerStyle={{ flex: 0.8 }}
            />
          </View>
        </Card>

        {/* Pricing & Units */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
            Base Pricing & Units
          </Text>

          <View style={styles.grid3}>
            <Input
              label="Base Unit"
              value={baseUnit}
              onChangeText={setBaseUnit}
              placeholder="Piece, KG, Bottle"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Purchase Price"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Selling Price"
              value={salePrice}
              onChangeText={setSalePrice}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <View style={styles.grid2}>
            <Input
              label="Printed MRP (₹)"
              value={mrp}
              onChangeText={setMrp}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Low Stock Alert Qty"
              value={lowStockAlert}
              onChangeText={setLowStockAlert}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>

          {!editId && (
            <Input
              label="Opening Stock (Base units)"
              value={openingStock}
              onChangeText={setOpeningStock}
              keyboardType="numeric"
              placeholder="0"
            />
          )}

          {/* Serial Tracking Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setTrackSerials(!trackSerials)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.text }]}>
                Track Individual Serial Numbers
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Enables barcode scan verification for every piece sold/bought
              </Text>
            </View>
            <Ionicons
              name={trackSerials ? 'checkbox' : 'square-outline'}
              size={24}
              color={colors.palette.primary}
            />
          </TouchableOpacity>
        </Card>

        {/* Unit Conversion Ladder */}
        <Card>
          <View style={styles.ladderHeader}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Packaging Levels (Multi-Units)
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                e.g. 1 Pack = 10 Pcs, 1 Box = 120 Pcs, 1 Carton = 2400 Pcs
              </Text>
            </View>
            <Button
              title="+ Add Level"
              size="sm"
              variant="outline"
              onPress={() => setUnitModal(true)}
            />
          </View>

          {unitLadder.map((u, idx) => (
            <View
              key={idx}
              style={[
                styles.ladderRow,
                { borderBottomColor: idx === unitLadder.length - 1 ? 'transparent' : colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.unitTitle, { color: colors.text }]}>{u.unit_name}</Text>
                  {u.is_base === 1 ? (
                    <Badge label="Base (1x)" variant="primary" />
                  ) : (
                    <Badge label={`${u.factor}x Base`} variant="info" />
                  )}
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Sale: ₹{u.sale_price || salePrice} | Cost: ₹{u.purchase_price || purchasePrice}
                  {u.barcode ? ` | Barcode: ${u.barcode}` : ''}
                </Text>
              </View>
              {u.is_base !== 1 && (
                <TouchableOpacity onPress={() => handleRemoveUnit(idx)} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.palette.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Card>

        {/* Save Button */}
        <Button
          title={editId ? 'Save Changes' : 'Create Product'}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />

        {/* HSN Search Modal */}
        <Modal visible={hsnModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Search HSN / SAC</Text>
                <TouchableOpacity onPress={() => setHsnModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Input
                placeholder="Type product or 4-digit code (e.g. Milk, 2202)..."
                value={hsnSearch}
                onChangeText={handleSearchHsn}
                icon="search"
              />

              <FlatList
                data={hsnResults}
                keyExtractor={(item) => item.hsn}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.hsnItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectHsn(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.hsnCode, { color: colors.palette.primary }]}>
                        HSN: {item.hsn} ({item.gst}% GST)
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>{item.desc}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Add Packaging Unit Modal */}
        <Modal visible={unitModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Packaging Level</Text>
                <TouchableOpacity onPress={() => setUnitModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Input
                label="Packaging Name"
                placeholder="e.g. Box, Carton, Pack, Crate"
                value={newUnitName}
                onChangeText={setNewUnitName}
              />

              <Input
                label={`Conversion Factor (How many ${baseUnit} in 1 of this?)`}
                placeholder="e.g. 12 or 24 or 2400"
                value={newUnitFactor}
                onChangeText={setNewUnitFactor}
                keyboardType="numeric"
              />

              <View style={styles.grid2}>
                <Input
                  label="Unit Sale Price (₹)"
                  placeholder="Auto calculated if empty"
                  value={newUnitSalePrice}
                  onChangeText={setNewUnitSalePrice}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
                <Input
                  label="Unit Purchase Price (₹)"
                  placeholder="Auto calculated"
                  value={newUnitPurchasePrice}
                  onChangeText={setNewUnitPurchasePrice}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <Input
                label="Packaging Barcode / EAN (Optional)"
                placeholder="Scan or type barcode..."
                value={newUnitBarcode}
                onChangeText={setNewUnitBarcode}
              />

              <Button
                title="Add Packaging Level"
                onPress={handleAddUnitLevel}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        </Modal>
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
    marginBottom: 12,
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  hsnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  ladderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  ladderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  unitTitle: {
    fontSize: 14,
    fontWeight: '700',
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
    maxHeight: '80%',
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
  hsnItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  hsnCode: {
    fontSize: 14,
    fontWeight: '700',
  },
});
