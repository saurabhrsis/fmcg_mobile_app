# FMCG Mobile ERP — Functionality & Technical Specification Matrix

This document provides a comprehensive technical breakdown of all architectural components, database schemas, business calculation formulas, and service APIs implemented in the FMCG Mobile Suite.

---

## 1. System Architecture Overview

```
                        ┌────────────────────────┐
                        │   Expo 54 Application   │
                        └───────────┬────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             ▼                      ▼                      ▼
    ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
    │ React Nav 7     │   │ Context & State  │   │ Services Layer  │
    │ (Stacks & Tabs) │   │ (Theme, Biz,Auth)│   │ (Tax, Print, DB)│
    └─────────────────┘   └──────────────────┘   └────────┬────────┘
                                                          │
                                           ┌──────────────▼──────────────┐
                                           │  expo-sqlite (WAL Mode)     │
                                           │  SQLite 3.4x Offline Engine │
                                           └─────────────────────────────┘
```

---

## 2. Functionality & Module Matrix

| Module | Features & Capabilities | Reference Screen(s) | Service(s) |
|---|---|---|---|
| **Multi-Firm / Businesses** | • Multiple independent firms<br>• Custom invoice series (`INV`, `APX`)<br>• Bank & UPI credentials<br>• Bill customization (7 templates, colors)<br>• Header quick switcher | `BusinessListScreen`<br>`BusinessFormScreen` | `businessService.ts` |
| **Inventory & Items** | • Multi-level category hierarchy<br>• SKU, Barcode, HSN, Tax rate<br>• Low stock thresholds & alerts<br>• Tax inclusive/exclusive pricing<br>• Stock valuation | `ItemListScreen`<br>`ItemDetailScreen`<br>`ItemFormScreen`<br>`CategoryManagerScreen` | `itemService.ts`<br>`lookupService.ts` |
| **Packaging Ladders** | • Multi-tier unit hierarchy (Carton > Box > Pack > Piece)<br>• Multiplier factor math<br>• Unit-specific purchase & sale prices<br>• Unique barcode per unit level | `ItemDetailScreen`<br>`ItemFormScreen` | `itemService.ts`<br>`units.ts` |
| **FEFO Batches** | • First-Expiry First-Out sorting<br>• Mfg & Expiry date management<br>• Lot costing & MRP<br>• Expiring soon (30-day) badge<br>• Auto lot stock decrementing | `BatchStockScreen` | `batchService.ts`<br>`stock.ts` |
| **Serial Numbers** | • Unique serial tracking (`in_stock`, `sold`)<br>• Link to purchase & sale invoices<br>• Lifecycle history lookup | `SerialLookupScreen` | `serialService.ts` |
| **Parties & Ledgers** | • Customer & Supplier profiles<br>• **Walk-in customers (name only, `is_walkin` flag)** completed later without losing the ledger link<br>• GSTIN state code parsing & format validation<br>• Real-time ledger balance math<br>• 1-tap WhatsApp payment reminders | `PartyListScreen`<br>`PartyDetailScreen`<br>`PartyFormScreen` | `partyService.ts`<br>`whatsappService.ts` |
| **Billing & Vouchers** | • Sales, Purchases, Quotations, Notes<br>• **GST bill vs NON-GST bill (`bill_type`)** — bill of supply prints with no tax columns<br>• **Supply type: Auto / Intra / Inter / Nil-rated (`gst_type`)**<br>• 3-tier discounts (Trade/CD/SD)<br>• Automated Intra/Inter GST split<br>• Walk-in counter billing with a name only<br>• E-Way & FMCG dispatch metadata<br>• Quotation-to-Sale conversion | `CreateInvoiceScreen`<br>`InvoiceListScreen`<br>`InvoiceDetailScreen` | `invoiceService.ts`<br>`printService.ts`<br>`gstState.ts` |
| **Payments** | • Payment In (Receipts) & Out (Vouchers)<br>• Cash, UPI, Bank Transfer, Cheque<br>• Auto invoice status reconciliation | `PaymentListScreen`<br>`CreatePaymentScreen` | `paymentService.ts` |
| **E-Way Bills** | • E-Way bill generation linked to invoices<br>• Road, Rail, Air, Ship modes<br>• Distance & vehicle validation<br>• NIC JSON payload export & slip print | `EwayListScreen`<br>`EwayFormScreen`<br>`EwayDetailScreen` | `ewayService.ts` |
| **GST & HSN Reports** | • Sales & Purchase Registers<br>• B2B, B2CL, B2CS classifications<br>• HSN Table 12 summaries<br>• GSTR-1 JSON export | `ReportsHomeScreen`<br>`SalesRegisterScreen`<br>`GstReportScreen`<br>`HsnSummaryScreen` | `reportService.ts`<br>`gstr1Service.ts` |
| **Financial Analytics** | • Outstanding Receivables/Payables with aging<br>• FY Balance Sheet (Turnover, Purchases, Gross Margin)<br>• Serial & Batch Traceability | `OutstandingReportScreen`<br>`FyBalanceScreen`<br>`TraceabilityScreen` | `reportService.ts`<br>`fy.ts` |
| **Settings & Security** | • Role-based permissions (Admin/Staff)<br>• F12 Global feature toggles<br>• 8 Theme palettes & Dark mode<br>• JSON backup & restore<br>• CSV catalog data migration | `UserListScreen`<br>`FeaturesConfigScreen`<br>`ThemeSettingsScreen`<br>`BackupRestoreScreen`<br>`DataImportScreen` | `authService.ts`<br>`backupService.ts`<br>`migrateService.ts` |
| **Desktop Sync & Pairing** | • **QR pairing** with the desktop portal (`expo-camera`, port 4000)<br>• `parsePairingCode()` for JSON + `rightserve://sync` payloads<br>• URL / API-key manual fallback (key is required)<br>• Full sync (pull → merge → push), push, pull, ping<br>• Offline export / import sync files<br>• `usesCleartextTraffic` for release Android on the LAN | `DesktopSyncScreen`<br>`ScanDesktopQrScreen` | `syncService.ts` |
| **Licensing** | • ed25519 offline key verification, 7-day trial<br>• **`product` gate — desktop keys are rejected on mobile**<br>• Device-locked keys, one-time online activation + seal<br>• Read-only mode after trial/expiry | `ActivationScreen`<br>`LicenseScreen` | `license.ts`<br>`licenseStore.ts` |

