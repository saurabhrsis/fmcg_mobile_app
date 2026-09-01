import { itemService } from './itemService';
import { partyService } from './partyService';

export const FIELD_SYNONYMS = {
  items: {
    name: ['name', 'item name', 'product name', 'product', 'itemname', 'particulars', 'stock item', 'item'],
    sku: ['sku', 'code', 'item code', 'product code', 'barcode', 'alias'],
    category: ['category', 'group', 'item group', 'stock group', 'category name'],
    unit: ['unit', 'uom', 'units', 'base unit'],
    hsn: ['hsn', 'hsn code', 'hsn/sac', 'hsncode'],
    gst_rate: ['gst', 'gst rate', 'gst%', 'tax rate', 'igst'],
    purchase_price: ['purchase price', 'purchase rate', 'cost price', 'cost', 'p.rate'],
    sale_price: ['sale price', 'sales price', 'selling price', 'mrp', 'rate', 'price', 's.rate'],
    opening_stock: ['opening stock', 'stock', 'qty', 'quantity', 'current stock'],
    low_stock_alert: ['low stock', 'reorder', 'reorder level', 'min stock'],
    batch_no: ['batch', 'batch no', 'serial no'],
    expiry_date: ['expiry', 'expiry date', 'exp date'],
  },
  parties: {
    name: ['name', 'party name', 'customer name', 'supplier name', 'ledger name', 'account name', 'party'],
    type: ['type', 'party type', 'group', 'ledger group'],
    phone: ['phone', 'mobile', 'contact', 'mobile no', 'phone no'],
    email: ['email', 'e-mail'],
    gstin: ['gstin', 'gst no', 'gst number', 'gstin/uin', 'gst'],
    address: ['address', 'billing address', 'addr', 'location'],
    state: ['state', 'state name'],
    opening_balance: ['opening balance', 'balance', 'opening', 'outstanding', 'closing balance'],
  },
};

export function parseCsv(text: string): { headers: string[]; records: Record<string, string>[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], records: [] };

  // Parse CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = vals[idx] || '';
    });
    records.push(rec);
  }

  return { headers, records };
}

export function autoMapHeaders(headers: string[], entity: 'items' | 'parties'): Record<string, string> {
  const syns = FIELD_SYNONYMS[entity];
  const map: Record<string, string> = {};
  const used = new Set<string>();

  for (const [field, names] of Object.entries(syns)) {
    const hit = headers.find((h) => names.includes(h.toLowerCase().trim()) && !used.has(h));
    if (hit) {
      map[field] = hit;
      used.add(hit);
    }
  }

  return map;
}

export const migrateService = {
  previewCsv(csvText: string, entity: 'items' | 'parties') {
    const { headers, records } = parseCsv(csvText);
    const mapping = autoMapHeaders(headers, entity);
    return {
      headers,
      mapping,
      totalRows: records.length,
      sample: records.slice(0, 5),
    };
  },

  async commitImport(
    businessId: number,
    csvText: string,
    entity: 'items' | 'parties',
    userMapping?: Record<string, string>
  ): Promise<{ inserted: number; errors: string[] }> {
    const { headers, records } = parseCsv(csvText);
    const mapping = userMapping && Object.keys(userMapping).length ? userMapping : autoMapHeaders(headers, entity);

    let inserted = 0;
    const errors: string[] = [];

    const getVal = (rec: Record<string, string>, field: string) => {
      const col = mapping[field];
      return col ? (rec[col] || '').trim() : '';
    };

    if (entity === 'items') {
      for (const rec of records) {
        const name = getVal(rec, 'name');
        if (!name) continue;

        try {
          await itemService.createItem(
            businessId,
            {
              name,
              sku: getVal(rec, 'sku'),
              unit: getVal(rec, 'unit') || 'PCS',
              base_unit: getVal(rec, 'unit') || 'PCS',
              hsn: getVal(rec, 'hsn'),
              gst_rate: parseFloat(getVal(rec, 'gst_rate')) || 0,
              purchase_price: parseFloat(getVal(rec, 'purchase_price')) || 0,
              sale_price: parseFloat(getVal(rec, 'sale_price')) || 0,
              low_stock_alert: parseFloat(getVal(rec, 'low_stock_alert')) || 0,
            },
            undefined,
            parseFloat(getVal(rec, 'opening_stock')) || 0
          );
          inserted++;
        } catch (err: any) {
          errors.push(`Row error (${name}): ${err.message}`);
        }
      }
    } else if (entity === 'parties') {
      for (const rec of records) {
        const name = getVal(rec, 'name');
        if (!name) continue;

        const rawType = getVal(rec, 'type').toLowerCase();
        const type = rawType.includes('supp') || rawType.includes('vendor') ? 'supplier' : 'customer';

        try {
          await partyService.createParty({
            name,
            type,
            phone: getVal(rec, 'phone'),
            email: getVal(rec, 'email'),
            gstin: getVal(rec, 'gstin'),
            address: getVal(rec, 'address'),
            state: getVal(rec, 'state'),
            opening_balance: parseFloat(getVal(rec, 'opening_balance')) || 0,
          });
          inserted++;
        } catch (err: any) {
          errors.push(`Row error (${name}): ${err.message}`);
        }
      }
    }

    return { inserted, errors };
  },

  getItemSampleCsv(): string {
    return `Name,SKU,Category,Unit,HSN,GST Rate,Purchase Price,Sale Price,Opening Stock,Low Stock
Cola 500ml,BEV001,Beverages,Bottle,2202,28,18,25,100,20
Orange Juice 1L,BEV002,Beverages,Bottle,2009,12,60,85,50,10
Potato Chips 50g,SNK001,Snacks,Piece,2005,12,8,10,200,40
Biscuits Pack,SNK002,Snacks,Piece,1905,18,3,5,150,30
Shampoo 200ml,PC001,Personal Care,Bottle,3305,18,90,130,40,10`;
  },

  getPartySampleCsv(): string {
    return `Name,Type,Phone,Email,GSTIN,Address,State,Opening Balance
Gupta Kirana Store,Customer,9811111111,gupta@example.com,22AAAAA0000A1Z5,"Lajpat Nagar, Delhi",Delhi,0
Sunrise Supermarket,Customer,9822222222,sunrise@example.com,07BBBBB1111B1Z3,"Karol Bagh, Delhi",Delhi,0
HUL Distributors,Supplier,9844444444,hul@example.com,27CCCCC2222C1Z1,"Andheri, Mumbai",Maharashtra,0
Nestle Wholesale,Supplier,9855555555,nestle@example.com,24DDDDD3333D1Z9,Ahmedabad,Gujarat,0`;
  },
};
