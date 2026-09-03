# Project Memory & Session History Logs — FMCG Mobile Suite

**Date Created**: September 1, 2026  
**Repository**: `saurabhrsis/fmcg_mobile_app`  
**Active Working Branch**: `arena/01a05bfe-fmcg-mobile-app`  
**Target Platform**: React Native Expo SDK 54 (New Architecture Ready)  
**Database**: `expo-sqlite` (WAL Mode enabled)  
**Pull Request**: https://github.com/saurabhrsis/fmcg_mobile_app/pull/1  

---

## 1. Project Overview & Origin

The project is the full mobile ERP counterpart to the desktop FMCG application (`https://github.com/nitesh1414/fmcg_software.git`). It translates all desktop capabilities (Electron + Node.js Express + SQLite + React 18) into a mobile React Native Expo 54 app running on `expo-sqlite` with offline-first capabilities.

---

## 2. File & Component Manifest

### 📁 Database & State Layer (`src/db/`, `src/context/`)
- `src/db/schema.ts`: Complete SQLite DDL creating 12 tables and compound indexes.
- `src/db/database.ts`: Connection pooling, WAL mode, transaction runners (`runTransaction`).
- Demo seeding removed: the database now starts empty and is populated by user registration (`src/screens/auth/RegisterScreen.tsx`).
- `src/licensing/`: offline ed25519 licence verification (RSL1 keys), 7-day free trial and device-id/seal storage, shared with the desktop licensing portal.
- `src/context/AuthContext.tsx`: User session, authentication, setup state.
- `src/context/BusinessContext.tsx`: Multi-firm switcher, active firm state, firm CRUD.
- `src/context/FeaturesContext.tsx`: F12 feature toggles (batches, serials, multi-unit, e-way).
- `src/context/ThemeContext.tsx`: 8 theme palettes, dark/light mode toggle.

### 📁 Services Layer (`src/services/`)
- `authService.ts`: Hash verification, user login, PINs, permissions.
- `businessService.ts`: Firm profiles, bill styling settings, bank details.
- `itemService.ts`: Categories, items master, packaging ladder math.
- `batchService.ts`: FEFO batch inventory, expiry alerts, lot allocation.
- `serialService.ts`: Serial number tracking and invoice linkage.
- `partyService.ts`: Customer/supplier ledgers and balance math.
- `invoiceService.ts`: Sales/purchase billing, 3-tier discounts, GST engine, quotation conversion.
- `paymentService.ts`: Payment receipts/vouchers and auto-reconciliation.
- `ewayService.ts`: E-Way bill slips and NIC JSON payloads.
- `reportService.ts`: Sales/Purchase registers, HSN summary, FY balance, Outstanding aging.
- `gstr1Service.ts`: GSTR-1 government JSON format generation.
- `printService.ts`: 7 HTML bill layout templates and AirPrint/PDF rendering.
- `whatsappService.ts`: Direct prefilled WhatsApp dispatch.
- `backupService.ts`: Full JSON database snapshots and restoration.
- `migrateService.ts`: CSV parsing and batch catalog import.
- `settingsService.ts`: Global configuration key-value storage.

### 📁 UI Screens Layer (`src/screens/`)
- **Auth**: `LoginScreen.tsx`, `BusinessSetupScreen.tsx`, `SetupAdminScreen.tsx`, `ForgotPasswordScreen.tsx`.
- **Billing**: `InvoiceListScreen.tsx`, `CreateInvoiceScreen.tsx`, `InvoiceDetailScreen.tsx`.
- **Inventory**: `ItemListScreen.tsx`, `ItemDetailScreen.tsx`, `ItemFormScreen.tsx`, `CategoryManagerScreen.tsx`, `BatchStockScreen.tsx`, `SerialLookupScreen.tsx`.
- **Parties**: `PartyListScreen.tsx`, `PartyDetailScreen.tsx`, `PartyFormScreen.tsx`.
- **Payments**: `PaymentListScreen.tsx`, `CreatePaymentScreen.tsx`.
- **E-Way**: `EwayListScreen.tsx`, `EwayFormScreen.tsx`, `EwayDetailScreen.tsx`.
- **Reports**: `ReportsHomeScreen.tsx`, `SalesRegisterScreen.tsx`, `PurchaseRegisterScreen.tsx`, `GstReportScreen.tsx`, `HsnSummaryScreen.tsx`, `OutstandingReportScreen.tsx`, `FyBalanceScreen.tsx`, `TraceabilityScreen.tsx`.
- **Businesses & Users**: `BusinessListScreen.tsx`, `BusinessFormScreen.tsx`, `UserListScreen.tsx`, `UserFormScreen.tsx`.
- **Settings**: `MoreHubScreen.tsx`, `FeaturesConfigScreen.tsx`, `ThemeSettingsScreen.tsx`, `BackupRestoreScreen.tsx`, `DataImportScreen.tsx`, `WhatsAppSettingsScreen.tsx`, `SupportScreen.tsx`.

### 📁 Common Components & Navigation (`src/components/`, `src/navigation/`)
- `ScreenWrapper.tsx`, `TopNavbar.tsx`, `Card.tsx`, `Button.tsx`, `Input.tsx`, `Select.tsx`, `Badge.tsx`, `SearchBar.tsx`, `StatCard.tsx`, `Modal.tsx`, `EmptyState.tsx`.
- `TabNavigator.tsx`: Bottom tabs (Dashboard, Billing F2, Inventory F6, Parties F9, Hub & More).
- `AppNavigator.tsx`: Native Stack Navigator with all nested application routes.
- `RootNavigator.tsx`: Splash/Auth/Setup/Main router.

---

## 3. How to Run, Test, and Build

### Running TypeScript Check
```bash
npx tsc --noEmit
# Must complete with 0 errors
```

### Running Automated Test Suite
```bash
node scripts/verify_system.mjs
# Executes all 12 core ERP business logic scenarios on SQLite
```

### Running Development Server
```bash
EXPO_OFFLINE=1 npx expo start --web --port 8081 --host lan
```

### Building Android APK & AAB
```bash
# EAS Cloud Build:
eas build -p android --profile preview    # Generates .apk
eas build -p android --profile production # Generates .aab for Play Store

# Local Gradle Build:
cd android && ./gradlew assembleRelease
```

### Building iOS App
```bash
# EAS Cloud Build:
eas build -p ios --profile preview    # Simulator build
eas build -p ios --profile production # TestFlight / App Store IPA

# Local Xcode Build:
cd ios && pod install && open RightServeFMCGMobile.xcworkspace
```

---

## 4. Key Decisions & Technical Notes
- **Packaging Ladder Factor Multiplier**: Every item unit row in `item_units` contains a `factor` representing the number of base units in that packaging tier. All stock decrements in `batches` and `items` are computed in base units.
- **3-Tier Discount Order**: Trade discount is deducted first from gross amount, followed by Cash Discount (CD) on the subtotal, followed by Special Discount (SD).
- **GST Intra vs Inter State**: The GST engine compares the 2-digit state prefix of the active business GSTIN against the customer/supplier GSTIN (e.g., `07` Delhi vs `27` Maharashtra). If equal, it splits into `CGST` and `SGST`; otherwise, `IGST`.
- **expo-file-system v19 compatibility**: File operations import from `expo-file-system/legacy` to maintain full synchronous document directory and file sharing compatibility.