---

## 3. Database Schema Reference (12 Tables)

1. **`users`**: User credentials, role (`admin` / `staff`), granular permissions JSON, security questions.
2. **`company`**: Master enterprise settings, financial year start month, global F12 feature flags.
3. **`businesses`**: Multi-firm profiles, GSTINs, bank accounts, UPI IDs, bill formats, header/footer colors.
4. **`categories`**: Nested hierarchical categories with `parent_id` foreign keys.
5. **`items`**: Products master with SKU, category, base unit, HSN, GST rate, cost, and serial tracking flags.
6. **`item_units`**: Packaging ladder levels with multiplier factors, prices, and barcodes.
7. **`batches`**: FEFO lot inventory with batch numbers, mfg/expiry dates, purchase costs, MRP, and available stock.
8. **`serials`**: Product serials with lifecycle statuses (`in_stock` / `sold`) and invoice linkage.
9. **`parties`**: Customers and suppliers with GSTINs, state codes, opening balances, and an
   `is_walkin` flag for name-only walk-in customers (set while phone **and** GSTIN are blank,
   cleared automatically once the profile is completed).
10. **`invoices`**: Vouchers master (`sale`, `purchase`, `quotation`, notes) with dispatch info, GST
    sums, `gst_type` (`auto` / `intra` / `inter` / `nil`) and `bill_type` (`gst` / `non_gst`).
