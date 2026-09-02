import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { queryAll, runTransaction } from '../db/database';
import { settingsService } from './settingsService';
import { backupService } from './backupService';

/**
 * Desktop Portal Sync
 * -------------------
 * Two transports between the mobile app and the RightServe desktop portal:
 *
 * 1. FILE TRANSFER (works fully offline)
 *    - Export a versioned sync package (.json) via the share sheet; the
 *      desktop portal imports the same format.
 *    - Import a package exported by the desktop portal, either merging it
 *      into the local database or replacing everything.
 *
 * 2. NETWORK SYNC (Wi-Fi / LAN — both devices on the same network)
 *    Desktop portal endpoints (base URL configured on the sync screen):
 *      GET  {base}/api/sync/ping   → reachability check
 *      GET  {base}/api/sync/pull   → returns a sync package (desktop data)
 *      POST {base}/api/sync/push   → receives this device's sync package
 *    An optional API key is sent as "Authorization: Bearer <key>".
 *
 * MERGE STRATEGY (non-destructive):
 * Auto-increment ids differ between devices, so rows are matched by their
 * natural keys and ids are remapped while importing. Existing local rows are
 * kept as-is ("local wins"); only records missing locally are added.
 */

export const SYNC_FORMAT = 'rightserve-sync/1';

const SYNC_TABLES = [
  'users',
  'company',
  'businesses',
  'categories',
  'items',
  'item_units',
  'parties',
  'batches',
  'invoices',
  'invoice_items',
  'serials',
  'payments',
  'eway_bills',
];

export interface SyncPackage {
  format: string;
  source: 'mobile' | 'desktop' | string;
  app: string;
  version: string;
  exportedAt: string;
  counts: Record<string, number>;
  data: Record<string, any[]>;
}

export interface MergeStats {
  added: Record<string, number>;
  matched: Record<string, number>;
}

export interface SyncConfig {
  url: string;
  apiKey: string;
  lastPushAt: string;
  lastPullAt: string;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function lower(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

async function insertRow(
  db: SQLite.SQLiteDatabase,
  table: string,
  row: Record<string, any>,
  overrides: Record<string, any> = {}
): Promise<number> {
  const data: Record<string, any> = { ...row, ...overrides };
  delete data.id;
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map((k) => (data[k] === undefined ? null : data[k]));
  const res = await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
    ...values
  );
  return res.lastInsertRowId as number;
}

function mapOrNull(map: Map<number, number>, id: any): number | null {
  if (id === null || id === undefined || id === '') return null;
  const mapped = map.get(Number(id));
  return mapped ?? null;
}

function normalizeBaseUrl(url: string): string {
  let u = String(url || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u.replace(/\/+$/, '');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey.trim()) h['Authorization'] = `Bearer ${apiKey.trim()}`;
  return h;
}

// ---------------------------------------------------------------------------
// service
// ---------------------------------------------------------------------------

export const syncService = {
  // ---------------- package build / validation ----------------

  async buildSyncPackage(): Promise<SyncPackage> {
    const data: Record<string, any[]> = {};
    const counts: Record<string, number> = {};
    for (const tbl of SYNC_TABLES) {
      const rows = await queryAll(`SELECT * FROM ${tbl}`);
      data[tbl] = rows;
      counts[tbl] = rows.length;
    }
    return {
      format: SYNC_FORMAT,
      source: 'mobile',
      app: 'RightServe FMCG Suite',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      counts,
      data,
    };
  },

  parsePackage(jsonString: string): SyncPackage {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('The file is not valid JSON.');
    }
    // Accept both sync packages and plain backup files ({version, data:{...}})
    const data = parsed?.data || parsed;
    if (!data || typeof data !== 'object' || (!data.items && !data.parties && !data.invoices && !data.businesses)) {
      throw new Error('Unrecognised file — expected a RightServe sync package or backup export.');
    }
    return {
      format: parsed.format || 'backup',
      source: parsed.source || 'desktop',
      app: parsed.app || '',
      version: parsed.version || '',
      exportedAt: parsed.exportedAt || '',
      counts: parsed.counts || {},
      data,
    };
  },

  // ---------------- non-destructive merge ----------------

