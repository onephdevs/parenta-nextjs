'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';

const DEFAULT_TTL_MS = 60_000;

type CacheKey = 'profile' | 'balance' | 'payments' | 'documents' | 'maintenance';

interface CacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
}

interface TenantDataContextValue {
  /** True while the first load for a key is in flight and no cache exists */
  isLoading: (key: CacheKey) => boolean;
  /** True while a fetch (including background revalidate) is in flight */
  isValidating: (key: CacheKey) => boolean;
  getCached: <T>(key: CacheKey) => T | undefined;
  /**
   * Return cached data immediately when available; revalidate in background.
   * Only blocks (isLoading) when there is no cache yet.
   */
  load: <T>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    options?: { force?: boolean; ttlMs?: number }
  ) => Promise<T>;
  invalidate: (key?: CacheKey) => void;
  setData: <T>(key: CacheKey, data: T) => void;
}

const TenantDataContext = createContext<TenantDataContextValue | null>(null);

async function readJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Failed to load ${url}`);
  }
  return (json.data ?? json) as T;
}

export function TenantDataProvider({ children }: { children: ReactNode }) {
  const { canAccess } = useTenantPortalGate();
  const cacheRef = useRef<Partial<Record<CacheKey, CacheEntry>>>({});
  const inflightRef = useRef<Partial<Record<CacheKey, Promise<unknown>>>>({});
  const [loadingKeys, setLoadingKeys] = useState<Partial<Record<CacheKey, boolean>>>({});
  const [validatingKeys, setValidatingKeys] = useState<Partial<Record<CacheKey, boolean>>>({});
  const [, bump] = useState(0);

  const setLoading = (key: CacheKey, value: boolean) => {
    setLoadingKeys((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const setValidating = (key: CacheKey, value: boolean) => {
    setValidatingKeys((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  };

  const getCached = useCallback(<T,>(key: CacheKey): T | undefined => {
    return cacheRef.current[key]?.data as T | undefined;
  }, []);

  const setData = useCallback(<T,>(key: CacheKey, data: T) => {
    cacheRef.current[key] = { data, fetchedAt: Date.now() };
    bump((n) => n + 1);
  }, []);

  const invalidate = useCallback((key?: CacheKey) => {
    if (key) {
      delete cacheRef.current[key];
      delete inflightRef.current[key];
    } else {
      cacheRef.current = {};
      inflightRef.current = {};
    }
    bump((n) => n + 1);
  }, []);

  const load = useCallback(
    async <T,>(
      key: CacheKey,
      fetcher: () => Promise<T>,
      options?: { force?: boolean; ttlMs?: number }
    ): Promise<T> => {
      if (!canAccess) {
        throw new Error('Tenant portal not ready');
      }

      const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
      const existing = cacheRef.current[key] as CacheEntry<T> | undefined;
      const isFresh =
        existing && !options?.force && Date.now() - existing.fetchedAt < ttl;

      if (isFresh) {
        return existing.data;
      }

      // Stale-while-revalidate: return cache, refresh in background
      if (existing && !options?.force) {
        if (!inflightRef.current[key]) {
          setValidating(key, true);
          const promise = fetcher()
            .then((data) => {
              cacheRef.current[key] = { data, fetchedAt: Date.now() };
              bump((n) => n + 1);
              return data;
            })
            .catch((err) => {
              console.warn(`Background revalidate failed for ${key}:`, err);
              return existing.data;
            })
            .finally(() => {
              delete inflightRef.current[key];
              setValidating(key, false);
            });
          inflightRef.current[key] = promise;
        }
        return existing.data;
      }

      // Deduplicate concurrent first loads
      if (inflightRef.current[key]) {
        return inflightRef.current[key] as Promise<T>;
      }

      const hasCache = Boolean(existing);
      if (!hasCache) setLoading(key, true);
      setValidating(key, true);

      const promise = fetcher()
        .then((data) => {
          cacheRef.current[key] = { data, fetchedAt: Date.now() };
          bump((n) => n + 1);
          return data;
        })
        .finally(() => {
          delete inflightRef.current[key];
          setLoading(key, false);
          setValidating(key, false);
        });

      inflightRef.current[key] = promise;
      return promise;
    },
    [canAccess]
  );

  const value = useMemo<TenantDataContextValue>(
    () => ({
      isLoading: (key) => Boolean(loadingKeys[key]) && !cacheRef.current[key],
      isValidating: (key) => Boolean(validatingKeys[key]),
      getCached,
      load,
      invalidate,
      setData,
    }),
    [loadingKeys, validatingKeys, getCached, load, invalidate, setData]
  );

  return <TenantDataContext.Provider value={value}>{children}</TenantDataContext.Provider>;
}

export function useTenantData() {
  const ctx = useContext(TenantDataContext);
  if (!ctx) {
    throw new Error('useTenantData must be used within TenantDataProvider');
  }
  return ctx;
}

/** Convenience fetchers used by portal pages */
export async function fetchTenantProfile() {
  return readJson<Record<string, unknown>>('/api/tenant/profile');
}

export async function fetchTenantBalance() {
  return readJson<Record<string, unknown>>('/api/tenant/balance');
}

export async function fetchTenantPayments() {
  const res = await fetch('/api/tenant/payments');
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to load payments');
  }
  return json.data as Record<string, unknown>;
}

export async function fetchTenantDocuments() {
  return readJson<Record<string, unknown>>('/api/tenant/documents');
}

export async function fetchTenantMaintenance() {
  const res = await fetch('/api/tenant/maintenance');
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to load maintenance');
  }
  // API may return { requests } or an array
  if (Array.isArray(json.data)) return { requests: json.data };
  return (json.data ?? { requests: [] }) as { requests: unknown[] };
}
