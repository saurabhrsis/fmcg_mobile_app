import { queryAll, queryOne } from '../db/database';
import { isInterState, isNilRated, stateCode } from '../utils/gstState';
import { toUQC } from '../utils/uqc';
import { round2 } from '../utils/formatters';

export const gstr1Service = {
  async generateGstr1Summary(businessId: number, monthOrPeriod: string): Promise<any> {
    const biz = (await queryOne<any>('SELECT * FROM businesses WHERE id = ?', [businessId])) || {};

    // Determine date range: month (YYYY-MM)
    const from = `${monthOrPeriod}-01`;
    const parts = monthOrPeriod.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${monthOrPeriod}-${String(lastDay).padStart(2, '0')}`;

    const invoices = await queryAll<any>(
      `SELECT inv.*, p.name AS party_name, p.gstin AS party_gstin, p.state AS party_state
       FROM invoices inv
       LEFT JOIN parties p ON p.id = inv.party_id
       WHERE inv.business_id = ? AND inv.date >= ? AND inv.date <= ?`,
      [businessId, from, to]
    );

    const b2b: any[] = [];
    const b2cl: any[] = [];
    const b2cs: any[] = [];
    const cdnr: any[] = [];
    const cdnur: any[] = [];
    // Non-GST bills (bill of supply) and nil-rated / exempt supplies carry no
    // tax, so they are reported separately and never enter GSTR-1 tables.
    const nonGst: any[] = [];
    let nilTotal = 0;

    for (const inv of invoices) {
      inv.items = await queryAll<any>('SELECT * FROM invoice_items WHERE invoice_id = ?', [inv.id]);
      const inter = isInterState(biz, inv);
      const isReg = !!(inv.party_gstin && inv.party_gstin.trim().length === 15);
      const isNote = inv.note_kind === 'credit' || inv.note_kind === 'debit';

      if (isNilRated(inv)) {
        nonGst.push(inv);
        nilTotal += Number(inv.total) || 0;
        continue;
      }

      if (isNote) {
        if (isReg) cdnr.push(inv);
        else cdnur.push(inv);
      } else if (inv.type === 'sale') {
        if (isReg) {
          b2b.push(inv);
        } else if (inter && inv.total > 250000) {
          b2cl.push(inv);
        } else {
          b2cs.push(inv);
        }
      }
    }

    return {
      period: monthOrPeriod,
      from,
      to,
      counts: {
        b2b: b2b.length,
        b2cl: b2cl.length,
        b2cs: b2cs.length,
        cdnr: cdnr.length,
        cdnur: cdnur.length,
        nonGst: nonGst.length,
      },
      b2b,
      b2cl,
      b2cs,
      cdnr,
      cdnur,
      nonGst,
      nilTotal: round2(nilTotal),
    };
  },

  async generateGstr1Json(businessId: number, monthOrPeriod: string): Promise<object> {
    const summary = await this.generateGstr1Summary(businessId, monthOrPeriod);
    const biz = (await queryOne<any>('SELECT * FROM businesses WHERE id = ?', [businessId])) || {};

    const [yyyy, mm] = monthOrPeriod.split('-');
    const fp = `${mm}${yyyy}`;

    // Structure compliant with GSTN GSTR-1 offline utility
    const payload: any = {
      gstin: biz.gstin || '',
      fp,
      version: 'GSTR1_1.0',
      b2b: [],
      b2cl: [],
      b2cs: [],
      cdnr: [],
      cdnur: [],
      hsn: { data: [] },
    };

    // Populate B2B
    const b2bMap = new Map<string, any>();
    for (const inv of summary.b2b) {
      const gstin = inv.party_gstin.trim().toUpperCase();
      let partyEntry = b2bMap.get(gstin);
      if (!partyEntry) {
        partyEntry = { ctin: gstin, inv: [] };
        b2bMap.set(gstin, partyEntry);
      }

      const inter = isInterState(biz, inv);
      const pos = stateCode(inv.place_of_supply || inv.consignee_state || inv.party_state, gstin);

      const itms = (inv.items || []).map((it: any, idx: number) => ({
        num: idx + 1,
        itm_det: {
          rt: Number(it.gst_rate) || 0,
          txval: round2(it.taxable),
          iamt: inter ? round2(it.tax_amount) : 0,
          camt: inter ? 0 : round2(it.tax_amount / 2),
          samt: inter ? 0 : round2(it.tax_amount / 2),
          csamt: 0,
        },
      }));

      partyEntry.inv.push({
        inum: inv.invoice_no,
        idt: inv.date.split('-').reverse().join('-'),
        val: round2(inv.total),
        pos: pos || '07',
        rchrg: 'N',
        inv_typ: 'R',
        itms,
      });
    }
    payload.b2b = Array.from(b2bMap.values());

    return payload;
  },
};
