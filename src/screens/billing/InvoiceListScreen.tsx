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
import { invoiceService } from '../../services/invoiceService';
import { BillType, Invoice, InvoiceType, NoteKind } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { SearchBar } from '../../components/common/SearchBar';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export const InvoiceListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const initialType: InvoiceType = route.params?.type || 'sale';
  const [activeTab, setActiveTab] = useState<string>(initialType);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // Optional filter: only GST bills or only non-GST (bill of supply) records.
  const [billFilter, setBillFilter] = useState<'' | BillType>('');

  const loadInvoices = async () => {
    if (!activeBusiness) return;
    try {
      let type: InvoiceType = 'sale';
      let noteKind: NoteKind | undefined = undefined;

      if (activeTab === 'sale') {
        type = 'sale';
        noteKind = '';
      } else if (activeTab === 'purchase') {
        type = 'purchase';
        noteKind = '';
      } else if (activeTab === 'quotation') {
        type = 'quotation';
      } else if (activeTab === 'credit') {
        type = 'sale';
        noteKind = 'credit';
      } else if (activeTab === 'debit') {
        type = 'purchase';
        noteKind = 'debit';
      }

      const list = await invoiceService.getAllInvoices(activeBusiness.id, {
        type,
        noteKind,
        query: search,
        billType: billFilter || undefined,
      });
      setInvoices(list);
    } catch (e) {
      console.error('Failed to load invoices:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [activeBusiness, activeTab, search, billFilter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'accepted':
        return <Badge label={status} variant="success" />;
      case 'partial':
        return <Badge label={status} variant="warning" />;
      case 'unpaid':
      case 'rejected':
        return <Badge label={status} variant="danger" />;
      case 'converted':
        return <Badge label="converted" variant="info" />;
      case 'open':
      default:
        return <Badge label={status} variant="neutral" />;
    }
  };

  const tabs = [
    { key: 'sale', label: 'Sales' },
    { key: 'purchase', label: 'Purchases' },
    { key: 'quotation', label: 'Quotations' },
    { key: 'credit', label: 'Credit Notes' },
    { key: 'debit', label: 'Debit Notes' },
  ];

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Tab Pills */}
        <View style={styles.tabBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={tabs}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor:
                      activeTab === item.key ? colors.palette.primary : colors.surfaceSubtle,
                  },
                ]}
                onPress={() => setActiveTab(item.key)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === item.key ? '#ffffff' : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Search & Actions Bar */}
        <View style={styles.searchBarRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${activeTab} invoices...`}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.palette.primary }]}
            onPress={() => {
              let createType: InvoiceType = 'sale';
              let createNoteKind: NoteKind = '';
              if (activeTab === 'purchase') createType = 'purchase';
              else if (activeTab === 'quotation') createType = 'quotation';
              else if (activeTab === 'credit') {
                createType = 'sale';
                createNoteKind = 'credit';
              } else if (activeTab === 'debit') {
                createType = 'purchase';
                createNoteKind = 'debit';
              }

              navigation.navigate('CreateInvoice', {
                type: createType,
                noteKind: createNoteKind,
              });
            }}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* GST / Non-GST filter */}
        <View style={styles.filterRow}>
          {([
            { key: '', label: 'All bills' },
            { key: 'gst', label: 'GST bills' },
            { key: 'non_gst', label: 'Non-GST bills' },
          ] as const).map((f) => {
            const active = billFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key || 'all'}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.palette.primaryLight : 'transparent',
                    borderColor: active ? colors.palette.primary : colors.border,
                  },
                ]}
                onPress={() => setBillFilter(f.key as '' | BillType)}
              >
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '700',
                    color: active ? colors.palette.primaryDark : colors.textMuted,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Invoice List */}
        <FlatList
          data={invoices}
          keyExtractor={(item) => String(item.id)}
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
              title={`No ${activeTab} records`}
              description="Tap the + button above to create a new voucher"
              actionTitle={`Create ${activeTab.toUpperCase()}`}
              onAction={() =>
                navigation.navigate('CreateInvoice', {
                  type: activeTab === 'purchase' ? 'purchase' : activeTab === 'quotation' ? 'quotation' : 'sale',
                  noteKind: activeTab === 'credit' ? 'credit' : activeTab === 'debit' ? 'debit' : '',
                })
              }
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.invoiceCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
            >
              <View style={styles.invTopRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View>
                    <Text style={[styles.invNo, { color: colors.palette.primary }]}>
                      {item.invoice_no}
                    </Text>
                    <Text style={[styles.invDate, { color: colors.textMuted }]}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  {item.bill_type === 'non_gst' ? (
                    <Badge label="NON-GST" variant="warning" />
                  ) : item.gst_type === 'nil' ? (
                    <Badge label="NIL" variant="neutral" />
                  ) : null}
                </View>
                {getStatusBadge(item.status)}
              </View>

              <View style={styles.partyRow}>
                <Ionicons name="person-circle-outline" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.partyName, { color: colors.text }]} numberOfLines={1}>
                  {item.party_name || 'Walk-in Customer'}
                </Text>
              </View>

              <View style={[styles.invBottomRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total Amount</Text>
                  <Text style={[styles.amountVal, { color: colors.text }]}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>

                {item.type !== 'quotation' && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Balance Due</Text>
                    <Text
                      style={[
                        styles.amountVal,
                        { color: item.total - item.paid > 0 ? colors.palette.danger : colors.palette.success },
                      ]}
                    >
                      {formatCurrency(Math.max(0, item.total - item.paid))}
                    </Text>
                  </View>
                )}
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
  tabBar: {
    paddingVertical: 10,
  },
  tabChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  invTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invNo: {
    fontSize: 15,
    fontWeight: '700',
  },
  invDate: {
    fontSize: 11,
    marginTop: 2,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '600',
  },
  invBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  amountLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  amountVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});
