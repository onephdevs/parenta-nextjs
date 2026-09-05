import { describe, expect, it } from 'vitest';

import { occupancyDateKey, withOccupancyHistoryBadges } from '@/lib/occupancy/history-badge';

describe('occupancy history badges', () => {
  it('extracts a YYYY-MM-DD key from ISO strings', () => {
    expect(occupancyDateKey('2026-09-01T15:00:00.000Z')).toBe('2026-09-01');
  });

  it('marks a later stay by the same person as renewed', () => {
    const badges = withOccupancyHistoryBadges([
      {
        id: 'old',
        tenantId: 't1',
        tenantName: 'Ada Lovelace',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        assignmentStatus: 'terminated',
      },
      {
        id: 'new',
        tenantId: 't1',
        tenantName: 'Ada Lovelace',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        assignmentStatus: 'active',
      },
    ]);

    expect(badges.find((row) => row.id === 'old')?.occupancyBadge).toBe('renewed');
    expect(badges.find((row) => row.id === 'new')?.occupancyBadge).toBe('current');
  });

  it('marks a former occupant with no later stay as terminated', () => {
    const [item] = withOccupancyHistoryBadges([
      {
        id: 'gone',
        tenantId: 't2',
        tenantName: 'Former Tenant',
        startDate: '2024-01-01',
        endDate: '2024-06-01',
        assignmentStatus: 'terminated',
      },
    ]);
    expect(item.occupancyBadge).toBe('terminated');
  });
});
