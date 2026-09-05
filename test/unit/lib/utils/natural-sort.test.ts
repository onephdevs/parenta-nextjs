import { describe, expect, it } from 'vitest';

import { compareByRoomThenName, compareNatural } from '@/lib/utils/natural-sort';

describe('natural sort', () => {
  it('orders numbers inside strings numerically', () => {
    expect(['Unit 10', 'Unit 2'].sort(compareNatural)).toEqual(['Unit 2', 'Unit 10']);
  });

  it('sorts tenants by room then last name', () => {
    const rows = [
      { currentRoomNumber: '10', lastName: 'Zed', firstName: 'A' },
      { currentRoomNumber: '2', lastName: 'Ann', firstName: 'B' },
    ];
    rows.sort(compareByRoomThenName);
    expect(rows[0].currentRoomNumber).toBe('2');
  });
});
