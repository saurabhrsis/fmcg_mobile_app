import { queryAll, queryOne, execute, runTransaction } from '../db/database';
import { Item, Category, ItemUnit } from '../types';
import { humanizeQty, normalizeUnits } from '../utils/units';

export const itemService = {
  // Categories
  async getAllCategories(): Promise<Category[]> {
    const rows = await queryAll<Category>('SELECT * FROM categories ORDER BY name ASC');
    // Build tree paths
    const map = new Map<number, Category>();
    rows.forEach((c) => map.set(c.id, c));

    rows.forEach((c) => {
      const parts: string[] = [];
      let cur: Category | undefined = c;
      let depth = 0;
      while (cur && depth++ < 10) {
        parts.unshift(cur.name);
        cur = cur.parent_id ? map.get(cur.parent_id) : undefined;
      }
      c.path = parts.join(' > ');
    });

    return rows.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
  },

  async createCategory(name: string, parentId: number | null = null): Promise<Category> {
    const res = await execute('INSERT INTO categories (name, parent_id) VALUES (?, ?)', [name.trim(), parentId]);
    return (await queryOne<Category>('SELECT * FROM categories WHERE id = ?', [res.lastInsertRowId]))!;
  },

  async updateCategory(id: number, name: string, parentId: number | null = null): Promise<void> {
    if (parentId === id) throw new Error('Category cannot be its own parent');
    await execute('UPDATE categories SET name = ?, parent_id = ? WHERE id = ?', [name.trim(), parentId, id]);
  },

  async deleteCategory(id: number): Promise<void> {
    const cat = await queryOne<Category>('SELECT parent_id FROM categories WHERE id = ?', [id]);
    if (cat) {
      await execute('UPDATE categories SET parent_id = ? WHERE parent_id = ?', [cat.parent_id || null, id]);
    }
    await execute('DELETE FROM categories WHERE id = ?', [id]);
  },

  // Items
  async getAllItems(businessId: number, query?: string, categoryId?: number | null): Promise<Item[]> {
    let sql = `
      SELECT i.*, c.name AS category_name,
        COALESCE((SELECT SUM(qty_available) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) AS stock,
        COALESCE((SELECT SUM(qty_available * purchase_price) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) AS stock_value
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      WHERE i.is_active = 1
    `;
    const params: any[] = [businessId, businessId];

    if (query && query.trim()) {
      sql += ' AND (i.name LIKE ? OR i.sku LIKE ? OR i.hsn LIKE ? OR i.brand LIKE ?)';
      const term = `%${query.trim()}%`;
      params.push(term, term, term, term);
    }

    if (categoryId) {
      sql += ' AND i.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY i.name ASC';

    const items = await queryAll<Item>(sql, params);

    // Attach units & human readable label
    for (const item of items) {
      item.units = await this.getItemUnits(item.id);
      item.stock_label = humanizeQty(item.stock || 0, item.units, item.base_unit || item.unit || 'PCS');
    }

    return items;
  },

  async getItemById(id: number, businessId: number): Promise<Item | null> {
    const sql = `
      SELECT i.*, c.name AS category_name,
        COALESCE((SELECT SUM(qty_available) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) AS stock,
        COALESCE((SELECT SUM(qty_available * purchase_price) FROM batches b WHERE b.item_id = i.id AND b.business_id = ?), 0) AS stock_value
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      WHERE i.id = ?
    `;
    const item = await queryOne<Item>(sql, [businessId, businessId, id]);
    if (!item) return null;

    item.units = await this.getItemUnits(item.id);
    item.stock_label = humanizeQty(item.stock || 0, item.units, item.base_unit || item.unit || 'PCS');
    return item;
  },

  async getItemUnits(itemId: number): Promise<ItemUnit[]> {
    return queryAll<ItemUnit>(
      'SELECT * FROM item_units WHERE item_id = ? ORDER BY is_base DESC, factor ASC, sort_order ASC',
      [itemId]
    );
  },

  async findByBarcode(barcode: string): Promise<{ item_id: number; unit_name: string; factor: number } | null> {
    if (!barcode || !barcode.trim()) return null;
    return queryOne<{ item_id: number; unit_name: string; factor: number }>(
      'SELECT item_id, unit_name, factor FROM item_units WHERE barcode = ? COLLATE NOCASE LIMIT 1',
      [barcode.trim()]
    );
  },

  async createItem(
    businessId: number,
    data: Partial<Item>,
    units?: Partial<ItemUnit>[],
    openingStockQty?: number
  ): Promise<Item> {
    const baseUnit = (data.base_unit || data.unit || 'PCS').trim();
    const pp = Number(data.purchase_price) || 0;
    const sp = Number(data.sale_price) || 0;

    const res = await execute(
      `INSERT INTO items (
        name, sku, category_id, unit, base_unit, hsn, gst_rate, purchase_price, sale_price,
        avg_cost, low_stock_alert, is_active, description, track_serials, brand, mrp, image,
        min_stock, max_stock, tax_inclusive, cess_rate
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 1, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )`,
      [
        data.name?.trim() || 'New Item',
        data.sku?.trim() || '',
        data.category_id || null,
        baseUnit,
        baseUnit,
        data.hsn?.trim() || '',
        Number(data.gst_rate) || 0,
        pp,
        sp,
        pp,
        Number(data.low_stock_alert) || 0,
        data.description?.trim() || '',
        data.track_serials ? 1 : 0,
        data.brand?.trim() || '',
        Number(data.mrp) || 0,
        data.image || '',
        Number(data.min_stock) || 0,
        Number(data.max_stock) || 0,
        data.tax_inclusive ? 1 : 0,
        Number(data.cess_rate) || 0,
      ]
    );

    const itemId = res.lastInsertRowId;

    // Save unit ladder
    let unitsList = units && units.length > 0 ? units : [{ unit_name: baseUnit, factor: 1, is_base: 1, purchase_price: pp, sale_price: sp, barcode: '' }];
    const norm = normalizeUnits(unitsList);
    if (norm.ok && norm.units) {
      for (const u of norm.units) {
        await execute(
          `INSERT INTO item_units (item_id, unit_name, factor, is_base, purchase_price, sale_price, barcode, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, u.unit_name, u.factor, u.is_base, u.purchase_price, u.sale_price, u.barcode || '', u.sort_order || 0]
        );
      }
    }

    // Opening stock batch
    if (openingStockQty && openingStockQty > 0) {
      await execute(
        `INSERT INTO batches (item_id, business_id, batch_no, mfg_date, expiry_date, purchase_price, mrp, qty_in, qty_available)
         VALUES (?, ?, 'OPENING', '', '', ?, ?, ?, ?)`,
        [itemId, businessId, pp, Number(data.mrp) || 0, openingStockQty, openingStockQty]
      );
    }

    return (await this.getItemById(itemId, businessId))!;
  },

  async updateItem(
    id: number,
    businessId: number,
    data: Partial<Item>,
    units?: Partial<ItemUnit>[]
  ): Promise<void> {
    const baseUnit = (data.base_unit || data.unit || 'PCS').trim();
    const pp = Number(data.purchase_price) || 0;
    const sp = Number(data.sale_price) || 0;

    await execute(
      `UPDATE items SET
        name = ?, sku = ?, category_id = ?, unit = ?, base_unit = ?, hsn = ?, gst_rate = ?,
        purchase_price = ?, sale_price = ?, low_stock_alert = ?, description = ?,
        track_serials = ?, brand = ?, mrp = ?, image = ?, min_stock = ?, max_stock = ?,
        tax_inclusive = ?, cess_rate = ?
       WHERE id = ?`,
      [
        data.name?.trim() || '',
        data.sku?.trim() || '',
        data.category_id || null,
        baseUnit,
        baseUnit,
        data.hsn?.trim() || '',
        Number(data.gst_rate) || 0,
        pp,
        sp,
        Number(data.low_stock_alert) || 0,
        data.description?.trim() || '',
        data.track_serials ? 1 : 0,
        data.brand?.trim() || '',
        Number(data.mrp) || 0,
        data.image || '',
        Number(data.min_stock) || 0,
        Number(data.max_stock) || 0,
        data.tax_inclusive ? 1 : 0,
        Number(data.cess_rate) || 0,
        id,
      ]
    );

    if (units && units.length > 0) {
      const norm = normalizeUnits(units);
      if (norm.ok && norm.units) {
        await execute('DELETE FROM item_units WHERE item_id = ?', [id]);
        for (const u of norm.units) {
          await execute(
            `INSERT INTO item_units (item_id, unit_name, factor, is_base, purchase_price, sale_price, barcode, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, u.unit_name, u.factor, u.is_base, u.purchase_price, u.sale_price, u.barcode || '', u.sort_order || 0]
          );
        }
      }
    }
  },

  async deleteItem(id: number): Promise<void> {
    await execute('UPDATE items SET is_active = 0 WHERE id = ?', [id]);
  },
};
