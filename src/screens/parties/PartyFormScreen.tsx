import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';
import { useBusiness } from '../../context/BusinessContext';
import { partyService } from '../../services/partyService';
import { lookupService } from '../../services/lookupService';
import { isValidGstinFormat } from '../../utils/gstState';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StateSelect } from '../../components/common/StateSelect';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export const PartyFormScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { ensureWritable } = useLicense();
  const { activeBusiness } = useBusiness();
  const editId = route.params?.id;
  const initialType = route.params?.type || 'customer';
  // Opened from the billing screen as "walk-in customer — name only".
  const walkInParam = !!route.params?.walkIn;

  const [name, setName] = useState('');
  const [type, setType] = useState<'customer' | 'supplier'>(initialType);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState(walkInParam ? '' : 'Delhi');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [walkIn, setWalkIn] = useState(walkInParam);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editId) {
      (async () => {
        const p = await partyService.getPartyById(editId);
        if (p) {
          setName(p.name);
          setType(p.type);
          setPhone(p.phone);
          setEmail(p.email);
          setGstin(p.gstin);
          setAddress(p.address);
          setState(p.state || (walkInParam ? '' : 'Delhi'));
          setOpeningBalance(String(p.opening_balance || 0));
          setWalkIn(partyService.isWalkIn(p));
        }
      })();
    }
  }, [editId]);

  const handleGstinChange = (text: string) => {
    const clean = text.toUpperCase().trim();
    setGstin(clean);
    if (clean.length === 15) {
      const decoded = lookupService.decodeGstin(clean);
      if (decoded.valid && decoded.stateName) {
        setState(decoded.stateName);
      }
    }
  };

  const handleSave = async () => {
    const gate = ensureWritable();
    if (!gate.allowed) {
      Alert.alert('Read-Only Mode', gate.reason || 'Your license is not active.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Party Name is required');
      return;
    }
    if (gstin.trim() && !isValidGstinFormat(gstin)) {
      Alert.alert(
        'Invalid GSTIN',
        'The GSTIN should be 15 characters (e.g. 07AAAAA0000A1Z5). Leave it blank for an unregistered / walk-in customer.'
      );
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await partyService.updateParty(editId, {
          name,
          type,
          phone,
          email,
          gstin,
          address,
          state,
          opening_balance: parseFloat(openingBalance) || 0,
        });
      } else {
        await partyService.createParty({
          name,
          type,
          phone,
          email,
          gstin,
          address,
          state,
          opening_balance: parseFloat(openingBalance) || 0,
        });
      }

      Alert.alert('Success', `Party "${name}" saved successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper
      title={editId ? 'Edit Party Profile' : 'Add New Customer / Supplier'}
      subtitle="Customer or supplier account"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {editId ? 'Edit Party Profile' : 'Add New Customer / Supplier'}
        </Text>

        <Card>
          {/* Walk-in: only the name is needed, everything else can wait */}
          <TouchableOpacity
            style={[styles.walkInToggle, { borderColor: walkIn ? colors.palette.primary : colors.border, backgroundColor: walkIn ? colors.palette.primaryLight : colors.surfaceSubtle }]}
            activeOpacity={0.8}
            onPress={() => setWalkIn(!walkIn)}
          >
            <Ionicons
              name={walkIn ? 'checkbox' : 'square-outline'}
              size={20}
              color={walkIn ? colors.palette.primaryDark : colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.walkInTitle, { color: colors.text }]}>Walk-in customer (name only)</Text>
              <Text style={[styles.walkInSub, { color: colors.textMuted }]}>
                Bill them straight away — phone, GSTIN, state and address can be updated here later.
              </Text>
            </View>
          </TouchableOpacity>

          <Input
            label="Party / Business Name *"
            value={name}
            onChangeText={setName}
            placeholder={walkIn ? 'e.g. Walk-in Customer' : 'e.g. Gupta Supermarket'}
          />

          <Select
            label="Party Type"
            value={type}
            onChange={setType}
            options={[
              { label: 'Customer (Buyer)', value: 'customer' },
              { label: 'Supplier (Vendor)', value: 'supplier' },
            ]}
          />

          <View style={styles.grid2}>
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <Input
            label={walkIn ? 'GSTIN Number (add later if needed)' : 'GSTIN Number (15 Digits)'}
            value={gstin}
            onChangeText={handleGstinChange}
            placeholder="e.g. 07AAAAA0000A1Z5"
            autoCapitalize="characters"
            maxLength={15}
          />

          <View style={styles.grid2}>
            <StateSelect
              label="State"
              value={state}
              onChange={(sName) => setState(sName)}
              allowClear
              placeholder={walkIn ? 'Optional' : 'Select state...'}
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Opening Balance (₹)"
              value={openingBalance}
              onChangeText={setOpeningBalance}
              placeholder="0"
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <Input
            label="Full Address / Location"
            value={address}
            onChangeText={setAddress}
            placeholder="Street address, city, pin code"
            multiline
            numberOfLines={2}
          />

          {walkIn && (
            <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }}>
              Only the name is required. The customer is flagged as a walk-in until you add a phone
              number or GSTIN — the flag clears itself automatically once the profile is complete.
            </Text>
          )}
        </Card>

        <Button
          title={editId ? 'Save Changes' : walkIn ? 'Save Walk-in Customer' : 'Create Party'}
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
  walkInToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  walkInTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  walkInSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
