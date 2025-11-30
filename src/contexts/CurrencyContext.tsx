'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '@/lib/utils/formatCurrency';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number) => string;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState('PHP');

  // Load currency setting from database on mount
  useEffect(() => {
    loadCurrencyFromSettings();
  }, []);

  const loadCurrencyFromSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (data.success && data.settings?.currency) {
        setCurrencyState(data.settings.currency);
      }
    } catch (error) {
      console.error('Error loading currency setting:', error);
      // Keep default PHP if error
    }
  };

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    // Optionally persist to localStorage for faster initial loads
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredCurrency', newCurrency);
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, currency);
  };

  const currencySymbol = getCurrencySymbol(currency);

  // Always provide context, even during loading (use default PHP)
  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        formatCurrency,
        currencySymbol,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

