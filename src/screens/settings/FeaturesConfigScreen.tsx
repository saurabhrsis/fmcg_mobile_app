import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { businessService } from '../../services/businessService';
import { CompanyFeatures } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';

export const FeaturesConfigScreen: React.FC = () => {
  const { colors } = useTheme();

  const [features, setFeatures] = useState<CompanyFeatures>({
    negativeStock: true,
    duplicateSerialAlert: true,
    autoRoundOff: true,
    trackSerials: true,
    multiUnitConversion: true,
    threeLevelDiscounts: true,
    quotations: true,
    ewayBills: true,
    billPackets: true,
    billConsignee: true,
    billDispatch: true,
    billOrderRef: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const f = await businessService.getCompanyFeatures();
      setFeatures((prev) => ({ ...prev, ...f }));
    })();
  }, []);

  const toggle = (key: keyof CompanyFeatures) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await businessService.updateCompanyFeatures(features);
      Alert.alert('Success', 'Company feature configurations updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const featureItems: Array<{ key: keyof CompanyFeatures; label: string; desc: string }> = [
    {
      key: 'negativeStock',
      label: 'Allow Negative Stock on Sales',
      desc: 'Allows billing goods even when current batch balance is 0 or negative',
    },
    {
      key: 'autoRoundOff',
      label: 'Auto Round-off Invoice Totals',
      desc: 'Rounds grand total to nearest rupee and records round-off adjustment',
    },
    {
      key: 'duplicateSerialAlert',
      label: 'Duplicate Serial / Batch Alert',
      desc: 'Warns when entering a serial or batch that already exists in warehouse',
    },
    {
      key: 'threeLevelDiscounts',
      label: '3-Tier Item Discounts (Trade / CD / Special)',
      desc: 'Enables entering separate Trade Discount, Cash Discount & Special Discount per line',
    },
    {
      key: 'multiUnitConversion',
      label: 'Unit Conversion Ladder Engine',
      desc: 'Enables buying and selling in packaging ladders (Bottle → Box → Carton)',
    },
    {
      key: 'trackSerials',
      label: 'Physical Serial Numbers Registry',
      desc: 'Tracks unique electronic / machine serial numbers across purchases and sales',
    },
    {
      key: 'quotations',
      label: 'Quotations & Estimates',
      desc: 'Enables non-accounting estimates that can be converted to sales with 1-tap',
    },
    {
      key: 'ewayBills',
      label: 'E-Way Bill Generation',
      desc: 'Enables transport document creation and GST portal JSON export',
    },
    {
      key: 'billConsignee',
      label: 'Show Consignee / Ship-To on Invoices',
      desc: 'Enables entering separate delivery party and shipping address on vouchers',
    },
    {
      key: 'billDispatch',
      label: 'Show Dispatch & Vehicle Details on Invoices',
      desc: 'Prints vehicle number, destination, and transport document info on tax invoice',
    },
  ];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Feature Toggles & Billing Flags</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Customize inventory behaviors, validation guards, and invoice layouts
        </Text>

        <Card>
          {featureItems.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.toggleRow,
                {
                  borderBottomColor:
                    idx === featureItems.length - 1 ? 'transparent' : colors.border,
                },
              ]}
              onPress={() => toggle(item.key)}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{item.desc}</Text>
              </View>
              <Ionicons
                name={features[item.key] ? 'toggle' : 'toggle-outline'}
                size={32}
                color={features[item.key] ? colors.palette.primary : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </Card>

        <Button
          title="Save Configurations"
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
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
});
