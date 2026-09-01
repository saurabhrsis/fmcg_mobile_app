import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useBusiness } from '../../context/BusinessContext';
import { notificationService, AppNotification } from '../../services/notificationService';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Badge } from '../../components/common/Badge';
import { Ionicons } from '@expo/vector-icons';

const KIND_META: Record<
  AppNotification['kind'],
  { icon: keyof typeof Ionicons.glyphMap; badge: string; variant: 'danger' | 'warning' | 'info' }
> = {
  low_stock: { icon: 'trending-down-outline', badge: 'LOW STOCK', variant: 'warning' },
  expired: { icon: 'alert-circle-outline', badge: 'EXPIRED', variant: 'danger' },
  expiring: { icon: 'time-outline', badge: 'EXPIRING', variant: 'warning' },
  overdue: { icon: 'cash-outline', badge: 'PAYMENT DUE', variant: 'info' },
};

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeBusiness } = useBusiness();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!activeBusiness) return;
    try {
      const list = await notificationService.getNotifications(activeBusiness.id);
      setItems(list);
      // Reading the list marks everything as seen — the bell dot clears.
      await notificationService.markAllRead(activeBusiness.id, list);
    } finally {
      setLoaded(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [activeBusiness])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              Stock alerts, expiries & pending payments — generated offline
            </Text>
          </View>
          {items.length > 0 && <Badge label={`${items.length}`} variant="primary" />}
        </View>

        <FlatList
          data={items}
          keyExtractor={(n) => n.key}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.palette.primary]} />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            loaded ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.palette.success} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 10 }}>
                  All caught up!
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
                  No low stock, expiring batches or overdue payments right now.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const meta = KIND_META[item.kind];
            const accent =
              meta.variant === 'danger'
                ? colors.palette.danger
                : meta.variant === 'warning'
                ? colors.palette.warning
                : colors.palette.primary;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.notifCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: accent }]}
                onPress={() => navigation.navigate(item.screen, item.params)}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${accent}18` }]}>
                  <Ionicons name={meta.icon} size={20} color={accent} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
                    {item.sub}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
