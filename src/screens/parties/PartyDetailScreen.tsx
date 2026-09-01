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
import { useBusiness } from '../../context/BusinessContext';
import { partyService } from '../../services/partyService';
import { whatsappService } from '../../services/whatsappService';
import { Party } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

export const PartyDetailScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const partyId = route.params?.id;

  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!activeBusiness || !partyId) return;
    try {
      const data = await partyService.getPartyById(partyId, activeBusiness.id);
      setParty(data);
    } catch (e) {
      console.error('Failed to load party:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [partyId, activeBusiness]);

  const handleSendReminder = async () => {
    if (!activeBusiness || !party) return;
    const msg = whatsappService.buildOutstandingReminderMessage(activeBusiness, party);
    const ok = await whatsappService.sendWhatsApp(party.phone, msg);
    if (!ok) {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Party', `Are you sure you want to delete "${party?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (party) {
            await partyService.deleteParty(party.id);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const bal = party?.balance || 0;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Party Profile Card */}
        <Card>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{party?.name}</Text>
              <Text style={[styles.typeText, { color: colors.palette.primary }]}>
                {party?.type.toUpperCase()} ACCOUNT
              </Text>
            </View>
            <Badge
              label={bal > 0 ? 'Receivable' : bal < 0 ? 'Payable' : 'Settled'}
              variant={bal > 0 ? 'primary' : bal < 0 ? 'danger' : 'success'}
            />
          </View>

          {/* Current Outstanding Box */}
          <View
            style={[
              styles.balanceBox,
              { backgroundColor: bal > 0 ? colors.palette.primaryLight : '#f1f5f9' },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.balLabel,
                  { color: bal > 0 ? colors.palette.primaryDark : colors.textMuted },
                ]}
              >
                Current Balance
              </Text>
              <Text
                style={[
                  styles.balNum,
                  { color: bal > 0 ? colors.palette.primaryDark : colors.text },
                ]}
              >
                {formatCurrency(Math.abs(bal))}
              </Text>
            </View>
            {party?.phone ? (
              <Button
                title="WhatsApp"
                size="sm"
                variant="success"
                icon="logo-whatsapp"
                onPress={handleSendReminder}
              />
            ) : null}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Phone</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{party?.phone || '-'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{party?.email || '-'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>GSTIN</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{party?.gstin || '-'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>State</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{party?.state || '-'}</Text>
            </View>
            <View style={{ width: '100%', marginTop: 6 }}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Billing Address</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{party?.address || '-'}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Action Shortcuts */}
        <View style={styles.actionGrid}>
          <Button
            title={party?.type === 'supplier' ? '+ Purchase' : '+ New Sale'}
            icon="cart"
            onPress={() =>
              navigation.navigate('CreateInvoice', { type: party?.type === 'supplier' ? 'purchase' : 'sale' })
            }
            style={{ flex: 1 }}
          />
          <Button
            title={party?.type === 'supplier' ? 'Pay Out' : 'Receive Money'}
            icon="cash"
            variant="secondary"
            onPress={() =>
              navigation.navigate('CreatePayment', { partyId: party?.id, type: party?.type === 'supplier' ? 'out' : 'in' })
            }
            style={{ flex: 1 }}
          />
        </View>

        {/* Invoices History */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Invoices & Bills ({(party?.invoices || []).length})
          </Text>
          {(party?.invoices || []).map((inv, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.historyRow,
                { borderBottomColor: idx === (party?.invoices?.length || 0) - 1 ? 'transparent' : colors.border },
              ]}
              onPress={() => navigation.navigate('InvoiceDetail', { id: inv.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyNo, { color: colors.palette.primary }]}>{inv.invoice_no}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatDate(inv.date)} • {inv.type.toUpperCase()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{formatCurrency(inv.total)}</Text>
                <Text style={{ fontSize: 11, color: inv.status === 'paid' ? colors.palette.success : colors.palette.warning }}>
                  {inv.status.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Payments History */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Payments & Receipts ({(party?.payments || []).length})
          </Text>
          {(party?.payments || []).map((pay, idx) => (
            <View
              key={idx}
              style={[
                styles.historyRow,
                { borderBottomColor: idx === (party?.payments?.length || 0) - 1 ? 'transparent' : colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyNo, { color: colors.text }]}>
                  {pay.type === 'in' ? 'Payment Received' : 'Payment Made'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {formatDate(pay.date)} • Mode: {pay.mode.toUpperCase()}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: pay.type === 'in' ? colors.palette.success : colors.palette.danger,
                }}
              >
                {pay.type === 'in' ? '+' : '-'}{formatCurrency(pay.amount)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Footer Actions */}
        <View style={styles.footerRow}>
          <Button
            title="Edit Party Details"
            icon="create-outline"
            onPress={() => navigation.navigate('PartyForm', { id: party?.id })}
            style={{ flex: 1 }}
          />
          <Button
            title="Delete"
            variant="danger"
            icon="trash-outline"
            onPress={handleDelete}
            style={{ width: 100 }}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  balLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balNum: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCol: {
    width: '46%',
  },
  metaLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyNo: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
