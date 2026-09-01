import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Ionicons } from '@expo/vector-icons';

export const MoreHubScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { activeBusiness } = useBusiness();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const hubItems = [
    {
      title: 'Receipts & Payments',
      sub: 'Money in / out vouchers & cash logs',
      icon: 'cash-outline' as const,
      color: colors.palette.success,
      action: () => navigation.navigate('Payments', { screen: 'PaymentList' }),
    },
    {
      title: 'E-Way Transport Bills',
      sub: 'Create & export GSTN EWB JSON slips',
      icon: 'car-outline' as const,
      color: colors.palette.primary,
      action: () => navigation.navigate('Eway', { screen: 'EwayList' }),
    },
    {
      title: 'GST & Financial Reports',
      sub: 'GSTR-1, registers, HSN summary, P&L',
      icon: 'document-text-outline' as const,
      color: colors.palette.accent,
      action: () => navigation.navigate('Reports', { screen: 'ReportsHome' }),
    },
    {
      title: 'Businesses (Multiple Firms)',
      sub: 'Switch active firm & bill formatting',
      icon: 'business-outline' as const,
      color: colors.palette.primary,
      action: () => navigation.navigate('BusinessList'),
    },
    {
      title: 'User Operators & Access',
      sub: 'Staff accounts & role permissions',
      icon: 'people-outline' as const,
      color: colors.palette.warning,
      action: () => navigation.navigate('UserList'),
    },
    {
      title: 'Data Migration & CSV Import',
      sub: 'Import Marg/Vyapar/Tally product lists',
      icon: 'cloud-upload-outline' as const,
      color: colors.palette.primary,
      action: () => navigation.navigate('DataImport'),
    },
    {
      title: 'Database Backup & Restore',
      sub: 'Offline JSON backup, restore & data wipe',
      icon: 'shield-checkmark-outline' as const,
      color: colors.palette.accent,
      action: () => navigation.navigate('BackupRestore'),
    },
    {
      title: 'Feature Config (F12 Toggles)',
      sub: 'Negative stock, 3-tier discounts, serials',
      icon: 'options-outline' as const,
      color: colors.palette.primary,
      action: () => navigation.navigate('FeaturesConfig'),
    },
    {
      title: 'Theme & Appearance',
      sub: '8 color palettes & dark mode switch',
      icon: 'color-palette-outline' as const,
      color: colors.palette.warning,
      action: () => navigation.navigate('ThemeSettings'),
    },
    {
      title: 'WhatsApp Message Config',
      sub: 'Bill sharing templates & phone setup',
      icon: 'logo-whatsapp' as const,
      color: colors.palette.success,
      action: () => navigation.navigate('WhatsAppSettings'),
    },
    {
      title: 'Help & License Support',
      sub: 'Documentation, shortcuts & contact',
      icon: 'help-circle-outline' as const,
      color: colors.palette.primary,
      action: () => navigation.navigate('Support'),
    },
  ];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        {/* User Card */}
        <Card style={styles.userBanner}>
          <View style={[styles.avatar, { backgroundColor: colors.palette.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.palette.primaryDark }]}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              @{user?.username} • Active Firm: <Text style={{ fontWeight: '700' }}>{activeBusiness?.name}</Text>
            </Text>
          </View>
          <Badge label={user?.role.toUpperCase() || 'USER'} variant={user?.role === 'admin' ? 'primary' : 'info'} />
        </Card>

        {/* Hub Items */}
        <View style={styles.grid}>
          {hubItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              style={[
                styles.itemCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={item.action}
            >
              <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.itemSub, { color: colors.textMuted }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.palette.danger }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.palette.danger} style={{ marginRight: 6 }} />
          <Text style={{ color: colors.palette.danger, fontWeight: '700', fontSize: 14 }}>
            Log Out Account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 20,
  },
});
