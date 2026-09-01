import { simpleHash } from '../utils/hash';
import { getDatabase } from './database';

export async function seedInitialData(
  runAsync: (sql: string, params?: any[]) => Promise<any>,
  getFirstAsync: (sql: string, params?: any[]) => Promise<any>
) {
  // Check if users exist
  const userCount = await getFirstAsync('SELECT COUNT(*) as c FROM users');
  if (userCount && userCount.c > 0) {
    return; // Already initialized
  }

  // 1. Admin User
  const adminPassHash = simpleHash('admin123');
  const secAnsHash = simpleHash('demo');
  await runAsync(
    `INSERT INTO users (name, username, password_hash, role, permissions, active, sec_question, sec_answer_hash)
     VALUES (?, ?, ?, 'admin', '{}', 1, 'What is your birth town?', ?)`,
    ['Admin', 'admin', adminPassHash, secAnsHash]
  );

  // 2. Company & Default Business
  const bizExists = await getFirstAsync('SELECT id FROM businesses WHERE id = 1');
  if (!bizExists) {
    await runAsync(
      `INSERT INTO businesses (id, name, gstin, phone, email, address, state, state_code, invoice_prefix, terms, fy_start_month, is_default, active, bill_format, bill_color)
       VALUES (1, 'Sharma FMCG Distributors', '07ABCDE1234F1Z5', '9876543210', 'contact@sharmafmcg.com', '12 Market Road, New Delhi', 'Delhi', '07', 'INV', 'Goods once sold will not be taken back.', 4, 1, 1, 'classic', '#0f766e')`
    );
  }

  // 3. Categories (Multi-level)
  const catNames = ['Beverages', 'Snacks', 'Personal Care', 'Household', 'Dairy'];
  const catMap: Record<string, number> = {};

  for (const name of catNames) {
    const res = await runAsync('INSERT INTO categories (name, parent_id) VALUES (?, NULL)', [name]);
    catMap[name] = res.lastInsertRowId;
  }

  // Sub-categories
  const subCats = [
    ['Soft Drinks', 'Beverages'],
    ['Juices', 'Beverages'],
    ['Hair Care', 'Personal Care'],
    ['Oral Care', 'Personal Care'],
  ];
  for (const [sub, parent] of subCats) {
    const pId = catMap[parent];
    const res = await runAsync('INSERT INTO categories (name, parent_id) VALUES (?, ?)', [sub, pId]);
    catMap[sub] = res.lastInsertRowId;
  }

  // 4. Items
  const items = [
    ['Cola 500ml', 'BEV001', 'Soft Drinks', 'Bottle', '2202', 28, 18, 25, 24, 1],
    ['Orange Juice 1L', 'BEV002', 'Juices', 'Bottle', '2009', 12, 60, 85, 12, 0],
    ['Potato Chips 50g', 'SNK001', 'Snacks', 'Piece', '2005', 12, 8, 10, 50, 0],
    ['Biscuits Pack', 'SNK002', 'Snacks', 'Piece', '1905', 18, 3, 5, 20, 0],
    ['Shampoo 200ml', 'PC001', 'Hair Care', 'Bottle', '3305', 18, 90, 130, 15, 0],
    ['Soap Bar', 'PC002', 'Personal Care', 'Piece', '3401', 18, 18, 28, 40, 0],
    ['Detergent 1kg', 'HH001', 'Household', 'Pack', '3402', 18, 110, 150, 10, 0],
    ['Toothpaste 100g', 'PC003', 'Oral Care', 'Piece', '3306', 18, 45, 65, 25, 0],
    ['Milk 1L', 'DRY001', 'Dairy', 'Pouch', '0401', 5, 50, 60, 30, 0],
    ['Butter 500g', 'DRY002', 'Dairy', 'Pack', '0405', 12, 220, 270, 8, 0],
    ['Smart Soundbar X1', 'EL001', 'Household', 'Piece', '8518', 18, 2400, 3499, 5, 1], // Serial tracked demo item
  ];

  const itemIds: Record<string, number> = {};

  for (const [name, sku, cat, unit, hsn, gst, pp, sp, low, serial] of items) {
    const catId = catMap[cat as string] || null;
    const res = await runAsync(
      `INSERT INTO items (name, sku, category_id, unit, base_unit, hsn, gst_rate, purchase_price, sale_price, avg_cost, low_stock_alert, track_serials)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, catId, unit, unit, hsn, gst, pp, sp, pp, low, serial]
    );
    itemIds[name as string] = res.lastInsertRowId;
  }

  // 5. Packaging Units (Ladder)
  const unitLadders: Record<string, Array<[string, number, number, number, string]>> = {
    'Cola 500ml': [
      ['Bottle', 1, 18, 25, '8901000000011'],
      ['Crate', 24, 420, 600, '8901000000028'],
    ],
    'Biscuits Pack': [
      ['Piece', 1, 3, 5, '8902000000010'],
      ['Pack', 10, 28, 45, '8902000000027'],
      ['Box', 120, 330, 520, '8902000000034'],
      ['Carton', 2400, 6400, 10200, '8902000000041'],
    ],
    'Potato Chips 50g': [
      ['Piece', 1, 8, 10, '8903000000013'],
      ['Box', 24, 180, 230, '8903000000020'],
    ],
  };

  for (const [itemName, ladder] of Object.entries(unitLadders)) {
    const itemId = itemIds[itemName];
    if (!itemId) continue;
    for (let i = 0; i < ladder.length; i++) {
      const [uName, factor, pp, sp, barcode] = ladder[i];
      await runAsync(
        `INSERT INTO item_units (item_id, unit_name, factor, is_base, purchase_price, sale_price, barcode, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, uName, factor, factor === 1 ? 1 : 0, pp, sp, barcode, i]
      );
    }
  }

  // Base unit for items without ladder
  for (const [name, id] of Object.entries(itemIds)) {
    if (!unitLadders[name]) {
      const it = items.find((x) => x[0] === name);
      const uName = (it ? it[3] : 'PCS') as string;
      const pp = (it ? it[6] : 0) as number;
      const sp = (it ? it[7] : 0) as number;
      await runAsync(
        `INSERT INTO item_units (item_id, unit_name, factor, is_base, purchase_price, sale_price, barcode, sort_order)
         VALUES (?, ?, 1, 1, ?, ?, '', 0)`,
        [id, uName, pp, sp]
      );
    }
  }

  // 6. Batches
  const today = new Date();
  const dstr = (off: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + off);
    return d.toISOString().slice(0, 10);
  };

  const batches = [
    ['Cola 500ml', 'B-COLA-A', dstr(-60), dstr(120), 18, 25, 100],
    ['Cola 500ml', 'B-COLA-B', dstr(-10), dstr(15), 18, 25, 20], // expiring soon
    ['Orange Juice 1L', 'B-OJ-1', dstr(-30), dstr(200), 60, 85, 50],
    ['Potato Chips 50g', 'B-CHIP-1', dstr(-20), dstr(40), 8, 10, 200],
    ['Biscuits Pack', 'B-BISC-1', dstr(-15), dstr(180), 3, 5, 240],
    ['Shampoo 200ml', 'B-SHM-1', dstr(-90), dstr(400), 90, 130, 40],
    ['Soap Bar', 'B-SOAP-1', dstr(-40), dstr(500), 18, 28, 150],
    ['Detergent 1kg', 'B-DET-1', dstr(-25), dstr(300), 110, 150, 5], // low stock
    ['Toothpaste 100g', 'B-TP-1', dstr(-10), dstr(360), 45, 65, 80],
    ['Milk 1L', 'B-MILK-1', dstr(-2), dstr(5), 50, 60, 40], // expiring very soon
    ['Butter 500g', 'B-BUT-1', dstr(-5), dstr(60), 220, 270, 15],
    ['Smart Soundbar X1', 'B-SND-1', dstr(-10), '', 2400, 3499, 4],
  ];

  for (const [item, bno, mfg, exp, pp, mrp, qty] of batches) {
    const itemId = itemIds[item as string];
    if (itemId) {
      await runAsync(
        `INSERT INTO batches (business_id, item_id, batch_no, mfg_date, expiry_date, purchase_price, mrp, qty_in, qty_available)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, bno, mfg, exp, pp, mrp, qty, qty]
      );
    }
  }

  // 7. Serials for Smart Soundbar
  const soundbarId = itemIds['Smart Soundbar X1'];
  if (soundbarId) {
    const soundSerials = ['SN-SB-001', 'SN-SB-002', 'SN-SB-003', 'SN-SB-004'];
    for (const sn of soundSerials) {
      await runAsync(
        `INSERT INTO serials (business_id, item_id, serial_no, batch_no, status)
         VALUES (1, ?, ?, 'B-SND-1', 'in_stock')`,
        [soundbarId, sn]
      );
    }
  }

  // 8. Parties
  const parties = [
    ['Gupta Kirana Store', 'customer', '9811111111', 'gupta@example.com', '22AAAAA0000A1Z5', 'Lajpat Nagar, Delhi', 'Delhi', 0],
    ['Sunrise Supermarket', 'customer', '9822222222', 'sunrise@example.com', '07BBBBB1111B1Z3', 'Karol Bagh, Delhi', 'Delhi', 0],
    ['Daily Needs Mart', 'customer', '9833333333', 'dailyneeds@example.com', '', 'Rohini, Delhi', 'Delhi', 1500],
    ['HUL Distributors', 'supplier', '9844444444', 'hul@example.com', '27CCCCC2222C1Z1', 'Andheri, Mumbai', 'Maharashtra', 0],
    ['Nestle Wholesale', 'supplier', '9855555555', 'nestle@example.com', '24DDDDD3333D1Z9', 'Ahmedabad', 'Gujarat', 0],
  ];

  const partyIds: Record<string, number> = {};

  for (const [name, type, phone, email, gstin, addr, state, ob] of parties) {
    const res = await runAsync(
      `INSERT INTO parties (name, type, phone, email, gstin, address, state, opening_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type, phone, email, gstin, addr, state, ob]
    );
    partyIds[name as string] = res.lastInsertRowId;
  }

  // 9. Sample Sales & Purchase Invoices
  // Sample Sale 1
  const sale1 = await runAsync(
    `INSERT INTO invoices (invoice_no, type, business_id, party_id, date, subtotal, discount, tax_total, total, round_off, paid, status, notes, note_kind)
     VALUES ('INV-0001', 'sale', 1, ?, ?, 1150.00, 0, 207.00, 1357.00, 0, 1357.00, 'paid', 'Thank you for your business', '')`,
    [partyIds['Gupta Kirana Store'], dstr(-3)]
  );
  const inv1Id = sale1.lastInsertRowId;
  await runAsync(
    `INSERT INTO invoice_items (invoice_id, item_id, batch_id, item_name, batch_no, hsn, qty, unit, unit_factor, base_qty, price, gst_rate, taxable, tax_amount, line_total)
     VALUES (?, ?, 1, 'Cola 500ml', 'B-COLA-A', '2202', 10, 'Bottle', 1, 10, 25.00, 28, 250.00, 70.00, 320.00)`,
    [inv1Id, itemIds['Cola 500ml']]
  );
  await runAsync(
    `INSERT INTO invoice_items (invoice_id, item_id, batch_id, item_name, batch_no, hsn, qty, unit, unit_factor, base_qty, price, gst_rate, taxable, tax_amount, line_total)
     VALUES (?, ?, 3, 'Orange Juice 1L', 'B-OJ-1', '2009', 10, 'Bottle', 1, 10, 85.00, 12, 850.00, 102.00, 952.00)`,
    [inv1Id, itemIds['Orange Juice 1L']]
  );
  await runAsync(
    `INSERT INTO payments (party_id, invoice_id, business_id, type, amount, mode, date, notes)
     VALUES (?, ?, 1, 'in', 1357.00, 'upi', ?, 'Auto payment with invoice INV-0001')`,
    [partyIds['Gupta Kirana Store'], inv1Id, dstr(-3)]
  );

  // Sample Sale 2 (Partial)
  const sale2 = await runAsync(
    `INSERT INTO invoices (invoice_no, type, business_id, party_id, date, subtotal, discount, tax_total, total, round_off, paid, status, notes, note_kind)
     VALUES ('INV-0002', 'sale', 1, ?, ?, 2600.00, 0, 468.00, 3068.00, 0, 1500.00, 'partial', '', '')`,
    [partyIds['Sunrise Supermarket'], dstr(-1)]
  );
  const inv2Id = sale2.lastInsertRowId;
  await runAsync(
    `INSERT INTO invoice_items (invoice_id, item_id, batch_id, item_name, batch_no, hsn, qty, unit, unit_factor, base_qty, price, gst_rate, taxable, tax_amount, line_total)
     VALUES (?, ?, 6, 'Shampoo 200ml', 'B-SHM-1', '3305', 20, 'Bottle', 1, 20, 130.00, 18, 2600.00, 468.00, 3068.00)`,
    [inv2Id, itemIds['Shampoo 200ml']]
  );
  await runAsync(
    `INSERT INTO payments (party_id, invoice_id, business_id, type, amount, mode, date, notes)
     VALUES (?, ?, 1, 'in', 1500.00, 'cash', ?, 'Advance payment for INV-0002')`,
    [partyIds['Sunrise Supermarket'], inv2Id, dstr(-1)]
  );
}

export async function seedDatabase() {
  const db = await getDatabase();
  await seedInitialData(
    (sql, params) => db.runAsync(sql, ...(params || [])),
    (sql, params) => db.getFirstAsync(sql, ...(params || []))
  );
}
