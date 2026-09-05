import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cacheDelete,
  cacheGet,
  cacheSet,
  invalidateDashboardCache,
} from '@/lib/cache/memory-cache';

describe('memory cache', () => {
  afterEach(() => {
    cacheDelete('unit-test-key');
    invalidateDashboardCache();
    vi.useRealTimers();
  });

  it('returns a value until TTL expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T00:00:00.000Z'));
    cacheSet('unit-test-key', { n: 1 }, 1000);
    expect(cacheGet<{ n: number }>('unit-test-key')).toEqual({ n: 1 });

    vi.setSystemTime(new Date('2026-09-05T00:00:01.001Z'));
    expect(cacheGet('unit-test-key')).toBeUndefined();
  });
});
