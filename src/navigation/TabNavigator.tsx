import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { InvoiceListScreen } from '../screens/billing/InvoiceListScreen';
import { ItemListScreen } from '../screens/inventory/ItemListScreen';
import { PartyListScreen } from '../screens/parties/PartyListScreen';
import { MoreHubScreen } from '../screens/more/MoreHubScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      id="TabNav"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.palette.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
        options={{ tabBarLabel: 'Billing (F2)' }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={ItemListScreen}
        options={{ tabBarLabel: 'Inventory (F6)' }}
      />
      <Tab.Screen
        name="PartiesTab"
        component={PartyListScreen}
        options={{ tabBarLabel: 'Parties (F9)' }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreHubScreen}
        options={{ tabBarLabel: 'Hub & More' }}
      />
    </Tab.Navigator>
  );
};
