import { queryAll, queryOne, execute } from '../db/database';
import { Batch } from '../types';

export const batchService = {
  async getBatchesForItem(itemId: number, businessId: number): Promise<Batch[]> {
    return queryAll<Batch>(
      `SELECT b.*, i.name as item_name, i.sku, i.unit,
        (b.qty_in - b.qty_available) AS qty_sold,
        (b.qty_available * b.purchase_price) AS stock_value,
        CASE WHEN b.qty_available > 0 THEN 'In Stock' ELSE 'Sold Out' END AS stock_status
       FROM batches b
       JOIN items i ON i.id = b.item_id
       WHERE b.item_id = ? AND b.business_id = ?
       ORDER BY (b.expiry_date = ''), b.expiry_date ASC, b.id ASC`,
      [itemId, businessId]
    );
  },

  async getAllBatches(businessId: number, filter?: 'all' | 'available' | 'expiring' | 'expired', search?: string): Promise<Batch[]> {
    let sql = `
      SELECT b.*, i.name as item_name, i.sku, i.unit,
        (b.qty_in - b.qty_available) AS qty_sold,
        (b.qty_available * b.purchase_price) AS stock_value,
        CASE WHEN b.qty_available > 0 THEN 'In Stock' ELSE 'Sold Out' END AS stock_status
      FROM batches b
      JOIN items i ON i.id = b.item_id
      WHERE b.business_id = ?
    `;
    const params: any[] = [businessId];

    const today = new Date().toISOString().slice(0, 10);

    if (filter === 'available') {
      sql += ' AND b.qty_available > 0';
    } else if (filter === 'expiring') {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const futureStr = future.toISOString().slice(0, 10);
      sql += ' AND b.qty_available > 0 AND b.expiry_date != "" AND b.expiry_date <= ? AND b.expiry_date >= ?';
      params.push(futureStr, today);
    } else if (filter === 'expired') {
      sql += ' AND b.qty_available > 0 AND b.expiry_date != "" AND b.expiry_date < ?';
      params.push(today);
    }

    if (search && search.trim()) {
      sql += ' AND (b.batch_no LIKE ? OR i.name LIKE ? OR i.sku LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY (b.expiry_date = ""), b.expiry_date ASC, b.id ASC';

    return queryAll<Batch>(sql, params);
  },

  async createBatch(businessId: number, data: Partial<Batch>): Promise<Batch> {
    const res = await execute(
      `INSERT INTO batches (
        business_id, item_id, batch_no, mfg_date, expiry_date, purchase_price, mrp, qty_in, qty_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        businessId,
        data.item_id,
        data.batch_no?.trim() || 'NA',
        data.mfg_date || '',
        data.expiry_date || '',
        Number(data.purchase_price) || 0,
        Number(data.mrp) || 0,
        Number(data.qty_available || data.qty_in) || 0,
        Number(data.qty_available || data.qty_in) || 0,
      ]
    );

    // Recalculate average cost
    await this.recalcAvgCost(data.item_id!);

    return (await queryOne<Batch>('SELECT * FROM batches WHERE id = ?', [res.lastInsertRowId]))!;
  },

  async updateBatch(id: number, data: Partial<Batch>): Promise<void> {
    await execute(
      `UPDATE batches SET
        batch_no = ?, mfg_date = ?, expiry_date = ?, purchase_price = ?, mrp = ?, qty_available = ?
       WHERE id = ?`,
      [
        data.batch_no?.trim() || '',
        data.mfg_date || '',
        data.expiry_date || '',
        Number(data.purchase_price) || 0,
        Number(data.mrp) || 0,
        Number(data.qty_available) || 0,
        id,
      ]
    );

    const row = await queryOne<Batch>('SELECT item_id FROM batches WHERE id = ?', [id]);
    if (row) {
      await this.recalcAvgCost(row.item_id);
    }
  },

  async deleteBatch(id: number): Promise<void> {
    const row = await queryOne<Batch>('SELECT item_id FROM batches WHERE id = ?', [id]);
    await execute('DELETE FROM batches WHERE id = ?', [id]);
    if (row) {
      await this.recalcAvgCost(row.item_id);
    }
  },

  async recalcAvgCost(itemId: number): Promise<number> {
    const row = await queryOne<{ q: number; v: number }>(
      `SELECT COALESCE(SUM(qty_in), 0) as q, COALESCE(SUM(qty_in * purchase_price), 0) as v
       FROM batches WHERE item_id = ?`,
      [itemId]
    );
    let avg = 0;
    if (row && row.q > 0) {
      avg = row.v / row.q;
    } else {
      const it = await queryOne<{ purchase_price: number }>('SELECT purchase_price FROM items WHERE id = ?', [itemId]);
      avg = it ? it.purchase_price : 0;
    }
    avg = Math.round((avg + Number.EPSILON) * 100) / 100;
    await execute('UPDATE items SET avg_cost = ? WHERE id = ?', [avg, itemId]);
    return avg;
  },

  async findDuplicateBatch(batchNo: string, excludeBatchId?: number): Promise<any[]> {
    if (!batchNo || !batchNo.trim() || batchNo.trim().toUpperCase() === 'NA') return [];
    let sql = `
      SELECT b.id, b.item_id, b.batch_no, b.qty_available, b.expiry_date, i.name as item_name
      FROM batches b JOIN items i ON i.id = b.item_id
      WHERE b.batch_no = ? COLLATE NOCASE
    `;
    const params: any[] = [batchNo.trim()];
    if (excludeBatchId) {
      sql += ' AND b.id != ?';
      params.push(excludeBatchId);
    }
    return queryAll<any>(sql, params);
  },
};
