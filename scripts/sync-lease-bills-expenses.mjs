#!/usr/bin/env node
/**
 * Align app data with lease packages + Jun 16–Jul 15 2026 apartment records:
 * 1) Assignment deposit/advance/utility deposit from lease template + building config
 * 2) Upsert per-unit electricity/water utility_bills for the period
 * 3) Replace tagged period expenses to match spreadsheet Total Expenses = ₱110,353
 *
 * Usage: node scripts/sync-lease-bills-expenses.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const PERIOD_START = '2026-06-16';
const PERIOD_END = '2026-07-15';
const NOTE_TAG = 'ledger:2026-06-16:2026-07-15';
const EXP_TAG = 'ledger-exp:2026-06-16:2026-07-15';

/** @typedef {{ room: string, electric?: number|null, water?: number|null, electricPaid?: boolean, waterPaid?: boolean, vacant?: boolean, notes?: string }} UtilRow */

/** Balibago — per-unit meter/collection amounts from APRT records sheet */
/** @type {UtilRow[]} */
const APT1_UTILS = [
  { room: 'Unit 1', electric: 2734, water: 194 },
  { room: 'Unit 2', electric: 2158, water: 524 },
  { room: 'Unit 3', electric: 195, water: 194, notes: 'New tenant' },
  { room: 'Unit 4', electric: 1534, water: 284 },
  { room: 'Unit 5', vacant: true, electric: 1630, water: 194, notes: 'Vacant — moved out' },
  { room: 'Unit 6', electric: 1498, water: 194 },
  { room: 'Unit 7', electric: 719, water: 344 },
  { room: 'Unit 8', vacant: true, electric: 43, water: 194 },
  { room: 'Unit 9', vacant: true, electric: 179, water: 194 },
  { room: 'Unit 10', electric: 599, water: 194 },
  { room: 'Unit 11', electric: 2350, water: 224 },
  { room: 'Unit 12', electric: 647, water: 284 },
  { room: 'Unit 13', electric: 323, water: 194 },
  { room: 'Unit 14', electric: 1030, water: 194 },
  { room: 'Unit 15', electric: 1570, water: 194 },
  { room: 'Unit 16', electric: 215, water: 284 },
  { room: 'Unit 17', electric: 299, water: 224 },
  { room: 'Unit 18', electric: 623, water: 194 },
  { room: 'Unit 19', electric: 175, water: 194, notes: 'New tenant' },
  { room: 'Unit 20', electric: 491, water: 314 },
  { room: 'Unit 21', electric: 479, water: 354 },
  { room: 'Unit 22', electric: 203, water: 294 },
  { room: 'Unit 23', electric: 3754, water: 334 },
  { room: 'Unit 24', electric: 155, water: 294 },
  { room: 'Unit 25', electric: 1174, water: 294 },
  { room: 'Unit 26', electric: 2590, water: 354, electricPaid: false, notes: 'Electric unpaid' },
  {
    room: 'Unit 27',
    electric: 275,
    water: 194,
    waterPaid: false,
    notes: 'Used all deposit till Aug 4 — water unpaid',
  },
  { room: 'Unit 28', vacant: true, electric: 43 },
  { room: 'Unit 29', electric: 1582, water: 294 },
  { room: 'Unit 30', vacant: true, electric: 43 },
  { room: 'Store', electric: 1736, water: 194 },
  { room: 'Admin', vacant: true, electric: 2370, water: 1544, notes: 'Common / admin meters' },
];

/** @type {UtilRow[]} */
const APT2_UTILS = [
  { room: 'Unit 1', electric: 6009, water: 683 },
  { room: 'Unit 2', electric: 971, water: 319 },
  { room: 'Unit 3', vacant: true, electric: 83, water: 152 },
  { room: 'Unit 4', electric: 2494, water: 252 },
  { room: 'Unit 5', electric: 1906, water: 219 },
  { room: 'Unit 6', electric: 2554, water: 319 },
  { room: 'Unit 7', electric: 611, water: 252 },
  { room: 'Unit 8', vacant: true, electric: 52, water: 152 },
  { room: 'Unit 9', electric: 611, water: 252 },
  {
    room: 'Unit 10',
    electric: 144,
    water: 152,
    electricPaid: false,
    waterPaid: false,
    notes: 'New tenant — utilities unpaid',
  },
];

