# FMCG Mobile ERP Suite — User Manual & Operations Guide

Welcome to the **FMCG Mobile ERP Suite** (React Native Expo 54 + SQLite). This manual guides store managers, cashiers, accountants, and administrators through day-to-day operations.

---

## Table of Contents
1. [Getting Started & Sign In](#1-getting-started--sign-in)
2. [Multi-Business & Firm Profile Setup](#2-multi-business--firm-profile-setup)
3. [Master Data Management (Categories, Items & Units)](#3-master-data-management)
4. [Packaging Unit Ladders & Barcodes](#4-packaging-unit-ladders--barcodes)
5. [FEFO Batch Stock & Expiry Tracking](#5-fefo-batch-stock--expiry-tracking)
6. [Serial Number Tracking](#6-serial-number-tracking)
7. [Parties (Customers & Suppliers) & Ledgers](#7-parties--ledgers)
8. [Billing & Invoicing (F2)](#8-billing--invoicing-f2)
9. [3-Tier FMCG Discounts & GST Engine](#9-3-tier-fmcg-discounts--gst-engine)
10. [Payments & Receipts Reconciliation](#10-payments--receipts-reconciliation)
11. [E-Way Bills Generation](#11-e-way-bills-generation)
12. [Reports & GST Compliance](#12-reports--gst-compliance)
13. [Backup, Restore & Data Migration](#13-backup-restore--data-migration)
14. [Theme Settings & Keyboard Navigation](#14-theme-settings--keyboard-navigation)

---

## 1. Getting Started & Sign In

### 1.1 Initial Launch
The app ships with **no demo data and no default accounts** — you start with a clean database.

- **Register**: On first launch the app opens the **Register** screen. Create your admin
  account (name, username, password, security question) and your **business/firm profile**
  (trade name, GSTIN, phone, address, state) in one step. You are signed in automatically.
- **Login**: Once an account exists, the app opens the **Login** screen. Use
  **Forgot Password?** to reset via your security question.
- **Free Trial**: Every fresh install includes a **7-day free trial** with all features
  unlocked. A status strip at the top of the app shows the days remaining.

### 1.2 Licensing & Activation
- Go to **More → License & Subscription** to see trial/licence status, plan, expiry and your
  **Device ID**.
- When the trial ends (or a paid licence expires), the app switches to **read-only mode**:
  you can still view, search, print and back up data, but cannot create or edit invoices,
  items, parties, payments or e-way bills.
- Tap **Enter License Key** and paste the key issued by the RightServe licensing portal — the
  same portal that issues keys for the FMCG desktop software. Keys are digitally signed and
  verified **offline**; internet is needed only once, at activation of an online key.

---

## 2. Multi-Business & Firm Profile Setup

The application supports multiple distinct firms under one mobile roof.

### 2.1 Switching Businesses
- Look at the **Top Bar** dropdown anytime. Tap your active business name to switch firms instantly.
- All product stock, vouchers, invoice prefixes, and ledger balances dynamically filter to the selected firm.

### 2.2 Adding / Editing a Business
1. Open **Hub & More** ➔ **Businesses / Firms**.
2. Tap **+ Add Business** (or edit an existing one).
3. Fill in:
   - **Trade / Business Name**: Display name on bills (e.g., `Sharma FMCG Distributors`).
   - **GSTIN & State Code**: 15-digit GST identification number (e.g., `07ABCDE1234F1Z5`).
   - **Invoice Prefix**: Prefix for automated numbering (e.g., `INV`, `APX`).
   - **Financial Year Start Month**: Default is April (`4`).
   - **Bank Details**: Bank Name, A/C Number, IFSC Code, Branch, UPI ID.
   - **Bill Customization**: Choose between 7 themes (`Classic`, `Vyapar`, `Marg`, `Miracle`, `Tally`, `Busy`, `Modern`), set theme brand color, header notes, terms & conditions, and authorized signatory label.
4. Tap **Save Business Profile**.

---

## 3. Master Data Management

### 3.1 Category Hierarchy
1. Navigate to **Inventory (F6)** ➔ **Category Manager**.
2. Tap **+ Add Category**.
3. To create a root category (e.g., `Beverages`), leave the Parent Category blank.
4. To create a subcategory (e.g., `Soft Drinks`), select `Beverages` as Parent.

### 3.2 Adding Items
1. Navigate to **Inventory (F6)** ➔ **+ Add Item**.
2. Enter Item details:
   - **Item Name & SKU**: e.g., `Cola 500ml`, SKU: `BEV001`.
   - **Category**: Select appropriate subcategory.
   - **Base Unit**: Base sales unit (`Bottle`, `Piece`, `Kg`).
   - **HSN Code & GST Rate**: (e.g., `2202`, 28% GST).
   - **Purchase Price & Sale Price**: Base price per piece.
   - **Low Stock Threshold**: Trigger point for alert badges.
   - **Serial Tracking**: Toggle ON if you track individual serial numbers.
3. Tap **Save Item**.

---

## 4. Packaging Unit Ladders & Barcodes

FMCG businesses buy and sell in bulk cartons, boxes, and loose pieces.

### 4.1 Configuring the Ladder
1. Open any Item ➔ **Packaging Units Ladder**.
2. Define unit levels in ascending order:
   - **Level 1 (Base)**: `Piece` | Factor: `1` | Price: `₹5.00` | Barcode: `89010001`
   - **Level 2 (Pack)**: `Pack` | Factor: `10` | Price: `₹45.00` | Barcode: `89010002`
   - **Level 3 (Box)**: `Box` | Factor: `120` | Price: `₹520.00` | Barcode: `89010003`
   - **Level 4 (Carton)**: `Carton` | Factor: `2400` | Price: `₹10,200.00` | Barcode: `89010004`
3. During billing, picking `1 Box` will automatically charge `₹520.00` and decrement `120 base pieces` from the lot!

---

## 5. FEFO Batch Stock & Expiry Tracking

First-Expiry, First-Out (FEFO) protects against spoiled stock losses.

### 5.1 Adding Lot Stock
1. Open **Inventory** ➔ **Batch Stock (FEFO)**.
2. Tap **+ Add Batch**.
3. Select Item, enter **Batch No** (e.g., `LOT-2026-A`), **Mfg Date**, **Expiry Date**, **Cost**, and **Opening Qty**.
4. The system automatically badges:
   - 🟢 **Active / In Stock**: Expiry > 30 days out.
   - 🟡 **Expiring Soon**: Expiry within the next 30 days.
   - 🔴 **Expired**: Lot past expiry date (prevented from sale).

---

## 6. Serial Number Tracking

For consumer electronics, high-value appliances, and tracked goods:
1. Open **Inventory** ➔ **Serial Lookup**.
2. Search any serial number (e.g., `SN-SB-001`) to view its current status (`in_stock` / `sold`), linked batch, purchase bill, and sale invoice.

---

## 7. Parties & Ledgers

### 7.1 Adding Parties
1. Open **Parties (F9)** ➔ **+ Add Party**.
2. Select **Customer** or **Supplier**.
3. Enter Name, Mobile Number, GSTIN, and State.
4. Enter **Opening Balance** (if any).

### 7.2 Viewing Ledger & Dispatching Reminders
- Tap any Customer to view their real-time balance, invoice history, and payments.
- Tap **Send WhatsApp Reminder** to open WhatsApp with a polite payment balance notification.

---

## 8. Billing & Invoicing (F2)

### 8.1 Creating a Sale Invoice
1. Tap **Billing (F2)** ➔ **+ New Invoice** (or select **Sale Invoice**).
2. Select **Customer**.
3. Tap **+ Add Item**:
   - Choose Item and Batch Lot.
   - Select Unit (`Carton`, `Box`, `Pack`, `Piece`). The unit multiplier and unit price apply automatically.
   - Adjust Trade Discount, CD %, or SD %.
4. The GST Engine automatically calculates CGST + SGST (intra-state) or IGST (inter-state) based on party GSTIN state code.
5. Tap **Review & Create Invoice**.

### 8.2 Printing & Sharing
- **Print / PDF**: Choose your preferred bill template (`Classic`, `Vyapar`, `Marg`, `Miracle`, `Tally`, `Busy`, `Modern`) and tap **Share PDF** or **Print**.
- **WhatsApp**: Tap **WhatsApp Invoice** to send invoice summary and links.

---

## 9. 3-Tier FMCG Discounts & GST Engine

The engine computes discounts sequentially in standard FMCG trade hierarchy:
1. **Gross Line Total** = `Quantity × Unit Price`
2. **Trade Discount** = Applied on Gross (e.g., 5%).
3. **Cash Discount (CD)** = Applied on Remaining Taxable Amount (e.g., 2%).
4. **Special Discount (SD)** = Applied on Line (Flat ₹ or %).
5. **GST Tax** = Calculated on Final Net Taxable Value.
6. **Round Off** = Automatic round-off to nearest integer ₹.

---

## 10. Payments & Receipts Reconciliation

1. Open **Hub & More** ➔ **Payments & Receipts**.
2. Tap **+ New Payment**:
   - **Type**: `Payment In (Receipt)` or `Payment Out (Voucher)`.
   - **Party**: Select Customer / Supplier.
   - **Linked Invoice**: Select outstanding bill.
   - **Payment Mode**: `Cash`, `UPI`, `Bank Transfer`, or `Cheque`.
   - **Amount Paid**: Enter amount.
3. The invoice status updates automatically from `unpaid` ➔ `partial` ➔ `paid`.

---

## 11. E-Way Bills Generation

1. Open **Hub & More** ➔ **E-Way Bills**.
2. Tap **+ Generate E-Way Bill**.
3. Select Invoice, enter Transporter ID, Transport Mode (`Road`, `Rail`, `Air`, `Ship`), Distance (km), and Vehicle No.
4. Export the official **NIC E-Way JSON Payload** or print the **E-Way Slip**.

---

## 12. Reports & GST Compliance

Navigate to **Hub & More** ➔ **Reports Center**:
- **Sales Register**: Comprehensive sales ledger with CGST/SGST/IGST breakdowns and CSV export.
- **Purchase Register**: Supplier procurement log and tax inputs.
- **GST & HSN Table 12**: B2B, B2CL, B2CS summaries with **GSTR-1 JSON export**.
- **Outstanding Receivables & Payables**: Aging analysis and 1-tap WhatsApp reminders.
- **Financial Year Balance**: Turnover, purchases, gross margin %, and closing stock valuation.
- **Traceability Report**: Batch and serial movement history.

---

## 13. Backup, Restore & Data Migration

### 13.1 Backup & Restore
- **Export Backup**: Navigate to **Hub & More** ➔ **Backup & Restore** ➔ **Export JSON Backup** to save a snapshot.
- **Restore Backup**: Pick any JSON snapshot to restore data.
- **Wipe All Data**: Clear sample data with master admin password confirmation.

### 13.2 CSV Data Import
- Navigate to **Hub & More** ➔ **Import Data (CSV)**.
- Download sample templates for Items or Parties.
- Upload your CSV to bulk import products and customer catalogs.

---

## 14. Theme Settings & Keyboard Navigation

- **Theme Palettes**: Choose from 8 business palettes: `Teal`, `Indigo`, `Emerald`, `Amber`, `Rose`, `Violet`, `Cyan`, `Slate`.
- **Dark Mode**: Switch between Light and High-Contrast Dark themes.
- **Desktop Shortcut Support**: Quick access keys (`F2` Billing, `F6` Inventory, `F9` Parties, `F12` Features).
