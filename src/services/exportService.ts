import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';
import { reportService } from './reportService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Business } from '../types';

/** Escape a single CSV cell (quotes, commas, newlines). */
const csvCell = (v: any): string => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

/** Make a string safe for use inside a filename. */
const safeName = (s: string) => s.replace(/[^a-z0-9_\-]/gi, '_');

const htmlEscape = (v: any) =>
  String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export interface ExportTable {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  /** Optional bold footer row (e.g. totals). Same length as headers. */
  footer?: (string | number)[];
}

export const exportService = {
  /**
   * Build a CSV file (UTF-8 BOM so Excel opens ₹ etc. correctly) from one or
   * more table sections and open the OS share sheet.
   */
  async exportCsv(filename: string, tables: ExportTable[]): Promise<void> {
    const lines: string[] = [];
    tables.forEach((t, idx) => {
      if (idx > 0) lines.push('');
      lines.push(csvCell(t.title + (t.subtitle ? ` — ${t.subtitle}` : '')));
      lines.push(t.headers.map(csvCell).join(','));
      t.rows.forEach((r) => lines.push(r.map(csvCell).join(',')));
      if (t.footer) lines.push(t.footer.map(csvCell).join(','));
    });

    const csv = '\ufeff' + lines.join('\n');
    const uri = `${FileSystem.documentDirectory}${safeName(filename)}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: filename,
      });
    } else {
      Alert.alert('Exported', `Saved as ${filename}.csv in app files`);
    }
  },

  /** Render table sections as a printable/shareable PDF document. */
  async exportPdf(docTitle: string, bizName: string, tables: ExportTable[]): Promise<void> {
    const sections = tables
      .map(
        (t) => `
      <div class="section">
        <h2>${htmlEscape(t.title)}</h2>
        ${t.subtitle ? `<div class="sub">${htmlEscape(t.subtitle)}</div>` : ''}
        <table>
          <thead><tr>${t.headers.map((h) => `<th>${htmlEscape(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${t.rows.length === 0
              ? `<tr><td colspan="${t.headers.length}" style="text-align:center;color:#94a3b8;">No records</td></tr>`
              : t.rows.map((r) => `<tr>${r.map((c) => `<td>${htmlEscape(c)}</td>`).join('')}</tr>`).join('')}
            ${t.footer ? `<tr class="foot">${t.footer.map((c) => `<td>${htmlEscape(c)}</td>`).join('')}</tr>` : ''}
          </tbody>
        </table>
      </div>`
      )
      .join('');

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #1e293b; padding: 18px; }
  h1 { font-size: 18px; margin: 0 0 2px; color: #0f172a; }
  .biz { color: #64748b; font-size: 11px; margin-bottom: 14px; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  h2 { font-size: 13px; margin: 0 0 2px; color: #0f766e; }
  .sub { color: #64748b; font-size: 10px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; font-size: 10px; text-transform: uppercase; }
  tr:nth-child(even) td { background: #fafcfe; }
  tr.foot td { font-weight: 700; background: #f0fdf9; }
</style></head><body>
  <h1>${htmlEscape(docTitle)}</h1>
  <div class="biz">${htmlEscape(bizName)} · Generated ${formatDate(new Date().toISOString().slice(0, 10))}</div>
  ${sections}
</body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: docTitle,
      });
    } else {
      await Print.printAsync({ html });
    }
  },

  /**
   * One-tap export of EVERY report as a single PDF pack: sales & purchase
   * registers, outstanding receivables/payables, HSN summary and FY balance.
   */
  async exportAllReports(biz: Business): Promise<void> {
    const [sales, purchases, outstanding, hsn, fyBal] = await Promise.all([
      reportService.getSalesRegister(biz.id),
      reportService.getPurchaseRegister(biz.id),
      reportService.getOutstandingReport(biz.id),
      reportService.getHsnSummary(biz.id),
      reportService.getFyBalanceReport(biz.id),
    ]);

    const regHeaders = ['Invoice No', 'Date', 'Party', 'GSTIN', 'Taxable', 'Tax', 'Total', 'Paid', 'Status'];
    const regRow = (r: any) => [
      r.invoice_no, formatDate(r.date), r.party_name || 'Cash', r.party_gstin || '-',
      formatCurrency(r.subtotal), formatCurrency(r.tax_total), formatCurrency(r.total),
      formatCurrency(r.paid), r.status,
    ];

    const tables: ExportTable[] = [
      {
        title: `Financial Year Summary (${fyBal.fy})`,
        headers: ['Metric', 'Amount'],
        rows: [
          ['Total Sales', formatCurrency(fyBal.sales)],
          ['Total Purchases', formatCurrency(fyBal.purchases)],
          ['Receipts (Money In)', formatCurrency(fyBal.receipts)],
          ['Payments (Money Out)', formatCurrency(fyBal.paidOut)],
          ['Current Stock Value', formatCurrency(fyBal.stockValue)],
          ['Gross Profit (Sales − Purchases)', formatCurrency(fyBal.grossProfit)],
        ],
      },
      {
        title: 'Sales Register',
        subtitle: `${sales.summary.count} invoices`,
        headers: regHeaders,
        rows: sales.rows.map(regRow),
        footer: ['TOTAL', '', '', '', formatCurrency(sales.summary.totalTaxable), formatCurrency(sales.summary.totalTax), formatCurrency(sales.summary.totalSales), '', ''],
      },
      {
        title: 'Purchase Register',
        subtitle: `${purchases.summary.count} vouchers`,
        headers: regHeaders,
        rows: purchases.rows.map(regRow),
        footer: ['TOTAL', '', '', '', formatCurrency(purchases.summary.totalTaxable), formatCurrency(purchases.summary.totalTax), formatCurrency(purchases.summary.totalSales), '', ''],
      },
      {
        title: 'Outstanding — Receivables (To Collect)',
        headers: ['Party', 'Phone', 'State', 'Balance'],
        rows: outstanding.receivables.map((p: any) => [p.name, p.phone || '-', p.state || '-', formatCurrency(p.balance)]),
        footer: ['TOTAL', '', '', formatCurrency(outstanding.receivables.reduce((s: number, p: any) => s + p.balance, 0))],
      },
      {
        title: 'Outstanding — Payables (To Pay)',
        headers: ['Party', 'Phone', 'State', 'Balance'],
        rows: outstanding.payables.map((p: any) => [p.name, p.phone || '-', p.state || '-', formatCurrency(p.balance)]),
        footer: ['TOTAL', '', '', formatCurrency(outstanding.payables.reduce((s: number, p: any) => s + p.balance, 0))],
      },
      {
        title: 'HSN / SAC Summary (Sales)',
        headers: ['HSN', 'Description', 'UQC', 'Qty', 'Taxable', 'Rate %', 'CGST', 'SGST', 'IGST', 'Total'],
        rows: hsn.map((h: any) => [
          h.hsn, h.description, h.uqc, h.total_qty, formatCurrency(h.total_taxable), h.gst_rate,
          formatCurrency(h.cgst), formatCurrency(h.sgst), formatCurrency(h.igst), formatCurrency(h.total_value),
        ]),
      },
    ];

    await this.exportPdf('All Reports Pack', biz.name, tables);
  },
};
