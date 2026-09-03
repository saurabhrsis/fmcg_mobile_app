export const SCHEMA_SQL = `
-- Key/value store for app-level metadata: device id, license key, activation
-- seal, free-trial start date and the anti-rollback clock.
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  permissions TEXT DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  sec_question TEXT DEFAULT '',
  sec_answer_hash TEXT DEFAULT '',
  theme_prefs TEXT DEFAULT '{}',
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  gstin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  state TEXT DEFAULT '',
  state_code TEXT DEFAULT '',
  invoice_prefix TEXT DEFAULT 'INV',
  terms TEXT DEFAULT 'Goods once sold will not be taken back.',
  features TEXT DEFAULT '{}',
  fy_start_month INTEGER NOT NULL DEFAULT 4,
  last_fy TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  gstin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  state TEXT DEFAULT '',
  state_code TEXT DEFAULT '',
  invoice_prefix TEXT DEFAULT 'INV',
  terms TEXT DEFAULT 'Goods once sold will not be taken back.',
  fy_start_month INTEGER NOT NULL DEFAULT 4,
  is_default INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  logo TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  stamp TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  bank_branch TEXT DEFAULT '',
  account_holder TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  pan TEXT DEFAULT '',
  udyam TEXT DEFAULT '',
  cin TEXT DEFAULT '',
  qr_image TEXT DEFAULT '',
  fssai TEXT DEFAULT '',
  bill_number_start INTEGER NOT NULL DEFAULT 1,
  bill_terms TEXT DEFAULT '',
  bill_format TEXT NOT NULL DEFAULT 'classic',
  bill_color TEXT NOT NULL DEFAULT '#0f766e',
  bill_header_bg TEXT DEFAULT '',
  bill_header_fg TEXT DEFAULT '',
  bill_table_bg TEXT DEFAULT '',
  bill_table_fg TEXT DEFAULT '',
  bill_total_bg TEXT DEFAULT '',
  bill_total_fg TEXT DEFAULT '',
  bill_title TEXT DEFAULT 'TAX INVOICE',
  bill_signatory TEXT DEFAULT 'Authorised Signatory',
  bill_billto_label TEXT DEFAULT 'Bill To (Buyer)',
  bill_terms_heading TEXT DEFAULT 'Terms & Conditions',
  bill_declaration TEXT DEFAULT 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  bill_footer_note TEXT DEFAULT 'Thank you for your business!',
  bill_terms_list TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE(name, parent_id)
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  unit TEXT DEFAULT 'PCS',
  base_unit TEXT DEFAULT 'PCS',
  hsn TEXT DEFAULT '',
  gst_rate REAL NOT NULL DEFAULT 0,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  avg_cost REAL NOT NULL DEFAULT 0,
  low_stock_alert REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  description TEXT DEFAULT '',
  track_serials INTEGER NOT NULL DEFAULT 0,
  brand TEXT DEFAULT '',
  mrp REAL NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  min_stock REAL NOT NULL DEFAULT 0,
  max_stock REAL NOT NULL DEFAULT 0,
  tax_inclusive INTEGER NOT NULL DEFAULT 0,
  cess_rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  factor REAL NOT NULL DEFAULT 1,
  is_base INTEGER NOT NULL DEFAULT 0,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  barcode TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_item_units_item ON item_units(item_id);
CREATE INDEX IF NOT EXISTS idx_item_units_barcode ON item_units(barcode);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  mfg_date TEXT DEFAULT '',
  expiry_date TEXT DEFAULT '',
  purchase_price REAL NOT NULL DEFAULT 0,
  mrp REAL NOT NULL DEFAULT 0,
  qty_in REAL NOT NULL DEFAULT 0,
  qty_available REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_batches_item ON batches(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_biz ON batches(business_id);

CREATE TABLE IF NOT EXISTS serials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  serial_no TEXT NOT NULL,
  batch_no TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_stock',
  purchase_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  sale_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_serials_item ON serials(item_id);
CREATE INDEX IF NOT EXISTS idx_serials_biz ON serials(business_id);
CREATE INDEX IF NOT EXISTS idx_serials_no ON serials(serial_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_serials_uniq ON serials(business_id, item_id, serial_no);

CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  address TEXT DEFAULT '',
  state TEXT DEFAULT '',
  opening_balance REAL NOT NULL DEFAULT 0,
  is_walkin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL,
  type TEXT NOT NULL,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax_total REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  round_off REAL NOT NULL DEFAULT 0,
  paid REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT DEFAULT '',
  note_kind TEXT DEFAULT '',
  ref_invoice_no TEXT DEFAULT '',
  ref_invoice_date TEXT DEFAULT '',
  valid_until TEXT DEFAULT '',
  converted_invoice_id INTEGER,
  consignee_name TEXT DEFAULT '',
  consignee_address TEXT DEFAULT '',
  consignee_gstin TEXT DEFAULT '',
  consignee_state TEXT DEFAULT '',
  place_of_supply TEXT DEFAULT '',
  eway_no TEXT DEFAULT '',
  pay_terms TEXT DEFAULT '',
  po_no TEXT DEFAULT '',
  po_date TEXT DEFAULT '',
  other_ref TEXT DEFAULT '',
  dispatch_doc TEXT DEFAULT '',
  delivery_note TEXT DEFAULT '',
  delivery_note_date TEXT DEFAULT '',
  dispatched_through TEXT DEFAULT '',
  destination TEXT DEFAULT '',
  terms_delivery TEXT DEFAULT '',
  irn TEXT DEFAULT '',
  ack_no TEXT DEFAULT '',
  ack_date TEXT DEFAULT '',
  no_of_packets TEXT DEFAULT '',
  supplier_inv_no TEXT DEFAULT '',
  gst_type TEXT DEFAULT 'auto',
  bill_type TEXT NOT NULL DEFAULT 'gst',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_party ON invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_invoices_biz ON invoices(business_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  serials TEXT DEFAULT '',
  batch_no TEXT DEFAULT '',
  hsn TEXT DEFAULT '',
  qty REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '',
  unit_factor REAL NOT NULL DEFAULT 1,
  base_qty REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  disc_trade_pct REAL NOT NULL DEFAULT 0,
  disc_trade_amt REAL NOT NULL DEFAULT 0,
  disc_cd_pct REAL NOT NULL DEFAULT 0,
  disc_cd_amt REAL NOT NULL DEFAULT 0,
  disc_sd_pct REAL NOT NULL DEFAULT 0,
  disc_sd_amt REAL NOT NULL DEFAULT 0,
  disc_trade_mode TEXT NOT NULL DEFAULT 'pct',
  disc_cd_mode TEXT NOT NULL DEFAULT 'pct',
  disc_sd_mode TEXT NOT NULL DEFAULT 'pct',
  gst_rate REAL NOT NULL DEFAULT 0,
  taxable REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  mode TEXT DEFAULT 'cash',
  date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_biz ON payments(business_id);

CREATE TABLE IF NOT EXISTS eway_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  ewb_no TEXT DEFAULT '',
  ewb_date TEXT NOT NULL DEFAULT (date('now')),
  supply_type TEXT NOT NULL DEFAULT 'O',
  sub_type TEXT NOT NULL DEFAULT 'supply',
  doc_type TEXT NOT NULL DEFAULT 'INV',
  doc_no TEXT DEFAULT '',
  doc_date TEXT DEFAULT '',
  from_gstin TEXT DEFAULT '', from_name TEXT DEFAULT '', from_addr TEXT DEFAULT '',
  from_place TEXT DEFAULT '', from_pin TEXT DEFAULT '', from_state TEXT DEFAULT '',
  to_gstin TEXT DEFAULT '', to_name TEXT DEFAULT '', to_addr TEXT DEFAULT '',
  to_place TEXT DEFAULT '', to_pin TEXT DEFAULT '', to_state TEXT DEFAULT '',
  transporter_id TEXT DEFAULT '', transporter_name TEXT DEFAULT '',
  trans_mode TEXT NOT NULL DEFAULT 'road',
  trans_distance REAL NOT NULL DEFAULT 0,
  trans_doc_no TEXT DEFAULT '', trans_doc_date TEXT DEFAULT '',
  vehicle_no TEXT DEFAULT '', vehicle_type TEXT NOT NULL DEFAULT 'R',
  total_value REAL NOT NULL DEFAULT 0,
  taxable_value REAL NOT NULL DEFAULT 0,
  cgst REAL NOT NULL DEFAULT 0, sgst REAL NOT NULL DEFAULT 0, igst REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eway_biz ON eway_bills(business_id);
`;
