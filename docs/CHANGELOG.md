# Changelog — FMCG Mobile ERP Suite

All notable changes and architectural transitions in the **FMCG Mobile ERP Suite** are documented in this file.

---

## [Version 1.2.0] — Simpler, Friendlier Mobile UX

### 🧾 Billing — GST tax type without "Auto"
- **Changed**: The confusing `Auto (…)` chip is gone. The correct GST type — **CGST + SGST** or
  **IGST** — is now picked automatically from the firm's state vs. the customer / place-of-supply
  state, and the matching chip shows as selected. Re-selecting a customer re-evaluates the type.
  Users can still override for special cases (SEZ / MIHAN) or pick **Nil / Exempt**.
- **Changed**: Vouchers now store the resolved concrete `gst_type` (`intra` / `inter` / `nil`)
  instead of persisting `auto`.

### 👤 First-run & registration
- **Changed**: A fresh install now opens the **Login** page (with a prominent
  *Create Your Account* button for first-time users) instead of dropping new users into the
  long Register form.
- **Added**: Registration offers *"I already use RightServe Desktop"* — business details are
  skipped, and after sign-in the app opens **Desktop Sync** so scanning the desktop pairing QR
  (or importing a sync file) copies the firm, items, parties and bills with zero typing.
- **Changed**: `mergeSyncPackage()` marks the first business pulled from the desktop as the
  active (default) firm when the phone has no businesses yet, so desktop converts land on a
  working app immediately.

