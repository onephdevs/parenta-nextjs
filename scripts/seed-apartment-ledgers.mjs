#!/usr/bin/env node
/**
 * Import Jun 16 – Jul 15 2026 rental / utility ledger for Apartment 1 & 2.
 *
 * Creates:
 * - payments (rent / advance / deposit / utility) linked to tenant + assignment + room
 * - utility_bills (electricity / water) linked to room (+ building)
 * - assignment deposit/advance/utility_deposit amounts for new tenants
 *
 * Idempotent: skips if a matching payment / utility bill already exists for the period.
 * If August rent invoices exist, allocates ledger rent/advance cash onto them.
 *
 * Usage: node scripts/seed-apartment-ledgers.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { allocateExcelLedgerToAugustInvoices } from './lib/allocate-excel-ledger-to-aug-invoices.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const PERIOD_START = '2026-06-16';
const PERIOD_END = '2026-07-15';
const NOTE_TAG = 'ledger:2026-06-16:2026-07-15';

/**
 * @typedef {{
 *   room: string,
 *   rentDue?: string|null,
 *   rentPaid?: number|null,
 *   rentPaidOn?: string|null,
 *   electric?: number|null,
 *   electricPaid?: boolean,
 *   water?: number|null,
 *   waterPaid?: boolean,
 *   advance?: number|null,
 *   deposit?: number|null,
 *   utilityDeposit?: number|null,
 *   depositPaidOn?: string|null,
 *   notes?: string,
 *   vacant?: boolean,
 * }} LedgerRow
 */

