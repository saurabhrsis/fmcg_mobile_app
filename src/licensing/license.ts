// ===========================================================================
// license.ts — FMCG Mobile offline licensing.
//
// Mirrors the desktop implementation (fmcg_software/desktop/license.js) so a
// single portal (fmcg_software/portal) mints keys for BOTH products:
//
//   Key format:  RSL1.<base64url(payload)>.<base64url(ed25519 signature)>
//   Payload:     { v, id, client, plan, issued, expires|null, machine|null,
//                  reminderDays, notes, online, act }
//
// The app ships only the PUBLIC key and verifies keys offline. `expires: null`
// = perpetual. `machine` locks a key to one device. Online keys are claimed
// once at the portal (`POST <act>/api/activate`) which binds them to one
// device; afterwards a local seal keeps the app fully offline.
//
// Mobile addition: a 7-DAY FREE TRIAL is granted on first launch. When it ends
// the app goes read-only until a valid key is entered — identical behaviour to
// the desktop post-expiry read-only mode.
// ===========================================================================
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { publicKeyBytes } from './publicKey';
import { licenseStore } from './licenseStore';

// @noble/ed25519 v2 needs a sha512 implementation wired up in React Native.
(ed.etc as any).sha512Sync = (...m: Uint8Array[]) => sha512((ed.etc as any).concatBytes(...m));

export const PREFIX = 'RSL1';
export const REMINDER_DAYS = 15;
export const TRIAL_DAYS = 7;
/** Warn during the trial when this many days (or fewer) remain. */
export const TRIAL_REMINDER_DAYS = 3;

export interface LicensePayload {
  v?: number;
  id: string;
  client: string;
  plan?: string;
  issued?: string;
  /** YYYY-MM-DD, or null for a perpetual licence. */
  expires: string | null;
  /** Device id this key is locked to, or null for any device. */
  machine?: string | null;
  reminderDays?: number;
  notes?: string;
  online?: boolean;
  /** Activation server base URL. */
  act?: string;
}

export type LicenseState =
  | 'trial'            // free trial running
  | 'trial-expiring'   // trial ends in <= TRIAL_REMINDER_DAYS
  | 'trial-expired'    // trial over, no key → read-only
  | 'active'
  | 'expiring'
  | 'expired'          // paid key expired → read-only
  | 'invalid'
  | 'needs-activation';

export interface LicenseStatus {
  state: LicenseState;
  /** True when the app must block create/edit/delete operations. */
  readOnly: boolean;
  /** True while running on the free trial (paid key absent). */
  trial: boolean;
  perpetual?: boolean;
  daysLeft: number | null;
  expires: string | null;
  reason?: string;
  plan?: string;
  client?: string;
  payload?: LicensePayload;
  deviceId: string;
}

// --------------------------------------------------------------------------
// base64url helpers
// --------------------------------------------------------------------------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function b64urlDecode(s: string): Uint8Array {
  let str = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const clean = str.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let acc = 0;
  let p = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = B64.indexOf(clean[i]);
    if (idx < 0) continue;
    acc = (acc << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[p++] = (acc >> bits) & 0xff;
    }
  }
  return out.slice(0, p);
}

function bytesToUtf8(bytes: Uint8Array): string {
  let str = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) str += String.fromCharCode(b);
    else if (b >= 0xc0 && b < 0xe0) str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b >= 0xe0 && b < 0xf0)
      str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else {
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      const off = cp - 0x10000;
      str += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff));
    }
  }
  return str;
}