  async mergeSyncPackage(pkg: SyncPackage): Promise<MergeStats> {
    const d = pkg.data;
    const stats: MergeStats = { added: {}, matched: {} };
    const bump = (bucket: 'added' | 'matched', tbl: string) => {
      stats[bucket][tbl] = (stats[bucket][tbl] || 0) + 1;
    };

    await runTransaction(async (db) => {
      const bizMap = new Map<number, number>();
      const userMap = new Map<number, number>();
      const catMap = new Map<number, number>();
      const itemMap = new Map<number, number>();
      const partyMap = new Map<number, number>();
      const batchMap = new Map<number, number>();
      const invMap = new Map<number, number>();

      // -- businesses (match by name) --
      for (const row of d.businesses || []) {
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM businesses WHERE LOWER(name) = ?',
          lower(row.name)
        );
        if (found) {
          bizMap.set(Number(row.id), Number(found.id));
          bump('matched', 'businesses');
        } else {
          const newId = await insertRow(db, 'businesses', row, { is_default: 0 });
          bizMap.set(Number(row.id), newId);
          bump('added', 'businesses');
        }
      }

      // -- users (match by username) --
      for (const row of d.users || []) {
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM users WHERE username = ?',
          String(row.username ?? '')
        );
        if (found) {
          userMap.set(Number(row.id), Number(found.id));
          bump('matched', 'users');
        } else {
          const newId = await insertRow(db, 'users', row, { created_by: null });
          userMap.set(Number(row.id), newId);
          bump('added', 'users');
        }
      }

      // -- categories (parents before children; match by name + parent) --
      const cats: any[] = [...(d.categories || [])];
      let remaining = cats;
      let guard = 0;
      while (remaining.length > 0 && guard < 20) {
        guard++;
        const deferred: any[] = [];
        for (const row of remaining) {
          const srcParent = row.parent_id === null || row.parent_id === undefined ? null : Number(row.parent_id);
          if (srcParent !== null && !catMap.has(srcParent)) {
            // Parent not processed yet — try again next round.
            const parentExistsInPkg = cats.some((c) => Number(c.id) === srcParent);
            if (parentExistsInPkg && guard < 19) {
              deferred.push(row);
              continue;
            }
          }
          const parentLocal = srcParent === null ? null : catMap.get(srcParent) ?? null;
          const found = await db.getFirstAsync<any>(
            'SELECT id FROM categories WHERE LOWER(name) = ? AND parent_id IS ?',
            lower(row.name),
            parentLocal
          );
          if (found) {
            catMap.set(Number(row.id), Number(found.id));
            bump('matched', 'categories');
          } else {
            const newId = await insertRow(db, 'categories', row, { parent_id: parentLocal });
            catMap.set(Number(row.id), newId);
            bump('added', 'categories');
          }
        }
        remaining = deferred;
      }

      // -- items (match by name + sku) --
      for (const row of d.items || []) {
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM items WHERE LOWER(name) = ? AND IFNULL(sku, "") = ?',
          lower(row.name),
          String(row.sku ?? '')
        );
        if (found) {
          itemMap.set(Number(row.id), Number(found.id));
          bump('matched', 'items');
        } else {
          const newId = await insertRow(db, 'items', row, {
            category_id: mapOrNull(catMap, row.category_id),
          });
          itemMap.set(Number(row.id), newId);
          bump('added', 'items');
        }
      }

