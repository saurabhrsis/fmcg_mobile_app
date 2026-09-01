# Changelog — FMCG Mobile ERP Suite

All notable changes and architectural transitions in the **FMCG Mobile ERP Suite** are documented in this file.

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
