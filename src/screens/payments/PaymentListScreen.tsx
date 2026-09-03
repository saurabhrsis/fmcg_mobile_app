import React, { useState, useCallback } from 'react';
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
import { paymentService } from '../../services/paymentService';
import { Payment, PaymentType } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const PaymentListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<PaymentType>('in');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    if (!activeBusiness) return;
    try {
      const list = await paymentService.getAllPayments(activeBusiness.id, {
        type: activeTab,
      });
      setPayments(list);
    } catch (e) {
      console.error('Failed to load payments:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [activeBusiness, activeTab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper title="Payments & Receipts" subtitle="Transactions & payment logs">
      <View style={styles.container}>
        {/* Switcher Tab */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'in' ? colors.palette.success : colors.surfaceSubtle,
                borderColor: activeTab === 'in' ? colors.palette.success : colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setActiveTab('in')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'in' ? '#ffffff' : colors.text },
              ]}
            >
              Money In (Receipts)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'out' ? colors.palette.danger : colors.surfaceSubtle,
                borderColor: activeTab === 'out' ? colors.palette.danger : colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setActiveTab('out')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'out' ? '#ffffff' : colors.text },
              ]}
            >
              Money Out (Payments)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {activeTab === 'in' ? 'Receipts Log' : 'Payments Log'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Transactions recorded for {activeBusiness?.name}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: activeTab === 'in' ? colors.palette.success : colors.palette.danger }]}
            onPress={() => navigation.navigate('CreatePayment', { type: activeTab })}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Payments List */}
        <FlatList
          data={payments}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cash-outline"
              title={`No ${activeTab === 'in' ? 'Receipts' : 'Payments'} Found`}
              description="Record payments received from customers or paid to vendors"
              actionTitle={`Record ${activeTab === 'in' ? 'Receipt' : 'Payment'}`}
              onAction={() => navigation.navigate('CreatePayment', { type: activeTab })}
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.payCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyName, { color: colors.text }]}>
                    {item.party_name || 'Direct Party'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    Date: {formatDate(item.date)} • Mode: {item.mode.toUpperCase()}
                    {item.invoice_no ? ` • Inv: ${item.invoice_no}` : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.amount,
                    { color: item.type === 'in' ? colors.palette.success : colors.palette.danger },
                  ]}
                >
                  {item.type === 'in' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
              </View>
              {item.notes ? (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                  Note: {item.notes}
                </Text>
              ) : null}
            </View>
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
});