/** @type {LedgerRow[]} */
const APT1 = [
  { room: 'Unit 1', rentDue: '2026-07-15', rentPaid: 4800, rentPaidOn: '2026-07-11', electric: 2734, water: 194 },
  { room: 'Unit 2', rentDue: '2026-07-08', rentPaid: 4800, rentPaidOn: '2026-07-06', electric: 2158, water: 524 },
  {
    room: 'Unit 3',
    advance: 4800,
    deposit: 9600,
    utilityDeposit: 1000,
    depositPaidOn: '2026-07-13',
    electric: 195,
    water: 194,
    notes: 'New tenant — 1mo advance + 2mo deposit + utility deposit',
  },
  { room: 'Unit 4', rentDue: '2026-06-28', rentPaid: 4800, rentPaidOn: '2026-07-01', electric: 1534, water: 284 },
  { room: 'Unit 5', vacant: true, electric: 1630, water: 194, notes: 'Vacant — moved out with refund' },
  { room: 'Unit 6', rentDue: '2026-07-01', rentPaid: 4800, rentPaidOn: '2026-07-05', electric: 1498, water: 194 },
  { room: 'Unit 7', rentDue: '2026-06-22', rentPaid: 3000, rentPaidOn: '2026-06-23', electric: 719, water: 344 },
  { room: 'Unit 8', vacant: true, electric: 43, water: 194 },
  { room: 'Unit 9', vacant: true, electric: 179, water: 194 },
  { room: 'Unit 10', rentDue: '2026-07-01', rentPaid: 4800, rentPaidOn: '2026-07-05', electric: 599, water: 194 },
  { room: 'Unit 11', rentDue: '2026-07-08', rentPaid: 4800, rentPaidOn: '2026-07-11', electric: 2350, water: 224 },
  { room: 'Unit 12', rentDue: '2026-07-08', rentPaid: 4800, rentPaidOn: '2026-07-10', electric: 647, water: 284 },
  { room: 'Unit 13', rentDue: '2026-06-23', rentPaid: 4800, rentPaidOn: '2026-06-23', electric: 323, water: 194 },
  { room: 'Unit 14', rentDue: '2026-06-23', rentPaid: 4800, rentPaidOn: '2026-06-24', electric: 1030, water: 194 },
  { room: 'Unit 15', rentDue: '2026-06-17', rentPaid: 4800, rentPaidOn: '2026-06-16', electric: 1570, water: 194 },
  { room: 'Unit 16', rentDue: '2026-07-04', rentPaid: 4800, rentPaidOn: '2026-07-05', electric: 215, water: 284 },
  { room: 'Unit 17', rentDue: '2026-06-18', rentPaid: 4800, rentPaidOn: '2026-06-21', electric: 299, water: 224 },
  { room: 'Unit 18', rentDue: '2026-07-04', rentPaid: 4800, rentPaidOn: '2026-07-06', electric: 623, water: 194 },
  {
    room: 'Unit 19',
    advance: 4800,
    deposit: 9600,
    utilityDeposit: 1000,
    depositPaidOn: '2026-06-29',
    electric: 175,
    water: 194,
    notes: 'New tenant — 1mo advance + 2mo deposit + utility deposit',
  },
  { room: 'Unit 20', rentDue: '2026-07-05', rentPaid: 4800, rentPaidOn: '2026-07-05', electric: 491, water: 314 },
  { room: 'Unit 21', rentDue: '2026-07-08', rentPaid: 4800, rentPaidOn: '2026-07-10', electric: 479, water: 354 },
  { room: 'Unit 22', rentDue: '2026-07-06', rentPaid: 4800, rentPaidOn: '2026-07-05', electric: 203, water: 294 },
  { room: 'Unit 23', rentDue: '2026-06-30', rentPaid: 4800, rentPaidOn: '2026-07-01', electric: 3754, water: 334 },
  { room: 'Unit 24', rentDue: '2026-06-19', rentPaid: 4800, rentPaidOn: '2026-06-21', electric: 155, water: 294 },
  { room: 'Unit 25', rentDue: '2026-06-22', rentPaid: 4800, rentPaidOn: '2026-06-23', electric: 1174, water: 294 },
  {
    room: 'Unit 26',
    rentDue: '2026-06-17',
    rentPaid: 4800,
    rentPaidOn: '2026-06-26',
    electric: 2590,
    water: 354,
    electricPaid: false,
    notes: 'Electric unpaid 2590',
  },
  {
    room: 'Unit 27',
    rentDue: '2026-07-04',
    electric: 275,
    water: 194,
    waterPaid: false,
    notes: 'Used all deposit till Aug 4 — no rent cash payment this period',
  },
  { room: 'Unit 28', vacant: true, electric: 43 },
  { room: 'Unit 29', rentDue: '2026-06-29', rentPaid: 4800, rentPaidOn: '2026-07-09', electric: 1582, water: 294 },
  { room: 'Unit 30', vacant: true, electric: 43 },
  { room: 'Store', rentDue: '2026-07-08', rentPaid: 3500, rentPaidOn: '2026-07-08', electric: 1736, water: 194 },
  { room: 'Admin', vacant: true, electric: 2370, water: 1544, notes: 'Common / admin meters' },
];

