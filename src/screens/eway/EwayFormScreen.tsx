import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { ewayService } from '../../services/ewayService';
import { invoiceService } from '../../services/invoiceService';
import { Invoice } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { getTodayIso, formatCurrency } from '../../utils/formatters';

export const EwayFormScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const invoiceId = route.params?.invoiceId;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(invoiceId || null);

  const [docNo, setDocNo] = useState('');
  const [docDate, setDocDate] = useState(getTodayIso());
  const [supplyType, setSupplyType] = useState<'O' | 'I'>('O');

  const [fromName, setFromName] = useState('');
  const [fromGstin, setFromGstin] = useState('');
  const [fromAddr, setFromAddr] = useState('');
  const [fromPlace, setFromPlace] = useState('');
  const [fromPin, setFromPin] = useState('');
  const [fromState, setFromState] = useState('');

  const [toName, setToName] = useState('');
  const [toGstin, setToGstin] = useState('');
  const [toAddr, setToAddr] = useState('');
  const [toPlace, setToPlace] = useState('');
  const [toPin, setToPin] = useState('');
  const [toState, setToState] = useState('');

  const [transporterId, setTransporterId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transDistance, setTransDistance] = useState('50');
  const [transMode, setTransMode] = useState<'road' | 'rail' | 'air' | 'ship'>('road');
  const [vehicleNo, setVehicleNo] = useState('');

  const [totalValue, setTotalValue] = useState('0');
  const [taxableValue, setTaxableValue] = useState('0');
  const [cgst, setCgst] = useState('0');
  const [sgst, setSgst] = useState('0');
  const [igst, setIgst] = useState('0');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!activeBusiness) return;
      const invList = await invoiceService.getAllInvoices(activeBusiness.id);
      setInvoices(invList);

      if (invoiceId) {
        handlePrefillFromInvoice(invoiceId);
      } else {
        // Prefill default supplier from active business
        setFromName(activeBusiness.name);
        setFromGstin(activeBusiness.gstin || '');
        setFromAddr(activeBusiness.address || '');
        setFromState(activeBusiness.state || '');
      }
    })();
  }, [activeBusiness, invoiceId]);

  const handlePrefillFromInvoice = async (invId: number) => {
    try {
      const draft = await ewayService.prefillFromInvoice(invId);
      if (draft) {
        setSelectedInvId(invId);
        setDocNo(draft.doc_no || '');
        setDocDate(draft.doc_date || getTodayIso());
        setSupplyType(draft.supply_type || 'O');

        setFromName(draft.from_name || '');
        setFromGstin(draft.from_gstin || '');
        setFromAddr(draft.from_addr || '');
        setFromState(draft.from_state || '');

        setToName(draft.to_name || '');
        setToGstin(draft.to_gstin || '');
        setToAddr(draft.to_addr || '');
        setToState(draft.to_state || '');

        setTotalValue(String(draft.total_value || 0));
        setTaxableValue(String(draft.taxable_value || 0));
        setCgst(String(draft.cgst || 0));
        setSgst(String(draft.sgst || 0));
        setIgst(String(draft.igst || 0));
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await ewayService.createEwayBill(activeBusiness!.id, {
        invoice_id: selectedInvId,
        doc_no: docNo,
        doc_date: docDate,
        supply_type: supplyType,
        from_name: fromName,
        from_gstin: fromGstin,
        from_addr: fromAddr,
        from_place: fromPlace,
        from_pin: fromPin,
        from_state: fromState,
        to_name: toName,
        to_gstin: toGstin,
        to_addr: toAddr,
        to_place: toPlace,
        to_pin: toPin,
        to_state: toState,
        transporter_id: transporterId,
        transporter_name: transporterName,
        trans_distance: parseFloat(transDistance) || 0,
        trans_mode: transMode,
        vehicle_no: vehicleNo,
        total_value: parseFloat(totalValue) || 0,
        taxable_value: parseFloat(taxableValue) || 0,
        cgst: parseFloat(cgst) || 0,
        sgst: parseFloat(sgst) || 0,
        igst: parseFloat(igst) || 0,
      });

      Alert.alert('Success', 'E-Way Bill created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Generate E-Way Bill</Text>

        {/* Invoice Link */}
        <Card>
          <Select
            label="Pre-fill from Existing Invoice (Optional)"
            value={selectedInvId}
            onChange={(val) => {
              if (val) handlePrefillFromInvoice(val);
            }}
            options={[
              { label: 'None / Manual Entry', value: null },
              ...invoices.map((i) => ({
                label: `${i.invoice_no} (${i.party_name || 'Cash'} • ${formatCurrency(i.total)})`,
                value: i.id,
              })),
            ]}
          />

          <View style={styles.grid2}>
            <Input
              label="Document No *"
              value={docNo}
              onChangeText={setDocNo}
              placeholder="e.g. INV-0001"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Doc Date"
              value={docDate}
              onChangeText={setDocDate}
              containerStyle={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Dispatch From */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Dispatch From (Supplier)</Text>
          <Input label="From Name" value={fromName} onChangeText={setFromName} />
          <View style={styles.grid2}>
            <Input label="From GSTIN" value={fromGstin} onChangeText={setFromGstin} autoCapitalize="characters" containerStyle={{ flex: 1 }} />
            <Input label="From State" value={fromState} onChangeText={setFromState} containerStyle={{ flex: 1 }} />
          </View>
          <Input label="From Address" value={fromAddr} onChangeText={setFromAddr} />
          <View style={styles.grid2}>
            <Input label="From City/Place" value={fromPlace} onChangeText={setFromPlace} containerStyle={{ flex: 1 }} />
            <Input label="From PIN Code" value={fromPin} onChangeText={setFromPin} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          </View>
        </Card>

        {/* Bill To */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Ship To (Recipient)</Text>
          <Input label="To Name *" value={toName} onChangeText={setToName} />
          <View style={styles.grid2}>
            <Input label="To GSTIN" value={toGstin} onChangeText={setToGstin} autoCapitalize="characters" containerStyle={{ flex: 1 }} />
            <Input label="To State" value={toState} onChangeText={setToState} containerStyle={{ flex: 1 }} />
          </View>
          <Input label="To Address" value={toAddr} onChangeText={setToAddr} />
          <View style={styles.grid2}>
            <Input label="To City/Place" value={toPlace} onChangeText={setToPlace} containerStyle={{ flex: 1 }} />
            <Input label="To PIN Code" value={toPin} onChangeText={setToPin} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          </View>
        </Card>

        {/* Transportation Details */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Transportation Details</Text>
          <View style={styles.grid2}>
            <Select
              label="Mode"
              value={transMode}
              onChange={setTransMode}
              options={[
                { label: 'Road', value: 'road' },
                { label: 'Rail', value: 'rail' },
                { label: 'Air', value: 'air' },
                { label: 'Ship', value: 'ship' },
              ]}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Distance (km) *"
              value={transDistance}
              onChangeText={setTransDistance}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <Input
            label="Vehicle Number"
            value={vehicleNo}
            onChangeText={setVehicleNo}
            placeholder="e.g. DL01AB1234"
            autoCapitalize="characters"
          />
          <View style={styles.grid2}>
            <Input label="Transporter ID (GSTIN)" value={transporterId} onChangeText={setTransporterId} autoCapitalize="characters" containerStyle={{ flex: 1 }} />
            <Input label="Transporter Name" value={transporterName} onChangeText={setTransporterName} containerStyle={{ flex: 1 }} />
          </View>
        </Card>

        {/* Valuation & Tax */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Taxable Goods Value</Text>
          <View style={styles.grid2}>
            <Input label="Total Invoice Value (₹)" value={totalValue} onChangeText={setTotalValue} keyboardType="numeric" containerStyle={{ flex: 1 }} />
            <Input label="Taxable Subtotal (₹)" value={taxableValue} onChangeText={setTaxableValue} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          </View>
          <View style={styles.grid3}>
            <Input label="CGST (₹)" value={cgst} onChangeText={setCgst} keyboardType="numeric" containerStyle={{ flex: 1 }} />
            <Input label="SGST (₹)" value={sgst} onChangeText={setSgst} keyboardType="numeric" containerStyle={{ flex: 1 }} />
            <Input label="IGST (₹)" value={igst} onChangeText={setIgst} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          </View>
        </Card>

        <Button
          title="Save E-Way Bill"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: 8 }}
        />
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
});
