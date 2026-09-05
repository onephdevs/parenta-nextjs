import { describe, expect, it } from 'vitest';

import { firstPropertyId, sortPropertiesByName } from '@/lib/format/property-sort';

describe('property sort', () => {
  it('orders Apartment 1 before Apartment 2', () => {
    const sorted = sortPropertiesByName([
      { id: '2', name: 'Apartment 2' },
      { id: '1', name: 'Apartment 1' },
    ]);
    expect(sorted.map((p) => p.id)).toEqual(['1', '2']);
    expect(firstPropertyId(sorted)).toBe('1');
  });
});
