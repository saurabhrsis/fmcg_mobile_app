import { queryAll, queryOne, execute } from '../db/database';
import { Payment, PaymentMode, PaymentType } from '../types';

export const paymentService = {
  async getAllPayments(
    businessId: number,
    filter: {
      type?: PaymentType;
      partyId?: number;
      from?: string;
      to?: string;
      mode?: PaymentMode;
    } = {}
  ): Promise<Payment[]> {
    let sql = `
      SELECT pay.*, p.name AS party_name, inv.invoice_no
      FROM payments pay
      LEFT JOIN parties p ON p.id = pay.party_id
      LEFT JOIN invoices inv ON inv.id = pay.invoice_id
      WHERE pay.business_id = ?
    `;
    const params: any[] = [businessId];

    if (filter.type) {
      sql += ' AND pay.type = ?';
      params.push(filter.type);
    }

    if (filter.partyId) {
      sql += ' AND pay.party_id = ?';
      params.push(filter.partyId);
    }

    if (filter.mode) {
      sql += ' AND pay.mode = ?';
      params.push(filter.mode);
    }

    if (filter.from) {
      sql += ' AND pay.date >= ?';
      params.push(filter.from);
    }

    if (filter.to) {
      sql += ' AND pay.date <= ?';
      params.push(filter.to);
    }

    sql += ' ORDER BY pay.date DESC, pay.id DESC';

    return queryAll<Payment>(sql, params);
  },

  async createPayment(
    businessId: number,
    data: {
      party_id: number;
      amount: number;
      type: PaymentType;
      mode?: PaymentMode;
      date?: string;
      notes?: string;
      invoice_id?: number | null;
    }
  ): Promise<Payment> {
    const res = await execute(
      `INSERT INTO payments (party_id, invoice_id, business_id, type, amount, mode, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.party_id,
        data.invoice_id || null,
        businessId,
        data.type || 'in',
        Number(data.amount) || 0,
        data.mode || 'cash',
        data.date || new Date().toISOString().slice(0, 10),
        data.notes || '',
      ]
    );

    const payId = res.lastInsertRowId;

    // If linked to invoice, update invoice paid amount and status
    if (data.invoice_id) {
      const inv = await queryOne<any>('SELECT * FROM invoices WHERE id = ?', [data.invoice_id]);
      if (inv) {
        const paid = Number(inv.paid) + Number(data.amount);
        const status = paid >= inv.total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
        await execute('UPDATE invoices SET paid = ?, status = ? WHERE id = ?', [paid, status, inv.id]);
      }
    }

    const pay = await queryOne<Payment>(
      `SELECT pay.*, p.name AS party_name, inv.invoice_no
       FROM payments pay
       LEFT JOIN parties p ON p.id = pay.party_id
       LEFT JOIN invoices inv ON inv.id = pay.invoice_id
       WHERE pay.id = ?`,
      [payId]
    );

    return pay!;
  },

  async deletePayment(id: number): Promise<void> {
    const pay = await queryOne<Payment>('SELECT * FROM payments WHERE id = ?', [id]);
    if (pay?.invoice_id) {
      const inv = await queryOne<any>('SELECT * FROM invoices WHERE id = ?', [pay.invoice_id]);
      if (inv) {
        const paid = Math.max(0, Number(inv.paid) - Number(pay.amount));
        const status = paid >= inv.total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
        await execute('UPDATE invoices SET paid = ?, status = ? WHERE id = ?', [paid, status, inv.id]);
      }
    }
    await execute('DELETE FROM payments WHERE id = ?', [id]);
  },
};
