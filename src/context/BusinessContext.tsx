import React, { createContext, useContext, useState, useEffect } from 'react';
import { Business } from '../types';
import { businessService } from '../services/businessService';

interface BusinessContextType {
  activeBusiness: Business | null;
  businesses: Business[];
  isLoading: boolean;
  setActiveBusiness: (b: Business) => void;
  createBusiness: (b: Omit<Business, 'id'>) => Promise<Business>;
  refreshBusinesses: () => Promise<void>;
  switchBusiness: (id: number) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBusinesses = async () => {
    try {
      const list = await businessService.getAllBusinesses();
      setBusinesses(list);

      if (list.length > 0) {
        if (!activeBusiness || !list.some((b) => b.id === activeBusiness.id)) {
          const def = list.find((b) => b.is_default === 1) || list[0];
          setActiveBusiness(def);
        } else {
          const current = list.find((b) => b.id === activeBusiness.id) || list[0];
          setActiveBusiness(current);
        }
      }
    } catch (e) {
      console.error('Failed to load businesses:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBusinesses();
  }, []);

  const switchBusiness = async (id: number) => {
    const target = businesses.find((b) => b.id === id);
    if (target) {
      setActiveBusiness(target);
    }
  };

  const createBusiness = async (b: Omit<Business, 'id'>) => {
    const created = await businessService.createBusiness(b);
    await refreshBusinesses();
    return created;
  };

  return (
    <BusinessContext.Provider
      value={{
        activeBusiness,
        businesses,
        isLoading,
        setActiveBusiness,
        createBusiness,
        refreshBusinesses,
        switchBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
};