/** @type {LedgerRow[]} */
const APT2 = [
  { room: 'Unit 1', rentDue: '2026-06-18', rentPaid: 6000, rentPaidOn: '2026-06-19', electric: 6009, water: 683 },
  { room: 'Unit 2', rentDue: '2026-06-27', rentPaid: 6000, rentPaidOn: '2026-06-29', electric: 971, water: 319 },
  { room: 'Unit 3', vacant: true, electric: 83, water: 152 },
  { room: 'Unit 4', rentDue: '2026-06-26', rentPaid: 6000, rentPaidOn: '2026-06-28', electric: 2494, water: 252 },
  { room: 'Unit 5', rentDue: '2026-06-18', rentPaid: 6000, rentPaidOn: '2026-06-16', electric: 1906, water: 219 },
  { room: 'Unit 6', rentDue: '2026-06-24', rentPaid: 6000, rentPaidOn: '2026-06-26', electric: 2554, water: 319 },
  { room: 'Unit 7', rentDue: '2026-06-17', rentPaid: 6000, rentPaidOn: '2026-06-23', electric: 611, water: 252 },
  { room: 'Unit 8', vacant: true, electric: 52, water: 152 },
  { room: 'Unit 9', rentDue: '2026-06-28', rentPaid: 6000, rentPaidOn: '2026-07-01', electric: 611, water: 252 },
  {
    room: 'Unit 10',
    advance: 8000,
    deposit: 8000,
    utilityDeposit: 3000,
    depositPaidOn: '2026-07-14',
    electric: 144,
    water: 152,
    electricPaid: false,
    waterPaid: false,
    notes: 'New tenant — 1mo advance + 1mo deposit + utility deposit',
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
     WHERE is_active = true AND lower(trim(name)) LIKE $1
     ORDER BY name LIMIT 1`,
    [pattern]
  );
  return res.rows[0] || null;
}

async function findRoom(buildingId, roomNumber) {
  const res = await client.query(
    `SELECT id, room_number, building_id FROM rooms
     WHERE building_id = $1 AND is_active = true AND lower(room_number) = lower($2)
     LIMIT 1`,
    [buildingId, roomNumber]
  );
  return res.rows[0] || null;
}

async function findActiveAssignment(roomId) {
  const res = await client.query(
    `SELECT tra.id AS assignment_id, tra.tenant_id, t.first_name, t.last_name
     FROM tenant_room_assignments tra
     JOIN tenants t ON t.id = tra.tenant_id
     WHERE tra.room_id = $1
       AND tra.assignment_status = 'active'
       AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
     LIMIT 1`,
    [roomId]
  );
  return res.rows[0] || null;
}

async function paymentExists(tenantId, paymentType, amount, paymentDate) {
  const res = await client.query(
    `SELECT id FROM payments
     WHERE tenant_id = $1
       AND payment_type = $2
       AND amount = $3
       AND payment_date = $4::date
       AND notes ILIKE $5
     LIMIT 1`,
    [tenantId, paymentType, amount, paymentDate, `%${NOTE_TAG}%`]
  );
  return res.rows.length > 0;
}

async function utilityExists(roomId, utilityType) {
  const res = await client.query(
    `SELECT id FROM utility_bills
     WHERE room_id = $1
       AND utility_type = $2
       AND billing_period_start = $3::date
       AND billing_period_end = $4::date
     LIMIT 1`,
    [roomId, utilityType, PERIOD_START, PERIOD_END]
  );
  return res.rows.length > 0;
}

async function insertPayment({
  tenantId,
  assignmentId,
  roomId,
  amount,
  paymentType,
  paymentDate,
  dueDate,
  status,
  notes,
}) {
  if (await paymentExists(tenantId, paymentType, amount, paymentDate)) {
    return { skipped: true };
  }
  await client.query(
    `INSERT INTO payments (
       tenant_id, assignment_id, room_id, amount, payment_type, payment_method,
       payment_date, due_date, payment_status, notes
     ) VALUES ($1,$2,$3,$4,$5,'cash',$6::date,$7::date,$8,$9)`,
    [
      tenantId,
      assignmentId,
      roomId,
      amount,
      paymentType,
      paymentDate,
      dueDate || paymentDate,
      status,
      `${notes || ''} [${NOTE_TAG}]`.trim(),
    ]
  );
  return { created: true };
}

async function insertUtilityBill({
  buildingId,
  roomId,
  utilityType,
  amount,
  billStatus,
  dueDate,
  notes,
}) {
  if (await utilityExists(roomId, utilityType)) {
    return { skipped: true };
  }
  const provider = utilityType === 'electricity' ? 'Electric utility' : 'Water utility';
  await client.query(
    `INSERT INTO utility_bills (
       building_id, room_id, utility_type, provider_name,
       billing_period_start, billing_period_end, due_date,
       amount, bill_status, allocation_method, notes
     ) VALUES (
       $1,$2,$3,$4,$5::date,$6::date,$7::date,$8,$9,'SUBMETERED',$10
     )`,
    [
      buildingId,
      roomId,
      utilityType,
      provider,
      PERIOD_START,
      PERIOD_END,
      dueDate || PERIOD_END,
      amount,
      billStatus,
      `${notes || ''} [${NOTE_TAG}]`.trim(),
    ]
  );
  return { created: true };
}

async function importBuilding(label, buildingPattern, rows) {
  const building = await findBuilding(buildingPattern);
  if (!building) {
    console.error(`${label}: building not found (${buildingPattern})`);
    return;
  }
  console.log(`\n==== ${label}: ${building.name.trim()} ====`);

  let payments = 0;
  let utilities = 0;
  let skipped = 0;
  let depositsUpdated = 0;

  for (const row of rows) {
    const room = await findRoom(building.id, row.room);
    if (!room) {
      console.warn(`  skip missing room: ${row.room}`);
      continue;
    }
    const assignment = row.vacant ? null : await findActiveAssignment(room.id);

    // Utility bills always attach to the room (even vacant)
    for (const [type, amount, paidFlag] of [
      ['electricity', row.electric, row.electricPaid],
      ['water', row.water, row.waterPaid],
    ]) {
      if (amount == null || amount <= 0) continue;
      const paid = paidFlag !== false; // default paid unless explicitly false
      const util = await insertUtilityBill({
        buildingId: building.id,
        roomId: room.id,
        utilityType: type,
        amount,
        billStatus: paid ? 'paid' : 'pending',
        dueDate: row.rentDue || PERIOD_END,
        notes: row.notes,
      });
      if (util.created) utilities += 1;
      else skipped += 1;

      // Mirror as tenant utility payment when there is an active tenant
      if (assignment && paid) {
        const pay = await insertPayment({
          tenantId: assignment.tenant_id,
          assignmentId: assignment.assignment_id,
          roomId: room.id,
          amount,
          paymentType: 'utility',
          paymentDate: row.rentPaidOn || row.depositPaidOn || PERIOD_END,
          dueDate: row.rentDue || PERIOD_END,
          status: 'paid',
          notes: `${type} bill — ${row.room}`,
        });
        if (pay.created) payments += 1;
        else skipped += 1;
      } else if (assignment && !paid) {
        const pay = await insertPayment({
          tenantId: assignment.tenant_id,
          assignmentId: assignment.assignment_id,
          roomId: room.id,
          amount,
          paymentType: 'utility',
          paymentDate: row.rentDue || PERIOD_END,
          dueDate: row.rentDue || PERIOD_END,
          status: 'pending',
          notes: `UNPAID ${type} bill — ${row.room}`,
        });
        if (pay.created) payments += 1;
        else skipped += 1;
      }
    }

    if (row.vacant || !assignment) continue;

    // Rent payment
    if (row.rentPaid != null && row.rentPaid > 0 && row.rentPaidOn) {
      const pay = await insertPayment({
        tenantId: assignment.tenant_id,
        assignmentId: assignment.assignment_id,
        roomId: room.id,
        amount: row.rentPaid,
        paymentType: 'rent',
        paymentDate: row.rentPaidOn,
        dueDate: row.rentDue || row.rentPaidOn,
        status: 'paid',
        notes: `Rent — ${row.room}${row.notes ? ` (${row.notes})` : ''}`,
      });
      if (pay.created) payments += 1;
      else skipped += 1;
    }

    // New-tenant advance / deposit / utility deposit
    if (row.advance || row.deposit || row.utilityDeposit) {
      const paidOn = row.depositPaidOn || PERIOD_END;
      await client.query(
        `UPDATE tenant_room_assignments
         SET deposit_paid = COALESCE($1, deposit_paid),
             advance_paid = COALESCE($2, advance_paid),
             utility_deposit_paid = COALESCE($3, utility_deposit_paid),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          row.deposit ?? null,
          row.advance ?? null,
          row.utilityDeposit ?? null,
          assignment.assignment_id,
        ]
      );
      depositsUpdated += 1;

      if (row.advance) {
        const pay = await insertPayment({
          tenantId: assignment.tenant_id,
          assignmentId: assignment.assignment_id,
          roomId: room.id,
          amount: row.advance,
          paymentType: 'advance',
          paymentDate: paidOn,
          dueDate: paidOn,
          status: 'paid',
          notes: `1-month advance — ${row.room}`,
        });
        if (pay.created) payments += 1;
        else skipped += 1;
      }
      if (row.deposit) {
        const pay = await insertPayment({
          tenantId: assignment.tenant_id,
          assignmentId: assignment.assignment_id,
          roomId: room.id,
          amount: row.deposit,
          paymentType: 'deposit',
          paymentDate: paidOn,
          dueDate: paidOn,
          status: 'paid',
          notes: `Security deposit — ${row.room}`,
        });
        if (pay.created) payments += 1;
        else skipped += 1;
      }
      if (row.utilityDeposit) {
        const pay = await insertPayment({
          tenantId: assignment.tenant_id,
          assignmentId: assignment.assignment_id,
          roomId: room.id,
          amount: row.utilityDeposit,
          paymentType: 'deposit',
          paymentDate: paidOn,
          dueDate: paidOn,
          status: 'paid',
          notes: `Utility deposit — ${row.room}`,
        });
        if (pay.created) payments += 1;
        else skipped += 1;
      }
    }

    console.log(
      `  ${row.room.padEnd(10)} tenant=${assignment.tenant_id.slice(0, 8)}… ` +
        `rent=${row.rentPaid ?? '-'} elec=${row.electric ?? '-'} water=${row.water ?? '-'}`
    );
  }

  console.log(
    `  → payments+${payments}, utilities+${utilities}, depositsUpdated=${depositsUpdated}, skipped=${skipped}`
  );
}

