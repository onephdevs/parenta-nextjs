/**
 * Tiny in-process TTL cache for single-instance Hostinger/PM2 deploys.
 * Not shared across processes — use Redis only if multi-instance is introduced.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheDeletePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const DASHBOARD_METRICS_KEY = 'dashboard:metrics';
export const DASHBOARD_STATS_KEY = 'dashboard:stats';
export const DASHBOARD_TTL_MS = 60_000;

export const PUBLIC_PORTFOLIO_KEY = 'public:portfolio';
/** Homepage portfolio aggregates — safe to cache a few minutes. */
export const PUBLIC_PORTFOLIO_TTL_MS = 5 * 60_000;

export function invalidateDashboardCache(): void {
  cacheDelete(DASHBOARD_METRICS_KEY);
  cacheDelete(DASHBOARD_STATS_KEY);
  cacheDeletePrefix('dashboard:');
}

export function invalidatePublicPortfolioCache(): void {
  cacheDelete(PUBLIC_PORTFOLIO_KEY);
}
