'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getTenantTheme,
  tenantTabClass as buildTabClass,
  type TenantThemeMode,
  type TenantThemeTokens,
} from '@/components/features/tenant/tenant-theme';

const STORAGE_KEY = 'parenta-tenant-theme';

interface TenantThemeContextValue extends TenantThemeTokens {
  mode: TenantThemeMode;
  setMode: (mode: TenantThemeMode) => void;
  toggleMode: () => void;
  tabClass: (active: boolean) => string;
  ready: boolean;
}

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

function readStoredMode(): TenantThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return 'dark';
}

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TenantThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setModeState(readStoredMode());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    document.documentElement.dataset.tenantTheme = mode;
  }, [mode, ready]);

  const setMode = useCallback((next: TenantThemeMode) => {
    setModeState(next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<TenantThemeContextValue>(() => {
    const tokens = getTenantTheme(mode);
    return {
      ...tokens,
      mode,
      setMode,
      toggleMode,
      tabClass: (active: boolean) => buildTabClass(tokens, active),
      ready,
    };
  }, [mode, setMode, toggleMode, ready]);

  return (
    <TenantThemeContext.Provider value={value}>{children}</TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  const ctx = useContext(TenantThemeContext);
  if (!ctx) {
    throw new Error('useTenantTheme must be used within TenantThemeProvider');
  }
  return ctx;
}