/** Spreadsheet Total Expenses = 110353 (Ima cash allowance is NOT an expense) */
const EXPENSES = [
  { date: '2026-06-16', description: 'Cleaning & Maintenance Villasol & Balibago', amount: 600, category: 'cleaning', building: 'both' },
  { date: '2026-06-22', description: 'Cleaning & Maintenance Villasol & Balibago', amount: 600, category: 'cleaning', building: 'both' },
  { date: '2026-06-30', description: 'Cleaning & Maintenance Villasol & Balibago', amount: 600, category: 'cleaning', building: 'both' },
  { date: '2026-07-07', description: 'Cleaning & Maintenance Villasol & Balibago', amount: 600, category: 'cleaning', building: 'both' },
  { date: '2026-07-15', description: 'Cleaning & Maintenance Villasol & Balibago', amount: 600, category: 'cleaning', building: 'both' },
  { date: '2026-06-30', description: 'Garbage Collector month of June Balibago', amount: 1500, category: 'garbage_collection', building: 'apt1', vendor: 'Garbage collector' },
  { date: '2026-06-30', description: 'Garbage Collector month of June Villasol', amount: 1000, category: 'garbage_collection', building: 'apt2', vendor: 'Garbage collector' },
  { date: '2026-06-30', description: 'Food Allowance for Cleaner and Me', amount: 1000, category: 'food_allowance', building: 'both' },
  { date: '2026-06-30', description: 'Pick Up Diesel for apartment maintenance', amount: 5000, category: 'fuel_diesel', building: 'both', vendor: 'Diesel' },
  { date: '2026-06-30', description: 'Electric Bill Aprt-1 Balibago - June', amount: 32046, category: 'other', building: 'apt1', vendor: 'Electric utility' },
  { date: '2026-06-30', description: 'Electric Bill Aprt-2 Villasol - June', amount: 15435, category: 'other', building: 'apt2', vendor: 'Electric utility' },
  { date: '2026-06-30', description: 'Water Bill Aprt-1 Balibago - June', amount: 6578, category: 'other', building: 'apt1', vendor: 'Water utility' },
  { date: '2026-06-30', description: 'Water Bill Aprt-2 Villasol - June', amount: 2752, category: 'other', building: 'apt2', vendor: 'Water utility' },
  { date: '2026-06-30', description: 'Salary for June 2026', amount: 15000, category: 'staff_salary', building: 'both' },
  { date: '2026-06-30', description: 'Refund Aprt-1 Unit 5 moved out', amount: 8426, category: 'refund', building: 'apt1', room: 'Unit 5' },
  { date: '2026-06-30', description: 'Surveyor Villasol', amount: 15000, category: 'other', building: 'apt2', vendor: 'Surveyor' },
  { date: '2026-06-30', description: 'Surveyor Lunch', amount: 1242, category: 'food_allowance', building: 'apt2' },
  { date: '2026-06-30', description: 'Secretary Food', amount: 1596, category: 'food_allowance', building: 'both' },
  { date: '2026-06-30', description: '2pcs PVC', amount: 230, category: 'maintenance', building: 'both' },
  { date: '2026-06-30', description: '3pcs Bulb', amount: 268, category: 'maintenance', building: 'both' },
  { date: '2026-06-30', description: '1pc Gripo', amount: 280, category: 'maintenance', building: 'both' },
];

/** Post-expense owner draw — deducted in cash waterfall, not in Total Expenses (110,353) */
const CASH_ALLOWANCES = [
  {
    date: '2026-07-15',
    description: 'Ima Cash Allowance',
    amount: 20000,
    category: 'cash_allowance',
    building: 'both',
    vendor: 'Ima',
  },
];

