import { ItemUnit } from '../types';
import { round2, round3 } from './formatters';

export function baseUnitName(item?: { base_unit?: string; unit?: string } | null): string {
  if (!item) return 'PCS';
  if (item.base_unit && item.base_unit.trim()) return item.base_unit.trim();
  if (item.unit && item.unit.trim()) return item.unit.trim();
  return 'PCS';
}

export function factorFor(
  units: ItemUnit[] | undefined | null,
  unitName: string,
  itemBaseUnit = 'PCS'
): number {
  if (!unitName || !unitName.trim()) return 1;
  const target = unitName.trim().toLowerCase();
  if (units && units.length > 0) {
    const match = units.find((u) => u.unit_name.toLowerCase() === target);
    if (match) return Number(match.factor) || 1;
  }
  if (target === itemBaseUnit.toLowerCase()) return 1;
  return 1;
}

export function toBaseQty(
  qty: number,
  unitName: string,
  units?: ItemUnit[] | null,
  itemBaseUnit = 'PCS'
): number {
  const f = factorFor(units, unitName, itemBaseUnit);
  return round3((Number(qty) || 0) * f);
}

export function humanizeQty(
  baseQty: number,
  units?: ItemUnit[] | null,
  fallbackBase = 'PCS'
): string {
  const q = Number(baseQty) || 0;
  if (!units || units.length === 0) return `${round3(q)} ${fallbackBase}`;

  // Sort descending factor
  const sorted = [...units].sort((a, b) => (Number(b.factor) || 1) - (Number(a.factor) || 1));
  let remaining = q;
  const parts: string[] = [];

  for (const r of sorted) {
    const f = Number(r.factor) || 1;
    if (f <= 0) continue;
    if (f === 1) {
      const v = round3(remaining);
      if (v > 0 || parts.length === 0) {
        parts.push(`${v} ${r.unit_name}`);
      }
      remaining = 0;
      break;
    }
    const whole = Math.floor(round3(remaining) / f);
    if (whole > 0) {
      parts.push(`${whole} ${r.unit_name}`);
      remaining = round3(remaining - whole * f);
    }
  }

  if (remaining > 0.0005) {
    parts.push(`${round3(remaining)} ${fallbackBase}`);
  }

  return parts.join(' ') || `0 ${fallbackBase}`;
}

export function normalizeUnits(units: Partial<ItemUnit>[]): {
  ok: boolean;
  error?: string;
  units?: ItemUnit[];
} {
  const list = Array.isArray(units)
    ? units.filter((u) => u && String(u.unit_name || '').trim())
    : [];
  if (!list.length) {
    return { ok: false, error: 'At least one unit (the base unit) is required.' };
  }
  const seen = new Set<string>();
  const out: ItemUnit[] = [];

  for (const u of list) {
    const name = String(u.unit_name).trim();
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate unit name "${name}".` };
    }
    seen.add(key);
    const factor = round3(Number(u.factor) || 0);
    if (factor <= 0) {
      return { ok: false, error: `Unit "${name}" must have a factor greater than 0.` };
    }
    out.push({
      unit_name: name,
      factor,
      is_base: factor === 1 ? 1 : 0,
      purchase_price: round2(Number(u.purchase_price) || 0),
      sale_price: round2(Number(u.sale_price) || 0),
      barcode: String(u.barcode || '').trim(),
    });
  }

  const bases = out.filter((u) => u.factor === 1);
  if (bases.length === 0) {
    return {
      ok: false,
      error: 'One unit must be the base unit with factor = 1 (e.g. 1 Piece = 1).',
    };
  }
  if (bases.length > 1) {
    return { ok: false, error: 'Only one unit can be the base unit (factor = 1).' };
  }

  out.sort((a, b) => b.is_base - a.is_base || a.factor - b.factor);
  out.forEach((u, i) => (u.sort_order = i));
  return { ok: true, units: out };
}
