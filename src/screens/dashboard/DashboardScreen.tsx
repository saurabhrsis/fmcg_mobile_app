import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { DashboardMetrics } from '../../types';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetrics = async () => {
    if (!activeBusiness) return;
    try {
      const data = await reportService.getDashboardMetrics(activeBusiness.id);
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMetrics();
    }, [activeBusiness])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  const maxSales = Math.max(...(metrics?.trend.map((t) => t.sales) || [1]), 1);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.palette.primary]}
          />
        }
      >
        {/* Header Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={[styles.greetingText, { color: colors.text }]}>
              Hello, {user?.name || 'User'} 👋
            </Text>
            <Text style={[styles.businessSub, { color: colors.textMuted }]}>
              {activeBusiness?.name || 'RightServe FMCG'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.navigate('BatchStock')}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {((metrics?.lowStockCount || 0) > 0 || (metrics?.expSoonCount || 0) > 0) && (
              <View style={[styles.badgeDot, { backgroundColor: colors.palette.danger }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.palette.primary }]}
            onPress={() =>
              navigation.navigate('CreateInvoice', { type: 'sale' })
            }
          >
            <Ionicons name="cart" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.actionChipText}>+ New Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.palette.accent }]}
            onPress={() =>
              navigation.navigate('CreateInvoice', { type: 'purchase' })
            }
          >
            <Ionicons name="bag-add" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.actionChipText}>+ Purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.navigate('CreatePayment')}
          >
            <Ionicons name="cash-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.actionChipText, { color: colors.text }]}>+ Payment</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Stat Grid */}
        <View style={styles.gridRow}>
          <StatCard
            title="Today's Sales"
            value={formatCurrency(metrics?.todaySales || 0)}
            icon="cash"
            color={colors.palette.primary}
            onPress={() => navigation.navigate('InvoiceList', { type: 'sale' })}
          />
          <StatCard
            title="Month Sales"
            value={formatCurrency(metrics?.monthSales || 0)}
            icon="trending-up"
            color={colors.palette.success}
            onPress={() => navigation.navigate('InvoiceList', { type: 'sale' })}
          />
        </View>

        <View style={styles.gridRow}>
          <StatCard
            title="Receivables"
            value={formatCurrency(metrics?.receivable || 0)}
            subtitle="To Collect"
            icon="arrow-down-circle"
            color={colors.palette.primary}
            onPress={() => navigation.navigate('PartyList', { type: 'customer' })}
          />
          <StatCard
            title="Payables"
            value={formatCurrency(metrics?.payable || 0)}
            subtitle="To Pay"
            icon="arrow-up-circle"
            color={colors.palette.danger}
            onPress={() => navigation.navigate('PartyList', { type: 'supplier' })}
          />
        </View>

        <View style={styles.gridRow}>
          <StatCard
            title="Month Purchase"
            value={formatCurrency(metrics?.monthPurchase || 0)}
            icon="basket"
            color={colors.palette.warning}
            onPress={() => navigation.navigate('InvoiceList', { type: 'purchase' })}
          />
          <StatCard
            title="Stock Value"
            value={formatCurrency(metrics?.stockValue || 0)}
            subtitle={`${metrics?.itemCount || 0} Items`}
            icon="cube"
            color={colors.palette.accent}
            onPress={() => navigation.navigate('ItemList')}
          />
        </View>

        {/* 7-Day Sales Trend Chart */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>7-Day Sales Trend</Text>
            <Ionicons name="bar-chart-outline" size={18} color={colors.palette.primary} />
          </View>
          <View style={styles.chartContainer}>
            {metrics?.trend.map((t, idx) => {
              const heightPct = Math.max(12, Math.round((t.sales / maxSales) * 100));
              const dayLabel = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <View key={idx} style={styles.chartCol}>
                  <Text style={[styles.chartBarValue, { color: colors.textMuted }]}>
                    {t.sales > 0 ? (t.sales >= 1000 ? `${Math.round(t.sales / 1000)}k` : Math.round(t.sales)) : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: t.sales > 0 ? colors.palette.primary : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartDayLabel, { color: colors.textMuted }]}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Critical Alerts: Low Stock & Expiring */}
        {((metrics?.lowStockCount || 0) > 0 || (metrics?.expSoonCount || 0) > 0) && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Action Needed</Text>
              <Badge label="Alerts" variant="danger" />
            </View>

            {metrics?.lowStock && metrics.lowStock.length > 0 && (
              <View style={styles.alertItem}>
                <View style={[styles.alertIconBox, { backgroundColor: '#ffe4e6' }]}>
                  <Ionicons name="alert-circle" size={20} color="#e11d48" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertHeading, { color: colors.text }]}>
                    {metrics.lowStock.length} Items with Low Stock
                  </Text>
                  <Text style={[styles.alertSub, { color: colors.textMuted }]}>
                    {metrics.lowStock.slice(0, 2).map((x) => x.name).join(', ')}
                    {metrics.lowStock.length > 2 ? ` +${metrics.lowStock.length - 2} more` : ''}
                  </Text>
                </View>
                <Button
                  title="View"
                  size="sm"
                  variant="outline"
                  onPress={() => navigation.navigate('ItemList')}
                />
              </View>
            )}

            {metrics?.expSoon && metrics.expSoon.length > 0 && (
              <View style={[styles.alertItem, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                <View style={[styles.alertIconBox, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="time" size={20} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertHeading, { color: colors.text }]}>
                    {metrics.expSoon.length} Batches Expiring in 30 Days
                  </Text>
                  <Text style={[styles.alertSub, { color: colors.textMuted }]}>
                    {metrics.expSoon.slice(0, 2).map((x) => `${x.item_name} (${x.batch_no})`).join(', ')}
                  </Text>
                </View>
                <Button
                  title="View"
                  size="sm"
                  variant="outline"
                  onPress={() => navigation.navigate('BatchStock')}
                />
              </View>
            )}
          </Card>
        )}

        {/* Top Selling Products */}
        {metrics?.topItems && metrics.topItems.length > 0 && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Top Selling Items (30 Days)</Text>
              <Ionicons name="star" size={16} color="#f59e0b" />
            </View>
            {metrics.topItems.map((it, idx) => (
              <View
                key={idx}
                style={[
                  styles.topItemRow,
                  { borderBottomColor: idx === metrics.topItems.length - 1 ? 'transparent' : colors.border },
                ]}
              >
                <View style={[styles.rankBox, { backgroundColor: colors.palette.primaryLight }]}>
                  <Text style={[styles.rankText, { color: colors.palette.primaryDark }]}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topItemName, { color: colors.text }]} numberOfLines={1}>
                    {it.item_name}
                  </Text>
                  <Text style={[styles.topItemSub, { color: colors.textMuted }]}>
                    Sold: {it.qty} units
                  </Text>
                </View>
                <Text style={[styles.topItemAmt, { color: colors.text }]}>
                  {formatCurrency(it.amount)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
  },
  businessSub: {
    fontSize: 13,
    marginTop: 2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionChipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarValue: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 75,
    justifyContent: 'flex-end',
    borderRadius: 4,
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartDayLabel: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '500',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertSub: {
    fontSize: 11,
    marginTop: 2,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  rankBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  topItemSub: {
    fontSize: 11,
  },
  topItemAmt: {
    fontSize: 13,
    fontWeight: '700',
  },
});
