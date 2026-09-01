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
import { businessService } from '../../services/businessService';
import { Item, Party, InvoiceItem, InvoiceType, NoteKind, Batch, ItemUnit, CompanyFeatures } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { DatePickerField } from '../../components/common/DatePickerField';
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

  // Optional tax-invoice details (Ship-to, dispatch, order refs, e-Invoice…)
  // Grouped in a collapsible section like the desktop edition. Nothing is mandatory.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [companyFeatures, setCompanyFeatures] = useState<CompanyFeatures>({});

  // Consignee (Ship To)
  const [shipToSame, setShipToSame] = useState(false); // ship-to = customer address
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeGstin, setConsigneeGstin] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [consigneeState, setConsigneeState] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');

  // GST tax type — 'auto' follows the state comparison (intra → CGST+SGST,
  // inter → IGST). SEZ units (e.g. MIHAN Nagpur) can force IGST even when the
  // customer & company are in the same state; 'intra' forces CGST+SGST.
  const [gstType, setGstType] = useState<'auto' | 'intra' | 'inter'>('auto');

  // Order & References
  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [otherRef, setOtherRef] = useState('');
  const [ewayNo, setEwayNo] = useState('');
  const [payTerms, setPayTerms] = useState('');

  // Dispatch / Transport
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [dispatchDoc, setDispatchDoc] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [termsDelivery, setTermsDelivery] = useState('');
  const [noOfPackets, setNoOfPackets] = useState('');

  // e-Invoice (IRN)
  const [irn, setIrn] = useState('');
  const [ackNo, setAckNo] = useState('');
  const [ackDate, setAckDate] = useState('');

  // Modals
  const [partyModal, setPartyModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [lineEditorModal, setLineEditorModal] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);

  // Party search & inline quick-add (create a new customer/supplier without
  // leaving the voucher screen).
  const [partySearch, setPartySearch] = useState('');
  const [addingParty, setAddingParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyGstin, setNewPartyGstin] = useState('');
  const [newPartyState, setNewPartyState] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [savingParty, setSavingParty] = useState(false);

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

      // Which optional bill-detail groups are enabled (Feature Config screen).
      const feats = await businessService.getCompanyFeatures();
      setCompanyFeatures(feats);
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

  // What would 'Auto' resolve to for the current party / ship-to / place of
  // supply? Used for the chip hint and the CGST/SGST vs IGST breakdown.
  const autoInter = isInterState(activeBusiness, {
    party_state: selectedParty?.state,
    party_gstin: selectedParty?.gstin,
    place_of_supply: placeOfSupply,
    consignee_state: shipToSame ? '' : consigneeState,
    consignee_gstin: shipToSame ? '' : consigneeGstin,
  });
  const effectiveInter = gstType === 'inter' ? true : gstType === 'intra' ? false : autoInter;

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
      // Ship To = customer's own address when the checkbox is ticked.
      const shipTo = shipToSame && selectedParty
        ? {
            consignee_name: selectedParty.name,
            consignee_gstin: selectedParty.gstin || '',
            consignee_address: selectedParty.address || '',
            consignee_state: selectedParty.state || '',
          }
        : {
            consignee_name: consigneeName,
            consignee_gstin: consigneeGstin,
            consignee_address: consigneeAddress,
            consignee_state: consigneeState,
          };

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
          ...shipTo,
          place_of_supply: placeOfSupply,
          gst_type: gstType,
          po_no: poNo,
          po_date: poDate,
          other_ref: otherRef,
          eway_no: ewayNo,
          pay_terms: payTerms,
          delivery_note: deliveryNote,
          delivery_note_date: deliveryNoteDate,
          dispatch_doc: dispatchDoc,
          dispatched_through: dispatchedThrough,
          destination,
          terms_delivery: termsDelivery,
          no_of_packets: noOfPackets,
          irn,
          ack_no: ackNo,
          ack_date: ackDate,
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

  // Feature toggles default ON when not configured (same as desktop).
  const featOn = (k: keyof CompanyFeatures) =>
    (companyFeatures as any)[k] === undefined ? true : !!(companyFeatures as any)[k];
  const showConsignee = featOn('billConsignee');
  const showOrderRef = featOn('billOrderRef');
  const showDispatch = featOn('billDispatch');
  const showEInvoice = featOn('billEInvoice');
  const anyDetailGroup = showConsignee || showOrderRef || showDispatch || showEInvoice;

  const detailFilledCount = [
    shipToSame ? 'same-as-customer' : '',
    ...(shipToSame ? [] : [consigneeName, consigneeGstin, consigneeAddress, consigneeState]),
    placeOfSupply,
    poNo, poDate, otherRef, ewayNo, payTerms,
    deliveryNote, deliveryNoteDate, dispatchDoc, dispatchedThrough, destination, termsDelivery, noOfPackets,
    irn, ackNo, ackDate,
  ].filter((v) => v && String(v).trim()).length;

  // Party helpers — search filter + inline creation.
  const partyTypeNeeded = type === 'purchase' || noteKind === 'debit' ? 'supplier' : 'customer';
  const partyTypeLabel = partyTypeNeeded === 'supplier' ? 'Supplier' : 'Customer';

  const filteredParties = partySearch.trim()
    ? parties.filter((p) => {
        const q = partySearch.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.gstin || '').toLowerCase().includes(q)
        );
      })
    : parties;

  const resetNewPartyForm = () => {
    setAddingParty(false);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyGstin('');
    setNewPartyState('');
    setNewPartyAddress('');
  };

  const handleQuickAddParty = async () => {
    if (!newPartyName.trim()) {
      Alert.alert('Name Required', `Please enter the ${partyTypeLabel.toLowerCase()} name`);
      return;
    }
    setSavingParty(true);
    try {
      const created = await partyService.createParty({
        name: newPartyName,
        type: partyTypeNeeded,
        phone: newPartyPhone,
        gstin: newPartyGstin,
        state: newPartyState,
        address: newPartyAddress,
      });
      // Refresh the list, auto-select the new party and close the modal.
      const pList = await partyService.getAllParties(partyTypeNeeded, undefined, activeBusiness!.id);
      setParties(pList);
      setSelectedParty(created);
      resetNewPartyForm();
      setPartySearch('');
      setPartyModal(false);
    } catch (e: any) {
      Alert.alert('Could not add party', e.message);
    } finally {
      setSavingParty(false);
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
            <DatePickerField
              label="Invoice Date"
              value={date}
              onChange={setDate}
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

          {/* GST Tax Type — Auto / CGST+SGST / IGST (SEZ override) */}
          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>GST Tax Type</Text>
          <View style={styles.gstTypeRow}>
            {([
              { key: 'auto', label: `Auto (${autoInter ? 'IGST' : 'CGST+SGST'})` },
              { key: 'intra', label: 'CGST + SGST' },
              { key: 'inter', label: 'IGST' },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.gstTypeChip,
                  {
                    backgroundColor: gstType === opt.key ? colors.palette.primary : colors.surfaceSubtle,
                    borderColor: gstType === opt.key ? colors.palette.primary : colors.border,
                  },
                ]}
                onPress={() => setGstType(opt.key)}
              >
                <Text
                  style={{
                    color: gstType === opt.key ? '#ffffff' : colors.text,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 10.5, color: colors.textMuted, marginTop: 6 }}>
            Auto compares customer & company GST states. SEZ / MIHAN units charge IGST even within
            the same state — select IGST to override.
          </Text>
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

          {effectiveInter ? (
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textMuted }}>
                IGST{gstType === 'inter' ? ' (forced — SEZ/inter-state)' : ''}:
              </Text>
              <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(taxTotal)}</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.textMuted }}>CGST:</Text>
                <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(taxTotal / 2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.textMuted }}>SGST:</Text>
                <Text style={{ fontWeight: '600', color: colors.text }}>{formatCurrency(taxTotal / 2)}</Text>
              </View>
            </>
          )}

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

        {/* Notes */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Additional Information</Text>
          <Input
            label="Notes / Terms"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional remarks on bill..."
          />
        </Card>

        {/* Invoice Details — Ship To, Order Refs, Dispatch/Transport, e-Invoice */}
        {anyDetailGroup && (
          <Card>
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setDetailsOpen(!detailsOpen)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons
                  name={detailsOpen ? 'chevron-down' : 'chevron-forward'}
                  size={18}
                  color={colors.palette.primary}
                />
                <View style={{ marginLeft: 6, flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Invoice Details</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Optional · Ship To, Dispatch, Order Refs, e-Way, e-Invoice
                  </Text>
                </View>
              </View>
              {detailFilledCount > 0 && (
                <Badge label={`${detailFilledCount} filled`} variant="success" />
              )}
            </TouchableOpacity>

            {detailsOpen && (
              <View style={{ marginTop: 12 }}>
                {/* Consignee (Ship To) */}
                {showConsignee && (
                  <View style={[styles.detailGroup, { borderColor: colors.border }]}>
                    <View style={styles.detailGroupHead}>
                      <Ionicons name="location-outline" size={15} color={colors.palette.primary} />
                      <Text style={[styles.detailGroupTitle, { color: colors.text }]}>Consignee (Ship To)</Text>
                    </View>

                    {/* Same-as-customer checkbox */}
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      activeOpacity={0.7}
                      onPress={() => setShipToSame(!shipToSame)}
                    >
                      <Ionicons
                        name={shipToSame ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={shipToSame ? colors.palette.primary : colors.textMuted}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }}>
                        Same as customer (Bill To) address
                      </Text>
                    </TouchableOpacity>

                    {shipToSame ? (
                      <View style={[styles.shipToSameBox, { backgroundColor: colors.surfaceSubtle }]}>
                        {selectedParty ? (
                          <>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
                              {selectedParty.name}
                            </Text>
                            <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                              {selectedParty.address || 'No address on record'}
                              {selectedParty.state ? ` • ${selectedParty.state}` : ''}
                            </Text>
                            {selectedParty.gstin ? (
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                                GSTIN: {selectedParty.gstin}
                              </Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>
                            Select a party above — their address will be used as the ship-to address.
                          </Text>
                        )}
                      </View>
                    ) : (
                      <>
                        <View style={styles.grid2}>
                          <Input label="Name" value={consigneeName} onChangeText={setConsigneeName} containerStyle={{ flex: 1 }} />
                          <Input label="GSTIN" value={consigneeGstin} onChangeText={setConsigneeGstin} autoCapitalize="characters" maxLength={15} containerStyle={{ flex: 1 }} />
                        </View>
                        <Input label="Address" value={consigneeAddress} onChangeText={setConsigneeAddress} />
                        <View style={styles.grid2}>
                          <Input label="State" value={consigneeState} onChangeText={setConsigneeState} containerStyle={{ flex: 1 }} />
                          <Input label="Place of Supply" value={placeOfSupply} onChangeText={setPlaceOfSupply} containerStyle={{ flex: 1 }} />
                        </View>
                      </>
                    )}
                  </View>
                )}

                {/* Order & References */}
                {showOrderRef && (
                  <View style={[styles.detailGroup, { borderColor: colors.border }]}>
                    <View style={styles.detailGroupHead}>
                      <Ionicons name="document-text-outline" size={15} color={colors.palette.primary} />
                      <Text style={[styles.detailGroupTitle, { color: colors.text }]}>Order & References</Text>
                    </View>
                    <View style={styles.grid2}>
                      <Input label="Buyer's Order No." value={poNo} onChangeText={setPoNo} placeholder="e.g. PO-890" containerStyle={{ flex: 1 }} />
                      <DatePickerField label="Order Date" value={poDate} onChange={setPoDate} allowClear containerStyle={{ flex: 1 }} />
                    </View>
                    <View style={styles.grid2}>
                      <Input label="Reference No. & Date" value={otherRef} onChangeText={setOtherRef} containerStyle={{ flex: 1 }} />
                      <Input label="e-Way Bill No." value={ewayNo} onChangeText={setEwayNo} placeholder="12-digit EWB" keyboardType="numeric" containerStyle={{ flex: 1 }} />
                    </View>
                    <Input label="Mode / Terms of Payment" value={payTerms} onChangeText={setPayTerms} placeholder="e.g. 30 Days Credit / Immediate" />
                  </View>
                )}

                {/* Dispatch / Transport */}
                {showDispatch && (
                  <View style={[styles.detailGroup, { borderColor: colors.border }]}>
                    <View style={styles.detailGroupHead}>
                      <Ionicons name="car-outline" size={15} color={colors.palette.primary} />
                      <Text style={[styles.detailGroupTitle, { color: colors.text }]}>Dispatch / Transport</Text>
                    </View>
                    <View style={styles.grid2}>
                      <Input label="Delivery Note" value={deliveryNote} onChangeText={setDeliveryNote} containerStyle={{ flex: 1 }} />
                      <DatePickerField label="Delivery Note Date" value={deliveryNoteDate} onChange={setDeliveryNoteDate} allowClear containerStyle={{ flex: 1 }} />
                    </View>
                    <View style={styles.grid2}>
                      <Input label="Dispatch Doc No." value={dispatchDoc} onChangeText={setDispatchDoc} containerStyle={{ flex: 1 }} />
                      <Input label="Dispatched Through" value={dispatchedThrough} onChangeText={setDispatchedThrough} placeholder="e.g. Road / Courier" containerStyle={{ flex: 1 }} />
                    </View>
                    <View style={styles.grid2}>
                      <Input label="Destination" value={destination} onChangeText={setDestination} containerStyle={{ flex: 1 }} />
                      <Input label="Terms of Delivery" value={termsDelivery} onChangeText={setTermsDelivery} containerStyle={{ flex: 1 }} />
                    </View>
                    {featOn('billPackets') && (
                      <Input label="No. of Packets" value={noOfPackets} onChangeText={setNoOfPackets} keyboardType="numeric" placeholder="e.g. 12" />
                    )}
                  </View>
                )}

                {/* e-Invoice (IRN) */}
                {showEInvoice && (
                  <View style={[styles.detailGroup, { borderColor: colors.border }]}>
                    <View style={styles.detailGroupHead}>
                      <Ionicons name="link-outline" size={15} color={colors.palette.primary} />
                      <Text style={[styles.detailGroupTitle, { color: colors.text }]}>e-Invoice (IRN)</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>enter after generating on GST portal</Text>
                    </View>
                    <Input label="IRN" value={irn} onChangeText={setIrn} autoCapitalize="none" />
                    <View style={styles.grid2}>
                      <Input label="Ack No." value={ackNo} onChangeText={setAckNo} containerStyle={{ flex: 1 }} />
                      <DatePickerField label="Ack Date" value={ackDate} onChange={setAckDate} allowClear containerStyle={{ flex: 1 }} />
                    </View>
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Save Button */}
        <Button
          title={`Save & Finalize ${type.toUpperCase()}`}
          onPress={handleSaveInvoice}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />

        {/* Party Picker Modal — search + quick-add */}
        <Modal visible={partyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {addingParty ? `New ${partyTypeLabel}` : `Select ${partyTypeLabel}`}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (addingParty) {
                      resetNewPartyForm();
                    } else {
                      setPartySearch('');
                      setPartyModal(false);
                    }
                  }}
                >
                  <Ionicons name={addingParty ? 'arrow-back' : 'close'} size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {addingParty ? (
                /* Inline quick-add form — create the party without leaving the voucher */
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Input
                    label={`${partyTypeLabel} Name *`}
                    value={newPartyName}
                    onChangeText={setNewPartyName}
                    placeholder={`e.g. ${partyTypeNeeded === 'supplier' ? 'Metro Traders' : 'Sunrise Supermarket'}`}
                  />
                  <View style={styles.grid2}>
                    <Input
                      label="Phone"
                      value={newPartyPhone}
                      onChangeText={setNewPartyPhone}
                      keyboardType="phone-pad"
                      placeholder="Mobile number"
                      containerStyle={{ flex: 1 }}
                    />
                    <Input
                      label="State"
                      value={newPartyState}
                      onChangeText={setNewPartyState}
                      placeholder="e.g. Maharashtra"
                      containerStyle={{ flex: 1 }}
                    />
                  </View>
                  <Input
                    label="GSTIN (Optional)"
                    value={newPartyGstin}
                    onChangeText={(t) => setNewPartyGstin(t.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={15}
                    placeholder="15-digit GSTIN"
                  />
                  <Input
                    label="Address (Optional)"
                    value={newPartyAddress}
                    onChangeText={setNewPartyAddress}
                    placeholder="Billing address"
                  />
                  <Button
                    title={`Save & Select ${partyTypeLabel}`}
                    onPress={handleQuickAddParty}
                    loading={savingParty}
                    style={{ marginTop: 4 }}
                  />
                </ScrollView>
              ) : (
                <>
                  {/* Search box */}
                  <Input
                    value={partySearch}
                    onChangeText={setPartySearch}
                    icon="search"
                    placeholder={`Search ${partyTypeLabel.toLowerCase()} by name, phone or GSTIN...`}
                    autoCapitalize="none"
                  />

                  {/* Quick-add button */}
                  <TouchableOpacity
                    style={[styles.addPartyBtn, { backgroundColor: colors.palette.primaryLight }]}
                    onPress={() => {
                      // Pre-fill the name with what the user was searching for.
                      setNewPartyName(partySearch.trim());
                      setAddingParty(true);
                    }}
                  >
                    <Ionicons name="person-add" size={16} color={colors.palette.primaryDark} />
                    <Text style={{ color: colors.palette.primaryDark, fontWeight: '700', fontSize: 13 }}>
                      + Add New {partyTypeLabel}
                      {partySearch.trim() ? ` "${partySearch.trim()}"` : ''}
                    </Text>
                  </TouchableOpacity>

                  <FlatList
                    data={filteredParties}
                    keyExtractor={(p) => String(p.id)}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <Ionicons name="people-outline" size={30} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>
                          {partySearch.trim()
                            ? `No ${partyTypeLabel.toLowerCase()} matches "${partySearch.trim()}"`
                            : `No ${partyTypeLabel.toLowerCase()}s yet — add one above`}
                        </Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.partyItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setSelectedParty(item);
                          setPartySearch('');
                          setPartyModal(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.partyItemName, { color: colors.text }]}>{item.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            {item.phone || 'No phone'} • {item.state || 'India'}
                            {item.gstin ? ` • ${item.gstin}` : ''}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.palette.primary }}>
                          {formatCurrency(item.balance || 0)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </>
              )}
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
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailGroup: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  detailGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  gstTypeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  gstTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  shipToSameBox: {
    borderRadius: 8,
    padding: 10,
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
  addPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  unitChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
});
