import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { InvoiceListScreen } from '../screens/billing/InvoiceListScreen';
import { ItemListScreen } from '../screens/inventory/ItemListScreen';
import { PartyListScreen } from '../screens/parties/PartyListScreen';
import { MoreHubScreen } from '../screens/more/MoreHubScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, 6);

  return (
    <Tab.Navigator
      id="TabNav"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.3 : 0.06,
              shadowRadius: 4,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarActiveTintColor: colors.palette.primary,
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'BillingTab') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'InventoryTab') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'PartiesTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'MoreTab') {
            iconName = focused ? 'grid' : 'grid-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="BillingTab"
        component={InvoiceListScreen}
        options={{ tabBarLabel: 'Billing' }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={ItemListScreen}
        options={{ tabBarLabel: 'Inventory' }}
      />
      <Tab.Screen
        name="PartiesTab"
        component={PartyListScreen}
        options={{ tabBarLabel: 'Parties' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreHubScreen}
        options={{ tabBarLabel: 'Hub & More' }}
      />
    </Tab.Navigator>
  );
};
