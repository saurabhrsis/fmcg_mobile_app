import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Business, InvoiceItem } from '../types';
import { formatCurrency, formatDate, amountInWords } from '../utils/formatters';
import { isInterState, isNonGstBill, isNilRated, stateCode, supplyTypeLabel } from '../utils/gstState';

export const printService = {
  generateInvoiceHtml(biz: Business, inv: Invoice): string {
    const inter = isInterState(biz, inv);
    const themeColor = biz.bill_color || '#0f766e';
    const items = inv.items || [];
    const isQuote = inv.type === 'quotation';
    const isNote = inv.note_kind === 'credit' || inv.note_kind === 'debit';
    // Non-GST bills (bill of supply) and nil-rated / exempt supplies carry no
    // tax, so every GST column, tax row and tax summary is dropped from them.
    const nonGst = isNonGstBill(inv);
    const noTax = isNilRated(inv);

    let title = biz.bill_title || 'TAX INVOICE';
    if (isQuote) title = 'QUOTATION / ESTIMATE';
    else if (inv.note_kind === 'credit') title = 'CREDIT NOTE';
    else if (inv.note_kind === 'debit') title = 'DEBIT NOTE';
    else if (inv.type === 'purchase') title = nonGst ? 'NON-GST PURCHASE BILL' : 'PURCHASE VOUCHER';
    else if (nonGst) title = 'BILL OF SUPPLY';
    else if (noTax) title = 'TAX INVOICE (NIL / EXEMPT)';

    // HSN Summary calculation (tax columns are skipped on non-GST bills)
    const hsnMap = new Map<string, { hsn: string; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>();
    items.forEach((it) => {
      const hsn = it.hsn || 'NA';
      const cur = hsnMap.get(hsn) || { hsn, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      cur.taxable += it.taxable;
      if (inter) {
        cur.igst += it.tax_amount;
      } else {
        cur.cgst += it.tax_amount / 2;
        cur.sgst += it.tax_amount / 2;
      }
      cur.totalTax += it.tax_amount;
      hsnMap.set(hsn, cur);
    });

    const hsnRows = Array.from(hsnMap.values());

    const itemRowsHtml = items
      .map(
        (it, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>
          <div style="font-weight: 600;">${it.item_name}</div>
          ${it.batch_no ? `<div style="font-size: 10px; color: #666;">Batch: ${it.batch_no} ${it.expiry_date ? `| Exp: ${formatDate(it.expiry_date)}` : ''}</div>` : ''}
          ${it.serials ? `<div style="font-size: 10px; color: #444;">S/N: ${it.serials}</div>` : ''}
        </td>
        <td style="text-align: center;">${it.hsn || '-'}</td>
        <td style="text-align: right;">${it.qty} ${it.unit || ''}</td>
        <td style="text-align: right;">${formatCurrency(it.price)}</td>
        <td style="text-align: right;">${it.disc_trade_amt || it.disc_cd_amt || it.discount ? formatCurrency((it.disc_trade_amt || 0) + (it.disc_cd_amt || 0) + (it.disc_sd_amt || 0)) : '-'}</td>
        <td style="text-align: right;">${formatCurrency(it.taxable)}</td>
        ${noTax ? '' : `<td style="text-align: center;">${it.gst_rate}%</td>`}
        <td style="text-align: right; font-weight: 600;">${formatCurrency(it.line_total)}</td>
      </tr>
    `
      )
      .join('');

    const hsnSummaryHtml = hsnRows
      .map(
        (h) => `
      <tr>
        <td>${h.hsn}</td>
        <td style="text-align: right;">${formatCurrency(h.taxable)}</td>
        ${
          noTax
            ? ''
            : !inter
            ? `
          <td style="text-align: right;">${formatCurrency(h.cgst)}</td>
          <td style="text-align: right;">${formatCurrency(h.sgst)}</td>
        `
            : `<td style="text-align: right;">${formatCurrency(h.igst)}</td>`
        }
        ${noTax ? '' : `<td style="text-align: right; font-weight: 600;">${formatCurrency(h.totalTax)}</td>`}
      </tr>
    `
      )
      .join('');

    const inWords = amountInWords(inv.total);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${inv.invoice_no}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #ffffff;
      padding: 24px;
    }
    .bill-container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 20px;
      border-radius: 6px;
    }
    .header-band {
      background: ${themeColor};
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .header-band h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header-band .inv-no { font-size: 14px; font-weight: 600; }
    
    .company-buyer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #cbd5e1;
    }
    .info-card { font-size: 11.5px; line-height: 1.5; }
    .info-card .name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .label { font-weight: 600; color: #475569; }

    .meta-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      margin-bottom: 16px;
      font-size: 11px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-item .meta-label { color: #64748b; font-size: 10px; text-transform: uppercase; }
    .meta-item .meta-val { font-weight: 600; color: #1e293b; }

    table.item-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
    }
    table.item-table th {
      background: #f1f5f9;
      color: #334155;
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
    table.item-table td {
      padding: 8px 6px;
      border-bottom: 1px solid #f1f5f9;
    }

    .summary-section {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .bank-terms-box {
      font-size: 11px;
      line-height: 1.4;
      background: #f8fafc;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .totals-box {
      background: #f8fafc;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .total-row.grand {
      font-size: 15px;
      font-weight: 700;
      color: ${themeColor};
      border-top: 2px solid ${themeColor};
      margin-top: 6px;
      padding-top: 6px;
    }

    .hsn-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 8px;
    }
    .hsn-table th, .hsn-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 6px;
    }
    .hsn-table th { background: #f8fafc; font-weight: 600; }

    .footer-sign {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
    }
    .sign-box { text-align: center; width: 200px; font-size: 11px; }
    .sign-line { border-top: 1px solid #64748b; margin-top: 40px; padding-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="bill-container">
    <div class="header-band">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${biz.logo ? `<img src="${biz.logo}" style="height: 52px; max-width: 120px; object-fit: contain; background: #ffffff; border-radius: 6px; padding: 3px;" />` : ''}
        <div>
          <h1>${title}</h1>
          <div style="font-size: 11px; opacity: 0.9;">${nonGst ? 'Bill of Supply — Not a Tax Invoice' : 'Original For Recipient'}</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div class="inv-no"># ${inv.invoice_no}</div>
        <div style="font-size: 11px; opacity: 0.9;">Date: ${formatDate(inv.date)}</div>
      </div>
    </div>

    <div class="company-buyer-grid">
      <div class="info-card">
        <div class="label" style="font-size: 10px; text-transform: uppercase;">Sold By / Supplier:</div>
        <div class="name">${biz.name}</div>
        <div>${biz.address}</div>
        <div><span class="label">Phone:</span> ${biz.phone} | <span class="label">Email:</span> ${biz.email}</div>
        ${biz.gstin ? `<div><span class="label">GSTIN:</span> <strong>${biz.gstin}</strong> (State: ${biz.state || ''})</div>` : ''}
        ${biz.fssai ? `<div><span class="label">FSSAI:</span> ${biz.fssai}</div>` : ''}
      </div>

      <div class="info-card">
        <div class="label" style="font-size: 10px; text-transform: uppercase;">${biz.bill_billto_label || 'Billed To (Buyer)'}:</div>
        <div class="name">${inv.party_name || 'Walk-in Customer'}</div>
        <div>${inv.party_address || '-'}</div>
        <div><span class="label">Phone:</span> ${inv.party_phone || '-'}</div>
        ${inv.party_gstin ? `<div><span class="label">GSTIN:</span> <strong>${inv.party_gstin}</strong> (State: ${inv.party_state || ''})</div>` : `<div><span class="label">GSTIN:</span> ${nonGst ? 'Unregistered buyer' : 'Not provided'}</div>`}
        ${inv.place_of_supply ? `<div><span class="label">Place of Supply:</span> ${inv.place_of_supply}</div>` : ''}
      </div>
    </div>

    ${
      inv.consignee_name || inv.consignee_address || inv.consignee_gstin
        ? `
    <div class="info-card" style="margin-top: 8px;">
      <div class="label" style="font-size: 10px; text-transform: uppercase;">Consignee (Ship To):</div>
      <div class="name">${inv.consignee_name || inv.party_name || ''}</div>
      ${inv.consignee_address ? `<div>${inv.consignee_address}</div>` : ''}
      ${inv.consignee_gstin ? `<div><span class="label">GSTIN:</span> <strong>${inv.consignee_gstin}</strong>${inv.consignee_state ? ` (State: ${inv.consignee_state})` : ''}</div>` : inv.consignee_state ? `<div><span class="label">State:</span> ${inv.consignee_state}</div>` : ''}
    </div>
    `
        : ''
    }

    ${
      nonGst || noTax || inv.eway_no || inv.po_no || inv.other_ref || inv.pay_terms || inv.dispatched_through ||
      inv.delivery_note || inv.dispatch_doc || inv.destination || inv.terms_delivery ||
      inv.no_of_packets || inv.irn
        ? `
    <div class="meta-bar">
      ${nonGst || noTax ? `<div class="meta-item"><span class="meta-label">Supply Type</span><span class="meta-val">${supplyTypeLabel(inv)}</span></div>` : ''}
      ${inv.po_no ? `<div class="meta-item"><span class="meta-label">Buyer's Order No & Date</span><span class="meta-val">${inv.po_no} ${inv.po_date ? `(${formatDate(inv.po_date)})` : ''}</span></div>` : ''}
      ${inv.other_ref ? `<div class="meta-item"><span class="meta-label">Reference No & Date</span><span class="meta-val">${inv.other_ref}</span></div>` : ''}
      ${inv.pay_terms ? `<div class="meta-item"><span class="meta-label">Mode/Terms of Payment</span><span class="meta-val">${inv.pay_terms}</span></div>` : ''}
      ${inv.eway_no ? `<div class="meta-item"><span class="meta-label">E-Way Bill</span><span class="meta-val">${inv.eway_no}</span></div>` : ''}
      ${inv.delivery_note ? `<div class="meta-item"><span class="meta-label">Delivery Note</span><span class="meta-val">${inv.delivery_note} ${inv.delivery_note_date ? `(${formatDate(inv.delivery_note_date)})` : ''}</span></div>` : ''}
      ${inv.dispatch_doc ? `<div class="meta-item"><span class="meta-label">Dispatch Doc No</span><span class="meta-val">${inv.dispatch_doc}</span></div>` : ''}
      ${inv.dispatched_through ? `<div class="meta-item"><span class="meta-label">Dispatched Through</span><span class="meta-val">${inv.dispatched_through}</span></div>` : ''}
      ${inv.destination ? `<div class="meta-item"><span class="meta-label">Destination</span><span class="meta-val">${inv.destination}</span></div>` : ''}
      ${inv.terms_delivery ? `<div class="meta-item"><span class="meta-label">Terms of Delivery</span><span class="meta-val">${inv.terms_delivery}</span></div>` : ''}
      ${inv.no_of_packets ? `<div class="meta-item"><span class="meta-label">No. of Packets</span><span class="meta-val">${inv.no_of_packets}</span></div>` : ''}
      ${inv.irn ? `<div class="meta-item"><span class="meta-label">e-Invoice IRN</span><span class="meta-val" style="word-break: break-all;">${inv.irn}</span></div>` : ''}
      ${inv.ack_no ? `<div class="meta-item"><span class="meta-label">Ack No & Date</span><span class="meta-val">${inv.ack_no} ${inv.ack_date ? `(${formatDate(inv.ack_date)})` : ''}</span></div>` : ''}
    </div>
    `
        : ''
    }

    <table class="item-table">
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="text-align: center;">HSN</th>
          <th style="text-align: right;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Disc</th>
          <th style="text-align: right;">Taxable</th>
          ${noTax ? '' : '<th style="text-align: center;">GST</th>'}
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    ${
      nonGst
        ? `<div style="font-size: 10.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; margin-bottom: 14px;">
             <strong>Declaration:</strong> This is a bill of supply issued in place of a tax invoice. No GST has been charged on this bill
             (${supplyTypeLabel(inv).replace('Non-GST · ', '').toLowerCase()}).
           </div>`
        : noTax
        ? `<div style="font-size: 10.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; margin-bottom: 14px;">
             <strong>Declaration:</strong> Nil-rated / exempt supply — no GST is chargeable on the items in this invoice.
           </div>`
        : ''
    }

    <div class="summary-section">
      <div>
        <div class="bank-terms-box">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-weight: 700; margin-bottom: 4px; color: #0f172a;">Bank & Payment Info:</div>
              ${biz.bank_name ? `<div>Bank: <strong>${biz.bank_name}</strong> | A/C: <strong>${biz.bank_account}</strong></div>` : ''}
              ${biz.bank_ifsc ? `<div>IFSC: <strong>${biz.bank_ifsc}</strong> | Branch: ${biz.bank_branch || ''}</div>` : ''}
              ${biz.account_holder ? `<div>A/C Holder: <strong>${biz.account_holder}</strong></div>` : ''}
              ${biz.upi_id ? `<div>UPI ID: <strong>${biz.upi_id}</strong></div>` : ''}
            </div>
            ${biz.qr_image ? `<div style="text-align: center;"><img src="${biz.qr_image}" style="width: 76px; height: 76px; object-fit: contain;" /><div style="font-size: 9px; color: #64748b;">Scan to Pay</div></div>` : ''}
          </div>

          <div style="font-weight: 700; margin-top: 8px; margin-bottom: 2px;">${biz.bill_terms_heading || 'Terms & Conditions'}:</div>
          <div>${biz.terms || '1. Goods once sold will not be taken back.'}</div>
          ${biz.bill_declaration ? `<div style="margin-top: 6px; font-style: italic; color: #64748b;"><strong>Declaration:</strong> ${biz.bill_declaration}</div>` : ''}
        </div>

        <div style="margin-top: 10px;">
          <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b;">${noTax ? 'HSN/SAC Value Summary:' : 'HSN/SAC Tax Summary:'}</div>
          <table class="hsn-table">
            <thead>
              <tr>
                <th>HSN</th>
                <th style="text-align: right;">${noTax ? 'Value' : 'Taxable'}</th>
                ${
                  noTax
                    ? ''
                    : !inter
                    ? `
                  <th style="text-align: right;">CGST</th>
                  <th style="text-align: right;">SGST</th>
                `
                    : '<th style="text-align: right;">IGST</th>'
                }
                ${noTax ? '' : '<th style="text-align: right;">Total Tax</th>'}
              </tr>
            </thead>
            <tbody>
              ${hsnSummaryHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="totals-box">
        <div class="total-row">
          <span>${noTax ? 'Subtotal:' : 'Taxable Subtotal:'}</span>
          <strong>${formatCurrency(inv.subtotal)}</strong>
        </div>
        ${
          inv.discount > 0
            ? `
        <div class="total-row" style="color: #dc2626;">
          <span>Extra Discount:</span>
          <strong>-${formatCurrency(inv.discount)}</strong>
        </div>
        `
            : ''
        }
        ${
          noTax
            ? `
        <div class="total-row">
          <span>GST:</span>
          <span>${nonGst ? 'Not applicable (Non-GST bill)' : 'Nil / Exempt'}</span>
        </div>
        `
            : !inter
            ? `
        <div class="total-row">
          <span>CGST:</span>
          <span>${formatCurrency(inv.tax_total / 2)}</span>
        </div>
        <div class="total-row">
          <span>SGST:</span>
          <span>${formatCurrency(inv.tax_total / 2)}</span>
        </div>
        `
            : `
        <div class="total-row">
          <span>IGST:</span>
          <span>${formatCurrency(inv.tax_total)}</span>
        </div>
        `
        }
        ${
          inv.round_off !== 0
            ? `
        <div class="total-row">
          <span>Round Off:</span>
          <span>${formatCurrency(inv.round_off)}</span>
        </div>
        `
            : ''
        }
        <div class="total-row grand">
          <span>Grand Total:</span>
          <span>${formatCurrency(inv.total)}</span>
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-style: italic;">
          ${inWords}
        </div>

        <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 8px;">
          <div class="total-row">
            <span>Amount Paid:</span>
            <span>${formatCurrency(inv.paid)}</span>
          </div>
          <div class="total-row" style="font-weight: 700; color: #e11d48;">
            <span>Balance Due:</span>
            <span>${formatCurrency(Math.max(0, inv.total - inv.paid))}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-sign">
      <div style="font-size: 10px; color: #64748b; display: flex; align-items: flex-end; gap: 12px;">
        ${biz.stamp ? `<img src="${biz.stamp}" style="height: 64px; max-width: 90px; object-fit: contain; opacity: 0.9;" />` : ''}
        <span>${biz.bill_footer_note || 'Thank you for your business!'}</span>
      </div>
      <div class="sign-box">
        <div>For <strong>${biz.name}</strong></div>
        ${biz.signature ? `<img src="${biz.signature}" style="height: 44px; max-width: 150px; object-fit: contain; margin-top: 6px;" /><div style="border-top: 1px solid #64748b; padding-top: 4px; font-weight: 600;">${biz.bill_signatory || 'Authorised Signatory'}</div>` : `<div class="sign-line">${biz.bill_signatory || 'Authorised Signatory'}</div>`}
      </div>
    </div>
  </div>
</body>
</html>
    `;
  },

  async printInvoice(biz: Business, inv: Invoice): Promise<void> {
    const html = this.generateInvoiceHtml(biz, inv);
    await Print.printAsync({ html });
  },

  /**
   * Opens a print preview of a SAMPLE invoice rendered with the given business
   * settings (format, colours, branding images, invoice texts). Used by the
   * business form so users can see the bill design before saving.
   */
  async previewBillFormat(biz: Business): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const sampleItems: any[] = [
      {
        item_name: 'Parle-G Biscuits 800g', batch_no: 'B-PGB-1', hsn: '1905',
        qty: 10, unit: 'Box', price: 85, gst_rate: 18,
        taxable: 850, tax_amount: 153, line_total: 1003,
      },
      {
        item_name: 'Shampoo 200ml', batch_no: 'B-SHM-2', hsn: '3305',
        qty: 6, unit: 'Bottle', price: 130, gst_rate: 18,
        taxable: 780, tax_amount: 140.4, line_total: 920.4,
      },
      {
        item_name: 'Cooking Oil 1L', hsn: '1512',
        qty: 4, unit: 'PCS', price: 160, gst_rate: 5,
        taxable: 640, tax_amount: 32, line_total: 672,
      },
    ];
    const sampleInv: Invoice = {
      id: 0,
      invoice_no: `${biz.invoice_prefix || 'INV'}-0001`,
      type: 'sale',
      business_id: biz.id || 0,
      party_id: null,
      party_name: 'Sunrise Supermarket (Sample)',
      party_address: '45 Bazar Street, Sample City',
      party_phone: '9812345678',
      party_gstin: '27AAACS1234A1Z5',
      party_state: 'Maharashtra',
      date: today,
      subtotal: 2270,
      discount: 0,
      tax_total: 325.4,
      total: 2595.4,
      round_off: 0,
      paid: 1000,
      status: 'partial' as any,
      notes: '',
      note_kind: '' as any,
      consignee_name: 'Sunrise Warehouse',
      consignee_address: 'Plot 12, MIDC Area, Sample City',
      po_no: 'PO-4521',
      po_date: today,
      dispatched_through: 'Road Transport',
      destination: 'Sample City',
      created_at: today,
      items: sampleItems,
    };
    const html = this.generateInvoiceHtml(biz, sampleInv);
    await Print.printAsync({ html });
  },

  async shareInvoicePdf(biz: Business, inv: Invoice): Promise<void> {
    const html = this.generateInvoiceHtml(biz, inv);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${inv.invoice_no}`,
      });
    }
  },
};