      // -- item_units (match by item + unit name; adds missing packaging levels) --
      for (const row of d.item_units || []) {
        const localItem = mapOrNull(itemMap, row.item_id);
        if (localItem === null) continue;
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM item_units WHERE item_id = ? AND LOWER(unit_name) = ?',
          localItem,
          lower(row.unit_name)
        );
        if (found) {
          bump('matched', 'item_units');
        } else {
          await insertRow(db, 'item_units', row, { item_id: localItem });
          bump('added', 'item_units');
        }
      }

      // -- parties (match by name + type) --
      for (const row of d.parties || []) {
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM parties WHERE LOWER(name) = ? AND type = ?',
          lower(row.name),
          String(row.type ?? 'customer')
        );
        if (found) {
          partyMap.set(Number(row.id), Number(found.id));
          bump('matched', 'parties');
        } else {
          const newId = await insertRow(db, 'parties', row);
          partyMap.set(Number(row.id), newId);
          bump('added', 'parties');
        }
      }

      // -- batches (match by business + item + batch no) --
      for (const row of d.batches || []) {
        const localItem = mapOrNull(itemMap, row.item_id);
        if (localItem === null) continue;
        const localBiz = mapOrNull(bizMap, row.business_id);
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM batches WHERE business_id IS ? AND item_id = ? AND batch_no = ?',
          localBiz,
          localItem,
          String(row.batch_no ?? '')
        );
        if (found) {
          batchMap.set(Number(row.id), Number(found.id));
          bump('matched', 'batches');
        } else {
          const newId = await insertRow(db, 'batches', row, {
            business_id: localBiz,
            item_id: localItem,
          });
          batchMap.set(Number(row.id), newId);
          bump('added', 'batches');
        }
      }

      // -- invoices (match by business + invoice no + type) --
      const invItemsBySrcInvoice = new Map<number, any[]>();
      for (const line of d.invoice_items || []) {
        const key = Number(line.invoice_id);
        if (!invItemsBySrcInvoice.has(key)) invItemsBySrcInvoice.set(key, []);
        invItemsBySrcInvoice.get(key)!.push(line);
      }

      for (const row of d.invoices || []) {
        const localBiz = mapOrNull(bizMap, row.business_id);
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM invoices WHERE business_id IS ? AND invoice_no = ? AND type = ?',
          localBiz,
          String(row.invoice_no ?? ''),
          String(row.type ?? 'sale')
        );
        if (found) {
          invMap.set(Number(row.id), Number(found.id));
          bump('matched', 'invoices');
          continue;
        }
        const newId = await insertRow(db, 'invoices', row, {
          business_id: localBiz,
          party_id: mapOrNull(partyMap, row.party_id),
          created_by: mapOrNull(userMap, row.created_by),
          converted_invoice_id: null,
        });
        invMap.set(Number(row.id), newId);
        bump('added', 'invoices');

        for (const line of invItemsBySrcInvoice.get(Number(row.id)) || []) {
          await insertRow(db, 'invoice_items', line, {
            invoice_id: newId,
            item_id: mapOrNull(itemMap, line.item_id),
            batch_id: mapOrNull(batchMap, line.batch_id),
          });
          bump('added', 'invoice_items');
        }
      }

      // -- serials (unique on business + item + serial no) --
      for (const row of d.serials || []) {
        const localItem = mapOrNull(itemMap, row.item_id);
        if (localItem === null) continue;
        const localBiz = mapOrNull(bizMap, row.business_id);
        const found = await db.getFirstAsync<any>(
          'SELECT id FROM serials WHERE business_id IS ? AND item_id = ? AND serial_no = ?',
          localBiz,
          localItem,
          String(row.serial_no ?? '')
        );
        if (found) {
          bump('matched', 'serials');
        } else {
          await insertRow(db, 'serials', row, {
            business_id: localBiz,
            item_id: localItem,
            purchase_invoice_id: mapOrNull(invMap, row.purchase_invoice_id),
            sale_invoice_id: mapOrNull(invMap, row.sale_invoice_id),
          });
          bump('added', 'serials');
        }
      }

      // -- payments (fingerprint match to avoid duplicates) --
      for (const row of d.payments || []) {
        const localBiz = mapOrNull(bizMap, row.business_id);
        const localParty = mapOrNull(partyMap, row.party_id);
        const localInv = mapOrNull(invMap, row.invoice_id);
        const found = await db.getFirstAsync<any>(
          `SELECT id FROM payments
           WHERE business_id IS ? AND party_id IS ? AND invoice_id IS ?
             AND type = ? AND amount = ? AND date = ? AND IFNULL(mode,'') = ? AND IFNULL(notes,'') = ?`,
          localBiz,
          localParty,
          localInv,
          String(row.type ?? ''),
          Number(row.amount ?? 0),
          String(row.date ?? ''),
          String(row.mode ?? ''),
          String(row.notes ?? '')
        );
        if (found) {
          bump('matched', 'payments');
        } else {
          await insertRow(db, 'payments', row, {
            business_id: localBiz,
            party_id: localParty,
            invoice_id: localInv,
          });
          bump('added', 'payments');
        }
      }

      // -- eway bills (fingerprint match) --
      for (const row of d.eway_bills || []) {
        const localBiz = mapOrNull(bizMap, row.business_id);
        const found = await db.getFirstAsync<any>(
          `SELECT id FROM eway_bills
           WHERE business_id IS ? AND IFNULL(doc_no,'') = ? AND ewb_date = ? AND total_value = ?`,
          localBiz,
          String(row.doc_no ?? ''),
          String(row.ewb_date ?? ''),
          Number(row.total_value ?? 0)
        );
        if (found) {
          bump('matched', 'eway_bills');
        } else {
          await insertRow(db, 'eway_bills', row, {
            business_id: localBiz,
            invoice_id: mapOrNull(invMap, row.invoice_id),
            created_by: mapOrNull(userMap, row.created_by),
          });
          bump('added', 'eway_bills');
        }
      }
    });

    return stats;
  },

  /** Apply an incoming package: merge (non-destructive) or replace everything. */
  async applyPackage(pkg: SyncPackage, mode: 'merge' | 'replace'): Promise<MergeStats | null> {
    if (mode === 'replace') {
      const res = await backupService.restoreBackup(JSON.stringify({ version: pkg.version || '1.0.0', data: pkg.data }));
      if (!res.success) throw new Error(res.error || 'Replace failed');
      return null;
    }
    return this.mergeSyncPackage(pkg);
  },

  // ---------------- file transfer ----------------

  async exportSyncFile(): Promise<{ fileName: string; records: number }> {
    const pkg = await this.buildSyncPackage();
    const json = JSON.stringify(pkg);
    const records = (Object.values(pkg.counts) as number[]).reduce((a, b) => a + b, 0);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const fileName = `RightServe_Sync_${stamp}.json`;

    if (Platform.OS === 'web') {
      // Browser download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const uri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Send Sync Package to Desktop Portal',
        });
      }
    }
    return { fileName, records };
  },

  // ---------------- network sync ----------------

  async getConfig(): Promise<SyncConfig> {
    return {
      url: await settingsService.getSetting('desktop_sync_url', ''),
      apiKey: await settingsService.getSetting('desktop_sync_key', ''),
      lastPushAt: await settingsService.getSetting('desktop_sync_last_push', ''),
      lastPullAt: await settingsService.getSetting('desktop_sync_last_pull', ''),
    };
  },

  async saveConfig(url: string, apiKey: string): Promise<void> {
    await settingsService.saveSettings({
      desktop_sync_url: normalizeBaseUrl(url),
      desktop_sync_key: apiKey.trim(),
    });
  },

  async testConnection(url: string, apiKey: string): Promise<{ ok: boolean; message: string }> {
    const base = normalizeBaseUrl(url);
    if (!base) return { ok: false, message: 'Enter the desktop portal URL first' };
    try {
      const res = await fetchWithTimeout(`${base}/api/sync/ping`, { headers: authHeaders(apiKey) }, 8000);
      if (res.ok) return { ok: true, message: 'Desktop portal is reachable ✓' };
      return { ok: false, message: `Portal responded with HTTP ${res.status}` };
    } catch (e: any) {
      return {
        ok: false,
        message: 'Could not reach the portal. Check that the desktop app is running and both devices are on the same Wi-Fi network.',
      };
    }
  },

  /** Push all local data to the desktop portal. */
  async pushToDesktop(url: string, apiKey: string): Promise<{ records: number }> {
    const base = normalizeBaseUrl(url);
    if (!base) throw new Error('Desktop portal URL is not configured');
    const pkg = await this.buildSyncPackage();
    const res = await fetchWithTimeout(
      `${base}/api/sync/push`,
      { method: 'POST', headers: authHeaders(apiKey), body: JSON.stringify(pkg) },
      60000
    );
    if (!res.ok) throw new Error(`Desktop portal rejected the upload (HTTP ${res.status})`);
    await settingsService.setSetting('desktop_sync_last_push', new Date().toISOString());
    return { records: (Object.values(pkg.counts) as number[]).reduce((a, b) => a + b, 0) };
  },

  /** Pull the desktop portal's data and merge it into the local database. */
  async pullFromDesktop(url: string, apiKey: string): Promise<MergeStats> {
    const base = normalizeBaseUrl(url);
    if (!base) throw new Error('Desktop portal URL is not configured');
    const res = await fetchWithTimeout(`${base}/api/sync/pull`, { headers: authHeaders(apiKey) }, 60000);
    if (!res.ok) throw new Error(`Desktop portal refused the download (HTTP ${res.status})`);
    const text = await res.text();
    const pkg = this.parsePackage(text);
    const stats = await this.mergeSyncPackage(pkg);
    await settingsService.setSetting('desktop_sync_last_pull', new Date().toISOString());
    return stats;
  },

  /** Human-readable one-line summary of merge stats. */
  summarizeStats(stats: MergeStats): string {
    const added = Object.entries(stats.added).filter(([, n]) => n > 0);
    const total = added.reduce((a, [, n]) => a + n, 0);
    if (total === 0) return 'Already up to date — no new records found.';
    const parts = added.map(([tbl, n]) => `${n} ${tbl.replace(/_/g, ' ')}`);
    return `Added ${parts.join(', ')}.`;
  },
};
