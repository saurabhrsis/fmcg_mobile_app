export const STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  'punjab': '03',
  'chandigarh': '04',
  'uttarakhand': '05',
  'haryana': '06',
  'delhi': '07',
  'rajasthan': '08',
  'uttar pradesh': '09',
  'bihar': '10',
  'sikkim': '11',
  'arunachal pradesh': '12',
  'nagaland': '13',
  'manipur': '14',
  'mizoram': '15',
  'tripura': '16',
  'meghalaya': '17',
  'assam': '18',
  'west bengal': '19',
  'jharkhand': '20',
  'odisha': '21',
  'chhattisgarh': '22',
  'madhya pradesh': '23',
  'gujarat': '24',
  'daman and diu': '25',
  'dadra and nagar haveli': '26',
  'maharashtra': '27',
  'karnataka': '29',
  'goa': '30',
  'lakshadweep': '31',
  'kerala': '32',
  'tamil nadu': '33',
  'puducherry': '34',
  'andaman and nicobar islands': '35',
  'telangana': '36',
  'andhra pradesh': '37',
  'ladakh': '38',
  'other territory': '97',
};

export const STATE_BY_CODE: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export function stateCode(stateName?: string, gstin?: string): string {
  const g = String(gstin || '').trim();
  if (/^\d{2}/.test(g)) return g.slice(0, 2);
  const raw = String(stateName || '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (STATE_CODES[low]) return STATE_CODES[low];
  const m = raw.match(/\b(0[1-9]|1[0-9]|2[0-9]|3[0-8]|97)\b/);
  return m ? m[1] : '';
}

export function homeStateCode(biz?: { state?: string; gstin?: string; state_code?: string }): string {
  if (!biz) return '';
  return stateCode(biz.state, biz.gstin) || String(biz.state_code || '').trim();
}

export function posInfo(inv?: {
  place_of_supply?: string;
  consignee_state?: string;
  consignee_gstin?: string;
  party_state?: string;
  party_gstin?: string;
}): { state: string; gstin: string } {
  if (!inv) return { state: '', gstin: '' };
  const pos = String(inv.place_of_supply || '').trim();
  if (pos) return { state: pos, gstin: '' };
  const con = String(inv.consignee_state || '').trim();
  if (con) return { state: con, gstin: inv.consignee_gstin || '' };
  return { state: inv.party_state || '', gstin: inv.party_gstin || '' };
}

export function posStateCode(inv?: any): string {
  const p = posInfo(inv);
  return stateCode(p.state, p.gstin);
}

export function isInterState(biz?: any, inv?: any): boolean {
  const home = homeStateCode(biz);
  const other = posStateCode(inv);
  if (home && other) return home !== other;
  const h = String((biz && biz.state) || '').trim().toLowerCase();
  const p = posInfo(inv);
  const o = String(p.state || '').trim().toLowerCase();
  return !!(h && o && h !== o);
}

export function isValidGstinFormat(gstin: string): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim().toUpperCase());
}
