import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';

export interface FeaturesConfig {
  enable_batches: boolean;
  enable_serials: boolean;
  enable_multi_unit: boolean;
  enable_multi_currency: boolean;
  enable_pos_quick_billing: boolean;
  enable_eway_bill: boolean;
  enable_round_off: boolean;
  default_gst_rate: number;
  auto_backup: boolean;
}

const defaultFeatures: FeaturesConfig = {
  enable_batches: true,
  enable_serials: true,
  enable_multi_unit: true,
  enable_multi_currency: false,
  enable_pos_quick_billing: true,
  enable_eway_bill: true,
  enable_round_off: true,
  default_gst_rate: 18,
  auto_backup: true,
};

interface FeaturesContextType {
  features: FeaturesConfig;
  isLoading: boolean;
  updateFeature: <K extends keyof FeaturesConfig>(key: K, value: FeaturesConfig[K]) => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesContextType | null>(null);

export const FeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<FeaturesConfig>(defaultFeatures);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFeatures = async () => {
    try {
      const saved = await settingsService.getAllSettings();
      setFeatures({
        enable_batches: saved.enable_batches !== '0',
        enable_serials: saved.enable_serials !== '0',
        enable_multi_unit: saved.enable_multi_unit !== '0',
        enable_multi_currency: saved.enable_multi_currency === '1',
        enable_pos_quick_billing: saved.enable_pos_quick_billing !== '0',
        enable_eway_bill: saved.enable_eway_bill !== '0',
        enable_round_off: saved.enable_round_off !== '0',
        default_gst_rate: saved.default_gst_rate ? Number(saved.default_gst_rate) : 18,
        auto_backup: saved.auto_backup !== '0',
      });
    } catch (e) {
      console.warn('Could not load feature settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFeatures();
  }, []);

  const updateFeature = async <K extends keyof FeaturesConfig>(key: K, value: FeaturesConfig[K]) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
    try {
      await settingsService.setSetting(String(key), String(value));
    } catch (e) {
      console.error('Failed to save feature toggle:', e);
    }
  };

  return (
    <FeaturesContext.Provider
      value={{
        features,
        isLoading,
        updateFeature,
        refreshFeatures,
      }}
    >
      {children}
    </FeaturesContext.Provider>
  );
};

export const useFeatures = () => {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error('useFeatures must be used within FeaturesProvider');
  return ctx;
};
