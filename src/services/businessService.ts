import { queryAll, queryOne, execute } from '../db/database';
import { Business, Company, CompanyFeatures } from '../types';

export const businessService = {
  async getAllBusinesses(): Promise<Business[]> {
    const rows = await queryAll<any>('SELECT * FROM businesses WHERE active = 1 ORDER BY is_default DESC, id ASC');
    return rows;
  },

  async getBusinessById(id: number): Promise<Business | null> {
    const row = await queryOne<any>('SELECT * FROM businesses WHERE id = ?', [id]);
    return row;
  },

  async getDefaultBusiness(): Promise<Business | null> {
    const row = await queryOne<any>('SELECT * FROM businesses WHERE is_default = 1 AND active = 1 LIMIT 1');
    if (!row) {
      const first = await queryOne<any>('SELECT * FROM businesses WHERE active = 1 ORDER BY id ASC LIMIT 1');
      return first;
    }
    return row;
  },

  async createBusiness(data: Partial<Business>): Promise<Business> {
    const isDef = data.is_default ? 1 : 0;
    if (isDef === 1) {
      await execute('UPDATE businesses SET is_default = 0');
    }
    const res = await execute(
      `INSERT INTO businesses (
        name, gstin, phone, email, address, state, state_code, invoice_prefix, terms,
        fy_start_month, is_default, active, logo, signature, stamp, bank_name, bank_account,
        bank_ifsc, bank_branch, account_holder, upi_id, pan, udyam, cin, qr_image, fssai,
        bill_number_start, bill_terms, bill_format, bill_color, bill_header_bg, bill_header_fg,
        bill_table_bg, bill_table_fg, bill_total_bg, bill_total_fg, bill_title, bill_signatory,
        bill_billto_label, bill_terms_heading, bill_declaration, bill_footer_note, bill_terms_list
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 1, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )`,
      [
        data.name || 'My Business',
        data.gstin || '',
        data.phone || '',
        data.email || '',
        data.address || '',
        data.state || '',
        data.state_code || '',
        data.invoice_prefix || 'INV',
        data.terms || 'Goods once sold will not be taken back.',
        data.fy_start_month || 4,
        isDef,
        data.logo || '',
        data.signature || '',
        data.stamp || '',
        data.bank_name || '',
        data.bank_account || '',
        data.bank_ifsc || '',
        data.bank_branch || '',
        data.account_holder || '',
        data.upi_id || '',
        data.pan || '',
        data.udyam || '',
        data.cin || '',
        data.qr_image || '',
        data.fssai || '',
        data.bill_number_start || 1,
        data.bill_terms || '',
        data.bill_format || 'classic',
        data.bill_color || '#0f766e',
        data.bill_header_bg || '',
        data.bill_header_fg || '',
        data.bill_table_bg || '',
        data.bill_table_fg || '',
        data.bill_total_bg || '',
        data.bill_total_fg || '',
        data.bill_title || 'TAX INVOICE',
        data.bill_signatory || 'Authorised Signatory',
        data.bill_billto_label || 'Bill To (Buyer)',
        data.bill_terms_heading || 'Terms & Conditions',
        data.bill_declaration || 'We declare that this invoice shows the actual price of the goods described.',
        data.bill_footer_note || 'Thank you for your business!',
        data.bill_terms_list || '',
      ]
    );

    return (await this.getBusinessById(res.lastInsertRowId))!;
  },

  async updateBusiness(id: number, data: Partial<Business>): Promise<void> {
    if (data.is_default) {
      await execute('UPDATE businesses SET is_default = 0 WHERE id != ?', [id]);
    }

    const fields = [
      'name', 'gstin', 'phone', 'email', 'address', 'state', 'state_code', 'invoice_prefix', 'terms',
      'fy_start_month', 'is_default', 'logo', 'signature', 'stamp', 'bank_name', 'bank_account',
      'bank_ifsc', 'bank_branch', 'account_holder', 'upi_id', 'pan', 'udyam', 'cin', 'qr_image', 'fssai',
      'bill_number_start', 'bill_terms', 'bill_format', 'bill_color', 'bill_header_bg', 'bill_header_fg',
      'bill_table_bg', 'bill_table_fg', 'bill_total_bg', 'bill_total_fg', 'bill_title', 'bill_signatory',
      'bill_billto_label', 'bill_terms_heading', 'bill_declaration', 'bill_footer_note', 'bill_terms_list'
    ];

    const updates: string[] = [];
    const params: any[] = [];

    for (const f of fields) {
      if ((data as any)[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push((data as any)[f]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      await execute(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`, params);
    }
  },

  async setDefaultBusiness(id: number): Promise<void> {
    await execute('UPDATE businesses SET is_default = 0');
    await execute('UPDATE businesses SET is_default = 1 WHERE id = ?', [id]);
  },

  async deleteBusiness(id: number): Promise<void> {
    const total = await queryOne<{ c: number }>('SELECT COUNT(*) as c FROM businesses WHERE active = 1');
    if (total && total.c <= 1) {
      throw new Error('Cannot delete the only business profile');
    }
    await execute('UPDATE businesses SET active = 0 WHERE id = ?', [id]);
    // If was default, make another one default
    const isDef = await queryOne<any>('SELECT is_default FROM businesses WHERE id = ?', [id]);
    if (isDef?.is_default) {
      const other = await queryOne<any>('SELECT id FROM businesses WHERE active = 1 ORDER BY id ASC LIMIT 1');
      if (other) {
        await execute('UPDATE businesses SET is_default = 1 WHERE id = ?', [other.id]);
      }
    }
  },

  async getCompanyFeatures(): Promise<CompanyFeatures> {
    const row = await queryOne<any>('SELECT features FROM company WHERE id = 1');
    try {
      return row?.features ? JSON.parse(row.features) : {};
    } catch (_) {
      return {};
    }
  },

  async updateCompanyFeatures(features: Partial<CompanyFeatures>): Promise<CompanyFeatures> {
    const current = await this.getCompanyFeatures();
    const merged = { ...current, ...features };
    await execute('UPDATE company SET features = ? WHERE id = 1', [JSON.stringify(merged)]);
    return merged;
  },
};
