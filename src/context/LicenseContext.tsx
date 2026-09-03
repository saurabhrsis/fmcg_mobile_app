import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LicenseStatus,
  getStatus,
  installLicenseKey,
  removeLicenseKey,
  TRIAL_DAYS,
} from '../licensing/license';
import { licenseStore } from '../licensing/licenseStore';

interface LicenseContextType {
  status: LicenseStatus | null;
  isLoading: boolean;
  /** True while the app must block create / edit / delete actions. */
  readOnly: boolean;
  deviceId: string;
  refresh: () => Promise<void>;
  activateKey: (key: string) => Promise<{ ok: boolean; reason?: string }>;
  removeKey: () => Promise<void>;
  /**
   * Guard for write actions. Returns true when the action may proceed;
   * otherwise shows the caller a reason to display.
   */
  ensureWritable: () => { allowed: boolean; reason?: string };
}

const LicenseContext = createContext<LicenseContextType | null>(null);

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');

  const refresh = useCallback(async () => {
    try {
      const s = await getStatus();
      setStatus(s);
      setDeviceId(s.deviceId);
    } catch (e) {
      console.error('License check failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Make sure a device id + trial start exist from the very first launch.
      await licenseStore.getDeviceId();
      await refresh();
    })();
  }, [refresh]);

  const activateKey = async (key: string) => {
    const res = await installLicenseKey(key);
    if (res.ok) {
      setStatus(res.status || null);
      await refresh();
      return { ok: true };
    }
    return { ok: false, reason: res.reason };
  };

  const removeKey = async () => {
    await removeLicenseKey();
    await refresh();
  };

  const readOnly = !!status?.readOnly;

  const ensureWritable = () => {
    if (!readOnly) return { allowed: true };
    if (status?.state === 'trial-expired') {
      return {
        allowed: false,
        reason: `Your ${TRIAL_DAYS}-day free trial has ended. The app is read-only — you can still view, search, print and back up data. Enter a license key to resume billing.`,
      };
    }
    return {
      allowed: false,
      reason: status?.reason || 'Your license is not active. The app is running in read-only mode.',
    };
  };

  return (
    <LicenseContext.Provider
      value={{ status, isLoading, readOnly, deviceId, refresh, activateKey, removeKey, ensureWritable }}
    >
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error('useLicense must be used within LicenseProvider');
  return ctx;
};
