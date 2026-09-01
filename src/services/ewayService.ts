import { queryAll, queryOne, execute } from '../db/database';
import { EwayBill } from '../types';
import { isInterState, stateCode } from '../utils/gstState';

const TRANS_MODE_CODES: Record<string, string> = { road: '1', rail: '2', air: '3', ship: '4' };

export const ewayService = {
  async getAllEwayBills(businessId: number): Promise<EwayBill[]> {
    return queryAll<EwayBill>(
      `SELECT e.*, inv.invoice_no
       FROM eway_bills e
       LEFT JOIN invoices inv ON inv.id = e.invoice_id
       WHERE e.business_id = ?
       ORDER BY e.id DESC`,
      [businessId]
    );
  },

  async getEwayBillById(id: number): Promise<EwayBill | null> {
    return queryOne<EwayBill>('SELECT * FROM eway_bills WHERE id = ?', [id]);
  },

  async prefillFromInvoice(invoiceId: number): Promise<Partial<EwayBill> | null> {
    const inv = await queryOne<any>(
      `SELECT inv.*, p.name AS party_name, p.gstin AS party_gstin, p.address AS party_address, p.state AS party_state
       FROM invoices inv
       LEFT JOIN parties p ON p.id = inv.party_id
       WHERE inv.id = ?`,
      [invoiceId]
    );
    if (!inv) return null;

    const biz = (await queryOne<any>('SELECT * FROM businesses WHERE id = ?', [inv.business_id])) || {};
    const outward = inv.type === 'sale';

    const seller = { gstin: biz.gstin, name: biz.name, addr: biz.address, state: biz.state };
    const buyer = { gstin: inv.party_gstin, name: inv.party_name, addr: inv.party_address, state: inv.party_state };
    const from = outward ? seller : buyer;
    const to = outward ? buyer : seller;

    const inter = isInterState(seller, inv);
    const taxTotal = Number(inv.tax_total) || 0;

    return {
      invoice_id: inv.id,
      doc_no: inv.invoice_no,
      doc_date: inv.date,
      doc_type: 'INV',
      supply_type: outward ? 'O' : 'I',
      sub_type: 'supply',
      from_gstin: from.gstin || '',
      from_name: from.name || '',
      from_addr: from.addr || '',
      from_state: from.state || '',
      to_gstin: to.gstin || '',
      to_name: to.name || '',
      to_addr: to.addr || '',
      to_state: to.state || '',
      total_value: Number(inv.total) || 0,
      taxable_value: Number(inv.subtotal) || 0,
      cgst: inter ? 0 : taxTotal / 2,
      sgst: inter ? 0 : taxTotal / 2,
      igst: inter ? taxTotal : 0,
      trans_mode: 'road',
      vehicle_type: 'R',
      status: 'draft',
      ewb_date: new Date().toISOString().slice(0, 10),
    };
  },

  async createEwayBill(businessId: number, data: Partial<EwayBill>, userId?: number): Promise<EwayBill> {
    const today = new Date().toISOString().slice(0, 10);
    const res = await execute(
      `INSERT INTO eway_bills (
        business_id, invoice_id, ewb_no, ewb_date, supply_type, sub_type, doc_type, doc_no, doc_date,
        from_gstin, from_name, from_addr, from_place, from_pin, from_state,
        to_gstin, to_name, to_addr, to_place, to_pin, to_state,
        transporter_id, transporter_name, trans_mode, trans_distance, trans_doc_no, trans_doc_date,
        vehicle_no, vehicle_type, total_value, taxable_value, cgst, sgst, igst, notes, status, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        businessId,
        data.invoice_id || null,
        data.ewb_no || '',
        data.ewb_date || today,
        data.supply_type || 'O',
        data.sub_type || 'supply',
        data.doc_type || 'INV',
        data.doc_no || '',
        data.doc_date || today,
        data.from_gstin || '',
        data.from_name || '',
        data.from_addr || '',
        data.from_place || '',
        data.from_pin || '',
        data.from_state || '',
        data.to_gstin || '',
        data.to_name || '',
        data.to_addr || '',
        data.to_place || '',
        data.to_pin || '',
        data.to_state || '',
        data.transporter_id || '',
        data.transporter_name || '',
        data.trans_mode || 'road',
        Number(data.trans_distance) || 0,
        data.trans_doc_no || '',
        data.trans_doc_date || '',
        (data.vehicle_no || '').replace(/\s/g, '').toUpperCase(),
        data.vehicle_type || 'R',
        Number(data.total_value) || 0,
        Number(data.taxable_value) || 0,
        Number(data.cgst) || 0,
        Number(data.sgst) || 0,
        Number(data.igst) || 0,
        data.notes || '',
        data.status || 'draft',
        userId || null,
      ]
    );

    return (await this.getEwayBillById(res.lastInsertRowId))!;
  },

  async updateEwayBill(id: number, data: Partial<EwayBill>): Promise<void> {
    await execute(
      `UPDATE eway_bills SET
        ewb_no = ?, ewb_date = ?, supply_type = ?, sub_type = ?, doc_type = ?, doc_no = ?, doc_date = ?,
        from_gstin = ?, from_name = ?, from_addr = ?, from_place = ?, from_pin = ?, from_state = ?,
        to_gstin = ?, to_name = ?, to_addr = ?, to_place = ?, to_pin = ?, to_state = ?,
        transporter_id = ?, transporter_name = ?, trans_mode = ?, trans_distance = ?, trans_doc_no = ?, trans_doc_date = ?,
        vehicle_no = ?, vehicle_type = ?, total_value = ?, taxable_value = ?, cgst = ?, sgst = ?, igst = ?,
        notes = ?, status = ?
       WHERE id = ?`,
      [
        data.ewb_no || '',
        data.ewb_date || '',
        data.supply_type || 'O',
        data.sub_type || 'supply',
        data.doc_type || 'INV',
        data.doc_no || '',
        data.doc_date || '',
        data.from_gstin || '',
        data.from_name || '',
        data.from_addr || '',
        data.from_place || '',
        data.from_pin || '',
        data.from_state || '',
        data.to_gstin || '',
        data.to_name || '',
        data.to_addr || '',
        data.to_place || '',
        data.to_pin || '',
        data.to_state || '',
        data.transporter_id || '',
        data.transporter_name || '',
        data.trans_mode || 'road',
        Number(data.trans_distance) || 0,
        data.trans_doc_no || '',
        data.trans_doc_date || '',
        (data.vehicle_no || '').replace(/\s/g, '').toUpperCase(),
        data.vehicle_type || 'R',
        Number(data.total_value) || 0,
        Number(data.taxable_value) || 0,
        Number(data.cgst) || 0,
        Number(data.sgst) || 0,
        Number(data.igst) || 0,
        data.notes || '',
        data.status || 'draft',
        id,
      ]
    );
  },

  async deleteEwayBill(id: number): Promise<void> {
    await execute('DELETE FROM eway_bills WHERE id = ?', [id]);
  },

  generatePortalJson(e: EwayBill): object {
    const gstDate = (iso: string) => {
      const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
    };

    const rec = {
      supplyType: e.supply_type || 'O',
      subSupplyType: '1',
      docType: e.doc_type || 'INV',
      docNo: e.doc_no || '',
      docDate: gstDate(e.doc_date),
      fromGstin: e.from_gstin || 'URP',
      fromTrdName: e.from_name || '',
      fromAddr1: e.from_addr || '',
      fromPlace: e.from_place || '',
      fromPincode: Number(e.from_pin) || 0,
      fromStateCode: (e.from_gstin || '').slice(0, 2) || stateCode(e.from_state, e.from_gstin),
      toGstin: e.to_gstin || 'URP',
      toTrdName: e.to_name || '',
      toAddr1: e.to_addr || '',
      toPlace: e.to_place || '',
      toPincode: Number(e.to_pin) || 0,
      toStateCode: (e.to_gstin || '').slice(0, 2) || stateCode(e.to_state, e.to_gstin),
      totInvValue: e.total_value || 0,
      totalValue: e.taxable_value || 0,
      cgstValue: e.cgst || 0,
      sgstValue: e.sgst || 0,
      igstValue: e.igst || 0,
      transporterId: e.transporter_id || '',
      transporterName: e.transporter_name || '',
      transMode: TRANS_MODE_CODES[e.trans_mode] || '1',
      transDistance: String(e.trans_distance || 0),
      transDocNo: e.trans_doc_no || '',
      transDocDate: gstDate(e.trans_doc_date),
      vehicleNo: (e.vehicle_no || '').replace(/\s/g, '').toUpperCase(),
      vehicleType: e.vehicle_type || 'R',
    };

    return {
      version: '1.0.0',
      billLists: [rec],
    };
  },
};
