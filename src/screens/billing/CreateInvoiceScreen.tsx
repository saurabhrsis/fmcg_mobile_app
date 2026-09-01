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
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { itemService } from '../../services/itemService';
import { partyService } from '../../services/partyService';
import { batchService } from '../../services/batchService';
import { invoiceService } from '../../services/invoiceService';
import { serialService } from '../../services/serialService';
import { Item, Party, InvoiceItem, InvoiceType, NoteKind, Batch, ItemUnit } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { computeLineMath } from '../../utils/stock';
import { formatCurrency, getTodayIso, round2 } from '../../utils/formatters';
import { isInterState } from '../../utils/gstState';
import { Ionicons } from '@expo/vector-icons';

export const CreateInvoiceScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const { user } = useAuth();

  const type: InvoiceType = route.params?.type || 'sale';
  const noteKind: NoteKind = route.params?.noteKind || '';

  const [date, setDate] = useState(getTodayIso());
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [lineItems, setLineItems] = useState<Partial<InvoiceItem>[]>([]);

  // Extra options
  const [extraDiscount, setExtraDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [poNo, setPoNo] = useState('');
  const [ewayNo, setEwayNo] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  // Modals
  const [partyModal, setPartyModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [lineEditorModal, setLineEditorModal] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);

  // Active editing line state
  const [currentLine, setCurrentLine] = useState<Partial<InvoiceItem>>({
    qty: 1,
    price: 0,
    gst_rate: 18,
    disc_trade_pct: 0,
    disc_cd_pct: 0,
    disc_sd_pct: 0,
    disc_trade_mode: 'pct',
    disc_cd_mode: 'pct',
    disc_sd_mode: 'pct',
  });
  const [currentAvailableBatches, setCurrentAvailableBatches] = useState<Batch[]>([]);
  const [currentAvailableUnits, setCurrentAvailableUnits] = useState<ItemUnit[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!activeBusiness) return;
      const nextNo = await invoiceService.getNextInvoiceNo(activeBusiness.id, type, noteKind);
      setInvoiceNo(nextNo);

      const pType = type === 'purchase' || noteKind === 'debit' ? 'supplier' : 'customer';
      const pList = await partyService.getAllParties(pType, undefined, activeBusiness.id);
      setParties(pList);

      const allItems = await itemService.getAllItems(activeBusiness.id);
      setItemsList(allItems);
    })();
  }, [activeBusiness, type, noteKind]);

  // Recalculate Totals
  let subtotal = 0;
  let taxTotal = 0;
  let totalGross = 0;

  lineItems.forEach((l) => {
    const c = computeLineMath(l);
    subtotal += c.taxable;
    taxTotal += c.tax_amount;
    totalGross += c.line_total;
  });

  const extraDiscNum = Number(extraDiscount) || 0;
  const grandTotal = Math.max(0, round2(totalGross - extraDiscNum));

  const handleSelectProduct = async (product: Item) => {
    setProductModal(false);
    const units = await itemService.getItemUnits(product.id);
    const batches = await batchService.getBatchesForItem(product.id, activeBusiness!.id);

    const defaultUnit = units.find((u) => u.is_base === 1) || units[0];
    const defaultPrice = type === 'purchase' ? (defaultUnit?.purchase_price || product.purchase_price) : (defaultUnit?.sale_price || product.sale_price);

    setCurrentAvailableUnits(units);
    setCurrentAvailableBatches(batches);

    setCurrentLine({
      item_id: product.id,
      item_name: product.name,
      hsn: product.hsn,
      unit: defaultUnit?.unit_name || product.unit || 'PCS',
      unit_factor: defaultUnit?.factor || 1,
      qty: 1,
      price: defaultPrice,
      gst_rate: product.gst_rate || 0,
      mrp: product.mrp || 0,
      track_serials: product.track_serials,
      disc_trade_pct: 0,
      disc_cd_pct: 0,
      disc_sd_pct: 0,
      disc_trade_mode: 'pct',
      disc_cd_mode: 'pct',
      disc_sd_mode: 'pct',
    });

    setEditingLineIndex(null);
    setLineEditorModal(true);
  };

  const handleSaveLine = () => {
    if (!currentLine.item_name || (currentLine.qty || 0) <= 0) {
      Alert.alert('Invalid item', 'Please enter a valid item name and quantity');
      return;
    }

    const calculated = computeLineMath(currentLine);
    const finalized = { ...currentLine, ...calculated };

    if (editingLineIndex !== null) {
      const updated = [...lineItems];
      updated[editingLineIndex] = finalized;
      setLineItems(updated);
    } else {
      setLineItems([...lineItems, finalized]);
    }

    setLineEditorModal(false);
  };

  const handleRemoveLine = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  const handleSaveInvoice = async () => {
    if (lineItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one line item to the voucher');
      return;
    }

    setLoading(true);
    try {
      const inv = await invoiceService.createInvoice(
        activeBusiness!.id,
        {
          type,
          note_kind: noteKind,
          invoice_no: invoiceNo,
          party_id: selectedParty?.id || null,
          date,
          discount: extraDiscNum,
          paid: Number(paidAmount) || 0,
          notes,
          po_no: poNo,
          eway_no: ewayNo,
          consignee_name: consigneeName,
          place_of_supply: placeOfSupply,
        },
        lineItems,
        false,
        user?.id
      );

      Alert.alert('Success', `${type.toUpperCase()} ${inv.invoice_no} created successfully!`, [
        {
          text: 'View Details',
          onPress: () => navigation.replace('InvoiceDetail', { id: inv.id }),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error Creating Voucher', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Title */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            {noteKind ? `${noteKind.toUpperCase()} NOTE` : type === 'quotation' ? 'QUOTATION' : `NEW ${type.toUpperCase()}`}
          </Text>
          <Badge label={type.toUpperCase()} variant="primary" />
        </View>

        {/* Voucher Metadata */}
        <Card>
          <View style={styles.grid2}>
            <Input
              label="Invoice No"
              value={invoiceNo}
              onChangeText={setInvoiceNo}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              containerStyle={{ flex: 1 }}
            />
          </View>

          {/* Party Selector */}
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            {type === 'purchase' || noteKind === 'debit' ? 'Supplier / Vendor' : 'Customer / Buyer'}
          </Text>
          <TouchableOpacity
            style={[
              styles.partySelector,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
            onPress={() => setPartyModal(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.partySelectName, { color: selectedParty ? colors.text : colors.textMuted }]}>
                {selectedParty ? selectedParty.name : 'Select or Search Party...'}
              </Text>
              {selectedParty?.gstin ? (
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  GSTIN: {selectedParty.gstin} • State: {selectedParty.state || 'N/A'}
                </Text>
              ) : null}
            </View>
            <Ionicons name="search" size={20} color={colors.palette.primary} />
          </TouchableOpacity>
        </Card>

        {/* Line Items List */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items ({lineItems.length})</Text>
            <Button
              title="+ Add Product"
              size="sm"
              onPress={() => setProductModal(true)}
            />
          </View>

          {lineItems.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyItemsBox, { borderColor: colors.border }]}
              onPress={() => setProductModal(true)}
            >
              <Ionicons name="cart-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyItemsText, { color: colors.textMuted }]}>
                Tap here to add items to this voucher
              </Text>
            </TouchableOpacity>
          ) : (
            lineItems.map((l, idx) => (
              <View
                key={idx}
                style={[
                  styles.lineRow,
                  { borderBottomColor: idx === lineItems.length - 1 ? 'transparent' : colors.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lineName, { color: colors.text }]}>{l.item_name}</Text>
                  <Text style={[styles.lineDetails, { color: colors.textMuted }]}>
                    {l.qty} {l.unit || 'PCS'} × {formatCurrency(l.price)} • GST: {l.gst_rate}%
                    {l.batch_no ? ` • Batch: ${l.batch_no}` : ''}
                  </Text>
                </View>
                <Text style={[styles.lineTotal, { color: colors.text }]}>
                  {formatCurrency(l.line_total || 0)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveLine(idx)}
                  style={{ marginLeft: 8, padding: 4 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.palette.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {/* Invoice Summary Card */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Summary & Totals</Text>

          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Subtotal (Taxable):</Text>
            <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Total Tax (GST):</Text>
            <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(taxTotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Extra Discount (₹):</Text>
            <Input
              value={extraDiscount}
              onChangeText={setExtraDiscount}
              keyboardType="numeric"
              containerStyle={{ width: 100, marginBottom: 0 }}
              style={{ textAlign: 'right' }}
            />
          </View>

          <View style={[styles.summaryRow, styles.grandTotalRow, { borderTopColor: colors.palette.primary }]}>
            <Text style={[styles.grandTotalText, { color: colors.palette.primary }]}>Grand Total:</Text>
            <Text style={[styles.grandTotalVal, { color: colors.palette.primary }]}>{formatCurrency(grandTotal)}</Text>
          </View>

          {type !== 'quotation' && (
            <View style={[styles.summaryRow, { marginTop: 12 }]}>
              <Text style={{ fontWeight: '600', color: colors.text }}>Amount Paid Now (₹):</Text>
              <Input
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="numeric"
                containerStyle={{ width: 120, marginBottom: 0 }}
                style={{ textAlign: 'right', fontWeight: '700' }}
              />
            </View>
          )}
        </Card>

        {/* Notes & Optional Details Accordion */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Additional Information</Text>
          <Input
            label="Notes / Terms"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional remarks on bill..."
          />
          <View style={styles.grid2}>
            <Input
              label="PO Number"
              value={poNo}
              onChangeText={setPoNo}
              placeholder="e.g. PO-890"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="E-Way Bill No"
              value={ewayNo}
              onChangeText={setEwayNo}
              placeholder="e.g. 121345678901"
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Save Button */}
        <Button
          title={`Save & Finalize ${type.toUpperCase()}`}
          onPress={handleSaveInvoice}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />

        {/* Party Picker Modal */}
        <Modal visible={partyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Party</Text>
                <TouchableOpacity onPress={() => setPartyModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={parties}
                keyExtractor={(p) => String(p.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.partyItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedParty(item);
                      setPartyModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partyItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {item.phone || 'No phone'} • {item.state || 'India'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.palette.primary }}>
                      {formatCurrency(item.balance || 0)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Product Picker Modal */}
        <Modal visible={productModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Item / Product</Text>
                <TouchableOpacity onPress={() => setProductModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={itemsList}
                keyExtractor={(it) => String(it.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.partyItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partyItemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        SKU: {item.sku || '-'} • Stock: {item.stock_label || `${item.stock || 0} ${item.unit}`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.palette.primary }}>
                      {formatCurrency(type === 'purchase' ? item.purchase_price : item.sale_price)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Line Item Editor Modal */}
        <Modal visible={lineEditorModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{currentLine.item_name}</Text>
                <TouchableOpacity onPress={() => setLineEditorModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Unit Ladder Picker */}
                {currentAvailableUnits.length > 1 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Packaging Unit</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {currentAvailableUnits.map((u, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.unitChip,
                            {
                              backgroundColor: currentLine.unit === u.unit_name ? colors.palette.primary : colors.surfaceSubtle,
                            },
                          ]}
                          onPress={() => {
                            const p = type === 'purchase' ? u.purchase_price : u.sale_price;
                            setCurrentLine({
                              ...currentLine,
                              unit: u.unit_name,
                              unit_factor: u.factor,
                              price: p || currentLine.price,
                            });
                          }}
                        >
                          <Text
                            style={{
                              color: currentLine.unit === u.unit_name ? '#ffffff' : colors.text,
                              fontSize: 12,
                              fontWeight: '600',
                            }}
                          >
                            {u.unit_name} ({u.factor}x)
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.grid2}>
                  <Input
                    label="Quantity"
                    value={String(currentLine.qty || '')}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, qty: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Rate / Price (₹)"
                    value={String(currentLine.price || '')}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, price: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {/* 3-Level Discounts (TD, CD, SD) */}
                <View style={styles.grid3}>
                  <Input
                    label="Trade Disc %"
                    value={String(currentLine.disc_trade_pct || '')}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, disc_trade_pct: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Cash Disc %"
                    value={String(currentLine.disc_cd_pct || '')}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, disc_cd_pct: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Special Disc %"
                    value={String(currentLine.disc_sd_pct || '')}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, disc_sd_pct: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <View style={styles.grid2}>
                  <Input
                    label="GST Rate %"
                    value={String(currentLine.gst_rate || '')}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, gst_rate: parseFloat(t) || 0 })}
                    keyboardType="numeric"
                    containerStyle={{ flex: 1 }}
                  />
                  <Input
                    label="Batch No"
                    value={currentLine.batch_no || ''}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, batch_no: t })}
                    placeholder="e.g. B-001"
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                {currentLine.track_serials ? (
                  <Input
                    label="Serial Numbers (comma separated)"
                    value={currentLine.serials || ''}
                    onChangeText={(t) => setCurrentLine({ ...currentLine, serials: t })}
                    placeholder="e.g. SN101, SN102"
                  />
                ) : null}

                <Button
                  title="Apply Item"
                  onPress={handleSaveLine}
                  style={{ marginTop: 12 }}
                />
              </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
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
  partySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  partySelectName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyItemsBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemsText: {
    fontSize: 13,
    marginTop: 8,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lineName: {
    fontSize: 13,
    fontWeight: '700',
  },
  lineDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  grandTotalRow: {
    borderTopWidth: 2,
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalText: {
    fontSize: 16,
    fontWeight: '800',
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '800',
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
  partyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  partyItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
});
