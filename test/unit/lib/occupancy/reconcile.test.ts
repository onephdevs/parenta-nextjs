import { describe, expect, it } from 'vitest';

import {
  assertOccupancyReconciles,
  buildOccupancyReconciliation,
  classifyRoomStatus,
  estimateLostRent,
} from '@/lib/occupancy/reconcile';

describe('occupancy reconciliation', () => {
  it('derives unassigned instead of accepting a third independent count', () => {
    const rec = buildOccupancyReconciliation({ totalUnits: 10, occupied: 6, vacant: 3 });
    expect(rec.unassigned).toBe(1);
    expect(rec.reconciles).toBe(true);
    expect(rec.occupiedPercent).toBe(60);
  });

  it('does not reconcile when occupied + vacant exceed total units', () => {
    const rec = buildOccupancyReconciliation({ totalUnits: 5, occupied: 4, vacant: 3 });
    expect(rec.reconciles).toBe(false);
    expect(rec.unassigned).toBe(0);
    expect(() => assertOccupancyReconciles(rec, 'Balibago')).toThrow(/does not reconcile/);
  });

  it('maps unknown room_status into the unassigned bucket', () => {
    expect(classifyRoomStatus('occupied')).toBe('occupied');
    expect(classifyRoomStatus('vacant')).toBe('vacant');
    expect(classifyRoomStatus('reserved')).toBe('unassigned');
  });

  it('estimates lost rent as days vacant × monthly / 30', () => {
    expect(estimateLostRent(15, 9000)).toBe(4500);
  });
});
