import { queryAll, queryOne } from '../db/database';
import { DashboardMetrics } from '../types';
import { currentFy, fyRange, FyRange } from '../utils/fy';
import { isInterState } from '../utils/gstState';
import { toUQC } from '../utils/uqc';
import { round2 } from '../utils/formatters';

export const reportService = {
  async getDashboardMetrics(businessId: number): Promise<DashboardMetrics> {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    // Today & Month Sales
    const todaySales =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND date = ? AND business_id = ?",
        [today, businessId]
      ))?.v || 0;

    const monthSales =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND date >= ? AND business_id = ?",
        [monthStart, businessId]
      ))?.v || 0;

    const monthPurchase =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' AND date >= ? AND business_id = ?",
        [monthStart, businessId]
      ))?.v || 0;

    // Non-GST (bill of supply) turnover this month — no tax on these bills.
    const monthNonGstSales =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND date >= ? AND business_id = ? AND IFNULL(bill_type, 'gst') = 'non_gst'",
        [monthStart, businessId]
      ))?.v || 0;

    // Receivables & Payables
    const parties = await queryAll<{ id: number; opening_balance: number }>('SELECT id, opening_balance FROM parties');
    let receivable = 0;
    let payable = 0;

    for (const p of parties) {
      const sale =
        (await queryOne<{ t: number }>(
          "SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE party_id = ? AND type = 'sale' AND business_id = ?",
          [p.id, businessId]
        ))?.t || 0;

      const inP =
        (await queryOne<{ a: number }>(
          "SELECT COALESCE(SUM(amount), 0) as a FROM payments WHERE party_id = ? AND type = 'in' AND business_id = ?",
          [p.id, businessId]
        ))?.a || 0;

      const purc =
        (await queryOne<{ t: number }>(
          "SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE party_id = ? AND type = 'purchase' AND business_id = ?",
          [p.id, businessId]
        ))?.t || 0;

      const outP =
        (await queryOne<{ a: number }>(
          "SELECT COALESCE(SUM(amount), 0) as a FROM payments WHERE party_id = ? AND type = 'out' AND business_id = ?",
          [p.id, businessId]
        ))?.a || 0;

      const bal = p.opening_balance + sale - inP - (purc - outP);
      if (bal > 0) receivable += bal;
      else if (bal < 0) payable += -bal;
    }

    const stockValRow = await queryOne<{ v: number }>(
      'SELECT COALESCE(SUM(qty_available * purchase_price), 0) as v FROM batches WHERE business_id = ?',
      [businessId]
    );
    const stockValue = stockValRow?.v || 0;

    const itemCount = (await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM items WHERE is_active = 1'))?.c || 0;
    const partyCount = (await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM parties'))?.c || 0;

    // Low stock items
    const lowStock = await queryAll<any>(
      `SELECT i.id, i.name, i.unit, i.low_stock_alert,
        COALESCE((SELECT SUM(qty_available) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) AS stock
       FROM items i
       WHERE i.is_active = 1 AND i.low_stock_alert > 0
         AND COALESCE((SELECT SUM(qty_available) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) <= i.low_stock_alert
       ORDER BY stock ASC`,
      [businessId, businessId]
    );

    // Expiring soon (30 days)
    const future30 = new Date();
    future30.setDate(future30.getDate() + 30);
    const future30Str = future30.toISOString().slice(0, 10);

    const expSoon = await queryAll<any>(
      `SELECT b.id, b.batch_no, b.expiry_date, b.qty_available, i.name AS item_name, i.unit
       FROM batches b JOIN items i ON i.id = b.item_id
       WHERE b.business_id = ? AND b.qty_available > 0 AND b.expiry_date != '' AND b.expiry_date <= ?
       ORDER BY b.expiry_date ASC`,
      [businessId, future30Str]
    );

    // 7-day trend
    const trend: { date: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const v =
        (await queryOne<{ v: number }>(
          "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND date = ? AND business_id = ?",
          [dStr, businessId]
        ))?.v || 0;
      trend.push({ date: dStr, sales: v });
    }

    // Top items last 30 days
    const past30 = new Date();
    past30.setDate(past30.getDate() - 30);
    const past30Str = past30.toISOString().slice(0, 10);

    const topItems = await queryAll<any>(
      `SELECT ii.item_name, SUM(ii.qty) as qty, SUM(ii.line_total) as amount
       FROM invoice_items ii
       JOIN invoices inv ON inv.id = ii.invoice_id
       WHERE inv.type = 'sale' AND inv.date >= ? AND inv.business_id = ?
       GROUP BY ii.item_name ORDER BY qty DESC LIMIT 5`,
      [past30Str, businessId]
    );

    return {
      todaySales,
      monthSales,
      monthPurchase,
      monthNonGstSales: round2(monthNonGstSales),
      receivable: round2(receivable),
      payable: round2(payable),
      stockValue: round2(stockValue),
      itemCount,
      partyCount,
      lowStockCount: lowStock.length,
      expSoonCount: expSoon.length,
      lowStock,
      expSoon,
      trend,
      topItems,
    };
  },

  async getSalesRegister(businessId: number, from?: string, to?: string): Promise<any> {
    let sql = `
      SELECT inv.*, p.name AS party_name, p.gstin AS party_gstin
      FROM invoices inv
      LEFT JOIN parties p ON p.id = inv.party_id
      WHERE inv.type = 'sale' AND inv.business_id = ?
    `;
    const params: any[] = [businessId];

    if (from) {
      sql += ' AND inv.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND inv.date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY inv.date DESC, inv.id DESC';

    const rows = await queryAll<any>(sql, params);

    let totalSales = 0;
    let totalTax = 0;
    let totalTaxable = 0;
    let nonGstCount = 0;
    let nonGstTotal = 0;

    rows.forEach((r) => {
      totalSales += Number(r.total) || 0;
      totalTax += Number(r.tax_total) || 0;
      totalTaxable += Number(r.subtotal) || 0;
      if (String(r.bill_type || 'gst') === 'non_gst') {
        nonGstCount += 1;
        nonGstTotal += Number(r.total) || 0;
      }
    });

    return {
      rows,
      summary: {
        count: rows.length,
        totalSales: round2(totalSales),
        totalTax: round2(totalTax),
        totalTaxable: round2(totalTaxable),
        nonGstCount,
        nonGstTotal: round2(nonGstTotal),
      },
    };
  },

  async getPurchaseRegister(businessId: number, from?: string, to?: string): Promise<any> {
    let sql = `
      SELECT inv.*, p.name AS party_name, p.gstin AS party_gstin
      FROM invoices inv
      LEFT JOIN parties p ON p.id = inv.party_id
      WHERE inv.type = 'purchase' AND inv.business_id = ?
    `;
    const params: any[] = [businessId];

    if (from) {
      sql += ' AND inv.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND inv.date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY inv.date DESC, inv.id DESC';

    const rows = await queryAll<any>(sql, params);

    let totalPurchase = 0;
    let totalTax = 0;
    let totalTaxable = 0;

    rows.forEach((r) => {
      totalPurchase += Number(r.total) || 0;
      totalTax += Number(r.tax_total) || 0;
      totalTaxable += Number(r.subtotal) || 0;
    });

    return {
      rows,
      summary: {
        count: rows.length,
        totalPurchase: round2(totalPurchase),
        totalTax: round2(totalTax),
        totalTaxable: round2(totalTaxable),
      },
    };
  },

  async getOutstandingReport(businessId: number): Promise<{ receivables: any[]; payables: any[] }> {
    const parties = await queryAll<any>('SELECT * FROM parties ORDER BY name ASC');
    const receivables: any[] = [];
    const payables: any[] = [];

    for (const p of parties) {
      const sale =
        (await queryOne<{ t: number }>(
          "SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE party_id = ? AND type = 'sale' AND business_id = ?",
          [p.id, businessId]
        ))?.t || 0;

      const inP =
        (await queryOne<{ a: number }>(
          "SELECT COALESCE(SUM(amount), 0) as a FROM payments WHERE party_id = ? AND type = 'in' AND business_id = ?",
          [p.id, businessId]
        ))?.a || 0;

      const purc =
        (await queryOne<{ t: number }>(
          "SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE party_id = ? AND type = 'purchase' AND business_id = ?",
          [p.id, businessId]
        ))?.t || 0;

      const outP =
        (await queryOne<{ a: number }>(
          "SELECT COALESCE(SUM(amount), 0) as a FROM payments WHERE party_id = ? AND type = 'out' AND business_id = ?",
          [p.id, businessId]
        ))?.a || 0;

      const bal = round2(p.opening_balance + sale - inP - (purc - outP));

      if (bal > 0) {
        receivables.push({ ...p, balance: bal });
      } else if (bal < 0) {
        payables.push({ ...p, balance: Math.abs(bal) });
      }
    }

    return { receivables, payables };
  },

  async getHsnSummary(businessId: number, from?: string, to?: string): Promise<any[]> {
    const biz = (await queryOne<any>('SELECT * FROM businesses WHERE id = ?', [businessId])) || {};

    let sql = `
      SELECT ii.hsn, ii.item_name, ii.unit, ii.gst_rate,
             SUM(ii.qty) as total_qty,
             SUM(ii.taxable) as total_taxable,
             SUM(ii.tax_amount) as total_tax,
             SUM(ii.line_total) as total_value,
             inv.consignee_state, inv.consignee_gstin, inv.place_of_supply,
             p.state as party_state, p.gstin as party_gstin
      FROM invoice_items ii
      JOIN invoices inv ON inv.id = ii.invoice_id
      LEFT JOIN parties p ON p.id = inv.party_id
      WHERE inv.type = 'sale' AND inv.business_id = ?
        AND IFNULL(inv.bill_type, 'gst') <> 'non_gst'
        AND IFNULL(inv.gst_type, 'auto') <> 'nil'
    `;
    const params: any[] = [businessId];

    if (from) {
      sql += ' AND inv.date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND inv.date <= ?';
      params.push(to);
    }

    sql += ' GROUP BY ii.hsn, ii.gst_rate ORDER BY ii.hsn ASC';

    const rows = await queryAll<any>(sql, params);

    return rows.map((r) => {
      const inter = isInterState(biz, r);
      const tax = Number(r.total_tax) || 0;
      return {
        hsn: r.hsn || 'NA',
        description: r.item_name || '',
        uqc: toUQC(r.unit),
        total_qty: round2(r.total_qty),
        total_taxable: round2(r.total_taxable),
        gst_rate: Number(r.gst_rate) || 0,
        cgst: inter ? 0 : round2(tax / 2),
        sgst: inter ? 0 : round2(tax / 2),
        igst: inter ? round2(tax) : 0,
        total_value: round2(r.total_value),
      };
    });
  },

  async getFinancialYearsList(businessId: number): Promise<FyRange[]> {
    const biz = await queryOne<any>('SELECT fy_start_month FROM businesses WHERE id = ?', [businessId]);
    const startMonth = biz?.fy_start_month || 4;

    const row = await queryOne<{ mn: string }>(
      'SELECT MIN(date) as mn FROM invoices WHERE business_id = ?',
      [businessId]
    );

    const minDate = row?.mn ? new Date(row.mn) : new Date();
    const now = new Date();

    const firstStartYear = minDate.getMonth() + 1 >= startMonth ? minDate.getFullYear() : minDate.getFullYear() - 1;
    const curStartYear = now.getMonth() + 1 >= startMonth ? now.getFullYear() : now.getFullYear() - 1;

    const years: FyRange[] = [];
    for (let y = curStartYear; y >= firstStartYear; y--) {
      years.push(fyRange(y, startMonth));
    }

    return years;
  },

  async getFyBalanceReport(businessId: number, fyLabel?: string): Promise<any> {
    const biz = await queryOne<any>('SELECT fy_start_month FROM businesses WHERE id = ?', [businessId]);
    const range = fyLabel ? fyRange(fyLabel, biz?.fy_start_month || 4) : currentFy(biz?.fy_start_month || 4);

    const sales =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'sale' AND business_id = ? AND date >= ? AND date <= ?",
        [businessId, range.from, range.to]
      ))?.v || 0;

    const purchases =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(total), 0) as v FROM invoices WHERE type = 'purchase' AND business_id = ? AND date >= ? AND date <= ?",
        [businessId, range.from, range.to]
      ))?.v || 0;

    const receipts =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(amount), 0) as v FROM payments WHERE type = 'in' AND business_id = ? AND date >= ? AND date <= ?",
        [businessId, range.from, range.to]
      ))?.v || 0;

    const paidOut =
      (await queryOne<{ v: number }>(
        "SELECT COALESCE(SUM(amount), 0) as v FROM payments WHERE type = 'out' AND business_id = ? AND date >= ? AND date <= ?",
        [businessId, range.from, range.to]
      ))?.v || 0;

    const stockVal =
      (await queryOne<{ v: number }>(
        'SELECT COALESCE(SUM(qty_available * purchase_price), 0) as v FROM batches WHERE business_id = ?',
        [businessId]
      ))?.v || 0;

    return {
      fy: range.label,
      from: range.from,
      to: range.to,
      sales: round2(sales),
      purchases: round2(purchases),
      receipts: round2(receipts),
      paidOut: round2(paidOut),
      stockValue: round2(stockVal),
      grossProfit: round2(sales - purchases),
    };
  },

  async getTraceabilityReport(businessId: number, query: string): Promise<any> {
    if (!query || !query.trim()) return [];
    const term = `%${query.trim()}%`;

    // 1. Serials
    const serials = await queryAll<any>(
      `SELECT s.*, i.name as item_name, i.sku,
              pi.invoice_no as purchase_invoice_no, pi.date as purchase_date,
              si.invoice_no as sale_invoice_no, si.date as sale_date,
              sp.name as supplier_name, cp.name as customer_name
       FROM serials s
       JOIN items i ON i.id = s.item_id
       LEFT JOIN invoices pi ON pi.id = s.purchase_invoice_id
       LEFT JOIN parties sp ON sp.id = pi.party_id
       LEFT JOIN invoices si ON si.id = s.sale_invoice_id
       LEFT JOIN parties cp ON cp.id = si.party_id
       WHERE s.business_id = ? AND (s.serial_no LIKE ? OR s.batch_no LIKE ? OR i.name LIKE ?)
       LIMIT 50`,
      [businessId, term, term, term]
    );

    // 2. Batches
    const batches = await queryAll<any>(
      `SELECT b.*, i.name as item_name, i.sku
       FROM batches b
       JOIN items i ON i.id = b.item_id
       WHERE b.business_id = ? AND (b.batch_no LIKE ? OR i.name LIKE ?)
       LIMIT 50`,
      [businessId, term, term]
    );

    return { serials, batches };
  },
};
