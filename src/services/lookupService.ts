import hsnData from '../data/hsn.json';
import { HsnEntry } from '../types';
import { STATE_BY_CODE } from '../utils/gstState';

export const lookupService = {
  searchHsn(query: string): HsnEntry[] {
    if (!query || !query.trim()) return (hsnData as HsnEntry[]).slice(0, 20);
    const q = query.trim().toLowerCase();
    return (hsnData as HsnEntry[])
      .filter((item) => item.hsn.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q))
      .slice(0, 30);
  },

  decodeGstin(gstin: string): {
    valid: boolean;
    stateCode?: string;
    stateName?: string;
    pan?: string;
    entityNum?: string;
  } {
    const clean = String(gstin || '').trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean)) {
      return { valid: false };
    }

    const stateCode = clean.slice(0, 2);
    const pan = clean.slice(2, 12);
    const entityNum = clean.slice(12, 13);
    const stateName = STATE_BY_CODE[stateCode] || 'Unknown State';

    return {
      valid: true,
      stateCode,
      stateName,
      pan,
      entityNum,
    };
  },
};
