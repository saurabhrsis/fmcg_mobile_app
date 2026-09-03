import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';

// Notifications
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

// Billing
import { CreateInvoiceScreen } from '../screens/billing/CreateInvoiceScreen';
import { InvoiceDetailScreen } from '../screens/billing/InvoiceDetailScreen';
import { InvoiceListScreen } from '../screens/billing/InvoiceListScreen';

// Inventory
import { ItemListScreen } from '../screens/inventory/ItemListScreen';
import { ItemDetailScreen } from '../screens/inventory/ItemDetailScreen';
import { ItemFormScreen } from '../screens/inventory/ItemFormScreen';
import { CategoryManagerScreen } from '../screens/inventory/CategoryManagerScreen';
import { BatchStockScreen } from '../screens/inventory/BatchStockScreen';
import { SerialLookupScreen } from '../screens/inventory/SerialLookupScreen';

// Parties
import { PartyListScreen } from '../screens/parties/PartyListScreen';
import { PartyDetailScreen } from '../screens/parties/PartyDetailScreen';
import { PartyFormScreen } from '../screens/parties/PartyFormScreen';

// Payments
import { PaymentListScreen } from '../screens/payments/PaymentListScreen';
import { CreatePaymentScreen } from '../screens/payments/CreatePaymentScreen';

// Eway
import { EwayListScreen } from '../screens/eway/EwayListScreen';
import { EwayFormScreen } from '../screens/eway/EwayFormScreen';
import { EwayDetailScreen } from '../screens/eway/EwayDetailScreen';

// Reports
import { ReportsHomeScreen } from '../screens/reports/ReportsHomeScreen';
import { SalesRegisterScreen } from '../screens/reports/SalesRegisterScreen';
import { PurchaseRegisterScreen } from '../screens/reports/PurchaseRegisterScreen';
import { GstReportScreen } from '../screens/reports/GstReportScreen';
import { HsnSummaryScreen } from '../screens/reports/HsnSummaryScreen';
import { OutstandingReportScreen } from '../screens/reports/OutstandingReportScreen';
import { FyBalanceScreen } from '../screens/reports/FyBalanceScreen';
import { TraceabilityScreen } from '../screens/reports/TraceabilityScreen';

// Businesses & Users
import { BusinessListScreen } from '../screens/businesses/BusinessListScreen';
import { BusinessFormScreen } from '../screens/businesses/BusinessFormScreen';
import { UserListScreen } from '../screens/users/UserListScreen';
import { UserFormScreen } from '../screens/users/UserFormScreen';

// Settings
import { FeaturesConfigScreen } from '../screens/settings/FeaturesConfigScreen';
import { ThemeSettingsScreen } from '../screens/settings/ThemeSettingsScreen';
import { BackupRestoreScreen } from '../screens/settings/BackupRestoreScreen';
import { DataImportScreen } from '../screens/settings/DataImportScreen';
import { WhatsAppSettingsScreen } from '../screens/settings/WhatsAppSettingsScreen';
import { DesktopSyncScreen } from '../screens/settings/DesktopSyncScreen';
import { ScanDesktopQrScreen } from '../screens/settings/ScanDesktopQrScreen';
import { SupportScreen } from '../screens/settings/SupportScreen';

// Licensing
import { LicenseScreen } from '../screens/license/LicenseScreen';
import { ActivationScreen } from '../screens/license/ActivationScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator id="AppStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* Notifications */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />

      {/* Billing */}
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />

      {/* Inventory */}
      <Stack.Screen name="ItemList" component={ItemListScreen} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
      <Stack.Screen name="ItemForm" component={ItemFormScreen} />
      <Stack.Screen name="CategoryManager" component={CategoryManagerScreen} />
      <Stack.Screen name="BatchStock" component={BatchStockScreen} />
      <Stack.Screen name="SerialLookup" component={SerialLookupScreen} />

      {/* Parties */}
      <Stack.Screen name="PartyList" component={PartyListScreen} />
      <Stack.Screen name="PartyDetail" component={PartyDetailScreen} />
      <Stack.Screen name="PartyForm" component={PartyFormScreen} />

      {/* Payments */}
      <Stack.Screen name="PaymentList" component={PaymentListScreen} />
      <Stack.Screen name="CreatePayment" component={CreatePaymentScreen} />

      {/* Eway */}
      <Stack.Screen name="EwayList" component={EwayListScreen} />
      <Stack.Screen name="EwayForm" component={EwayFormScreen} />
      <Stack.Screen name="EwayDetail" component={EwayDetailScreen} />

      {/* Reports */}
      <Stack.Screen name="ReportsHome" component={ReportsHomeScreen} />
      <Stack.Screen name="SalesRegister" component={SalesRegisterScreen} />
      <Stack.Screen name="PurchaseRegister" component={PurchaseRegisterScreen} />
      <Stack.Screen name="GstReport" component={GstReportScreen} />
      <Stack.Screen name="HsnSummary" component={HsnSummaryScreen} />
      <Stack.Screen name="OutstandingReport" component={OutstandingReportScreen} />
      <Stack.Screen name="FyBalance" component={FyBalanceScreen} />
      <Stack.Screen name="Traceability" component={TraceabilityScreen} />

      {/* Businesses & Users */}
      <Stack.Screen name="BusinessList" component={BusinessListScreen} />
      <Stack.Screen name="BusinessForm" component={BusinessFormScreen} />
      <Stack.Screen name="UserList" component={UserListScreen} />
      <Stack.Screen name="UserForm" component={UserFormScreen} />

      {/* Settings */}
      <Stack.Screen name="FeaturesConfig" component={FeaturesConfigScreen} />
      <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
      <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
      <Stack.Screen name="DesktopSync" component={DesktopSyncScreen} />
      <Stack.Screen name="ScanDesktopQr" component={ScanDesktopQrScreen} />
      <Stack.Screen name="DataImport" component={DataImportScreen} />
      <Stack.Screen name="WhatsAppSettings" component={WhatsAppSettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />

      {/* Licensing */}
      <Stack.Screen name="License" component={LicenseScreen} />
      <Stack.Screen name="Activation" component={ActivationScreen} />
    </Stack.Navigator>
  );
};