### 💳 Buying & activation
- **Added**: The **Buy / Activate** screen (reached from the trial banner's *Buy License*) now
  shows sales & support contact details up front — phone numbers, WhatsApp and the support email.
- **Added**: After a key activates, the app offers **Copy from Desktop** in one tap for desktop
  licence holders who just added a mobile licence.
- **Changed**: Removed the lengthy "Mobile key ≠ Desktop key" explanation in favour of one short
  card.

### 🆘 Help & Support
- **Changed**: Removed the "RightServe FMCG Mobile Edition / Version / Developed by …" box and all
  technology names. The screen is now a clean support hub — Call / WhatsApp / Email plus tappable
  quick-help topics (license, desktop copy, backup, CSV import, GST).

### 🗂 Settings
- **Changed**: Merged **Data Migration & CSV Import** and **Database Backup & Restore** into one
  **Data Backup & Import** screen with two tabs (`BackupRestoreScreen` + `DataImportScreen` →
  `DataManagementScreen`), cutting the More hub from 13 to 12 tiles.
- **Added**: Shared `src/constants/support.ts` so contact details stay consistent across the
  activation, support and buy flows.

---

## [Version 1.1.0] - Non-GST Bills, Walk-in Customers & Desktop QR Pairing

### 🧾 Billing — Non-GST Bills (Bill of Supply)
- **Added**: `Bill Type` selector on the voucher screen — **GST Bill (Tax Invoice)** or
  **Non-GST Bill (Bill of Supply)** for unregistered, composition-dealer and exempt-goods buyers.
- **Added**: Supply / tax type now covers **Auto, Intra-state (CGST+SGST), Inter-state (IGST) and
  Nil / Exempt**. On a non-GST bill the same chips read **Intra-state / Inter-state / Nil** and only
  classify the supply — no tax is ever charged.
- **Added**: `invoices.bill_type` column (`gst` | `non_gst`) plus the `nil` value for
  `invoices.gst_type`, with additive SQLite migrations for existing installs.
- **Changed**: `invoiceService.createInvoice()` forces every line rate to 0% for non-GST and
  nil-rated vouchers; `isInterState()` returns false for them, so no IGST split is printed.
- **Changed**: Print / PDF / WhatsApp output for non-GST bills — title becomes **BILL OF SUPPLY**
  (“not a tax invoice”), GST column, CGST/SGST/IGST rows and the tax summary are removed, the HSN
  table becomes a value summary, and a “no GST charged” declaration is printed. Nil-rated GST
  invoices print as **TAX INVOICE (NIL / EXEMPT)**.
- **Changed**: Billing list gained an `All bills / GST bills / Non-GST bills` filter and a NON-GST
  badge; the bill detail screen shows the supply type and “GST: not applicable”.
- **Changed**: Reports — non-GST and nil-rated vouchers are excluded from **GSTR-1**, the
  **HSN / Table-12** summary and the portal JSON (new “Outside GSTR-1” card), while the **Sales
  Register** still lists them with a bill-type column, a non-GST count/total in the summary and the
  dashboard (`monthNonGstSales`).
- **Fixed**: E-way bills created from a non-GST / nil-rated invoice now prefill with nil tax values
  and warn the user instead of splitting a zero tax into CGST/SGST.

### 👤 Parties — Walk-in Customers (name only)
- **Added**: Bill a counter customer by adding **only a name** — from the voucher screen
  (“Walk-in Customer (name only)”, plus a walk-in toggle in the inline party form) or from the party
  form’s **Walk-in customer** switch.
- **Added**: `parties.is_walkin` column, derived automatically while both phone and GSTIN are blank
  and cleared as soon as the profile is completed.
- **Added**: “Update later” flow — WALK-IN badges in the party list / profile / bill, a
  missing-fields hint (phone, GSTIN, address), an **Update Customer Details** button on the saved
  bill, and a post-save “Add Customer Details” action. Bills stay linked to the same ledger when the
  profile is completed, and WhatsApp sharing prompts for a number when the walk-in has none.
- **Changed**: `partyService.createParty()` requires a name only, upper-cases the GSTIN and exposes
  `isWalkIn()` / `missingFields()` helpers; the party form validates GSTIN format and allows a blank
  state.

### 🔗 Desktop Sync — QR Pairing & LAN Reliability
- **Added**: **Scan QR to connect** (`expo-camera` `CameraView`) with a new `ScanDesktopQrScreen`;
  `parsePairingCode()` reads both the desktop JSON payload
  (`{"v":1,"app":"rightserve-sync","url":"http://192.168.1.5:4000","key":"rsync_…"}`) and the
  `rightserve://sync?url=…&key=…` deep link, then saves the config and pings the portal.
- **Added**: Camera permission flow (`expo-camera` plugin in `app.json`, updated
  `NSCameraUsageDescription`), a “Can’t scan? Paste code” fallback and manual URL/key entry tucked
  under a collapsible section.
- **Changed**: `usesCleartextTraffic: true` for release Android builds (`app.json` +
  `android/app/src/main/AndroidManifest.xml`) so plain HTTP to `http://192.168.x.x:4000` works
  outside debug builds.
- **Changed**: `normalizeBaseUrl()` strips a pasted `/api` or `/api/sync[/ping|/pull|/push]` suffix;
  the example port is **4000** everywhere; the API key is labelled **required** and Test Connection
  now explains same-Wi-Fi, port and cleartext-HTTP failures.
- **Changed**: Desktop Sync screen leads with a 4-step first-run guide (“set up on desktop, then scan
  QR and Full Sync”), shows the pairing status, and documents that records merge by natural keys
  (business name, item name + SKU, party name + type, invoice no + type, batch no) — never by
  licence key — with each device keeping its own `company` row.
- **Fixed**: Sync inserts now ignore fields that do not exist in the local schema, so a phone and a
  desktop on slightly different versions still merge safely.

### 🔐 Licensing — Desktop vs Mobile Products
- **Added**: `product` support in the key payload with `licenseProduct()` / `isMobileProduct()`;
  mobile accepts `mobile` and `both`, and **rejects `desktop`** (and untagged legacy keys, which
  count as desktop) with “This key is for the RightServe desktop app. Ask RightServe for a Mobile
  license.” — enforced in both `evaluate()` and `installLicenseKey()`.
- **Added**: `LicenseStatus.product`, a **Product** row on the License screen, and an activation
  screen explainer that one key unlocks one device, “Desktop + Mobile” mints two keys for the same
  client, and each product renews separately.

### 🧪 Verification
- **Added**: Four new scenarios in `scripts/verify_system.mjs` (16 total) covering walk-in customers
  billed by name and completed later, non-GST bills with intra / inter / nil supply types, GSTR-1
  exclusion vs sales-register coverage, and pairing-QR parsing / URL normalisation.

---

## [Version 1.0.0] - Production Mobile Counterpart Release

### 🚀 Major Milestones & New Architecture
- **Ported from Electron Desktop to React Native Expo 54**:
  - Transitioned backend storage from desktop Node.js `better-sqlite3` to native **`expo-sqlite` (WAL Mode)**.
  - Replaced desktop window routing with **React Navigation 7** Native Stack & Bottom Tab navigators.
  - Adapted desktop CSS and Ant Design/Tailwind layouts into responsive React Native styling with Context API theming.

### 🏢 Multi-Firm & Business Administration
- **Added**: Multi-business management allowing creation and configuration of independent firm profiles.
- **Added**: Firm switcher dropdown on the top navbar across all screens.
- **Added**: Customizable invoice prefixes, terms, bank details, and 7 bill layout formats (`Classic`, `Vyapar`, `Marg`, `Miracle`, `Tally`, `Busy`, `Modern`).
- **Added**: Role-based access control (`admin` / `staff`) with permission toggles for billing, purchasing, inventory, parties, reports, e-way bills, deletion, and price editing.

### 📦 Inventory & Packaging Engine
- **Added**: Multi-level category hierarchy with recursive parent/child relationships.
- **Added**: Multi-tier packaging unit conversion ladder (`Carton` → `Box` → `Pack` → `Piece`) with automatic base quantity conversion and per-unit barcode indexing.
- **Added**: First-Expiry, First-Out (FEFO) batch tracking with lot number, manufacturing date, expiry date, purchase cost, and MRP.
- **Added**: Visual stock alerts for `Expiring Soon (30 Days)`, `Expired`, and `Low Stock`.
- **Added**: Serial number tracking with lifecycle states (`in_stock`, `sold`) and invoice linkage.

### 🧾 Billing & Tax Compliance
- **Added**: Voucher support for Sales Invoices, Purchase Invoices, Quotations/Estimates, Credit Notes, and Debit Notes.
- **Added**: 3-tier sequential discounts (Trade Discount, Cash Discount CD, Special Discount SD in % or flat ₹).
- **Added**: Dynamic GST engine automatically calculating Intra-state (CGST + SGST) vs Inter-state (IGST) based on party GSTIN state codes.
- **Added**: FMCG dispatch fields: Transporter ID, Vehicle No, Consignee details, Place of supply, and PO/Order reference.
- **Added**: 1-tap Quotation to Sale conversion.
- **Added**: Direct AirPrint, PDF sharing (`expo-print`, `expo-sharing`), and direct WhatsApp messaging.

### 👥 Parties, Ledgers & Payments
- **Added**: Customer and Supplier master with GSTIN validation and 37-state code parsing.
- **Added**: Real-time customer/supplier ledger balances, invoice history, and transaction logs.
- **Added**: 1-tap WhatsApp payment reminder dispatch.
- **Added**: Payment Receipts (In) and Payment Vouchers (Out) across Cash, UPI, Bank Transfer, and Cheque modes with automatic invoice status reconciliation.

### 🚛 E-Way Bills
- **Added**: Invoice-linked E-Way bill generation with transport mode (`Road`, `Rail`, `Air`, `Ship`), distance, and vehicle types (`Regular`, `Over-dimensional`).
- **Added**: Printable E-Way slips and official NIC-compliant JSON payload exports.

### 📊 Reports & Analytics
- **Added**: Sales Register and Purchase Register with date filters and CSV export.
- **Added**: GST / HSN Table 12 summaries with B2B, B2CL, B2CS classifications and GSTR-1 JSON export.
- **Added**: Outstanding Receivables & Payables aging analysis.
- **Added**: Financial Year Balance Sheet (Turnover, Purchases, Gross Margin, Stock Valuation).
- **Added**: Batch and Serial Traceability audit trail.

### ⚙️ Utilities, Theming & Data Portability
- **Added**: F12 Global Feature Configuration toggles.
- **Added**: 8 Theme Palettes (`Teal`, `Indigo`, `Emerald`, `Amber`, `Rose`, `Violet`, `Cyan`, `Slate`) with Light/Dark mode.
- **Added**: Full database JSON snapshot export and document picker restore.
- **Added**: CSV Data Migration tool for bulk import of items and parties with downloadable sample CSV templates.
- **Added**: Production build configuration for Android (APK & AAB via EAS) and iOS (Simulator & IPA).
