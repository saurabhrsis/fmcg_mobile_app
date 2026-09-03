import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../context/ThemeContext';
import { ewayService } from '../../services/ewayService';
import { EwayBill } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const EwayDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const ewayId = route.params?.id;

  const [eway, setEway] = useState<EwayBill | null>(null);
  const [ewbNo, setEwbNo] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await ewayService.getEwayBillById(ewayId);
      setEway(data);
      if (data) setEwbNo(data.ewb_no || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ewayId]);

  const handleUpdateEwbNo = async () => {
    if (!eway) return;
    try {
      await ewayService.updateEwayBill(eway.id, {
        ewb_no: ewbNo.trim(),
        status: ewbNo.trim() ? 'generated' : 'draft',
      });
      Alert.alert('Updated', 'E-Way bill number recorded');
      await loadData();
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleExportJson = async () => {
    if (!eway) return;
    try {
      const jsonPayload = ewayService.generatePortalJson(eway);
      const jsonStr = JSON.stringify(jsonPayload, null, 2);

      const fileUri = `${FileSystem.documentDirectory}EWB_${eway.doc_no || eway.id}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export E-Way Bill JSON',
        });
      } else {
        Alert.alert('JSON Exported', 'Saved to app documents');
      }
    } catch (e: any) {
      Alert.alert('Export Error', e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete E-Way Bill', 'Are you sure you want to delete this transport record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (eway) {
            await ewayService.deleteEwayBill(eway.id);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  if (!eway && !loading) {
    return (
      <ScreenWrapper title="E-Way Bill Details">
        <View style={styles.center}><Text style={{ color: colors.text }}>E-Way Bill Not Found</Text></View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper
      title={eway?.ewb_no ? `EWB #${eway.ewb_no}` : `Doc: ${eway?.doc_no || 'E-Way Bill'}`}
      subtitle={eway ? `Dated: ${formatDate(eway.doc_date || eway.ewb_date)}` : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Card */}
        <Card>
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.title, { color: colors.palette.primary }]}>
                {eway?.ewb_no ? `EWB #${eway.ewb_no}` : `Doc: ${eway?.doc_no || 'Draft'}`}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                Dated: {formatDate(eway?.doc_date || eway?.ewb_date)}
              </Text>
            </View>
            <Badge
              label={eway?.status.toUpperCase() || 'DRAFT'}
              variant={eway?.status === 'generated' ? 'success' : 'neutral'}
            />
          </View>

          {/* Quick JSON Export Button */}
          <Button
            title="Export GST Portal JSON"
            icon="download-outline"
            onPress={handleExportJson}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Portal EWB Update Card */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Portal E-Way Bill Number</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
            Enter the 12-digit number issued by the GST E-Way portal
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Input
              value={ewbNo}
              onChangeText={setEwbNo}
              placeholder="e.g. 121345678901"
              keyboardType="numeric"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button title="Save No" size="sm" onPress={handleUpdateEwbNo} />
          </View>
        </Card>

        {/* Route Details */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Route & Party Info</Text>

          <View style={styles.addressBox}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>DISPATCH FROM:</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{eway?.from_name}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{eway?.from_addr} {eway?.from_place ? `, ${eway.from_place}` : ''}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>GSTIN: {eway?.from_gstin || 'URP'} • State: {eway?.from_state}</Text>
          </View>

          <View style={[styles.addressBox, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>SHIP TO:</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{eway?.to_name}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{eway?.to_addr} {eway?.to_place ? `, ${eway.to_place}` : ''}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>GSTIN: {eway?.to_gstin || 'URP'} • State: {eway?.to_state}</Text>
          </View>
        </Card>

        {/* Transport Specs */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>Transport Vehicle</Text>
          <View style={styles.grid2}>
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Vehicle No</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{eway?.vehicle_no || 'N/A'}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Distance</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{eway?.trans_distance} km</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Mode</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{eway?.trans_mode?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Goods Value</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.palette.primary }}>
                {formatCurrency(eway?.total_value)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Delete */}
        <Button
          title="Delete E-Way Bill"
          variant="danger"
          icon="trash-outline"
          onPress={handleDelete}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addressBox: {
    gap: 2,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
