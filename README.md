# FMCG Mobile Suite (React Native Expo 54 + expo-sqlite)

A full-featured mobile counterpart to the FMCG Desktop ERP system, designed for distributors, wholesalers, and retail operators. Built with **React Native Expo 54**, **expo-sqlite**, **TypeScript**, and **React Navigation 7**.

---

## 🔐 Accounts & Licensing

- **No demo data, no default accounts.** A fresh install starts with an empty database.
- **Login first**: the app always opens on the **Login** page. First-time users tap
  **Create Your Account**; returning users sign straight in, with security-question password
  recovery.
- **Desktop users don't re-type anything**: at registration pick *"I already use RightServe
  Desktop"* — business details are skipped and, after signing in, scanning the desktop pairing QR
  copies the firm, items, parties and bills to the phone automatically.
- **7-day free trial** on every new install, all features unlocked. The trial banner's
  **Buy License** action shows our phone numbers, WhatsApp and support email so you can reach
  sales instantly.
- **Licence keys shared with the desktop product** — ed25519-signed `RSL1.…` keys minted by
  the same [RightServe licensing portal](https://github.com/nitesh1414/fmcg_software), verified
  **offline** on device. Supports perpetual keys, device-locked keys, expiry reminders and
  one-time online activation.
- **Desktop and mobile are separate products** — a key carries `product` (`desktop`, `mobile`,
  `both`) and activates **one device**. This app rejects desktop-only keys (untagged legacy keys
  count as desktop); buying both apps mints two keys for the same client, renewed separately.
- **Read-only mode** after the trial or a licence expires: view, search, print and back up
  still work; creating/editing invoices, items, parties, payments and e-way bills is blocked.

See [docs/LICENSING.md](docs/LICENSING.md) for the full scheme.

## 🚀 Key Features

### 1. Multi-Business / Firm Profiles
- Manage multiple firms/branches independently with unique GSTINs, state codes, bank credentials, custom invoice prefixes, logos, and signatures.
- Quick business switcher in the top navigation bar.
- Individual invoice sequences, customizable terms, and FY start settings.

### 2. Packaging Conversion Ladder & Multi-Tier Units
- Define hierarchical packaging units (e.g., `Carton` (2400) → `Box` (120) → `Pack` (10) → `Piece` (1)).
- Factor mathematics for automatic base quantity conversion and stock decrementing.
- Unit-specific purchase & sale pricing with integrated barcode lookups.

### 3. FEFO Batch & Serial Number Tracking
- First-Expiry, First-Out (FEFO) batch inventory with Mfg & Expiry dates, lot costs, and MRP.
- Real-time stock status flags: Active, Expiring Soon (30 days), Expired, and Low Stock.
- Serial number tracking with lifecycle states (`in_stock`, `sold`) and two-way invoice traceability.

### 4. Billing & Vouchers
- **Voucher Types**: Sales Invoices, Purchase Invoices, Quotations/Estimates, Credit Notes, Debit Notes.
- **GST or Non-GST Bills**: every voucher is either a **GST Bill (Tax Invoice)** or a
  **Non-GST Bill (Bill of Supply)** for unregistered, composition or exempt-goods buyers. Non-GST
  bills carry no tax at all and print as *BILL OF SUPPLY* without GST columns, with a “no GST
  charged” declaration.
- **Supply / Tax Type**: `Intra-state (CGST+SGST)`, `Inter-state (IGST)` or
  `Nil / Exempt` — the correct type is **picked automatically** from the party / place-of-supply
  state and shown selected; override only for special cases (SEZ etc.). On a non-GST bill the same
  choice (`Intra` / `Inter` / `Nil`) only classifies the supply for your registers.
- **Walk-in Counter Billing**: bill a walking customer by adding **just a name** — phone, GSTIN and
  address can be updated later from the bill or the party list without losing the ledger link.
- **3-Tier Discounts**: Trade Discount, Cash Discount (CD), and Special Discount (SD) in % or flat ₹ amounts.
- **GST Calculation Engine**: Automated Intra-state (CGST + SGST) vs. Inter-state (IGST) split based on party GSTIN state code, Cess rates, Reverse charge, and Round-off.
- **FMCG Dispatch Details**: E-Way Bill No., Consignee details, Place of supply, PO/Order Ref, Transporter & vehicle details.
- **1-Tap Quotation to Sale Conversion**.
- **7 Professional Bill Templates**: Classic, Vyapar, Marg, Miracle, Tally, Busy, Modern with custom theme palettes.
- **PDF Export, AirPrint & Direct WhatsApp Dispatch**.

### 5. Parties & Ledger
- Customers and Suppliers directory with GSTIN state code validation.
- **Walk-in customers** saved with a name only (`is_walkin`), flagged in the directory and
  self-clearing once a phone number or GSTIN is added.
- Real-time opening balance, outstanding receivables/payables, and invoice/payment transaction ledgers.
- 1-tap WhatsApp payment reminder dispatch.

### 6. Payments
- **Payment In (Receipts)** and **Payment Out (Vouchers)** with Cash, UPI, Bank Transfer, and Cheque modes.
- Automatic invoice status reconciliation (`paid`, `partial`, `unpaid`).

### 7. E-Way Bills
- E-Way bill generation linked to invoices with transport mode (Road/Rail/Air/Ship), distance, and vehicle type.
- Preview printable E-Way slips and export NIC-compliant JSON payloads.

### 8. Enterprise Reports
- **Sales & Purchase Registers** with date range filters, GST breakdowns, and CSV export.
- **GST & HSN Table 12 Summary** with B2B, B2CL, B2CS classifications and GSTR-1 JSON export —
  non-GST bills and nil-rated supplies are counted separately as “Outside GSTR-1” and never enter
  the portal JSON, while the sales register still lists them.
- **Outstanding Receivables & Payables** with aging analysis.
- **Financial Year Balance Sheet** (Turnover, Purchases, Gross Margin, Stock Valuation).
- **Serial & Batch Traceability Audit Trail**.

### 9. Administration & Settings
- Multi-user access control (Admin & Staff) with granular permissions.
- F12 Global feature toggles (Batches, Serials, Multi-Unit, E-Way, POS quick billing, Round-off).
- 8 Theme Palettes (Teal, Indigo, Emerald, Amber, Rose, Violet, Cyan, Slate) and Dark/Light Mode.
- **Data Backup & Import** — one screen for JSON backup / restore / wipe *and* CSV migration of
  items and parties (with sample template downloads).
- **Desktop Sync with QR pairing**: scan the QR shown by the desktop app (Settings → Mobile Sync,
  port `4000`) to save the LAN address *and* the required API key in one step, then tap **Full
  Sync**. Manual URL/key entry, an offline sync-file export/import, and `usesCleartextTraffic` for
  release Android builds are included. Records merge by natural keys (business name, item name +
  SKU, party name + type, invoice no + type, batch no) — the licence key never links two databases.
- Shortcut reference (`F2` Billing, `F6` Inventory, `F9` Parties, `F12` Features).

---

## 📱 Navigation & Keyboard Architecture

- **Dashboard**: Quick metrics, sales trends, top products, low stock / expiry alerts.
- **Billing (F2)**: Fast invoice generation and listing with status filtering.
- **Inventory (F6)**: Multi-level categories, items, packaging ladders, FEFO batches, serial lookup.
- **Parties (F9)**: Customer and supplier management and ledgers.
- **Hub & More**: Reports, E-Way bills, Businesses, Staff users, Settings, Backup/Restore.

---

## 🛠 Tech Stack

- **Framework**: React Native Expo 54
- **Database Engine**: `expo-sqlite` (WAL mode enabled, foreign keys enabled)
- **Navigation**: `@react-navigation/native-stack` & `@react-navigation/bottom-tabs` (v7)
- **Styling**: Context-based dynamic theming with 8 palettes and dark mode
- **Document & Print**: `expo-print`, `expo-sharing`, `expo-file-system`
- **Language**: 100% Strict TypeScript