async function insertHardwareCheque() {
  const building = await findBuilding('%apartment-1%');
  if (!building) return { skipped: true, reason: 'no building' };
  const room = await findRoom(building.id, 'Store');
  if (!room) return { skipped: true, reason: 'no store' };
  const assignment = await findActiveAssignment(room.id);
  if (!assignment) return { skipped: true, reason: 'no tenant' };

  const exists = await client.query(
    `SELECT id FROM payments
     WHERE tenant_id = $1 AND amount = 25000
       AND LOWER(COALESCE(payment_method,'')) IN ('cheque','check')
       AND payment_date = '2026-07-15'::date
       AND notes ILIKE $2
     LIMIT 1`,
    [assignment.tenant_id, `%${NOTE_TAG}%`]
  );
  if (exists.rows.length) return { skipped: true };

  await client.query(
    `INSERT INTO payments (
       tenant_id, assignment_id, room_id, amount, payment_type, payment_method,
       payment_date, due_date, payment_status, notes
     ) VALUES ($1,$2,$3,25000,'rent','cheque','2026-07-15'::date,'2026-07-15'::date,'paid',$4)`,
    [
      assignment.tenant_id,
      assignment.assignment_id,
      room.id,
      `Hardware Rental Fee July 15 Cheq [${NOTE_TAG}]`,
    ]
  );
  return { created: true };
}

try {
  await importBuilding('APT1', '%apartment-1%', APT1);
  await importBuilding('APT2', '%villasol%', APT2);
  const cheque = await insertHardwareCheque();
  console.log(
    cheque.created
      ? 'Hardware rental cheque ₱25000 recorded.'
      : `Hardware rental cheque skipped (${cheque.reason || 'already exists'}).`
  );
  await allocateExcelLedgerToAugustInvoices(client);
  console.log('\nLedger import complete.');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
