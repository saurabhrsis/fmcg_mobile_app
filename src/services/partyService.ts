import { queryAll, queryOne, execute } from '../db/database';
import { Party, Invoice, Payment } from '../types';

export const partyService = {
  async computePartyBalance(partyId: number, businessId?: number): Promise<number> {
    const p = await queryOne<{ opening_balance: number }>('SELECT opening_balance FROM parties WHERE id = ?', [partyId]);
    if (!p) return 0;

    let saleSql = "SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE party_id = ? AND type = 'sale'";
    let purcSql = "SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE party_id = ? AND type = 'purchase'";
    let inSql = "SELECT COALESCE(SUM(amount), 0) as a FROM payments WHERE party_id = ? AND type = 'in'";
    let outSql = "SELECT COALESCE(SUM(amount), 0) as a FROM payments WHERE party_id = ? AND type = 'out'";

    const params: any[] = [partyId];
    if (businessId) {
      saleSql += ' AND business_id = ?';
      purcSql += ' AND business_id = ?';
      inSql += ' AND business_id = ?';
      outSql += ' AND business_id = ?';
      params.push(businessId);
    }

    const sale = (await queryOne<{ t: number }>(saleSql, params))?.t || 0;
    const purc = (await queryOne<{ t: number }>(purcSql, params))?.t || 0;
    const inP = (await queryOne<{ a: number }>(inSql, params))?.a || 0;
    const outP = (await queryOne<{ a: number }>(outSql, params))?.a || 0;

    // Balance > 0 means party owes us (receivable)
    // Balance < 0 means we owe party (payable)
    return p.opening_balance + sale - inP - (purc - outP);
  },

  async getAllParties(
    type?: 'customer' | 'supplier',
    query?: string,
    businessId?: number
  ): Promise<Party[]> {
    let sql = 'SELECT * FROM parties WHERE 1=1';
    const params: any[] = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (query && query.trim()) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR gstin LIKE ? OR address LIKE ?)';
      const term = `%${query.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY name ASC';

    const parties = await queryAll<Party>(sql, params);

    for (const p of parties) {
      p.balance = await this.computePartyBalance(p.id, businessId);
    }

    return parties;
  },

  async getPartyById(id: number, businessId?: number): Promise<Party | null> {
    const party = await queryOne<Party>('SELECT * FROM parties WHERE id = ?', [id]);
    if (!party) return null;

    party.balance = await this.computePartyBalance(party.id, businessId);

    let invSql = 'SELECT * FROM invoices WHERE party_id = ?';
    let paySql = 'SELECT * FROM payments WHERE party_id = ?';
    const invParams: any[] = [id];
    const payParams: any[] = [id];

    if (businessId) {
      invSql += ' AND business_id = ?';
      paySql += ' AND business_id = ?';
      invParams.push(businessId);
      payParams.push(businessId);
    }

    invSql += ' ORDER BY date DESC, id DESC';
    paySql += ' ORDER BY date DESC, id DESC';

    party.invoices = await queryAll<Invoice>(invSql, invParams);
    party.payments = await queryAll<Payment>(paySql, payParams);

    return party;
  },

  async createParty(data: Partial<Party>): Promise<Party> {
    const res = await execute(
      `INSERT INTO parties (name, type, phone, email, gstin, address, state, opening_balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name?.trim() || 'New Party',
        data.type || 'customer',
        data.phone?.trim() || '',
        data.email?.trim() || '',
        data.gstin?.trim() || '',
        data.address?.trim() || '',
        data.state?.trim() || '',
        Number(data.opening_balance) || 0,
      ]
    );

    return (await this.getPartyById(res.lastInsertRowId))!;
  },

  async updateParty(id: number, data: Partial<Party>): Promise<void> {
    await execute(
      `UPDATE parties SET
        name = ?, type = ?, phone = ?, email = ?, gstin = ?, address = ?, state = ?, opening_balance = ?
       WHERE id = ?`,
      [
        data.name?.trim() || '',
        data.type || 'customer',
        data.phone?.trim() || '',
        data.email?.trim() || '',
        data.gstin?.trim() || '',
        data.address?.trim() || '',
        data.state?.trim() || '',
        Number(data.opening_balance) || 0,
        id,
      ]
    );
  },

  async deleteParty(id: number): Promise<void> {
    await execute('DELETE FROM parties WHERE id = ?', [id]);
  },
};
