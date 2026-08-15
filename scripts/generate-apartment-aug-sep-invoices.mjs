#!/usr/bin/env node
/**
 * Create August 2026 (this month, sent) + September 2026 (next month, draft)
 * rent invoices for APARTMENT-1 and APRTMENT-2 active tenants.
 *
 * Amounts and due days come from the Jun 16–Jul 15 Excel ledger
 * (same figures as scripts/seed-apartment-ledgers.mjs).
 *
 * Does NOT generate a full lease year. Idempotent per tenant + billing month.
 * After invoices exist, allocates Excel ledger rent/advance cash onto August invoices.
 *
 * Usage: node scripts/generate-apartment-aug-sep-invoices.mjs
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

/** Excel monthly rent + due day-of-month (from rentDue / new-tenant dates). */
const APT1_EXCEL = {
  'Unit 1': { rent: 4800, dueDay: 15 },
  'Unit 2': { rent: 4800, dueDay: 8 },
  'Unit 3': { rent: 4800, dueDay: 13 },
  'Unit 4': { rent: 4800, dueDay: 28 },
  'Unit 6': { rent: 4800, dueDay: 1 },
  'Unit 7': { rent: 4800, dueDay: 22 },
  'Unit 10': { rent: 4800, dueDay: 1 },
  'Unit 11': { rent: 4800, dueDay: 8 },
  'Unit 12': { rent: 4800, dueDay: 8 },
  'Unit 13': { rent: 4800, dueDay: 23 },
  'Unit 14': { rent: 4800, dueDay: 23 },
  'Unit 15': { rent: 4800, dueDay: 17 },
  'Unit 16': { rent: 4800, dueDay: 4 },
  'Unit 17': { rent: 4800, dueDay: 18 },
  'Unit 18': { rent: 4800, dueDay: 4 },
  'Unit 19': { rent: 4800, dueDay: 29 },
  'Unit 20': { rent: 4800, dueDay: 5 },
  'Unit 21': { rent: 4800, dueDay: 8 },
  'Unit 22': { rent: 4800, dueDay: 6 },
  'Unit 23': { rent: 4800, dueDay: 30 },
  'Unit 24': { rent: 4800, dueDay: 19 },
  'Unit 25': { rent: 4800, dueDay: 22 },
  'Unit 26': { rent: 4800, dueDay: 17 },
  'Unit 27': { rent: 4800, dueDay: 4 },
  'Unit 29': { rent: 4800, dueDay: 29 },
  Store: { rent: 3500, dueDay: 8 },
};

const APT2_EXCEL = {
  'Unit 1': { rent: 6000, dueDay: 18 },
  'Unit 2': { rent: 6000, dueDay: 27 },
  'Unit 4': { rent: 6000, dueDay: 26 },
  'Unit 5': { rent: 6000, dueDay: 18 },
  'Unit 6': { rent: 6000, dueDay: 24 },
  'Unit 7': { rent: 6000, dueDay: 17 },
  'Unit 9': { rent: 6000, dueDay: 28 },
  'Unit 10': { rent: 8000, dueDay: 14 },
};

const BUILDINGS = [
  { label: 'APARTMENT-1', pattern: '%apartment-1%', excel: APT1_EXCEL },
  { label: 'APRTMENT-2', pattern: '%aprtment-2%', excel: APT2_EXCEL },
];

const MONTHS = [
  {
    key: '2026-08',
    year: 2026,
    monthIndex: 7,
    label: 'August 2026',
    status: 'sent',
    issueDay: 1,
  },
  {
    key: '2026-09',
    year: 2026,
    monthIndex: 8,
    label: 'September 2026',
    status: 'draft',
    issueDay: 1,
  },
];

