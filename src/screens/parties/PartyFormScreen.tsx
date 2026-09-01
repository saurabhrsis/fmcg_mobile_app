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
import { partyService } from '../../services/partyService';
import { lookupService } from '../../services/lookupService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const PartyFormScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const editId = route.params?.id;
  const initialType = route.params?.type || 'customer';

  const [name, setName] = useState('');
  const [type, setType] = useState<'customer' | 'supplier'>(initialType);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Delhi');
  const [openingBalance, setOpeningBalance] = useState('0');
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
          setState(p.state || 'Delhi');
          setOpeningBalance(String(p.opening_balance || 0));
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
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Party Name is required');
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
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          {editId ? 'Edit Party Profile' : 'Add New Customer / Supplier'}
        </Text>

        <Card>
          <Input
            label="Party / Business Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gupta Supermarket"
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
            label="GSTIN Number (15 Digits)"
            value={gstin}
            onChangeText={handleGstinChange}
            placeholder="e.g. 07AAAAA0000A1Z5"
            autoCapitalize="characters"
            maxLength={15}
          />

          <View style={styles.grid2}>
            <Input
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="e.g. Delhi, Maharashtra"
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
        </Card>

        <Button
          title={editId ? 'Save Changes' : 'Create Party'}
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
});
