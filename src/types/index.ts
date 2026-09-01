export type UserRole = 'admin' | 'staff';

export interface UserPermissions {
  sales?: boolean;
  purchases?: boolean;
  inventory?: boolean;
  parties?: boolean;
  payments?: boolean;
  reports?: boolean;
  eway?: boolean;
  settings?: boolean;
  migrate?: boolean;
  delete_tx?: boolean;
  edit_price?: boolean;
}

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  permissions?: UserPermissions | null;
  active: boolean;
  sec_question?: string;
  theme_prefs?: {
    palette?: string;
    density?: string;
    textSize?: string;
    darkMode?: boolean;
  };
  created_by?: number | null;
  created_at: string;
}

export interface CompanyFeatures {
  negativeStock?: boolean;
  duplicateSerialAlert?: boolean;
  autoRoundOff?: boolean;
  trackSerials?: boolean;
  multiUnitConversion?: boolean;
  threeLevelDiscounts?: boolean;
  quotations?: boolean;
  ewayBills?: boolean;
  billFormat?: string;
  billPackets?: boolean;
  billConsignee?: boolean;
  billDispatch?: boolean;
  billOrderRef?: boolean;
  billEInvoice?: boolean;
  billTerms?: boolean;
}

export interface Company {
  id: number;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  state_code: string;
  invoice_prefix: string;
  terms: string;
  features: CompanyFeatures;
  fy_start_month: number;
  last_fy: string;
}

export interface Business {
  id: number;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  state_code: string;
  invoice_prefix: string;
  terms: string;
  fy_start_month: number;
  is_default: number;
  active: number;
  logo?: string;
  signature?: string;
  stamp?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  account_holder?: string;
  upi_id?: string;
  pan?: string;
  udyam?: string;
  cin?: string;
  qr_image?: string;
  fssai?: string;
  bill_number_start: number;
  bill_terms?: string;
  bill_format: string; // 'classic' | 'vyapar' | 'marg' | 'miracle' | 'tally' | 'busy' | 'modern'
  bill_color: string;
  bill_header_bg?: string;
  bill_header_fg?: string;
  bill_table_bg?: string;
  bill_table_fg?: string;
  bill_total_bg?: string;
  bill_total_fg?: string;
  bill_title?: string;
  bill_signatory?: string;
  bill_billto_label?: string;
  bill_terms_heading?: string;
  bill_declaration?: string;
  bill_footer_note?: string;
  bill_terms_list?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  path?: string;
}

export interface ItemUnit {
  id?: number;
  item_id?: number;
  unit_name: string;
  factor: number;
  is_base: number;
  purchase_price: number;
  sale_price: number;
  barcode: string;
  sort_order?: number;
}

export interface Item {
  id: number;
  name: string;
  sku: string;
  category_id: number | null;
  category_name?: string;
  unit: string;
  base_unit: string;
  hsn: string;
  gst_rate: number;
  purchase_price: number;
  sale_price: number;
  avg_cost: number;
  low_stock_alert: number;
  is_active: number;
  description: string;
  track_serials: number;
  brand: string;
  mrp: number;
  image: string;
  min_stock: number;
  max_stock: number;
  tax_inclusive: number;
  cess_rate: number;
  created_at: string;
  stock?: number;
  stock_label?: string;
  stock_value?: number;
  units?: ItemUnit[];
}

export interface Batch {
  id: number;
  item_id: number;
  item_name?: string;
  sku?: string;
  unit?: string;
  business_id: number;
  batch_no: string;
  mfg_date: string;
  expiry_date: string;
  purchase_price: number;
  mrp: number;
  qty_in: number;
  qty_available: number;
  qty_sold?: number;
  stock_value?: number;
  stock_status?: string;
  created_at: string;
}

export interface SerialItem {
  id: number;
  business_id: number;
  item_id: number;
  item_name?: string;
  sku?: string;
  unit?: string;
  hsn?: string;
  serial_no: string;
  batch_no: string;
  status: 'in_stock' | 'sold';
  purchase_invoice_id: number | null;
  sale_invoice_id: number | null;
  purchase_invoice_no?: string;
  sale_invoice_no?: string;
  created_at: string;
}

export interface Party {
  id: number;
  name: string;
  type: 'customer' | 'supplier';
  phone: string;
  email: string;
  gstin: string;
  address: string;
  state: string;
  opening_balance: number;
  created_at: string;
  balance?: number;
  invoices?: Invoice[];
  payments?: Payment[];
}