11. **`invoice_items`**: Line items with unit factors, 3-tier discounts, HSN, taxable values, and tax amounts.
12. **`payments`**: Receipts and vouchers with payment modes and invoice balance updates.
13. **`eway_bills`**: E-Way bills with transport details, distance, vehicle numbers, and NIC JSON status.

---

## 4. Business Calculation Formulas

### 4.1 Packaging Ladder Math
- **Line Base Quantity** = $\text{Invoice Qty} \times \text{Unit Factor}$
  - *Example*: 2 Boxes of Biscuits (Factor 120) = $2 \times 120 = 240$ base pieces decremented from batch.

### 4.2 FMCG 3-Tier Discount & Tax Engine
Let:
- Gross Amount $G = \text{Quantity} \times \text{Unit Price}$
- Trade Discount $D_{\text{trade}} = G \times \frac{\text{Trade\%}}{100}$ (or flat ₹)
- Cash Discount Base $B_{\text{cd}} = G - D_{\text{trade}}$
- Cash Discount $D_{\text{cd}} = B_{\text{cd}} \times \frac{\text{CD\%}}{100}$ (or flat ₹)
- Net Taxable Value $T = B_{\text{cd}} - D_{\text{cd}} - D_{\text{special}}$

### 4.3 GST Tax Determination
- If $\text{Party State Code} == \text{Firm State Code}$ (Intra-State):
  - $\text{CGST} = T \times \frac{\text{GST Rate}}{200}$
  - $\text{SGST} = T \times \frac{\text{GST Rate}}{200}$
  - $\text{IGST} = 0$
- If $\text{Party State Code} \neq \text{Firm State Code}$ (Inter-State):
  - $\text{CGST} = 0$, $\text{SGST} = 0$
  - $\text{IGST} = T \times \frac{\text{GST Rate}}{100}$
- $\text{Total Invoice Amount} = \text{round}(T + \text{Tax} + \text{Cess})$

### 4.4 Non-GST Bills & Nil-rated Supplies
- `bill_type = 'non_gst'` (**bill of supply** / cash memo) or `gst_type = 'nil'`
  (**nil-rated / exempt**) ⇒ `isNilRated()` is true:
  - every line `gst_rate` is forced to `0` before `computeLineMath()` runs, so
    $\text{CGST} = \text{SGST} = \text{IGST} = 0$ and $\text{Total} = T$;
  - `isInterState()` returns `false` (no IGST on a no-tax bill);
  - the print / PDF / WhatsApp output drops the GST column and tax rows and titles the document
    **BILL OF SUPPLY** (or “TAX INVOICE (NIL / EXEMPT)”) with a no-GST declaration;
  - the voucher is excluded from **GSTR-1**, the **HSN / Table-12** summary and the portal JSON,
    but stays in the **Sales Register** and the dashboard turnover (reported separately as
    `monthNonGstSales` / `summary.nonGstTotal`).
- For a non-GST bill the supply type (`intra` / `inter` / `nil`) is stored for register
  classification only — it never re-enables tax.
- Switching a draft bill from Non-GST back to GST restores the item-master rates kept in
  `InvoiceItem.orig_gst_rate` (in-memory only, never written to SQLite).

---

## 5. Bill Templates Matrix

| Template Name | Layout Style | Highlights |
|---|---|---|
| **Classic** | Clean professional 2-column | Standard commercial layout with colored headers |
| **Vyapar** | Compact retail | Optimized for high density & POS printing |
| **Marg** | Pharma & FMCG distributor | Emphasizes Batch No, Expiry, MRP, and CD % |
| **Miracle** | Detailed tax breakdown | Full CGST/SGST rate-wise split tables |
| **Tally** | Traditional accounting | Formal ledger-style boxes & authorized signatures |
| **Busy** | Enterprise wholesale | Includes transport, E-Way, and consignee details |
| **Modern** | Minimalist corporate | Elegant card layout with primary theme accents |
