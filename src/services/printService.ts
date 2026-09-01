import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, Business, InvoiceItem } from '../types';
import { formatCurrency, formatDate, amountInWords } from '../utils/formatters';
import { isInterState, stateCode } from '../utils/gstState';

export const printService = {
  generateInvoiceHtml(biz: Business, inv: Invoice): string {
    const inter = isInterState(biz, inv);
    const themeColor = biz.bill_color || '#0f766e';
    const items = inv.items || [];
    const isQuote = inv.type === 'quotation';
    const isNote = inv.note_kind === 'credit' || inv.note_kind === 'debit';

    let title = biz.bill_title || 'TAX INVOICE';
    if (isQuote) title = 'QUOTATION / ESTIMATE';
    else if (inv.note_kind === 'credit') title = 'CREDIT NOTE';
    else if (inv.note_kind === 'debit') title = 'DEBIT NOTE';
    else if (inv.type === 'purchase') title = 'PURCHASE VOUCHER';

    // HSN Summary calculation
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
        <td style="text-align: center;">${it.gst_rate}%</td>
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
          !inter
            ? `
          <td style="text-align: right;">${formatCurrency(h.cgst)}</td>
          <td style="text-align: right;">${formatCurrency(h.sgst)}</td>
        `
            : `<td style="text-align: right;">${formatCurrency(h.igst)}</td>`
        }
        <td style="text-align: right; font-weight: 600;">${formatCurrency(h.totalTax)}</td>
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
      <div>
        <h1>${title}</h1>
        <div style="font-size: 11px; opacity: 0.9;">${biz.bill_declaration || 'Original For Recipient'}</div>
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
        <div class="name">${inv.party_name || 'Cash Customer'}</div>
        <div>${inv.party_address || '-'}</div>
        <div><span class="label">Phone:</span> ${inv.party_phone || '-'}</div>
        ${inv.party_gstin ? `<div><span class="label">GSTIN:</span> <strong>${inv.party_gstin}</strong> (State: ${inv.party_state || ''})</div>` : ''}
        ${inv.place_of_supply ? `<div><span class="label">Place of Supply:</span> ${inv.place_of_supply}</div>` : ''}
      </div>
    </div>

    ${
      inv.eway_no || inv.po_no || inv.consignee_name || inv.dispatched_through
        ? `
    <div class="meta-bar">
      ${inv.eway_no ? `<div class="meta-item"><span class="meta-label">E-Way Bill</span><span class="meta-val">${inv.eway_no}</span></div>` : ''}
      ${inv.po_no ? `<div class="meta-item"><span class="meta-label">PO No & Date</span><span class="meta-val">${inv.po_no} ${inv.po_date ? `(${formatDate(inv.po_date)})` : ''}</span></div>` : ''}
      ${inv.consignee_name ? `<div class="meta-item"><span class="meta-label">Ship To</span><span class="meta-val">${inv.consignee_name}</span></div>` : ''}
      ${inv.dispatched_through ? `<div class="meta-item"><span class="meta-label">Dispatched Via</span><span class="meta-val">${inv.dispatched_through}</span></div>` : ''}
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
          <th style="text-align: center;">GST</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
      </tbody>
    </table>

    <div class="summary-section">
      <div>
        <div class="bank-terms-box">
          <div style="font-weight: 700; margin-bottom: 4px; color: #0f172a;">Bank & Payment Info:</div>
          ${biz.bank_name ? `<div>Bank: <strong>${biz.bank_name}</strong> | A/C: <strong>${biz.bank_account}</strong></div>` : ''}
          ${biz.bank_ifsc ? `<div>IFSC: <strong>${biz.bank_ifsc}</strong> | Branch: ${biz.bank_branch || ''}</div>` : ''}
          ${biz.upi_id ? `<div>UPI ID: <strong>${biz.upi_id}</strong></div>` : ''}
          
          <div style="font-weight: 700; margin-top: 8px; margin-bottom: 2px;">${biz.bill_terms_heading || 'Terms & Conditions'}:</div>
          <div>${biz.terms || '1. Goods once sold will not be taken back.'}</div>
        </div>

        <div style="margin-top: 10px;">
          <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b;">HSN/SAC Tax Summary:</div>
          <table class="hsn-table">
            <thead>
              <tr>
                <th>HSN</th>
                <th style="text-align: right;">Taxable</th>
                ${
                  !inter
                    ? `
                  <th style="text-align: right;">CGST</th>
                  <th style="text-align: right;">SGST</th>
                `
                    : '<th style="text-align: right;">IGST</th>'
                }
                <th style="text-align: right;">Total Tax</th>
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
          <span>Taxable Subtotal:</span>
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
          !inter
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
      <div style="font-size: 10px; color: #64748b;">
        ${biz.bill_footer_note || 'Thank you for your business!'}
      </div>
      <div class="sign-box">
        <div>For <strong>${biz.name}</strong></div>
        <div class="sign-line">${biz.bill_signatory || 'Authorised Signatory'}</div>
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
