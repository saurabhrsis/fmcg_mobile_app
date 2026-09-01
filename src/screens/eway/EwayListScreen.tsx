import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { ewayService } from '../../services/ewayService';
import { EwayBill } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const EwayListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [ewayBills, setEwayBills] = useState<EwayBill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEwayBills = async () => {
    if (!activeBusiness) return;
    try {
      const list = await ewayService.getAllEwayBills(activeBusiness.id);
      setEwayBills(list);
    } catch (e) {
      console.error('Failed to load e-way bills:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEwayBills();
    }, [activeBusiness])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEwayBills();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>E-Way Bills</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Transport documents for goods movement
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.palette.primary }]}
            onPress={() => navigation.navigate('EwayForm')}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={ewayBills}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="car-outline"
              title="No E-Way Bills"
              description="Create e-way bills linked to invoices or export GSTN JSON"
              actionTitle="Create E-Way Bill"
              onAction={() => navigation.navigate('EwayForm')}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('EwayDetail', { id: item.id })}
            >
              <View style={styles.topRow}>
                <View>
                  <Text style={[styles.docNo, { color: colors.palette.primary }]}>
                    {item.ewb_no ? `EWB: ${item.ewb_no}` : `Doc: ${item.doc_no || 'Draft'}`}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Date: {formatDate(item.ewb_date || item.doc_date)} • Inv: {item.invoice_no || '-'}
                  </Text>
                </View>
                <Badge
                  label={item.status.toUpperCase()}
                  variant={item.status === 'generated' ? 'success' : 'neutral'}
                />
              </View>

              <View style={[styles.routeBox, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' }}>From</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {item.from_name || 'Business'} ({item.from_state || 'State'})
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.textMuted} style={{ marginHorizontal: 8 }} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase' }}>To</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {item.to_name || 'Recipient'} ({item.to_state || 'State'})
                  </Text>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  Vehicle: {item.vehicle_no || 'N/A'} • {item.trans_distance || 0} km
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {formatCurrency(item.total_value)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  docNo: {
    fontSize: 15,
    fontWeight: '700',
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});