export type InvoiceType = 'sale' | 'purchase' | 'quotation';
export type NoteKind = '' | 'credit' | 'debit';
export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'open' | 'accepted' | 'rejected' | 'converted';

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  item_id: number | null;
  batch_id: number | null;
  item_name: string;
  description?: string;
  serials?: string;
  batch_no?: string;
  hsn?: string;
  qty: number;
  unit?: string;
  unit_factor?: number;
  base_qty?: number;
  price: number;
  discount?: number; // legacy percent
  disc_trade_pct?: number;
  disc_trade_amt?: number;
  disc_cd_pct?: number;
  disc_cd_amt?: number;
  disc_sd_pct?: number;
  disc_sd_amt?: number;
  disc_trade_mode?: 'pct' | 'amt';
  disc_cd_mode?: 'pct' | 'amt';
  disc_sd_mode?: 'pct' | 'amt';
  gst_rate: number;
  taxable: number;
  tax_amount: number;
  line_total: number;
  mfg_date?: string;
  expiry_date?: string;
  mrp?: number;
  track_serials?: number;
}

export interface Invoice {
  id: number;
  invoice_no: string;
  type: InvoiceType;
  business_id: number;
  party_id: number | null;
  party_name?: string;
  party_gstin?: string;
  party_phone?: string;
  party_email?: string;
  party_address?: string;
  party_state?: string;
  date: string;
  subtotal: number;
  discount: number;
  tax_total: number;
  total: number;
  round_off: number;
  paid: number;
  status: InvoiceStatus;
  notes: string;
  note_kind: NoteKind;
  ref_invoice_no?: string;
  ref_invoice_date?: string;
  valid_until?: string;
  converted_invoice_id?: number | null;
  consignee_name?: string;
  consignee_address?: string;
  consignee_gstin?: string;
  consignee_state?: string;
  place_of_supply?: string;
  eway_no?: string;
  pay_terms?: string;
  po_no?: string;
  po_date?: string;
  other_ref?: string;
  dispatch_doc?: string;
  delivery_note?: string;
  delivery_note_date?: string;
  dispatched_through?: string;
  destination?: string;
  terms_delivery?: string;
  irn?: string;
  ack_no?: string;
  ack_date?: string;
  no_of_packets?: string;
  supplier_inv_no?: string;
  created_by?: number | null;
  created_at: string;
  items?: InvoiceItem[];
}

export type PaymentType = 'in' | 'out';
export type PaymentMode = 'cash' | 'upi' | 'bank' | 'cheque';

export interface Payment {
  id: number;
  party_id: number | null;
  party_name?: string;
  invoice_id: number | null;
  invoice_no?: string;
  business_id: number;
  type: PaymentType;
  amount: number;
  mode: PaymentMode;
  date: string;
  notes: string;
  created_at: string;
}

export interface EwayBill {
  id: number;
  business_id: number;
  invoice_id: number | null;
  invoice_no?: string;
  ewb_no: string;
  ewb_date: string;
  supply_type: 'O' | 'I';
  sub_type: string;
  doc_type: string;
  doc_no: string;
  doc_date: string;
  from_gstin: string;
  from_name: string;
  from_addr: string;
  from_place: string;
  from_pin: string;
  from_state: string;
  to_gstin: string;
  to_name: string;
  to_addr: string;
  to_place: string;
  to_pin: string;
  to_state: string;
  transporter_id: string;
  transporter_name: string;
  trans_mode: 'road' | 'rail' | 'air' | 'ship';
  trans_distance: number;
  trans_doc_no: string;
  trans_doc_date: string;
  vehicle_no: string;
  vehicle_type: 'R' | 'O';
  total_value: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  notes: string;
  status: 'draft' | 'generated' | 'cancelled';
  created_by?: number | null;
  created_at: string;
}

export interface DashboardMetrics {
  todaySales: number;
  monthSales: number;
  monthPurchase: number;
  receivable: number;
  payable: number;
  stockValue: number;
  itemCount: number;
  partyCount: number;
  lowStockCount: number;
  expSoonCount: number;
  lowStock: any[];
  expSoon: any[];
  trend: { date: string; sales: number }[];
  topItems: { item_name: string; qty: number; amount: number }[];
}

export interface HsnEntry {
  hsn: string;
  desc: string;
  gst: number;
}
