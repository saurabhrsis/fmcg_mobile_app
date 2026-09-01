import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { partyService } from '../../services/partyService';
import { whatsappService } from '../../services/whatsappService';
import { Party } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { SearchBar } from '../../components/common/SearchBar';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export const PartyListScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>(route.params?.type || 'customer');
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadParties = async () => {
    if (!activeBusiness) return;
    try {
      const list = await partyService.getAllParties(activeTab, search, activeBusiness.id);
      setParties(list);
    } catch (e) {
      console.error('Failed to load parties:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadParties();
    }, [activeBusiness, activeTab, search])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParties();
    setRefreshing(false);
  };

  const handleSendReminder = async (party: Party) => {
    if (!activeBusiness) return;
    const msg = whatsappService.buildOutstandingReminderMessage(activeBusiness, party);
    const ok = await whatsappService.sendWhatsApp(party.phone, msg);
    if (!ok) {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp');
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Customer / Supplier Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'customer' ? colors.palette.primary : colors.surfaceSubtle,
              },
            ]}
            onPress={() => setActiveTab('customer')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'customer' ? '#ffffff' : colors.text },
              ]}
            >
              Customers (Buyers)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'supplier' ? colors.palette.primary : colors.surfaceSubtle,
              },
            ]}
            onPress={() => setActiveTab('supplier')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'supplier' ? '#ffffff' : colors.text },
              ]}
            >
              Suppliers (Vendors)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search & Add */}
        <View style={styles.searchRow}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${activeTab}s by name, phone, GSTIN...`}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.palette.primary }]}
            onPress={() => navigation.navigate('PartyForm', { type: activeTab })}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Party List */}
        <FlatList
          data={parties}
          keyExtractor={(p) => String(p.id)}
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
              icon="people-outline"
              title={`No ${activeTab}s Found`}
              description="Tap the + button above to add new customer or supplier"
              actionTitle={`Add ${activeTab.toUpperCase()}`}
              onAction={() => navigation.navigate('PartyForm', { type: activeTab })}
            />
          }
          renderItem={({ item }) => {
            const bal = item.balance || 0;
            const owesUs = bal > 0;
            const weOwe = bal < 0;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.partyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => navigation.navigate('PartyDetail', { id: item.id })}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.partyName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {item.phone || 'No phone'} {item.state ? `• ${item.state}` : ''}
                    </Text>
                    {item.gstin ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        GSTIN: {item.gstin}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.balVal,
                        {
                          color: owesUs
                            ? colors.palette.primary
                            : weOwe
                            ? colors.palette.danger
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {formatCurrency(Math.abs(bal))}
                    </Text>
                    <Text style={[styles.balLabel, { color: colors.textMuted }]}>
                      {owesUs ? 'Receivable' : weOwe ? 'Payable' : 'Settled'}
                    </Text>
                  </View>
                </View>

                {/* WhatsApp reminder shortcut for outstanding customers */}
                {owesUs && item.phone ? (
                  <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.reminderBtn, { backgroundColor: '#dcfce7' }]}
                      onPress={() => handleSendReminder(item)}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#15803d" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#15803d', fontSize: 11, fontWeight: '700' }}>
                        Send WhatsApp Reminder
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
  },
  balVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  balLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  actionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
});
