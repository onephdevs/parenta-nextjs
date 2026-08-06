#!/usr/bin/env node
/**
 * Import monthly operating expenses (Jun 16 – Jul 15 2026)
 * for APARTMENT-1 BALIBAGO and APRTMENT-2 VILLASOL.
 *
 * Usage: node scripts/seed-apartment-expenses.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const NOTE_TAG = 'ledger-exp:2026-06-16:2026-07-15';
const DEFAULT_DATE = '2026-06-30';

/**
 * @typedef {{
 *   date?: string,
 *   description: string,
 *   amount: number,
 *   category: string,
 *   building?: 'apt1'|'apt2'|'both'|null,
 *   room?: string|null,
 *   vendor?: string|null,
 * }} ExpenseRow
 */

/** @type {ExpenseRow[]} */
const EXPENSES = [
  // Cleaning & maintenance (shared) — 5 weeks
  {
    date: '2026-06-16',
    description: 'Cleaning & Maintenance Villasol & Balibago',
    amount: 600,
    category: 'cleaning',
    building: 'both',
  },
  {
    date: '2026-06-22',
    description: 'Cleaning & Maintenance Villasol & Balibago',
    amount: 600,
    category: 'cleaning',
    building: 'both',
  },
  {
    date: '2026-06-30',
    description: 'Cleaning & Maintenance Villasol & Balibago',
    amount: 600,
    category: 'cleaning',
    building: 'both',
  },
  {
    date: '2026-07-07',
    description: 'Cleaning & Maintenance Villasol & Balibago',
    amount: 600,
    category: 'cleaning',
    building: 'both',
  },
  {
    date: '2026-07-15',
    description: 'Cleaning & Maintenance Villasol & Balibago',
    amount: 600,
    category: 'cleaning',
    building: 'both',
  },

  {
    date: '2026-06-30',
    description: 'Garbage Collector month of June Balibago',
    amount: 1500,
    category: 'garbage_collection',
    building: 'apt1',
    vendor: 'Garbage collector',
  },
  {
    date: '2026-06-30',
    description: 'Garbage Collector month of June Villasol',
    amount: 1000,
    category: 'garbage_collection',
    building: 'apt2',
    vendor: 'Garbage collector',
  },
  {
    date: '2026-06-30',
    description: 'Food Allowance for Cleaner and Me',
    amount: 1000,
    category: 'other',
    building: 'both',
  },
  {
    date: '2026-06-30',
    description: 'Pick Up Diesel for apartment maintenance',
    amount: 5000,
    category: 'maintenance',
    building: 'both',
    vendor: 'Diesel',
  },
  {
    date: '2026-06-30',
    description: 'Electric Bill Aprt-1 Balibago - June',
    amount: 32046,
    category: 'utilities',
    building: 'apt1',
    vendor: 'Electric utility',
  },
  {
    date: '2026-06-30',
    description: 'Electric Bill Aprt-2 Villasol - June',
    amount: 15435,
    category: 'utilities',
    building: 'apt2',
    vendor: 'Electric utility',
  },
  {
    date: '2026-06-30',
    description: 'Water Bill Aprt-1 Balibago - June',
    amount: 6578,
    category: 'utilities',
    building: 'apt1',
    vendor: 'Water utility',
  },
  {
    date: '2026-06-30',
    description: 'Water Bill Aprt-2 Villasol - June',
    amount: 2752,
    category: 'utilities',
    building: 'apt2',
    vendor: 'Water utility',
  },
  {
    date: '2026-06-30',
    description: 'Salary for June 2026',
    amount: 15000,
    category: 'worker_wages',
    building: 'both',
  },

  // Other expenses
  {
    date: '2026-06-30',
    description: 'Refund Aprt-1 Unit 5 moved out',
    amount: 8426,
    category: 'other',
    building: 'apt1',
    room: 'Unit 5',
  },
  {
    date: '2026-06-30',
    description: 'Surveyor Villasol',
    amount: 15000,
    category: 'services',
    building: 'apt2',
    vendor: 'Surveyor',
  },
  {
    date: '2026-06-30',
    description: 'Surveyor Lunch',
    amount: 1242,
    category: 'other',
    building: 'apt2',
  },
  {
    date: '2026-06-30',
    description: 'Secretary Food',
    amount: 1596,
    category: 'other',
    building: 'both',
  },
  {
    date: '2026-06-30',
    description: '2pcs PVC',
    amount: 230,
    category: 'supplies',
    building: 'both',
  },
  {
    date: '2026-06-30',
    description: '3pcs Bulb',
    amount: 268,
    category: 'supplies',
    building: 'both',
  },
  {
    date: '2026-06-30',
    description: '1pc Gripo',
    amount: 280,
    category: 'supplies',
    building: 'both',
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
  if (!buildingId || !roomNumber) return null;
  const res = await client.query(
    `SELECT id FROM rooms
     WHERE building_id = $1 AND is_active = true AND lower(room_number) = lower($2)
     LIMIT 1`,
    [buildingId, roomNumber]
  );
  return res.rows[0] || null;
}

async function exists(description, expenseDate, amount) {
  const res = await client.query(
    `SELECT id FROM expenses
     WHERE description = $1
       AND expense_date = $2::date
       AND amount = $3
       AND notes ILIKE $4
     LIMIT 1`,
    [description, expenseDate, amount, `%${NOTE_TAG}%`]
  );
  return res.rows.length > 0;
}

/**
 * @param {ExpenseRow} row
 * @param {string|null} buildingId
 * @param {string|null} roomId
 * @param {string} description
 * @param {number} amount
 */
async function insertExpense(row, buildingId, roomId, description, amount) {
  const expenseDate = row.date || DEFAULT_DATE;
  if (await exists(description, expenseDate, amount)) {
    return 'skipped';
  }

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
      amount,
      expenseDate,
      row.vendor || null,
      `Monthly expenses Jun 16–Jul 15 [${NOTE_TAG}]`,
    ]
  );
  return 'created';
}

