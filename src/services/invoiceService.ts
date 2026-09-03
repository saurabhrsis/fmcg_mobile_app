import { queryAll, queryOne, execute, runTransaction } from '../db/database';
import { BillType, Invoice, InvoiceItem, InvoiceType, NoteKind } from '../types';
import { computeLineMath } from '../utils/stock';
import { isNilRated } from '../utils/gstState';
import { round2, round3 } from '../utils/formatters';
import { batchService } from './batchService';
import { serialService } from './serialService';
import { businessService } from './businessService';

export const invoiceService = {
  async getNextInvoiceNo(
    businessId: number,
    type: InvoiceType,
    noteKind: NoteKind = ''
  ): Promise<string> {
    const biz = await businessService.getBusinessById(businessId);
    let prefix = '';
    if (noteKind === 'credit') prefix = 'CN';
    else if (noteKind === 'debit') prefix = 'DN';
    else if (type === 'quotation') prefix = 'QTN';
    else prefix = type === 'purchase' ? 'PUR' : biz?.invoice_prefix || 'INV';

    const rows = await queryAll<{ invoice_no: string }>(
      'SELECT invoice_no FROM invoices WHERE type = ? AND note_kind = ? AND business_id = ?',
      [type, noteKind || '', businessId]
    );

    let highest = 0;
    for (const r of rows) {
      const m = String(r.invoice_no || '').match(/(\d+)\s*$/);
      if (m) highest = Math.max(highest, parseInt(m[1], 10) || 0);
    }

    let start = 1;
    if (type === 'sale' && !noteKind) {
      start = Number(biz?.bill_number_start) || 1;
    }

    const num = Math.max(highest + 1, start);
    return `${prefix}-${String(num).padStart(4, '0')}`;
  },

  async getAllInvoices(
    businessId: number,
    filter: {
      type?: InvoiceType;
      noteKind?: NoteKind;
      partyId?: number;
      from?: string;
      to?: string;
      query?: string;
      status?: string;
      billType?: BillType;
    } = {}
  ): Promise<Invoice[]> {
    let sql = `
      SELECT inv.*, p.name AS party_name, p.phone AS party_phone, p.gstin AS party_gstin
      FROM invoices inv
      LEFT JOIN parties p ON p.id = inv.party_id
      WHERE inv.business_id = ?
    `;
    const params: any[] = [businessId];

    if (filter.type) {
      sql += ' AND inv.type = ?';
      params.push(filter.type);
    }

    if (filter.noteKind !== undefined) {
      sql += ' AND inv.note_kind = ?';
      params.push(filter.noteKind);
    }

    if (filter.partyId) {
      sql += ' AND inv.party_id = ?';
      params.push(filter.partyId);
    }

    if (filter.status) {
      sql += ' AND inv.status = ?';
      params.push(filter.status);
    }

    if (filter.billType === 'non_gst') {
      sql += " AND IFNULL(inv.bill_type, 'gst') = 'non_gst'";
    } else if (filter.billType === 'gst') {
      sql += " AND IFNULL(inv.bill_type, 'gst') <> 'non_gst'";
    }

    if (filter.from) {
      sql += ' AND inv.date >= ?';
      params.push(filter.from);
    }

    if (filter.to) {
      sql += ' AND inv.date <= ?';
      params.push(filter.to);
    }

    if (filter.query && filter.query.trim()) {
      sql += ' AND (inv.invoice_no LIKE ? OR p.name LIKE ? OR inv.notes LIKE ?)';
      const term = `%${filter.query.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY inv.date DESC, inv.id DESC';

    return queryAll<Invoice>(sql, params);
  },

  async getInvoiceById(id: number): Promise<Invoice | null> {
    const sql = `
      SELECT inv.*, p.name AS party_name, p.phone AS party_phone, p.gstin AS party_gstin,
             p.email AS party_email, p.address AS party_address, p.state AS party_state
      FROM invoices inv
      LEFT JOIN parties p ON p.id = inv.party_id
      WHERE inv.id = ?
    `;
    const inv = await queryOne<Invoice>(sql, [id]);
    if (!inv) return null;

    inv.items = await queryAll<InvoiceItem>(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC',
      [inv.id]
    );

    return inv;
  },

  async createInvoice(
    businessId: number,
    data: Partial<Invoice>,
    lines: Partial<InvoiceItem>[],
    allowDuplicate = false,
    userId?: number
  ): Promise<Invoice> {
    if (!lines || lines.length === 0) {
      throw new Error('At least one line item is required');
    }

    const type = data.type || 'sale';
    const isNote = data.note_kind === 'credit' || data.note_kind === 'debit';
    const isQuote = type === 'quotation';
    const features = await businessService.getCompanyFeatures();

    // GST bill vs NON-GST bill (bill of supply / cash memo). A non-GST bill —
    // and any nil-rated / exempt supply — carries no tax at all, so the rates
    // on the line items are forced to zero before the maths runs.
    const billType: BillType = String(data.bill_type || 'gst').toLowerCase() === 'non_gst' ? 'non_gst' : 'gst';
    const noTax = isNilRated({ bill_type: billType, gst_type: data.gst_type });
    if (noTax) {
      lines = lines.map((l) => ({ ...l, gst_rate: 0 }));
    }

    // Check negative stock for sales
    if (type === 'sale' && !isNote && !isQuote && features.negativeStock === false) {
      for (const l of lines) {
        if (!l.item_id) continue;
        const row = await queryOne<{ s: number }>(
          'SELECT COALESCE(SUM(qty_available), 0) as s FROM batches WHERE item_id = ? AND business_id = ?',
          [l.item_id, businessId]
        );
        const avail = row?.s || 0;
        const need = round3((Number(l.qty) || 0) * (Number(l.unit_factor) || 1));
        if (need > avail) {
          throw new Error(
            `Insufficient stock for "${l.item_name || 'Item'}". Available: ${avail}, Needed: ${need}.`
          );
        }
      }
    }

    // Check serials
    if (!isNote && !isQuote) {
      for (const l of lines) {
        if (!l.item_id || !l.track_serials) continue;
        const serials = serialService.parseSerials(l.serials);
        if (!serials.length) continue;

        if (type === 'sale') {
          const v = await serialService.validateSaleSerials(businessId, l.item_id, serials);
          if (!v.ok) {
            throw new Error(`Serial validation error: ${v.notInStock.join(', ')} (not in stock)`);
          }
        }
      }
    }

    // Calculate invoice totals
    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;

    const computedLines = lines.map((l) => {
      const c = computeLineMath(l);
      const factor = Number(l.unit_factor) || 1;
      const baseQty = round3((Number(l.qty) || 0) * factor);
      subtotal += c.taxable;
      taxTotal += c.tax_amount;
      total += c.line_total;
      return {
        ...l,
        ...c,
        unit_factor: factor,
        base_qty: baseQty,
      };
    });

    const extraDisc = Number(data.discount) || 0;
    const totalAfterDisc = round2(total - extraDisc);
    let roundOff = 0;
    let grandTotal = totalAfterDisc;

    if (features.autoRoundOff) {
      grandTotal = Math.round(totalAfterDisc);
      roundOff = round2(grandTotal - totalAfterDisc);
    }

    const noteKind = data.note_kind || '';
    const invNo = data.invoice_no || (await this.getNextInvoiceNo(businessId, type, noteKind));
    const paid = isQuote ? 0 : Math.min(Math.max(Number(data.paid) || 0, 0), grandTotal);
    const status = isQuote
      ? (data.status || 'open')
      : paid >= grandTotal
      ? 'paid'
      : paid > 0
      ? 'partial'
      : 'unpaid';

    // Insert Invoice
    const invRes = await execute(
      `INSERT INTO invoices (
        invoice_no, type, business_id, party_id, date, subtotal, discount, tax_total, total,
        round_off, paid, status, notes, note_kind, ref_invoice_no, ref_invoice_date,
        valid_until, consignee_name, consignee_address, consignee_gstin, consignee_state,
        place_of_supply, eway_no, pay_terms, po_no, po_date, other_ref, dispatch_doc,
        delivery_note, delivery_note_date, dispatched_through, destination, terms_delivery,
        irn, ack_no, ack_date, no_of_packets, supplier_inv_no, gst_type, bill_type, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        invNo,
        type,
        businessId,
        data.party_id || null,
        data.date || new Date().toISOString().slice(0, 10),
        round2(subtotal),
        round2(extraDisc),
        round2(taxTotal),
        grandTotal,
        roundOff,
        paid,
        status,
        data.notes || '',
        noteKind,
        data.ref_invoice_no || '',
        data.ref_invoice_date || '',
        isQuote ? (data.valid_until || '') : '',
        data.consignee_name || '',
        data.consignee_address || '',
        data.consignee_gstin || '',
        data.consignee_state || '',
        data.place_of_supply || '',
        data.eway_no || '',
        data.pay_terms || '',
        data.po_no || '',
        data.po_date || '',
        data.other_ref || '',
        data.dispatch_doc || '',
        data.delivery_note || '',
        data.delivery_note_date || '',
        data.dispatched_through || '',
        data.destination || '',
        data.terms_delivery || '',
        data.irn || '',
        data.ack_no || '',
        data.ack_date || '',
        data.no_of_packets || '',
        data.supplier_inv_no || '',
        data.gst_type || 'auto',
        billType,
        userId || null,
      ]
    );

    const invoiceId = invRes.lastInsertRowId;

    // Process line items & stock
    for (const l of computedLines) {
      let batchId = l.batch_id || null;
      let batchNo = l.batch_no || '';
      const baseQty = Number(l.base_qty) || 0;

      if (!noteKind && !isQuote) {
        if (type === 'purchase') {
          // Top up or create batch
          if (batchId) {
            await execute(
              'UPDATE batches SET qty_available = qty_available + ?, qty_in = qty_in + ? WHERE id = ?',
              [baseQty, baseQty, batchId]
            );
          } else if (l.item_id) {
            const bRes = await execute(
              `INSERT INTO batches (item_id, business_id, batch_no, mfg_date, expiry_date, purchase_price, mrp, qty_in, qty_available)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                l.item_id,
                businessId,
                batchNo || 'NA',
                l.mfg_date || '',
                l.expiry_date || '',
                Number(l.price) || 0,
                Number(l.mrp) || 0,
                baseQty,
                baseQty,
              ]
            );
            batchId = bRes.lastInsertRowId;
          }
        } else if (type === 'sale') {
          // FEFO stock deduction
          let remaining = baseQty;
          if (batchId) {
            const bt = await queryOne<any>('SELECT * FROM batches WHERE id = ?', [batchId]);
            if (bt) {
              const take = Math.min(remaining, bt.qty_available);
              await execute('UPDATE batches SET qty_available = qty_available - ? WHERE id = ?', [take, batchId]);
              batchNo = bt.batch_no;
            }
          } else if (l.item_id) {
            const availBatches = await queryAll<any>(
              `SELECT * FROM batches WHERE item_id = ? AND business_id = ? AND qty_available > 0
               ORDER BY (expiry_date = ''), expiry_date ASC, id ASC`,
              [l.item_id, businessId]
            );
            const usedNos: string[] = [];
            for (const bt of availBatches) {
              if (remaining <= 0) break;
              const take = Math.min(remaining, bt.qty_available);
              await execute('UPDATE batches SET qty_available = qty_available - ? WHERE id = ?', [take, bt.id]);
              usedNos.push(bt.batch_no);
              if (!batchId) batchId = bt.id;
              remaining -= take;
            }
            batchNo = usedNos.join(', ');
          }
        }
      }

      // Insert invoice item
      await execute(
        `INSERT INTO invoice_items (
          invoice_id, item_id, batch_id, item_name, description, serials, batch_no, hsn,
          qty, unit, unit_factor, base_qty, price, discount,
          disc_trade_pct, disc_trade_amt, disc_cd_pct, disc_cd_amt, disc_sd_pct, disc_sd_amt,
          disc_trade_mode, disc_cd_mode, disc_sd_mode,
          gst_rate, taxable, tax_amount, line_total
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?
        )`,
        [
          invoiceId,
          l.item_id || null,
          batchId,
          l.item_name || 'Item',
          l.description || '',
          l.serials || '',
          batchNo || '',
          l.hsn || '',
          Number(l.qty) || 0,
          l.unit || '',
          Number(l.unit_factor) || 1,
          baseQty,
          Number(l.price) || 0,
          Number(l.discount) || 0,
          l.disc_trade_pct || 0,
          l.disc_trade_amt || 0,
          l.disc_cd_pct || 0,
          l.disc_cd_amt || 0,
          l.disc_sd_pct || 0,
          l.disc_sd_amt || 0,
          l.disc_trade_mode || 'pct',
          l.disc_cd_mode || 'pct',
          l.disc_sd_mode || 'pct',
          Number(l.gst_rate) || 0,
          l.taxable || 0,
          l.tax_amount || 0,
          l.line_total || 0,
        ]
      );

      // Handle Serials
      if (!noteKind && !isQuote && l.item_id && l.track_serials) {
        const serials = serialService.parseSerials(l.serials);
        if (serials.length > 0) {
          if (type === 'purchase') {
            await serialService.registerPurchaseSerials(businessId, l.item_id, batchNo, invoiceId, serials);
          } else if (type === 'sale') {
            await serialService.markSerialsSold(businessId, l.item_id, invoiceId, serials);
          }
        }
      }

      // Update avg cost
      if (l.item_id) {
        await batchService.recalcAvgCost(l.item_id);
      }
    }

    // Auto payment if paid > 0
    if (paid > 0 && data.party_id) {
      await execute(
        `INSERT INTO payments (party_id, invoice_id, business_id, type, amount, mode, date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.party_id,
          invoiceId,
          businessId,
          type === 'sale' ? 'in' : 'out',
          paid,
          'cash',
          data.date || new Date().toISOString().slice(0, 10),
          `Auto payment with invoice ${invNo}`,
        ]
      );
    }

    return (await this.getInvoiceById(invoiceId))!;
  },

  async deleteInvoice(id: number): Promise<void> {
    const inv = await this.getInvoiceById(id);
    if (!inv) return;

    const isNote = inv.note_kind === 'credit' || inv.note_kind === 'debit';
    const isQuote = inv.type === 'quotation';

    // Reverse stock movements
    if (!isNote && !isQuote && inv.items) {
      for (const it of inv.items) {
        if (!it.batch_id) continue;
        const baseQ = Number(it.base_qty) || Number(it.qty) || 0;
        if (inv.type === 'sale') {
          await execute('UPDATE batches SET qty_available = qty_available + ? WHERE id = ?', [baseQ, it.batch_id]);
        } else if (inv.type === 'purchase') {
          await execute('UPDATE batches SET qty_available = MAX(0, qty_available - ?) WHERE id = ?', [baseQ, it.batch_id]);
        }
        if (it.item_id) {
          await batchService.recalcAvgCost(it.item_id);
        }
      }
    }

    // Delete linked payments
    await execute('DELETE FROM payments WHERE invoice_id = ?', [id]);
    await execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    await execute('DELETE FROM invoices WHERE id = ?', [id]);
  },

  async convertQuotationToSale(quoteId: number, userId?: number): Promise<Invoice> {
    const quote = await this.getInvoiceById(quoteId);
    if (!quote || quote.type !== 'quotation') {
      throw new Error('Quotation not found');
    }

    const saleInvoice = await this.createInvoice(
      quote.business_id,
      {
        type: 'sale',
        party_id: quote.party_id,
        date: new Date().toISOString().slice(0, 10),
        notes: `Converted from Quotation ${quote.invoice_no}`,
        consignee_name: quote.consignee_name,
        consignee_address: quote.consignee_address,
        consignee_gstin: quote.consignee_gstin,
        consignee_state: quote.consignee_state,
        place_of_supply: quote.place_of_supply,
        gst_type: quote.gst_type || 'auto',
        bill_type: quote.bill_type || 'gst',
        discount: quote.discount,
      },
      quote.items || [],
      false,
      userId
    );

    await execute(
      "UPDATE invoices SET status = 'converted', converted_invoice_id = ? WHERE id = ?",
      [saleInvoice.id, quote.id]
    );

    return saleInvoice;
  },

  async updateQuoteStatus(id: number, status: 'open' | 'accepted' | 'rejected'): Promise<void> {
    await execute('UPDATE invoices SET status = ? WHERE id = ? AND type = "quotation"', [status, id]);
  },
};
