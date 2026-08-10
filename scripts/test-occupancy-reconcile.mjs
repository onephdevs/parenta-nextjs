/**
 * Data-integrity check: Occupied + Vacant + Unassigned must equal Total Units.
 * Run: node scripts/test-occupancy-reconcile.mjs
 * Exit 1 on failure (CI / pre-deploy).
 */

function classifyRoomStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'occupied') return 'occupied';
  if (s === 'vacant') return 'vacant';
  return 'unassigned';
}

function buildOccupancyReconciliation({ totalUnits, occupied, vacant }) {
  const total = Math.max(0, Math.floor(Number(totalUnits) || 0));
  const occ = Math.max(0, Math.floor(Number(occupied) || 0));
  const vac = Math.max(0, Math.floor(Number(vacant) || 0));
  const unassigned = total - occ - vac;
  const reconciles = unassigned >= 0 && occ + vac + unassigned === total;
  return {
    totalUnits: total,
    occupied: occ,
    vacant: vac,
    unassigned: Math.max(0, unassigned),
    reconciles,
  };
}

function assertOccupancyReconciles(r, context) {
  if (r.reconciles && r.occupied + r.vacant + r.unassigned === r.totalUnits) {
    return;
  }
  throw new Error(
    `Occupancy does not reconcile${context ? ` (${context})` : ''}: ` +
      `${r.occupied}+${r.vacant}+${r.unassigned} !== ${r.totalUnits}`
  );
}

function estimateLostRent(daysVacant, monthlyRent) {
  return Math.round(Math.max(0, daysVacant) * (Math.max(0, monthlyRent) / 30) * 100) / 100;
}

let failed = 0;

function ok(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}`);
  }
}

console.log('Occupancy reconciliation integrity tests\n');

// Bug repro: 10 total, 8 occupied, 1 vacant → unassigned must be 1
{
  const r = buildOccupancyReconciliation({
    totalUnits: 10,
    occupied: 8,
    vacant: 1,
  });
  ok('derives unassigned=1 for 10/8/1', r.unassigned === 1);
  ok('10 = 8+1+1', r.occupied + r.vacant + r.unassigned === 10);
  ok('reconciles flag true', r.reconciles === true);
  try {
    assertOccupancyReconciles(r, 'bug-repro');
    ok('assert passes for reconciled set', true);
  } catch {
    ok('assert passes for reconciled set', false);
  }
}

// Full occupancy
{
  const r = buildOccupancyReconciliation({
    totalUnits: 5,
    occupied: 5,
    vacant: 0,
  });
  ok('full occupancy unassigned=0', r.unassigned === 0 && r.reconciles);
}

// All vacant
{
  const r = buildOccupancyReconciliation({
    totalUnits: 4,
    occupied: 0,
    vacant: 4,
  });
  ok('all vacant unassigned=0', r.unassigned === 0 && r.reconciles);
}

// Drift detection: occupied+vacant > total
{
  const r = buildOccupancyReconciliation({
    totalUnits: 10,
    occupied: 8,
    vacant: 3,
  });
  ok('detects overcount (unassigned clamped, reconciles false)', r.reconciles === false);
  let threw = false;
  try {
    assertOccupancyReconciles(r, 'overcount');
  } catch {
    threw = true;
  }
  ok('assert fails on overcount', threw);
}

// Classify statuses into three buckets only
{
  const rooms = [
    'occupied',
    'vacant',
    'maintenance',
    'reserved',
    null,
    '',
    'AVAILABLE',
  ];
  const buckets = { occupied: 0, vacant: 0, unassigned: 0 };
  for (const s of rooms) {
    buckets[classifyRoomStatus(s)] += 1;
  }
  const r = buildOccupancyReconciliation({
    totalUnits: rooms.length,
    occupied: buckets.occupied,
    vacant: buckets.vacant,
  });
  ok('classify maps non occupied/vacant → unassigned', buckets.unassigned === 5);
  ok('classified set reconciles', r.reconciles && r.unassigned === 5);
}

// Lost rent formula
{
  ok('lost rent 30 days @ 3000 = 3000', estimateLostRent(30, 3000) === 3000);
  ok('lost rent 15 days @ 3000 = 1500', estimateLostRent(15, 3000) === 1500);
  ok('lost rent 0 days = 0', estimateLostRent(0, 3000) === 0);
}

console.log('');
if (failed > 0) {
  console.error(`FAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log('All occupancy integrity checks passed.');
process.exit(0);
