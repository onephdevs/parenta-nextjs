import { describe, expect, it } from 'vitest';

import { clampPageLimit } from '@/lib/db/query-limits';

describe('clampPageLimit', () => {
  it('uses the fallback for missing or invalid values', () => {
    expect(clampPageLimit(undefined, 20, 100)).toBe(20);
    expect(clampPageLimit('nope', 20, 100)).toBe(20);
    expect(clampPageLimit(0, 20, 100)).toBe(20);
  });

  it('caps oversized requests', () => {
    expect(clampPageLimit(1000, 50, 200)).toBe(200);
    expect(clampPageLimit(25, 50, 200)).toBe(25);
  });
});