try {
  const apt1 = await findBuilding('%apartment-1%');
  const apt2 = await findBuilding('%villasol%');
  if (!apt1 || !apt2) {
    throw new Error(`Buildings missing: apt1=${!!apt1} apt2=${!!apt2}`);
  }
  console.log('Apt1:', apt1.name.trim());
  console.log('Apt2:', apt2.name.trim());

  let created = 0;
  let skipped = 0;

  for (const row of EXPENSES) {
    const targets =
      row.building === 'apt1'
        ? [{ id: apt1.id, label: 'Apt1' }]
        : row.building === 'apt2'
          ? [{ id: apt2.id, label: 'Apt2' }]
          : row.building === 'both'
            ? [
                // Shared costs recorded once under Apt1 with note, amount full
                // (keeps total spend correct without double-counting)
                { id: apt1.id, label: 'shared→Apt1' },
              ]
            : [{ id: null, label: 'unassigned' }];

    for (const target of targets) {
      const room = row.room ? await findRoom(target.id, row.room) : null;
      const description =
        row.building === 'both'
          ? `${row.description} (shared Balibago & Villasol)`
          : row.description;

      const result = await insertExpense(
        row,
        target.id,
        room?.id || null,
        description,
        row.amount
      );
      if (result === 'created') {
        created += 1;
        console.log(`  + ${row.date || DEFAULT_DATE} ₱${row.amount} ${description}`);
      } else {
        skipped += 1;
      }
    }
  }

  console.log(`\nDone. created=${created} skipped=${skipped}`);
  const sum = await client.query(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(amount),0)::float AS total
     FROM expenses WHERE notes ILIKE $1`,
    [`%${NOTE_TAG}%`]
  );
  console.log('Ledger expenses in DB:', sum.rows[0]);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
