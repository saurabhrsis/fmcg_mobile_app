import { InvoiceItem } from '../types';
import { round2 } from './formatters';

export function computeLineMath(line: Partial<InvoiceItem>) {
  const qty = Number(line.qty) || 0;
  const price = Number(line.price) || 0;
  const gst = Number(line.gst_rate) || 0;
  const gross = qty * price;

  const discOf = (pct?: number, amt?: number, mode?: 'pct' | 'amt') => {
    if (mode === 'amt') return round2(Math.min(Math.max(Number(amt) || 0, 0), gross));
    const p = Number(pct) || 0;
    if (p <= 0) return 0;
    return round2((gross * p) / 100);
  };

  const disc_trade_amt = discOf(line.disc_trade_pct, line.disc_trade_amt, line.disc_trade_mode);
  const disc_cd_amt = discOf(line.disc_cd_pct, line.disc_cd_amt, line.disc_cd_mode);
  const disc_sd_amt = discOf(line.disc_sd_pct, line.disc_sd_amt, line.disc_sd_mode);

  const disc_trade_pct = gross > 0 ? round2((disc_trade_amt / gross) * 100) : 0;
  const disc_cd_pct = gross > 0 ? round2((disc_cd_amt / gross) * 100) : 0;
  const disc_sd_pct = gross > 0 ? round2((disc_sd_amt / gross) * 100) : 0;

  let running = round2(gross - disc_trade_amt - disc_cd_amt - disc_sd_amt);

  // Legacy single per-line discount (%), applied only if the 3 discounts are unused
  if (!disc_trade_amt && !disc_cd_amt && !disc_sd_amt) {
    const dp = Number(line.discount) || 0;
    if (dp > 0) {
      running = round2(gross - round2((gross * dp) / 100));
    }
  }

  const taxable = Math.max(0, running);
  const taxAmount = (taxable * gst) / 100;

  return {
    taxable: round2(taxable),
    tax_amount: round2(taxAmount),
    line_total: round2(taxable + taxAmount),
    disc_trade_amt,
    disc_cd_amt,
    disc_sd_amt,
    disc_trade_pct,
    disc_cd_pct,
    disc_sd_pct,
  };
}
