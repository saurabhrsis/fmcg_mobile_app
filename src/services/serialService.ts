import { queryAll, queryOne, execute } from '../db/database';
import { SerialItem } from '../types';

export const serialService = {
  parseSerials(text: string | string[] | undefined | null): string[] {
    if (!text) return [];
    if (Array.isArray(text)) return text.map((s) => String(s).trim()).filter(Boolean);
    return String(text)
      .split(/[\n,;\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  },

  async getAllSerials(
    businessId: number,
    filter: {
      query?: string;
      itemId?: number;
      status?: 'all' | 'in_stock' | 'sold';
    } = {}
  ): Promise<{ rows: SerialItem[]; summary: { total: number; in_stock: number; sold: number } }> {
    let sql = `
      SELECT s.id, s.serial_no, s.batch_no, s.status, s.created_at,
             s.item_id, i.name AS item_name, i.sku, i.unit, i.hsn,
             pi.invoice_no AS purchase_invoice_no, si.invoice_no AS sale_invoice_no
      FROM serials s
      JOIN items i ON i.id = s.item_id
      LEFT JOIN invoices pi ON pi.id = s.purchase_invoice_id
      LEFT JOIN invoices si ON si.id = s.sale_invoice_id
      WHERE s.business_id = ?
    `;
    const params: any[] = [businessId];

    if (filter.itemId) {
      sql += ' AND s.item_id = ?';
      params.push(filter.itemId);
    }

    if (filter.status && filter.status !== 'all') {
      sql += ' AND s.status = ?';
      params.push(filter.status);
    }

    if (filter.query && filter.query.trim()) {
      sql += ' AND (s.serial_no LIKE ? OR i.name LIKE ? OR i.sku LIKE ? OR s.batch_no LIKE ?)';
      const term = `%${filter.query.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY i.name ASC, s.status ASC, s.serial_no ASC LIMIT 500';

    const rows = await queryAll<SerialItem>(sql, params);

    const summary = {
      total: rows.length,
      in_stock: rows.filter((r) => r.status === 'in_stock').length,
      sold: rows.filter((r) => r.status === 'sold').length,
    };

    return { rows, summary };
  },

  async getInStockSerialsForItem(businessId: number, itemId: number): Promise<SerialItem[]> {
    return queryAll<SerialItem>(
      'SELECT serial_no, batch_no FROM serials WHERE business_id = ? AND item_id = ? AND status = "in_stock" ORDER BY serial_no ASC',
      [businessId, itemId]
    );
  },

  async validateSaleSerials(
    businessId: number,
    itemId: number,
    serials: string[]
  ): Promise<{ ok: boolean; notInStock: string[]; missing: string[] }> {
    const notInStock: string[] = [];
    const missing: string[] = [];

    for (const sn of serials) {
      const row = await queryOne<{ status: string }>(
        'SELECT status FROM serials WHERE business_id = ? AND item_id = ? AND serial_no = ? COLLATE NOCASE',
        [businessId, itemId, sn]
      );
      if (!row) {
        missing.push(sn);
      } else if (row.status !== 'in_stock') {
        notInStock.push(sn);
      }
    }

    return {
      ok: notInStock.length === 0 && missing.length === 0,
      notInStock,
      missing,
    };
  },

  async findInStock(businessId: number, itemId: number, serialNo: string): Promise<boolean> {
    const row = await queryOne(
      'SELECT 1 FROM serials WHERE business_id = ? AND item_id = ? AND serial_no = ? COLLATE NOCASE AND status = "in_stock"',
      [businessId, itemId, serialNo]
    );
    return !!row;
  },

  async registerPurchaseSerials(
    businessId: number,
    itemId: number,
    batchNo: string,
    purchaseInvoiceId: number,
    serials: string[]
  ): Promise<void> {
    for (const sn of serials) {
      const existing = await queryOne<any>(
        'SELECT id FROM serials WHERE business_id = ? AND item_id = ? AND serial_no = ?',
        [businessId, itemId, sn]
      );
      if (existing) {
        await execute(
          'UPDATE serials SET status = "in_stock", batch_no = ?, purchase_invoice_id = ? WHERE id = ?',
          [batchNo || '', purchaseInvoiceId, existing.id]
        );
      } else {
        await execute(
          `INSERT INTO serials (business_id, item_id, serial_no, batch_no, status, purchase_invoice_id)
           VALUES (?, ?, ?, ?, 'in_stock', ?)`,
          [businessId, itemId, sn, batchNo || '', purchaseInvoiceId]
        );
      }
    }
  },

  async markSerialsSold(
    businessId: number,
    itemId: number,
    saleInvoiceId: number,
    serials: string[]
  ): Promise<void> {
    for (const sn of serials) {
      await execute(
        'UPDATE serials SET status = "sold", sale_invoice_id = ? WHERE business_id = ? AND item_id = ? AND serial_no = ?',
        [saleInvoiceId, businessId, itemId, sn]
      );
    }
  },
};
