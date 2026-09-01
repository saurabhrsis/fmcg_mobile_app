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
import { paymentService } from '../../services/paymentService';
import { partyService } from '../../services/partyService';
import { invoiceService } from '../../services/invoiceService';
import { Party, PaymentType, PaymentMode, Invoice } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { DatePickerField } from '../../components/common/DatePickerField';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { getTodayIso, formatCurrency } from '../../utils/formatters';

export const CreatePaymentScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const initialType: PaymentType = route.params?.type || 'in';
  const initialPartyId = route.params?.partyId || null;

  const [type, setType] = useState<PaymentType>(initialType);
  const [partyId, setPartyId] = useState<number | null>(initialPartyId);
  const [parties, setParties] = useState<Party[]>([]);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [date, setDate] = useState(getTodayIso());
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!activeBusiness) return;
      const pList = await partyService.getAllParties(
        type === 'in' ? 'customer' : 'supplier',
        undefined,
        activeBusiness.id
      );
      setParties(pList);

      if (initialPartyId) {
        setPartyId(initialPartyId);
      } else if (pList.length > 0 && !partyId) {
        setPartyId(pList[0].id);
      }
    })();
  }, [type, activeBusiness]);

  useEffect(() => {
    (async () => {
      if (!activeBusiness || !partyId) {
        setUnpaidInvoices([]);
        return;
      }
      const invs = await invoiceService.getAllInvoices(activeBusiness.id, {
        partyId,
        type: type === 'in' ? 'sale' : 'purchase',
      });
      setUnpaidInvoices(invs.filter((i) => i.status !== 'paid'));
    })();
  }, [partyId, type, activeBusiness]);

  const handleSave = async () => {
    if (!partyId || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please select a party and enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await paymentService.createPayment(activeBusiness!.id, {
        party_id: partyId,
        type,
        amount: parseFloat(amount),
        mode,
        date,
        invoice_id: invoiceId,
        notes,
      });

      Alert.alert('Success', 'Payment saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedParty = parties.find((p) => p.id === partyId);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          {type === 'in' ? 'Record Payment In (Receipt)' : 'Record Payment Out'}
        </Text>

        <Card>
          <Select
            label="Payment Type"
            value={type}
            onChange={(val) => {
              setType(val);
              setInvoiceId(null);
            }}
            options={[
              { label: 'Payment In (Received from Customer)', value: 'in' },
              { label: 'Payment Out (Paid to Supplier)', value: 'out' },
            ]}
          />

          <Select
            label={type === 'in' ? 'Customer (Buyer) *' : 'Supplier (Vendor) *'}
            value={partyId}
            onChange={(val) => {
              setPartyId(val);
              setInvoiceId(null);
            }}
            options={parties.map((p) => ({
              label: `${p.name} (Bal: ${formatCurrency(p.balance || 0)})`,
              value: p.id,
            }))}
          />

          {selectedParty && (
            <View style={[styles.balanceCard, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Current Balance</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: (selectedParty.balance || 0) > 0 ? colors.palette.primary : colors.palette.danger,
                }}
              >
                {formatCurrency(Math.abs(selectedParty.balance || 0))}
                {(selectedParty.balance || 0) > 0 ? ' (They Owe Us)' : ' (We Owe Them)'}
              </Text>
            </View>
          )}

          <View style={styles.grid2}>
            <Input
              label="Amount (₹) *"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Select
              label="Payment Mode"
              value={mode}
              onChange={setMode}
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'UPI / QR', value: 'upi' },
                { label: 'Bank Transfer / NEFT', value: 'bank' },
                { label: 'Cheque', value: 'cheque' },
              ]}
              containerStyle={{ flex: 1 }}
            />
          </View>

          <DatePickerField
            label="Payment Date"
            value={date}
            onChange={setDate}
          />

          {unpaidInvoices.length > 0 && (
            <Select
              label="Link Against Unpaid Invoice (Optional)"
              value={invoiceId}
              onChange={setInvoiceId}
              options={[
                { label: 'None / General Account Payment', value: null },
                ...unpaidInvoices.map((inv) => ({
                  label: `${inv.invoice_no} (${formatCurrency(inv.total - inv.paid)} due)`,
                  value: inv.id,
                })),
              ]}
            />
          )}

          <Input
            label="Notes / Reference"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. UTR / Cheque No / Remarks"
          />
        </Card>

        <Button
          title={type === 'in' ? 'Save Receipt (+)' : 'Save Payment (-)'}
          variant={type === 'in' ? 'success' : 'primary'}
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
  balanceCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
});
