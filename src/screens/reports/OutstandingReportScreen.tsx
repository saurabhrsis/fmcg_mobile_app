import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { reportService } from '../../services/reportService';
import { whatsappService } from '../../services/whatsappService';
import { Party } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

export const OutstandingReportScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
  const [data, setData] = useState<{ receivables: Party[]; payables: Party[] }>({
    receivables: [],
    payables: [],
  });

  const loadData = async () => {
    if (!activeBusiness) return;
    try {
      const res = await reportService.getOutstandingReport(activeBusiness.id);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  const handleSendReminder = async (p: Party) => {
    if (!activeBusiness) return;
    const msg = whatsappService.buildOutstandingReminderMessage(activeBusiness, p);
    const ok = await whatsappService.sendWhatsApp(p.phone, msg);
    if (!ok) {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp');
    }
  };

  const list = activeTab === 'receivables' ? data.receivables : data.payables;
  const totalAmount = list.reduce((acc, cur) => acc + (cur.balance || 0), 0);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'receivables' ? colors.palette.primary : colors.surfaceSubtle,
              },
            ]}
            onPress={() => setActiveTab('receivables')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'receivables' ? '#ffffff' : colors.text },
              ]}
            >
              Receivables (To Collect)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              {
                backgroundColor:
                  activeTab === 'payables' ? colors.palette.danger : colors.surfaceSubtle,
              },
            ]}
            onPress={() => setActiveTab('payables')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'payables' ? '#ffffff' : colors.text },
              ]}
            >
              Payables (To Pay)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Outstanding Card */}
        <Card
          style={[
            styles.bannerCard,
            {
              backgroundColor:
                activeTab === 'receivables' ? colors.palette.primaryLight : '#ffe4e6',
            },
          ]}
        >
          <Text
            style={[
              styles.bannerLabel,
              {
                color:
                  activeTab === 'receivables' ? colors.palette.primaryDark : '#be123c',
              },
            ]}
          >
            Total {activeTab === 'receivables' ? 'Outstanding Receivables' : 'Outstanding Payables'}
          </Text>
          <Text
            style={[
              styles.bannerValue,
              {
                color:
                  activeTab === 'receivables' ? colors.palette.primaryDark : '#be123c',
              },
            ]}
          >
            {formatCurrency(totalAmount)}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: activeTab === 'receivables' ? colors.palette.primaryDark : '#be123c',
              marginTop: 2,
            }}
          >
            Across {list.length} accounts
          </Text>
        </Card>

        {/* Parties List */}
        <FlatList
          data={list}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-circle-outline"
              title="No Outstanding Balance"
              description={`All ${activeTab} accounts are completely settled.`}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.partyCard}>
              <View style={styles.partyTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.partyName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {item.phone || 'No phone'} • {item.state || 'India'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.balVal,
                    { color: activeTab === 'receivables' ? colors.palette.primary : colors.palette.danger },
                  ]}
                >
                  {formatCurrency(item.balance || 0)}
                </Text>
              </View>

              <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Parties', { screen: 'PartyDetail', params: { id: item.id } })}
                  style={styles.actionBtn}
                >
                  <Ionicons name="document-text-outline" size={14} color={colors.text} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600' }}>Ledger</Text>
                </TouchableOpacity>

                {item.phone && activeTab === 'receivables' ? (
                  <TouchableOpacity
                    onPress={() => handleSendReminder(item)}
                    style={[styles.actionBtn, { backgroundColor: '#dcfce7', paddingHorizontal: 8, borderRadius: 4 }]}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#15803d" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>WhatsApp Reminder</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>
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
  bannerCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 14,
    alignItems: 'center',
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bannerValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  partyCard: {
    padding: 12,
    marginBottom: 8,
  },
  partyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  balVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