const NOTE_TAG = 'excel-ledger-rent:2026-08+09';

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

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isoDate(year, monthIndex, day) {
  const capped = Math.min(Math.max(1, day), lastDayOfMonth(year, monthIndex));
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(capped).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function slugUnit(roomNumber) {
  return String(roomNumber)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function excelGrandTotal(excel) {
  return Object.values(excel).reduce((sum, row) => sum + row.rent, 0);
}

await client.connect();

try {
  const expected = {
    'APARTMENT-1': excelGrandTotal(APT1_EXCEL),
    'APRTMENT-2': excelGrandTotal(APT2_EXCEL),
  };
  expected.ALL = expected['APARTMENT-1'] + expected['APRTMENT-2'];

  console.log('Excel monthly rent roll (occupied units in ledger):');
  console.log(`  Apt 1: ₱${expected['APARTMENT-1'].toLocaleString()}`);
  console.log(`  Apt 2: ₱${expected['APRTMENT-2'].toLocaleString()}`);
  console.log(`  Combined: ₱${expected.ALL.toLocaleString()}\n`);

  const createdByBuilding = {};
  let created = 0;
  let skipped = 0;

  for (const buildingDef of BUILDINGS) {
    const bRes = await client.query(
      `SELECT id, name FROM buildings
       WHERE is_active = true AND lower(trim(name)) LIKE $1
       ORDER BY name LIMIT 1`,
      [buildingDef.pattern]
    );
    if (!bRes.rows[0]) {
      console.error(`Building not found: ${buildingDef.label}`);
      continue;
    }
    const building = bRes.rows[0];
    createdByBuilding[buildingDef.label] = { aug: 0, sep: 0, tenants: 0 };

    const tenants = await client.query(
      `SELECT
         t.id AS tenant_id,
         t.first_name || ' ' || t.last_name AS tenant_name,
         r.id AS room_id,
         r.room_number,
         tra.monthly_rate
       FROM tenant_room_assignments tra
       JOIN tenants t ON t.id = tra.tenant_id
       JOIN rooms r ON r.id = tra.room_id
       WHERE r.building_id = $1
         AND tra.assignment_status = 'active'
         AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
       ORDER BY r.room_number`,
      [building.id]
    );

    createdByBuilding[buildingDef.label].tenants = tenants.rows.length;
    console.log(`==== ${building.name.trim()} (${tenants.rows.length} tenants) ====`);

    for (const tenant of tenants.rows) {
      const excel = buildingDef.excel[tenant.room_number];
      const rent = Number(excel?.rent ?? tenant.monthly_rate);
      const dueDay = excel?.dueDay ?? 5;
      const rateMismatch =
        excel && Number(tenant.monthly_rate) !== excel.rent
          ? ` (assignment rate ₱${Number(tenant.monthly_rate)} vs excel ₱${excel.rent} — using excel)`
          : '';

      if (!excel) {
        console.warn(
          `  ${tenant.room_number}: no Excel row — using assignment rate ₱${rent}`
        );
      }

      for (const month of MONTHS) {
        const existing = await client.query(
          `SELECT i.id
           FROM invoices i
           INNER JOIN invoice_line_items ili
             ON ili.invoice_id = i.id AND ili.item_type = 'rent'
           WHERE i.tenant_id = $1
             AND i.invoice_status <> 'cancelled'
             AND TO_CHAR(COALESCE(i.billing_period_start, i.due_date, i.issue_date), 'YYYY-MM') = $2
           LIMIT 1`,
          [tenant.tenant_id, month.key]
        );
        if (existing.rows.length > 0) {
          skipped += 1;
          continue;
        }

        const issueDate = isoDate(month.year, month.monthIndex, month.issueDay);
        const dueDate = isoDate(month.year, month.monthIndex, dueDay);
        const periodStart = isoDate(month.year, month.monthIndex, 1);
        const periodEnd = isoDate(
          month.year,
          month.monthIndex,
          lastDayOfMonth(month.year, month.monthIndex)
        );
        const invoiceNumber = `INV-${buildingDef.label === 'APARTMENT-1' ? 'A1' : 'A2'}-${slugUnit(tenant.room_number)}-${month.key.replace('-', '')}`;

        await client.query('BEGIN');
        try {
          const inv = await client.query(
            `INSERT INTO invoices (
               tenant_id, invoice_number, issue_date, due_date,
               billing_period_start, billing_period_end,
               subtotal, tax_amount, total_amount, amount_paid,
               invoice_status, bill_status, notes
             ) VALUES (
               $1, $2, $3::date, $4::date, $5::date, $6::date,
               $7, 0, $7, 0, $8, 'UNPAID', $9
             )
             RETURNING id`,
            [
              tenant.tenant_id,
              invoiceNumber,
              issueDate,
              dueDate,
              periodStart,
              periodEnd,
              rent,
              month.status,
              `Monthly rent ${month.label} · ${building.name.trim()} ${tenant.room_number} [${NOTE_TAG}]`,
            ]
          );
          await client.query(
            `INSERT INTO invoice_line_items (
               invoice_id, description, quantity, unit_price, item_type
             ) VALUES ($1, $2, 1, $3, 'rent')`,
            [
              inv.rows[0].id,
              `Monthly Rent - ${month.label}`,
              rent,
            ]
          );
          await client.query('COMMIT');
          created += 1;
          if (month.key === '2026-08') createdByBuilding[buildingDef.label].aug += rent;
          if (month.key === '2026-09') createdByBuilding[buildingDef.label].sep += rent;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      if (excel) {
        console.log(
          `  ${tenant.room_number.padEnd(8)} ${tenant.tenant_name.padEnd(18)} ₱${rent.toLocaleString()} due day ${dueDay}${rateMismatch}`
        );
      }
    }
  }

  console.log('\n==== Grand totals (August invoices created this run) ====');
  for (const label of Object.keys(createdByBuilding)) {
    const row = createdByBuilding[label];
    const exp = expected[label];
    const match = row.aug === exp ? 'MATCH' : `DIFF ${row.aug - exp}`;
    console.log(
      `  ${label}: Aug ₱${row.aug.toLocaleString()}  Sep ₱${row.sep.toLocaleString()}  Excel ₱${exp.toLocaleString()}  ${match}`
    );
  }
  const augAll = Object.values(createdByBuilding).reduce((s, r) => s + r.aug, 0);
  const sepAll = Object.values(createdByBuilding).reduce((s, r) => s + r.sep, 0);
  console.log(
    `  Combined: Aug ₱${augAll.toLocaleString()}  Sep ₱${sepAll.toLocaleString()}  Excel ₱${expected.ALL.toLocaleString()}  ${
      augAll === expected.ALL ? 'MATCH' : `DIFF ${augAll - expected.ALL}`
    }`
  );
  console.log(`\nCreated ${created} invoices, skipped ${skipped} existing.`);
  await allocateExcelLedgerToAugustInvoices(client);
} finally {
  await client.end();
}
