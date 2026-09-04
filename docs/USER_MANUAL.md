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
15. [Desktop Sync & QR Pairing](#15-desktop-sync--qr-pairing)

---

## 1. Getting Started & Sign In

### 1.1 Initial Launch
The app ships with **no demo data and no default accounts** — you start with a clean database.

- **Login**: The app always opens on the **Login** page. First-time users tap
  **New user? Create Your Account**; returning users sign straight in. Use
  **Forgot Password?** to reset via your security question.
- **Register**: create your admin account (name, username, password, security question) and choose
  how to set up your firm:
  - **Enter business details** — type the trade name, GSTIN, phone, address and state yourself, or
  - **I already use RightServe Desktop** — skip the business form entirely. After signing in the
    app opens **Desktop Sync**: scan the pairing QR on the PC and tap **Full Sync** to copy the
    firm, items, parties and bills automatically.
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
- **Mobile and desktop are separate products.** A licence activates one device, so the phone
  needs a key with `product: "mobile"` (or `"both"`); a desktop key is rejected here with
  *“This key is for the RightServe desktop app”*, exactly as the desktop rejects a mobile key.
  Buying both apps issues two keys for the same client, and each product is renewed
  separately.

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

### 7.1.1 Walk-in Customers (name only)
- Tick **Walk-in customer (name only)** on the party form — or use **Walk-in Customer** while
  billing — and just the name is saved. Phone, GSTIN, state and address stay blank.
- Walk-in parties carry a **WALK-IN** badge in the party list, the party profile and on the
  bill, and the profile shows which fields are still missing.
- **Updating later**: open the party (or tap **Update Customer Details** on the saved bill) and
  add the phone / GSTIN / address whenever the customer shares them. Every bill already raised
  stays linked to the same ledger, and the walk-in flag clears itself as soon as a phone number
  or GSTIN is saved.
- WhatsApp sharing needs a mobile number — if the customer has none yet, the bill screen offers
  to add one first.

### 7.2 Viewing Ledger & Dispatching Reminders
- Tap any Customer to view their real-time balance, invoice history, and payments.
- Tap **Send WhatsApp Reminder** to open WhatsApp with a polite payment balance notification.

---

## 8. Billing & Invoicing (F2)

### 8.1 Creating a Sale Invoice
1. Tap **Billing (F2)** ➔ **+ New Invoice** (or select **Sale Invoice**).
2. Select **Customer** — or tap **Walk-in Customer (name only)** to bill a counter customer with
   just a name (see §7.1.1). Their details can be completed after the bill is saved.
3. Choose the **Bill Type**:
   - **GST Bill (Tax Invoice)** — normal taxable sale with CGST + SGST or IGST.
   - **Non-GST Bill (Bill of Supply)** — for unregistered, composition-dealer or exempt-goods
     buyers. No tax is charged: line GST rates drop to 0%, the summary shows *“GST: Not
     applicable”*, and the printout becomes a **BILL OF SUPPLY** without tax columns, with a
     declaration that no GST has been charged.
4. Pick the **GST Tax Type / Supply Type** — this is **selected automatically** from your firm's
   state and the customer's state (same state → CGST + SGST, different state → IGST), and re-picks
   itself whenever you change the customer:
   - GST bill → `CGST + SGST` (intra-state), `IGST` (inter-state / SEZ) or `Nil / Exempt`.
     Override manually only for special cases such as SEZ units.
   - Non-GST bill → `Intra-state`, `Inter-state` or `Nil / Exempt`. This only records how the
     supply is classified for your registers; the bill still carries no tax.
5. Tap **+ Add Item**:
   - Choose Item and Batch Lot.
   - Select Unit (`Carton`, `Box`, `Pack`, `Piece`). The unit multiplier and unit price apply automatically.
   - Adjust Trade Discount, CD %, or SD %.
6. The GST Engine automatically calculates CGST + SGST (intra-state) or IGST (inter-state) based on party GSTIN state code.
7. Tap **Save & Finalize**. If the customer profile is incomplete you are asked once whether to
   update it now or save anyway — and after saving you can jump straight to **Add Customer
   Details**.

### 8.2 Printing & Sharing
- **Print / PDF**: Choose your preferred bill template (`Classic`, `Vyapar`, `Marg`, `Miracle`, `Tally`, `Busy`, `Modern`) and tap **Share PDF** or **Print**.
- **WhatsApp**: Tap **WhatsApp Invoice** to send invoice summary and links.

### 8.3 Non-GST Bills (Bill of Supply)
- Bill type and supply type are stored on the voucher (`invoices.bill_type`, `invoices.gst_type`),
  so old bills keep printing exactly as they were created.
- Non-GST bills are listed with a **NON-GST** badge in Billing, and the invoice list has an
  `All bills / GST bills / Non-GST bills` filter.
- They appear in the **Sales Register** (with “GST: not applicable” and a non-GST total in the
  summary + CSV export) but are **excluded from GSTR-1, the HSN/Table-12 summary and the portal
  JSON**, which is also shown as an “Outside GSTR-1” count on the GST report screen.
- An e-way bill can still be generated for a non-GST bill — the tax fields are simply nil.
- Nil-rated / exempt goods sold on a **GST** invoice: choose `Nil / Exempt` as the tax type; the
  invoice prints as “TAX INVOICE (NIL / EXEMPT)” with no tax and is also kept out of GSTR-1.

### 8.4 Walk-in Counter Billing
- Bill with a name only (§7.1.1). The saved bill shows a **WALK-IN** badge plus an
  **Update Customer Details** button, so the phone number / GSTIN / address can be added later
  without re-billing.

---

## 9. 3-Tier FMCG Discounts & GST Engine

The engine computes discounts sequentially in standard FMCG trade hierarchy:
1. **Gross Line Total** = `Quantity × Unit Price`
2. **Trade Discount** = Applied on Gross (e.g., 5%).
3. **Cash Discount (CD)** = Applied on Remaining Taxable Amount (e.g., 2%).
4. **Special Discount (SD)** = Applied on Line (Flat ₹ or %).
5. **GST Tax** = Calculated on Final Net Taxable Value.
6. **Round Off** = Automatic round-off to nearest integer ₹.

**No-tax cases** — a **Non-GST bill** (`bill_type = 'non_gst'`) or a **Nil / Exempt** supply
(`gst_type = 'nil'`) always produces `GST = 0`: line rates are forced to 0% before the maths runs,
`isInterState()` returns false, and the print/PDF/WhatsApp output drops every tax column. Switching
a draft bill back to **GST Bill** restores the item-master rates automatically.

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
- **GST & HSN Table 12**: B2B, B2CL, B2CS summaries with **GSTR-1 JSON export**. Non-GST bills and
  nil-rated supplies are counted separately under **Outside GSTR-1** and never enter the JSON.
- **Outstanding Receivables & Payables**: Aging analysis and 1-tap WhatsApp reminders.
- **Financial Year Balance**: Turnover, purchases, gross margin %, and closing stock valuation.
- **Traceability Report**: Batch and serial movement history.

---

## 13. Data Backup & Import

Both data-safety tools live in **one screen: Hub & More ➔ Data Backup & Import**, with two tabs.

### 13.1 Backup & Restore tab
- **Export Backup**: Tap **Generate & Share Backup** to save a portable JSON snapshot.
- **Restore Backup**: Pick any JSON snapshot to restore data.
- **Wipe All Data**: Clear all transaction & master data with master admin password confirmation.

### 13.2 CSV Import tab
- Download sample templates for Items or Parties.
- Upload your CSV (from Marg, Vyapar, Tally or Excel) or paste it directly, check the
  auto-mapped preview and confirm to bulk import products and customer catalogs.

---

## 14. Theme Settings & Keyboard Navigation

- **Theme Palettes**: Choose from 8 business palettes: `Teal`, `Indigo`, `Emerald`, `Amber`, `Rose`, `Violet`, `Cyan`, `Slate`.
- **Dark Mode**: Switch between Light and High-Contrast Dark themes.
- **Desktop Shortcut Support**: Quick access keys (`F2` Billing, `F6` Inventory, `F9` Parties, `F12` Features).

---

## 15. Desktop Sync & QR Pairing

**Hub & More ➔ Desktop Portal Sync** exchanges data with the RightServe desktop app over Wi-Fi.

### 15.1 Recommended setup
1. Create the company, items and parties on the **desktop** first.
2. On the desktop open **Settings → Mobile Sync** — it listens on `0.0.0.0:4000` and shows a
   **pairing QR**.
3. On the phone tap **Scan QR to connect** and point the camera at that QR. The QR carries both
   the LAN address and the **required** API key, e.g.
   `{"v":1,"app":"rightserve-sync","url":"http://192.168.1.5:4000","key":"rsync_…"}`, so nothing
   has to be typed. Camera access is asked for once; **Can’t scan? Paste code** and manual
   address/key entry remain available underneath.
4. Tap **Full Sync** — the desktop data is pulled and merged first, then this phone’s data is
   pushed back.
5. Use the **same business name** on both devices. A phone with empty data imports the desktop
   firm on the first pull.

### 15.2 How records match
Merging is by natural keys, never by licence key or internal IDs: `businesses` by name, `items` by
name + SKU, `parties` by name + type, `invoices` by business + invoice no + type, `batches` by
business + item + batch no. Existing local rows always win, so re-syncing never duplicates bills or
stock. Each device keeps its own `company` row — fill the GSTIN on both.

### 15.3 If the desktop is “not reachable”
- Phone and PC must be on the **same Wi-Fi** (not mobile data or a guest/client-isolated network).
- The desktop app must be running with Mobile Sync enabled, and port **4000** must be allowed
  through the firewall.
- Release Android builds must permit plain HTTP on the LAN (`usesCleartextTraffic` is enabled in
  this project); iOS uses `NSAllowsLocalNetworking`.
- Offline **Export / Import Sync File** (USB, email, WhatsApp, pen drive) works without any
  network.
