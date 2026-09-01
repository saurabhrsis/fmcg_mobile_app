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
import { businessService } from '../../services/businessService';
import { lookupService } from '../../services/lookupService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const BusinessFormScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { refreshBusinesses } = useBusiness();
  const editId = route.params?.id;

  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Delhi');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [billNumberStart, setBillNumberStart] = useState('1');

  // Banking & Tax
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [pan, setPan] = useState('');
  const [fssai, setFssai] = useState('');

  // Bill Customization
  const [billFormat, setBillFormat] = useState('classic');
  const [billColor, setBillColor] = useState('#0f766e');
  const [billTitle, setBillTitle] = useState('TAX INVOICE');
  const [billSignatory, setBillSignatory] = useState('Authorised Signatory');
  const [billTerms, setBillTerms] = useState('1. Goods once sold will not be taken back.\n2. Subject to Delhi jurisdiction.');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editId) {
      (async () => {
        const b = await businessService.getBusinessById(editId);
        if (b) {
          setName(b.name);
          setGstin(b.gstin || '');
          setPhone(b.phone || '');
          setEmail(b.email || '');
          setAddress(b.address || '');
          setState(b.state || 'Delhi');
          setInvoicePrefix(b.invoice_prefix || 'INV');
          setBillNumberStart(String(b.bill_number_start || 1));
          setBankName(b.bank_name || '');
          setBankAccount(b.bank_account || '');
          setBankIfsc(b.bank_ifsc || '');
          setBankBranch(b.bank_branch || '');
          setUpiId(b.upi_id || '');
          setPan(b.pan || '');
          setFssai(b.fssai || '');
          setBillFormat(b.bill_format || 'classic');
          setBillColor(b.bill_color || '#0f766e');
          setBillTitle(b.bill_title || 'TAX INVOICE');
          setBillSignatory(b.bill_signatory || 'Authorised Signatory');
          setBillTerms(b.terms || b.bill_terms || '');
        }
      })();
    }
  }, [editId]);

  const handleGstinChange = (text: string) => {
    const clean = text.toUpperCase().trim();
    setGstin(clean);
    if (clean.length === 15) {
      const decoded = lookupService.decodeGstin(clean);
      if (decoded.valid) {
        if (decoded.stateName) setState(decoded.stateName);
        if (decoded.pan) setPan(decoded.pan);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Business Name is required');
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await businessService.updateBusiness(editId, {
          name,
          gstin,
          phone,
          email,
          address,
          state,
          invoice_prefix: invoicePrefix,
          bill_number_start: parseInt(billNumberStart, 10) || 1,
          bank_name: bankName,
          bank_account: bankAccount,
          bank_ifsc: bankIfsc,
          bank_branch: bankBranch,
          upi_id: upiId,
          pan,
          fssai,
          bill_format: billFormat,
          bill_color: billColor,
          bill_title: billTitle,
          bill_signatory: billSignatory,
          terms: billTerms,
          bill_terms: billTerms,
        });
      } else {
        await businessService.createBusiness({
          name,
          gstin,
          phone,
          email,
          address,
          state,
          invoice_prefix: invoicePrefix,
          bill_number_start: parseInt(billNumberStart, 10) || 1,
          bank_name: bankName,
          bank_account: bankAccount,
          bank_ifsc: bankIfsc,
          bank_branch: bankBranch,
          upi_id: upiId,
          pan,
          fssai,
          bill_format: billFormat,
          bill_color: billColor,
          bill_title: billTitle,
          bill_signatory: billSignatory,
          terms: billTerms,
          bill_terms: billTerms,
        });
      }

      await refreshBusinesses();
      Alert.alert('Success', `Business "${name}" saved!`, [
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
          {editId ? 'Customize Business & Bill' : 'Add New Business Profile'}
        </Text>

        {/* Basic Firm Info */}
        <Card>
          <Input label="Business / Company Name *" value={name} onChangeText={setName} placeholder="e.g. Sharma Distribution Co." />
          <View style={styles.grid2}>
            <Input label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Mobile / Landline" keyboardType="phone-pad" containerStyle={{ flex: 1 }} />
            <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="contact@example.com" autoCapitalize="none" containerStyle={{ flex: 1 }} />
          </View>
          <Input label="GSTIN" value={gstin} onChangeText={handleGstinChange} placeholder="15-digit GSTIN" autoCapitalize="characters" maxLength={15} />
          <View style={styles.grid2}>
            <Input label="State" value={state} onChangeText={setState} containerStyle={{ flex: 1 }} />
            <Input label="PAN" value={pan} onChangeText={setPan} autoCapitalize="characters" containerStyle={{ flex: 1 }} />
          </View>
          <Input label="Business Address" value={address} onChangeText={setAddress} multiline numberOfLines={2} />
        </Card>

        {/* Invoicing Settings */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Invoice Numbering & Prefix</Text>
          <View style={styles.grid2}>
            <Input label="Invoice Prefix" value={invoicePrefix} onChangeText={setInvoicePrefix} placeholder="INV" containerStyle={{ flex: 1 }} />
            <Input label="Starting Number" value={billNumberStart} onChangeText={setBillNumberStart} keyboardType="numeric" placeholder="1" containerStyle={{ flex: 1 }} />
          </View>
          <Input label="FSSAI License No (Optional)" value={fssai} onChangeText={setFssai} placeholder="e.g. 10019011000123" />
        </Card>

        {/* Bank & UPI Info */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Bank & QR Code Payment Details</Text>
          <View style={styles.grid2}>
            <Input label="Bank Name" value={bankName} onChangeText={setBankName} placeholder="e.g. HDFC Bank" containerStyle={{ flex: 1 }} />
            <Input label="Account Number" value={bankAccount} onChangeText={setBankAccount} placeholder="Account No" keyboardType="numeric" containerStyle={{ flex: 1 }} />
          </View>
          <View style={styles.grid2}>
            <Input label="IFSC Code" value={bankIfsc} onChangeText={setBankIfsc} placeholder="HDFC0001234" autoCapitalize="characters" containerStyle={{ flex: 1 }} />
            <Input label="Branch" value={bankBranch} onChangeText={setBankBranch} placeholder="Connaught Place" containerStyle={{ flex: 1 }} />
          </View>
          <Input label="UPI ID (for bill QR Code)" value={upiId} onChangeText={setUpiId} placeholder="e.g. business@okhdfcbank" autoCapitalize="none" />
        </Card>

        {/* Bill Theme & Formats */}
        <Card>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Print & PDF Tax Invoice Formats</Text>
          <Select
            label="Bill Layout Template"
            value={billFormat}
            onChange={setBillFormat}
            options={[
              { label: 'Classic Tax Invoice', value: 'classic' },
              { label: 'Vyapar Style Theme', value: 'vyapar' },
              { label: 'Marg ERP Layout', value: 'marg' },
              { label: 'Miracle Style Format', value: 'miracle' },
              { label: 'Tally e-Invoice Format', value: 'tally' },
              { label: 'Busy Accounting Design', value: 'busy' },
              { label: 'Modern Minimalist', value: 'modern' },
            ]}
          />

          <View style={styles.grid2}>
            <Input label="Bill Header Title" value={billTitle} onChangeText={setBillTitle} placeholder="TAX INVOICE" containerStyle={{ flex: 1 }} />
            <Input label="Signatory Title" value={billSignatory} onChangeText={setBillSignatory} placeholder="Authorised Signatory" containerStyle={{ flex: 1 }} />
          </View>

          <Input label="Terms & Conditions (Printed on Bill)" value={billTerms} onChangeText={setBillTerms} multiline numberOfLines={3} />
        </Card>

        <Button
          title={editId ? 'Save Business Profile' : 'Create Firm Profile'}
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
});
