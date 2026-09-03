import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { seedDatabase } from '../../db/database';

export const BusinessSetupScreen: React.FC = () => {
  const { checkSetupStatus, login } = useAuth();
  const { createBusiness, refreshBusinesses } = useBusiness();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSaveBusiness = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter Business Name');
      return;
    }
    setLoading(true);
    try {
      await createBusiness({
        name: name.trim(),
        gstin: gstin.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        state: state.trim(),
        state_code: stateCode.trim(),
        invoice_prefix: 'INV',
        terms: 'Goods once sold will not be taken back.',
        fy_start_month: 4,
        is_default: 1,
        active: 1,
        bill_number_start: 1,
        bill_format: 'classic',
        bill_color: '#0f766e',
        created_at: new Date().toISOString(),
      });
      await refreshBusinesses();
      await checkSetupStatus();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
      await refreshBusinesses();
      await checkSetupStatus();
      await login('admin', 'admin123');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.palette.primary }]}>
          <Ionicons name="business" size={36} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Welcome to FMCG Suite</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Let's setup your first enterprise business profile
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.palette.primary }]}>Business Details</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Trade / Business Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Apex FMCG Distributors"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Legal / Registered Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Apex Enterprise Pvt Ltd"
            placeholderTextColor={colors.textMuted}
            value={legalName}
            onChangeText={setLegalName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>GSTIN (15-digit)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="27AABCA1234F1Z5"
              placeholderTextColor={colors.textMuted}
              value={gstin}
              onChangeText={(t) => {
                setGstin(t.toUpperCase());
                if (t.length >= 2) setStateCode(t.substring(0, 2));
              }}
              autoCapitalize="characters"
              maxLength={15}
            />
          </View>
          <View style={[styles.inputGroup, { width: 90 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>State Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="27"
              placeholderTextColor={colors.textMuted}
              value={stateCode}
              onChangeText={setStateCode}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="9876543210"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="billing@apex.in"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Office / Godown Address</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
            placeholder="Shop No. 12, APMC Market"
            placeholderTextColor={colors.textMuted}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>City</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="Mumbai"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>State</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="Maharashtra"
              placeholderTextColor={colors.textMuted}
              value={state}
              onChangeText={setState}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.palette.primary }]}
          onPress={handleSaveBusiness}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Business & Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Or quick seed */}
      <View style={[styles.orDivider, { marginVertical: 20 }]}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.orText, { color: colors.textMuted }]}>OR FOR DEMONSTRATION</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      <TouchableOpacity
        style={[styles.demoCard, { backgroundColor: colors.palette.primaryLight, borderColor: colors.palette.primary }]}
        onPress={handleSeedDemoData}
        disabled={seeding}
      >
        <Ionicons name="sparkles" size={24} color={colors.palette.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.demoTitle, { color: colors.palette.primary }]}>
            Populate Full Demo FMCG Business
          </Text>
          <Text style={[styles.demoDesc, { color: colors.textSecondary }]}>
            Includes sample FMCG categories (Biscuits, Personal Care, Beverages), nested packaging units (Box → Inner → Pcs), GST rates, batch stock with expiry dates, sample parties &amp; sales invoices.
          </Text>
        </View>
        {seeding && <ActivityIndicator color={colors.palette.primary} />}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