// --------------------------------------------------------------------------
// Verification
// --------------------------------------------------------------------------
export function verifyLicenseString(
  licStr: string
): { valid: boolean; reason?: string; payload?: LicensePayload } {
  try {
    const parts = String(licStr || '').trim().split('.');
    if (parts.length !== 3 || parts[0] !== PREFIX) {
      return { valid: false, reason: 'Invalid license format. Keys look like RSL1.xxxx.yyyy' };
    }
    const payloadBuf = b64urlDecode(parts[1]);
    const sig = b64urlDecode(parts[2]);
    const ok = ed.verify(sig, payloadBuf, publicKeyBytes());
    if (!ok) return { valid: false, reason: 'Signature verification failed (tampered or wrong key)' };
    let payload: LicensePayload;
    try {
      payload = JSON.parse(bytesToUtf8(payloadBuf));
    } catch (_) {
      return { valid: false, reason: 'Corrupt license payload' };
    }
    return { valid: true, payload };
  } catch (e: any) {
    return { valid: false, reason: 'Could not read license: ' + (e?.message || e) };
  }
}

/** Whole-day difference (expiry - today), ignoring time-of-day. */
export function dayDiff(expISO: string, now: Date): number {
  const [y, m, d] = expISO.split('-').map(Number);
  const exp = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((exp - today) / 86400000);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A key is "online" (one-device bound) only if it opts in AND names a server. */
export function isOnlineKey(payload: LicensePayload): boolean {
  return payload.online !== false && !!(payload.act && String(payload.act).trim());
}

/** Evaluate a verified payload against this device + the current date. */
export function evaluate(
  payload: LicensePayload,
  opts: { now?: Date; deviceId: string }
): LicenseStatus {
  const now = opts.now || new Date();
  const deviceId = opts.deviceId;

  if (payload.machine && payload.machine.toUpperCase() !== deviceId.toUpperCase()) {
    return {
      state: 'invalid',
      readOnly: true,
      trial: false,
      daysLeft: null,
      expires: payload.expires,
      reason: 'This license is locked to a different device.',
      payload,
      deviceId,
      client: payload.client,
      plan: payload.plan,
    };
  }

  if (!payload.expires) {
    return {
      state: 'active',
      readOnly: false,
      trial: false,
      perpetual: true,
      daysLeft: null,
      expires: null,
      payload,
      deviceId,
      client: payload.client,
      plan: payload.plan,
    };
  }

  const daysLeft = dayDiff(payload.expires, now);
  if (daysLeft < 0) {
    return {
      state: 'expired',
      readOnly: true,
      trial: false,
      daysLeft,
      expires: payload.expires,
      reason: `License expired on ${payload.expires}.`,
      payload,
      deviceId,
      client: payload.client,
      plan: payload.plan,
    };
  }

  return {
    state: daysLeft <= (payload.reminderDays || REMINDER_DAYS) ? 'expiring' : 'active',
    readOnly: false,
    trial: false,
    perpetual: false,
    daysLeft,
    expires: payload.expires,
    payload,
    deviceId,
    client: payload.client,
    plan: payload.plan,
  };
}

/** Evaluate the 7-day free trial (used when no paid key is installed). */
export function evaluateTrial(trialStart: string, now: Date, deviceId: string): LicenseStatus {
  const start = new Date(trialStart + 'T00:00:00Z');
  const end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
  const expires = isoDate(new Date(end.getTime() - 86400000)); // last usable day
  const daysLeft = dayDiff(expires, now);

  if (daysLeft < 0) {
    return {
      state: 'trial-expired',
      readOnly: true,
      trial: true,
      daysLeft,
      expires,
      reason: `Your ${TRIAL_DAYS}-day free trial ended on ${expires}. Enter a license key to continue billing.`,
      deviceId,
      plan: 'Free Trial',
    };
  }
  return {
    state: daysLeft <= TRIAL_REMINDER_DAYS ? 'trial-expiring' : 'trial',
    readOnly: false,
    trial: true,
    daysLeft,
    expires,
    deviceId,
    plan: 'Free Trial',
  };
}

// --------------------------------------------------------------------------
// Online activation (one-time). Offline keys skip the network entirely.
// --------------------------------------------------------------------------
export async function activateOnline(
  payload: LicensePayload,
  deviceId: string,
  { timeoutMs = 12000 }: { timeoutMs?: number } = {}
): Promise<{ ok: boolean; reason?: string; code?: string; data?: any; offline?: boolean }> {
  if (!isOnlineKey(payload)) return { ok: true, offline: true };
  const base = String(payload.act || '').replace(/\/+$/, '');
  const url = base + '/api/activate';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId: payload.id, machine: deviceId }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data.ok) {
      return { ok: false, reason: data.reason || `Activation failed (HTTP ${res.status}).`, code: data.code };
    }
    return { ok: true, data };
  } catch (e: any) {
    return {
      ok: false,
      reason:
        'Could not reach the activation server. Please connect to the internet and try again.\n(' +
        (e?.message || e) +
        ')',
    };
  }
}

