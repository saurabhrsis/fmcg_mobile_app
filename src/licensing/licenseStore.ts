// Persistent storage for licensing state (device id, license key, activation
// seal, trial start, anti-rollback clock). The desktop app keeps these in
// files under <userData>; on mobile we use a dedicated SQLite key/value table
// so the data survives app restarts and is included in backups.
import { queryOne, execute } from '../db/database';

const K_DEVICE_ID = 'device_id';
const K_LICENSE = 'license_key';
const K_SEAL = 'activation_seal';
const K_TRIAL_START = 'trial_start';
const K_MAX_SEEN = 'max_seen_ms';

export interface Seal {
  licenseId: string;
  machine: string;
  at: number;
}

async function get(key: string): Promise<string | null> {
  try {
    const row = await queryOne<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [key]);
    return row?.value ?? null;
  } catch (_) {
    return null;
  }
}

async function set(key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

async function del(key: string): Promise<void> {
  try {
    await execute('DELETE FROM app_meta WHERE key = ?', [key]);
  } catch (_) {
    /* ignore */
  }
}

/** XXXX-XXXX-XXXX-XXXX device identity, generated once and then stable. */
function newDeviceId(): string {
  let hex = '';
  for (let i = 0; i < 16; i++) hex += Math.floor(Math.random() * 16).toString(16);
  return hex.toUpperCase().replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

let cachedDeviceId: string | null = null;

export const licenseStore = {
  async getDeviceId(): Promise<string> {
    if (cachedDeviceId) return cachedDeviceId;
    let id = await get(K_DEVICE_ID);
    if (!id || !/^[0-9A-F-]{16,}$/i.test(id)) {
      id = newDeviceId();
      await set(K_DEVICE_ID, id);
    }
    cachedDeviceId = id.toUpperCase();
    return cachedDeviceId;
  },

  getLicenseKey(): Promise<string | null> {
    return get(K_LICENSE);
  },

  setLicenseKey(key: string): Promise<void> {
    return set(K_LICENSE, key.trim());
  },

  async clearLicense(): Promise<void> {
    await del(K_LICENSE);
    await del(K_SEAL);
  },

  async getSeal(): Promise<Seal | null> {
    const raw = await get(K_SEAL);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Seal;
    } catch (_) {
      return null;
    }
  },

  setSeal(licenseId: string, machine: string): Promise<void> {
    return set(K_SEAL, JSON.stringify({ licenseId, machine, at: Date.now() } as Seal));
  },

  /** Returns the stored trial start date, starting the trial on first call. */
  async getOrStartTrial(todayISO: string): Promise<string> {
    const existing = await get(K_TRIAL_START);
    if (existing) return existing;
    await set(K_TRIAL_START, todayISO);
    return todayISO;
  },

  async getTrialStart(): Promise<string | null> {
    return get(K_TRIAL_START);
  },

  /**
   * Monotonic "now": never earlier than the highest date we have ever seen, so
   * rolling the device clock back cannot revive an expired trial or license.
   */
  async monotonicNow(): Promise<Date> {
    const real = new Date();
    let seen = 0;
    const raw = await get(K_MAX_SEEN);
    if (raw) seen = parseInt(raw, 10) || 0;
    const effective = real.getTime() < seen ? new Date(seen) : real;
    try {
      await set(K_MAX_SEEN, String(Math.max(seen, real.getTime())));
    } catch (_) {
      /* ignore */
    }
    return effective;
  },
};