const url = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(
  /[?&]pgbouncer=true/g,
  ''
);
if (!url) {
  console.error('DIRECT_URL or DATABASE_URL is required');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('supabase') || url.includes('vercel') ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

async function findBuilding(pattern) {
  const res = await client.query(
    `SELECT id, name FROM buildings
     WHERE COALESCE(is_active, true) = true AND lower(trim(name)) LIKE $1
     ORDER BY name LIMIT 1`,
    [pattern]
  );
  return res.rows[0] || null;
}

async function findRoom(buildingId, roomNumber) {
  const res = await client.query(
    `SELECT id, room_number FROM rooms
     WHERE building_id = $1 AND COALESCE(is_active, true) = true
       AND lower(trim(room_number)) = lower(trim($2))
     LIMIT 1`,
    [buildingId, roomNumber]
  );
  return res.rows[0] || null;
}

async function upsertUtility(buildingId, roomId, utilityType, amount, paid, vacant, notes) {
  const billStatus = paid === false ? 'pending' : 'paid';
  const costBearer = vacant ? 'OWNER' : 'TENANT';
  const note = `${notes || ''} [${NOTE_TAG}]`.trim();

  const existing = await client.query(
    `SELECT id FROM utility_bills
     WHERE room_id = $1 AND utility_type = $2
       AND billing_period_start = $3::date
       AND billing_period_end = $4::date
     LIMIT 1`,
    [roomId, utilityType, PERIOD_START, PERIOD_END]
  );

  if (existing.rows[0]) {
    await client.query(
      `UPDATE utility_bills SET
         amount = $2,
         bill_status = $3,
         cost_bearer = $4,
         allocation_method = 'SUBMETERED',
         notes = $5,
         due_date = $6::date,
         updated_at = NOW()
       WHERE id = $1`,
      [existing.rows[0].id, amount, billStatus, costBearer, note, PERIOD_END]
    );
    return 'updated';
  }

  await client.query(
    `INSERT INTO utility_bills (
       building_id, room_id, utility_type, provider_name,
       billing_period_start, billing_period_end, due_date,
       amount, bill_status, allocation_method, cost_bearer, notes
     ) VALUES (
       $1,$2,$3,$4,$5::date,$6::date,$7::date,$8,$9,'SUBMETERED',$10,$11
     )`,
    [
      buildingId,
      roomId,
      utilityType,
      utilityType === 'electricity' ? 'Electric utility' : 'Water utility',
      PERIOD_START,
      PERIOD_END,
      PERIOD_END,
      amount,
      billStatus,
      costBearer,
      note,
    ]
  );
  return 'created';
}

async function syncUtils(label, pattern, rows) {
  const building = await findBuilding(pattern);
  if (!building) throw new Error(`${label} building not found`);
  console.log(`\n==== Utilities ${label}: ${building.name.trim()} ====`);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let sumE = 0;
  let sumW = 0;

  for (const row of rows) {
    const room = await findRoom(building.id, row.room);
    if (!room) {
      console.warn(`  missing room ${row.room}`);
      skipped += 1;
      continue;
    }
    for (const [type, amount, paidFlag] of [
      ['electricity', row.electric, row.electricPaid],
      ['water', row.water, row.waterPaid],
    ]) {
      if (amount == null || !(amount > 0)) continue;
      if (type === 'electricity') sumE += amount;
      else sumW += amount;
      const result = await upsertUtility(
        building.id,
        room.id,
        type,
        amount,
        paidFlag !== false,
        !!row.vacant,
        row.notes
      );
      if (result === 'created') created += 1;
      else updated += 1;
      console.log(`  ${row.room.padEnd(10)} ${type.padEnd(11)} ₱${amount} (${result})`);
    }
  }
  console.log(`  → created=${created} updated=${updated} skipped=${skipped} sumE=${sumE} sumW=${sumW}`);
  return { building, sumE, sumW };
}

async function alignDepositsSafe(buildingId, utilityDepositDefault) {
  const assignments = await client.query(
    `
    SELECT a.id, r.room_number, a.monthly_rate,
           lpt.deposit_months, lpt.advance_months,
           a.deposit_paid, a.advance_paid, a.utility_deposit_paid
    FROM tenant_room_assignments a
    JOIN rooms r ON r.id = a.room_id
    JOIN lease_package_templates lpt ON lpt.id = a.lease_package_template_id
    WHERE r.building_id = $1 AND a.assignment_status = 'active'
    `,
    [buildingId]
  );

  const updated = [];
  for (const row of assignments.rows) {
    const rate = Number(row.monthly_rate);
    const depositMonths = row.deposit_months == null ? null : Number(row.deposit_months);
    const advanceMonths = Number(row.advance_months ?? 1);
    const depositPaid = depositMonths == null ? Number(row.deposit_paid || 0) : Math.round(rate * depositMonths * 100) / 100;
    const advancePaid = Math.round(rate * advanceMonths * 100) / 100;
    // Keep explicit sheet move-in utility deposits; otherwise building default
    const existingUtil = Number(row.utility_deposit_paid || 0);
    const utilityDepositPaid =
      existingUtil > 0 ? existingUtil : Number(utilityDepositDefault || 0);

    await client.query(
      `UPDATE tenant_room_assignments
       SET deposit_paid = $2,
           advance_paid = $3,
           utility_deposit_paid = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [row.id, depositPaid, advancePaid, utilityDepositPaid]
    );
    updated.push({
      room: row.room_number,
      rate,
      depositPaid,
      advancePaid,
      utilityDepositPaid,
      depositMonths,
      advanceMonths,
    });
  }
  return updated;
}

async function syncExpenses(apt1Id, apt2Id) {
  console.log('\n==== Expenses (replace tagged period) ====');
  const del = await client.query(
    `DELETE FROM expenses WHERE notes ILIKE $1`,
    [`%${EXP_TAG}%`]
  );
  console.log(`  deleted old tagged expenses: ${del.rowCount}`);

  let created = 0;
  let total = 0;
  for (const row of [...EXPENSES, ...CASH_ALLOWANCES]) {
    const buildingId =
      row.building === 'apt1'
        ? apt1Id
        : row.building === 'apt2'
          ? apt2Id
          : apt1Id; // shared → record once under apt1 to avoid double-count
    let roomId = null;
    if (row.room) {
      const room = await findRoom(buildingId, row.room);
      roomId = room?.id || null;
    }
    const description =
      row.building === 'both'
        ? `${row.description} (shared Balibago & Villasol)`
        : row.description;

    await client.query(
      `INSERT INTO expenses (
         building_id, room_id, category, description, amount,
         expense_date, vendor_name, expense_status, notes, payment_method
       ) VALUES ($1,$2,$3,$4,$5,$6::date,$7,'paid',$8,'cash')`,
      [
        buildingId,
        roomId,
        row.category,
        description,
        row.amount,
        row.date,
        row.vendor || null,
        `Monthly expenses Jun 16–Jul 15 [${EXP_TAG}]`,
      ]
    );
    created += 1;
    total += row.amount;
    console.log(`  + ${row.date} ₱${row.amount} ${description}`);
  }
  console.log(`  → created=${created} operating+allowance total=${total}`);
  const operating = EXPENSES.reduce((s, r) => s + r.amount, 0);
  console.log(`  → operating expenses=${operating} (sheet target 110353)`);
  return operating;
}

try {
  const apt1 = await syncUtils('APT1', '%apartment-1%', APT1_UTILS);
  const apt2 = await syncUtils('APT2', '%villasol%', APT2_UTILS);

  console.log('\n==== Lease-template deposits ====');
  const balCfg = await client.query(
    `SELECT utility_deposit_amount FROM building_deposit_config WHERE building_id = $1`,
    [apt1.building.id]
  );
  const vilCfg = await client.query(
    `SELECT utility_deposit_amount FROM building_deposit_config WHERE building_id = $1`,
    [apt2.building.id]
  );
  const balUtil = Number(balCfg.rows[0]?.utility_deposit_amount || 1000);
  const vilUtil = Number(vilCfg.rows[0]?.utility_deposit_amount || 3000);

  const balDeps = await alignDepositsSafe(apt1.building.id, balUtil);
  const vilDeps = await alignDepositsSafe(apt2.building.id, vilUtil);
  console.log(`  Balibago assignments updated: ${balDeps.length}`);
  balDeps.forEach((r) =>
    console.log(
      `    ${r.room}: rate=${r.rate} deposit=${r.depositPaid} (${r.depositMonths}mo) advance=${r.advancePaid} util=${r.utilityDepositPaid}`
    )
  );
  console.log(`  Villasol assignments updated: ${vilDeps.length}`);
  vilDeps.forEach((r) =>
    console.log(
      `    ${r.room}: rate=${r.rate} deposit=${r.depositPaid} (${r.depositMonths}mo) advance=${r.advancePaid} util=${r.utilityDepositPaid}`
    )
  );

  // Preserve sheet move-in packages for new tenants (override template math where sheet differs only on Unit 10 rate already 8000)
  await client.query(
    `
    UPDATE tenant_room_assignments a
    SET deposit_paid = 9600, advance_paid = 4800, utility_deposit_paid = 1000, updated_at = NOW()
    FROM rooms r
    WHERE a.room_id = r.id AND r.building_id = $1
      AND lower(r.room_number) IN ('unit 3', 'unit 19')
      AND a.assignment_status = 'active'
    `,
    [apt1.building.id]
  );
  await client.query(
    `
    UPDATE tenant_room_assignments a
    SET deposit_paid = 8000, advance_paid = 8000, utility_deposit_paid = 3000, updated_at = NOW()
    FROM rooms r
    WHERE a.room_id = r.id AND r.building_id = $1
      AND lower(r.room_number) = 'unit 10'
      AND a.assignment_status = 'active'
    `,
    [apt2.building.id]
  );

  const expTotal = await syncExpenses(apt1.building.id, apt2.building.id);

  // Summary
  const utilSum = await client.query(
    `
    SELECT b.name, ub.utility_type, COUNT(*)::int n, COALESCE(SUM(ub.amount),0)::float total
    FROM utility_bills ub
    JOIN buildings b ON b.id = ub.building_id
    WHERE ub.building_id IN ($1,$2)
      AND ub.billing_period_start = $3::date
      AND ub.billing_period_end = $4::date
    GROUP BY b.name, ub.utility_type
    ORDER BY b.name, ub.utility_type
    `,
    [apt1.building.id, apt2.building.id, PERIOD_START, PERIOD_END]
  );
  console.log('\n==== Summary ====');
  console.log('Period utility_bills:', utilSum.rows);
  console.log('Expenses total:', expTotal);
  console.log('Sheet targets: Bal elec/water expenses 32046/6578, Vil 15435/2752, expenses 110353');
  console.log('Done.');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
