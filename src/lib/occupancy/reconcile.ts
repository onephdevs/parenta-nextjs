/**
 * Occupancy reconciliation — Occupied + Vacant + Unassigned ≡ Total Units.
 *
 * Occupied / vacant are tallied from room_status.
 * Unassigned is ALWAYS derived: totalUnits − occupied − vacant
 * (never an independent COUNT that can drift).
 */

export type OccupancyBucket = 'occupied' | 'vacant' | 'unassigned';

export interface OccupancyCountsInput {
  totalUnits: number;
  occupied: number;
  vacant: number;
}

export interface OccupancyReconciliation {
  totalUnits: number;
  occupied: number;
  vacant: number;
  /** Derived: totalUnits − occupied − vacant */
  unassigned: number;
  occupiedPercent: number;
  vacantPercent: number;
  unassignedPercent: number;
  /** True when occupied + vacant + unassigned === totalUnits and unassigned ≥ 0 */
  reconciles: boolean;
}

/** Map raw room_status into one of the three reconciliation buckets. */
export function classifyRoomStatus(
  status: string | null | undefined
): OccupancyBucket {
  const s = String(status || '')
    .toLowerCase()
    .trim();
  if (s === 'occupied') return 'occupied';
  if (s === 'vacant') return 'vacant';
  return 'unassigned';
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/**
 * Build reconciled occupancy from total + occupied + vacant.
 * Unassigned is derived — callers must not pass an independent unassigned tally.
 */
export function buildOccupancyReconciliation(
  input: OccupancyCountsInput
): OccupancyReconciliation {
  const totalUnits = Math.max(0, Math.floor(Number(input.totalUnits) || 0));
  const occupied = Math.max(0, Math.floor(Number(input.occupied) || 0));
  const vacant = Math.max(0, Math.floor(Number(input.vacant) || 0));
  const unassigned = totalUnits - occupied - vacant;

  const reconciles =
    unassigned >= 0 && occupied + vacant + unassigned === totalUnits;

  return {
    totalUnits,
    occupied,
    vacant,
    unassigned: Math.max(0, unassigned),
    occupiedPercent: pct(occupied, totalUnits),
    vacantPercent: pct(vacant, totalUnits),
    unassignedPercent: pct(Math.max(0, unassigned), totalUnits),
    reconciles,
  };
}

/**
 * Throws if occupancy does not reconcile.
 * Use in API/report builders and automated integrity checks.
 */
export function assertOccupancyReconciles(
  reconciliation: OccupancyReconciliation,
  context?: string
): void {
  const { occupied, vacant, unassigned, totalUnits, reconciles } =
    reconciliation;
  if (reconciles && occupied + vacant + unassigned === totalUnits) {
    return;
  }
  const where = context ? ` (${context})` : '';
  throw new Error(
    `Occupancy does not reconcile${where}: ` +
      `${occupied} occupied + ${vacant} vacant + ${unassigned} unassigned ` +
      `!== ${totalUnits} total units`
  );
}

/** Lost rent estimate: days vacant × (monthly rent / 30). */
export function estimateLostRent(
  daysVacant: number,
  monthlyRent: number
): number {
  const days = Math.max(0, Number(daysVacant) || 0);
  const rent = Math.max(0, Number(monthlyRent) || 0);
  return Math.round(days * (rent / 30) * 100) / 100;
}