// --------------------------------------------------------------------------
// Full status: read stored key + seal + monotonic clock, else fall back to trial
// --------------------------------------------------------------------------
export async function getStatus(): Promise<LicenseStatus> {
  const deviceId = await licenseStore.getDeviceId();
  const now = await licenseStore.monotonicNow();
  const licStr = await licenseStore.getLicenseKey();

  if (!licStr) {
    const trialStart = await licenseStore.getOrStartTrial(isoDate(now));
    return evaluateTrial(trialStart, now, deviceId);
  }

  const v = verifyLicenseString(licStr);
  if (!v.valid || !v.payload) {
    return {
      state: 'invalid',
      readOnly: true,
      trial: false,
      daysLeft: null,
      expires: null,
      reason: v.reason,
      deviceId,
    };
  }

  // Online keys need a local activation seal proving activation on this device.
  if (isOnlineKey(v.payload)) {
    const seal = await licenseStore.getSeal();
    if (!seal || seal.licenseId !== v.payload.id) {
      return {
        state: 'needs-activation',
        readOnly: true,
        trial: false,
        daysLeft: null,
        expires: v.payload.expires,
        reason: 'This key has not been activated on this device.',
        payload: v.payload,
        client: v.payload.client,
        plan: v.payload.plan,
        deviceId,
      };
    }
    // Self-heal a seal written before the stable device id existed.
    if (seal.machine !== deviceId) await licenseStore.setSeal(v.payload.id, deviceId);
  }

  return evaluate(v.payload, { now, deviceId });
}

/**
 * Verify (and, for online keys, activate) a pasted key, then install it.
 * Returns the resulting status on success.
 */
export async function installLicenseKey(
  rawKey: string
): Promise<{ ok: boolean; reason?: string; status?: LicenseStatus }> {
  const key = String(rawKey || '').trim().replace(/\s+/g, '');
  const v = verifyLicenseString(key);
  if (!v.valid || !v.payload) return { ok: false, reason: v.reason };

  const deviceId = await licenseStore.getDeviceId();
  const now = await licenseStore.monotonicNow();

  if (v.payload.machine && v.payload.machine.toUpperCase() !== deviceId.toUpperCase()) {
    return { ok: false, reason: 'This license is locked to a different device.' };
  }
  if (v.payload.expires && dayDiff(v.payload.expires, now) < 0) {
    return { ok: false, reason: `This license expired on ${v.payload.expires}. Please request a renewal.` };
  }

  if (isOnlineKey(v.payload)) {
    const act = await activateOnline(v.payload, deviceId);
    if (!act.ok) return { ok: false, reason: act.reason };
    await licenseStore.setSeal(v.payload.id, deviceId);
  }

  await licenseStore.setLicenseKey(key);
  const status = await getStatus();
  return { ok: true, status };
}

export async function removeLicenseKey(): Promise<void> {
  await licenseStore.clearLicense();
}

export function stateLabel(s: LicenseStatus): string {
  switch (s.state) {
    case 'trial':
    case 'trial-expiring':
      return `Free Trial — ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left`;
    case 'trial-expired':
      return 'Free Trial Ended — Read Only';
    case 'active':
      return s.perpetual ? 'Licensed (Lifetime)' : `Licensed — ${s.daysLeft} days left`;
    case 'expiring':
      return `Expiring in ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}`;
    case 'expired':
      return 'License Expired — Read Only';
    case 'needs-activation':
      return 'Activation Required';
    default:
      return 'Invalid License';
  }
}
