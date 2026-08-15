#!/usr/bin/env node
/**
 * Cross-check APARTMENT-1 / APRTMENT-2 against the Jun 16–Jul 15 Excel ledger.
 * Exit 0 only when occupancy, July waterfall / grand total, Aug/Sep invoices,
 * paid allocations, hub Paid filter, payment-board stages, unpaid utilities,
 * module coverage (contacts, activity, task cards), and leftover Dev Test
 * checks all pass.
 *
 * Usage: node scripts/verify-excel-ledger-sync.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const INVOICE_TAG = 'excel-ledger-rent:2026-08+09';
const LEDGER_TAG = 'ledger:2026-06-16:2026-07-15';
const EXP_TAG = 'ledger-exp:2026-06-16:2026-07-15';
const PERIOD_START = '2026-06-16';
const PERIOD_END = '2026-07-15';

/** July cycle (Jun 16–Jul 15) Excel waterfall — tenant cash only; vacant meters are expenses. */
const JULY_WATERFALL = {
  rent: 149300,
  advance: 17600,
  deposit: 32200,
  utility: 50823,
  collection: 249923,
  expenses: 110353,
  ima: 20000,
  cheque: 25000,
  grandTotal: 144570,
};

const APT1_EXCEL = {
  'Unit 1': { rent: 4800, dueDay: 15, cash: 4800 },
  'Unit 2': { rent: 4800, dueDay: 8, cash: 4800 },
  'Unit 3': { rent: 4800, dueDay: 13, cash: 4800 },
  'Unit 4': { rent: 4800, dueDay: 28, cash: 4800 },
  'Unit 6': { rent: 4800, dueDay: 1, cash: 4800 },
  'Unit 7': { rent: 4800, dueDay: 22, cash: 3000 },
  'Unit 10': { rent: 4800, dueDay: 1, cash: 4800 },
  'Unit 11': { rent: 4800, dueDay: 8, cash: 4800 },
  'Unit 12': { rent: 4800, dueDay: 8, cash: 4800 },
  'Unit 13': { rent: 4800, dueDay: 23, cash: 4800 },
  'Unit 14': { rent: 4800, dueDay: 23, cash: 4800 },
  'Unit 15': { rent: 4800, dueDay: 17, cash: 4800 },
  'Unit 16': { rent: 4800, dueDay: 4, cash: 4800 },
  'Unit 17': { rent: 4800, dueDay: 18, cash: 4800 },
  'Unit 18': { rent: 4800, dueDay: 4, cash: 4800 },
  'Unit 19': { rent: 4800, dueDay: 29, cash: 4800 },
  'Unit 20': { rent: 4800, dueDay: 5, cash: 4800 },
  'Unit 21': { rent: 4800, dueDay: 8, cash: 4800 },
  'Unit 22': { rent: 4800, dueDay: 6, cash: 4800 },
  'Unit 23': { rent: 4800, dueDay: 30, cash: 4800 },
  'Unit 24': { rent: 4800, dueDay: 19, cash: 4800 },
  'Unit 25': { rent: 4800, dueDay: 22, cash: 4800 },
  'Unit 26': { rent: 4800, dueDay: 17, cash: 4800 },
  'Unit 27': { rent: 4800, dueDay: 4, cash: 0 },
  'Unit 29': { rent: 4800, dueDay: 29, cash: 4800 },
  Store: { rent: 3500, dueDay: 8, cash: 3500 },
};

const APT2_EXCEL = {
  'Unit 1': { rent: 6000, dueDay: 18, cash: 6000 },
  'Unit 2': { rent: 6000, dueDay: 27, cash: 6000 },
  'Unit 4': { rent: 6000, dueDay: 26, cash: 6000 },
  'Unit 5': { rent: 6000, dueDay: 18, cash: 6000 },
  'Unit 6': { rent: 6000, dueDay: 24, cash: 6000 },
  'Unit 7': { rent: 6000, dueDay: 17, cash: 6000 },
  'Unit 9': { rent: 6000, dueDay: 28, cash: 6000 },
  'Unit 10': { rent: 8000, dueDay: 14, cash: 8000 },
};

const APT1_VACANT = ['Unit 5', 'Unit 8', 'Unit 9', 'Unit 28', 'Unit 30', 'Admin'];
const APT2_VACANT = ['Unit 3', 'Unit 8'];
const UNPAID_UTILS = [
  { room: 'Unit 26', type: 'electricity', amount: 2590 },
  { room: 'Unit 27', type: 'water', amount: 194 },
  { room: 'Unit 10', type: 'electricity', amount: 144 },
  { room: 'Unit 10', type: 'water', amount: 152 },
];

function expectedStatus(row) {
  if (row.cash <= 0) return 'unpaid';
  if (row.cash + 0.009 >= row.rent) return 'paid';
  return 'partial';
}

const checks = [];
function check(ok, msg) {
  checks.push({ ok: Boolean(ok), msg });
}

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

try {
  const buildings = await client.query(
    `SELECT id, name, is_active FROM buildings ORDER BY name`
  );
  const names = buildings.rows.map(
    (r) => `${r.is_active ? 'active' : 'inactive'}:${String(r.name).trim()}`
  );
  check(
    !buildings.rows.some((r) => /dev test/i.test(r.name)),
    `No Dev Test building (${names.join(' | ')})`
  );

  const leftoverDev = await client.query(`
    SELECT 'tenants' k, COUNT(*)::int n FROM tenants
      WHERE email ILIKE ANY(ARRAY['dev@email.com','dev2@email.com','est@test.com'])
    UNION ALL SELECT 'users', COUNT(*)::int FROM users
      WHERE email ILIKE ANY(ARRAY['dev@email.com','dev2@email.com','est@test.com']) AND role = 'tenant'
    UNION ALL SELECT 'invoices', COUNT(*)::int FROM invoices
      WHERE invoice_number ILIKE 'INV-178%'
    UNION ALL SELECT 'rooms 4a', COUNT(*)::int FROM rooms
      WHERE lower(room_number) = '4a'
  `);
  for (const row of leftoverDev.rows) {
    check(row.n === 0, `Leftover Dev ${row.k}=${row.n} (expect 0)`);
  }

  async function loadBuilding(pattern) {
    const res = await client.query(
      `SELECT id, name FROM buildings
       WHERE COALESCE(is_active, true) = true AND lower(trim(name)) LIKE $1
       ORDER BY name LIMIT 1`,
      [pattern]
    );
    return res.rows[0] || null;
  }

  const apt1 = await loadBuilding('%apartment-1%');
  const apt2 = await loadBuilding('%aprtment-2%');
  check(!!apt1, 'Apt 1 building exists');
  check(!!apt2, 'Apt 2 building exists');
  if (!apt1 || !apt2) throw new Error('Required buildings missing');

  async function occupancy(buildingId) {
    return client.query(
      `SELECT r.room_number,
              CASE WHEN tra.id IS NULL THEN 'vacant' ELSE 'occupied' END AS occ
       FROM rooms r
       LEFT JOIN LATERAL (
         SELECT tra.id FROM tenant_room_assignments tra
         WHERE tra.room_id = r.id AND tra.assignment_status = 'active'
           AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
         ORDER BY tra.start_date DESC LIMIT 1
       ) tra ON true
       WHERE r.building_id = $1 AND COALESCE(r.is_active, true) = true
       ORDER BY r.room_number`,
      [buildingId]
    );
  }

  async function invoicesFor(buildingId, yyyymm) {
    return client.query(
      `SELECT r.room_number,
              i.invoice_status,
              i.bill_status,
              i.total_amount::float AS total,
              i.amount_paid::float AS paid,
              EXTRACT(DAY FROM i.due_date)::int AS due_day,
              COALESCE((
                SELECT SUM(pa.allocated_amount)::float
                FROM payment_allocations pa WHERE pa.invoice_id = i.id
              ), 0) AS allocated
       FROM invoices i
       JOIN tenant_room_assignments tra
         ON tra.tenant_id = i.tenant_id AND tra.assignment_status = 'active'
       JOIN rooms r ON r.id = tra.room_id
       WHERE r.building_id = $1
         AND i.invoice_status IS DISTINCT FROM 'cancelled'
         AND i.notes ILIKE $2
         AND TO_CHAR(COALESCE(i.billing_period_start, i.due_date), 'YYYY-MM') = $3
       ORDER BY r.room_number`,
      [buildingId, `%${INVOICE_TAG}%`, yyyymm]
    );
  }

  function crossBuilding(label, excel, vacant, occRows, augRows, sepRows) {
    const occ = new Map(occRows.map((r) => [r.room_number, r]));
    const aug = new Map(augRows.map((r) => [r.room_number, r]));
    const sep = new Map(sepRows.map((r) => [r.room_number, r]));
    const excelRooms = Object.keys(excel);
    const occupiedN = occRows.filter((r) => r.occ === 'occupied').length;
    check(
      occupiedN === excelRooms.length,
      `${label} occupied ${occupiedN} vs excel ${excelRooms.length}`
    );
    check(
      augRows.length === excelRooms.length,
      `${label} Aug invoices ${augRows.length} vs excel ${excelRooms.length}`
    );
    check(
      sepRows.length === excelRooms.length,
      `${label} Sep invoices ${sepRows.length} vs excel ${excelRooms.length}`
    );

    let paidN = 0;
    let partialN = 0;
    let unpaidN = 0;
    let paidAmt = 0;
    let roll = 0;

    for (const room of excelRooms) {
      const exp = excel[room];
      roll += exp.rent;
      const o = occ.get(room);
      check(!!o && o.occ === 'occupied', `${label} ${room} occupied in DB`);
      const a = aug.get(room);
      const s = sep.get(room);
      check(!!a, `${label} ${room} has August invoice`);
      check(!!s, `${label} ${room} has September invoice`);
      if (!a || !s) continue;
      check(
        Math.abs(a.total - exp.rent) < 0.01,
        `${label} ${room} Aug amount ${a.total} vs excel ${exp.rent}`
      );
      check(
        a.due_day === exp.dueDay,
        `${label} ${room} Aug due day ${a.due_day} vs excel ${exp.dueDay}`
      );
      const st = expectedStatus(exp);
      const actualSt =
        a.paid <= 0.009 ? 'unpaid' : a.paid + 0.009 >= a.total ? 'paid' : 'partial';
      check(
        actualSt === st,
        `${label} ${room} Aug status ${actualSt} (paid ${a.paid}/${a.total}) vs excel ${st} cash ${exp.cash}`
      );
      if (st === 'paid') {
        check(
          String(a.invoice_status) === 'paid' && String(a.bill_status) === 'PAID',
          `${label} ${room} invoice_status=${a.invoice_status} bill_status=${a.bill_status}`
        );
        paidN += 1;
        paidAmt += a.paid;
      } else if (st === 'partial') {
        check(
          Math.abs(a.paid - exp.cash) < 0.01,
          `${label} ${room} partial paid ${a.paid} vs ${exp.cash}`
        );
        check(String(a.invoice_status) === 'partial', `${label} ${room} status ${a.invoice_status}`);
        partialN += 1;
        paidAmt += a.paid;
      } else {
        check(a.paid <= 0.009, `${label} ${room} unpaid paid=${a.paid}`);
        unpaidN += 1;
      }
      check(
        String(s.invoice_status) === 'draft' && s.paid <= 0.009,
        `${label} ${room} Sep still draft unpaid (${s.invoice_status} paid=${s.paid})`
      );
      check(
        Math.abs(s.total - exp.rent) < 0.01,
        `${label} ${room} Sep amount ${s.total} vs ${exp.rent}`
      );
    }

    for (const room of vacant) {
      const o = occ.get(room);
      if (o) check(o.occ === 'vacant', `${label} ${room} vacant`);
      check(!aug.has(room), `${label} vacant ${room} has no Aug invoice`);
    }

    return { paidN, partialN, unpaidN, paidAmt, roll, occupiedN, aug: augRows.length, sep: sepRows.length };
  }

  const a1occ = await occupancy(apt1.id);
  const a2occ = await occupancy(apt2.id);
  const a1aug = await invoicesFor(apt1.id, '2026-08');
  const a1sep = await invoicesFor(apt1.id, '2026-09');
  const a2aug = await invoicesFor(apt2.id, '2026-08');
  const a2sep = await invoicesFor(apt2.id, '2026-09');

  const s1 = crossBuilding('Apt1', APT1_EXCEL, APT1_VACANT, a1occ.rows, a1aug.rows, a1sep.rows);
  const s2 = crossBuilding('Apt2', APT2_EXCEL, APT2_VACANT, a2occ.rows, a2aug.rows, a2sep.rows);

  check(s1.roll === 123500, `Apt1 roll ${s1.roll} vs 123500`);
  check(s2.roll === 50000, `Apt2 roll ${s2.roll} vs 50000`);
  check(s1.paidN + s2.paidN === 32, `Paid invoices ${s1.paidN + s2.paidN} vs 32`);
  check(s1.partialN + s2.partialN === 1, `Partial invoices ${s1.partialN + s2.partialN} vs 1`);
  check(s1.unpaidN + s2.unpaidN === 1, `Unpaid invoices ${s1.unpaidN + s2.unpaidN} vs 1`);
  check(
    Math.abs(s1.paidAmt + s2.paidAmt - 166900) < 0.01,
    `Allocated cash ${s1.paidAmt + s2.paidAmt} vs 166900`
  );

  const APT_BUILDING = `(b.name ILIKE '%apartment-1%' OR b.name ILIKE '%aprtment-2%' OR b.name ILIKE '%villasol%')`;
  const PAID_CASH = `p.payment_status IN ('paid', 'completed', 'confirmed')
      AND LOWER(COALESCE(p.payment_method, 'cash')) NOT IN ('cheque', 'check')`;
  const byType = await client.query(
    `SELECT p.payment_type, COALESCE(SUM(p.amount), 0)::float AS amt, COUNT(*)::int AS n
     FROM payments p
     LEFT JOIN rooms r ON r.id = p.room_id
     LEFT JOIN buildings b ON b.id = r.building_id
     WHERE p.payment_date BETWEEN $1::date AND $2::date
       AND ${PAID_CASH}
       AND (${APT_BUILDING} OR p.notes ILIKE $3)
     GROUP BY 1`,
    [PERIOD_START, PERIOD_END, `%${LEDGER_TAG}%`]
  );
  const typeAmt = Object.fromEntries(byType.rows.map((r) => [r.payment_type, r.amt]));
  check(
    Math.abs((typeAmt.rent || 0) - JULY_WATERFALL.rent) < 0.01,
    `July rent cash ${typeAmt.rent || 0} vs ${JULY_WATERFALL.rent}`
  );
  check(
    Math.abs((typeAmt.advance || 0) - JULY_WATERFALL.advance) < 0.01,
    `July advance ${typeAmt.advance || 0} vs ${JULY_WATERFALL.advance}`
  );
  check(
    Math.abs((typeAmt.deposit || 0) - JULY_WATERFALL.deposit) < 0.01,
    `July deposit ${typeAmt.deposit || 0} vs ${JULY_WATERFALL.deposit}`
  );
  check(
    Math.abs((typeAmt.utility || 0) - JULY_WATERFALL.utility) < 0.01,
    `July paid utilities ${typeAmt.utility || 0} vs ${JULY_WATERFALL.utility}`
  );

  const wf = await client.query(
    `SELECT
       (
         SELECT COALESCE(SUM(p.amount), 0)
         FROM payments p
         LEFT JOIN rooms r ON r.id = p.room_id
         LEFT JOIN buildings b ON b.id = r.building_id
         WHERE p.payment_date BETWEEN $1::date AND $2::date
           AND ${PAID_CASH}
           AND (${APT_BUILDING} OR p.notes ILIKE $3)
       )::float AS collection,
       (
         SELECT COALESCE(SUM(e.amount), 0)
         FROM expenses e
         WHERE e.expense_date BETWEEN $1::date AND $2::date
           AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
           AND COALESCE(e.category, 'other') NOT IN ('cash_allowance', 'owner_draw')
           AND e.notes ILIKE $4
       )::float AS expenses,
       (
         SELECT COALESCE(SUM(e.amount), 0)
         FROM expenses e
         WHERE e.expense_date BETWEEN $1::date AND $2::date
           AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
           AND COALESCE(e.category, 'other') IN ('cash_allowance', 'owner_draw')
       )::float AS ima,
       (
         SELECT COALESCE(SUM(p.amount), 0)
         FROM payments p
         WHERE p.payment_date BETWEEN $1::date AND $2::date
           AND p.payment_status IN ('paid', 'completed', 'confirmed')
           AND LOWER(COALESCE(p.payment_method, '')) IN ('cheque', 'check')
       )::float AS cheque`,
    [PERIOD_START, PERIOD_END, `%${LEDGER_TAG}%`, `%${EXP_TAG}%`]
  );
  const waterfall = wf.rows[0];
  const afterExpenses = waterfall.collection - waterfall.expenses;
  const cashForDeposit = afterExpenses - waterfall.ima;
  const grandTotal = cashForDeposit + waterfall.cheque;
  check(
    Math.abs(waterfall.collection - JULY_WATERFALL.collection) < 0.01,
    `July collection ${waterfall.collection} vs ${JULY_WATERFALL.collection}`
  );
  check(
    Math.abs(waterfall.expenses - JULY_WATERFALL.expenses) < 0.01,
    `July expenses ${waterfall.expenses} vs ${JULY_WATERFALL.expenses}`
  );
  check(
    Math.abs(waterfall.ima - JULY_WATERFALL.ima) < 0.01,
    `July Ima cash allowance ${waterfall.ima} vs ${JULY_WATERFALL.ima}`
  );
  check(
    Math.abs(waterfall.cheque - JULY_WATERFALL.cheque) < 0.01,
    `July hardware cheque ${waterfall.cheque} vs ${JULY_WATERFALL.cheque}`
  );
  check(
    Math.abs(grandTotal - JULY_WATERFALL.grandTotal) < 0.01,
    `July grand total ${grandTotal} vs ${JULY_WATERFALL.grandTotal}`
  );

  const pendingClaims = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM payments p
     LEFT JOIN rooms r ON r.id = p.room_id
     LEFT JOIN buildings b ON b.id = r.building_id
     WHERE p.payment_status = 'pending'
       AND (${APT_BUILDING} OR p.notes ILIKE $1)`,
    [`%${LEDGER_TAG}%`]
  );
  check(
    pendingClaims.rows[0].n === 0,
    `Apt 1/2 pending payment claims ${pendingClaims.rows[0].n} vs 0 (ledger cash is already paid; no GCash ref required)`
  );

  const hubPaid = await client.query(`
    WITH unit AS (
      SELECT tra.tenant_id, b.name AS building_name
      FROM tenant_room_assignments tra
      JOIN rooms r ON r.id = tra.room_id
      JOIN buildings b ON b.id = r.building_id
      WHERE tra.assignment_status = 'active'
    )
    SELECT COUNT(*)::int AS n,
           COALESCE(SUM(i.total_amount), 0)::float AS total,
           string_agg(DISTINCT trim(unit.building_name), ' | ') AS buildings
    FROM invoices i
    LEFT JOIN unit ON unit.tenant_id = i.tenant_id
    WHERE i.invoice_status IS DISTINCT FROM 'cancelled'
      AND (i.invoice_status = 'paid'
           OR COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) <= 0.009)
      AND (
        (
          COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
          AND (i.invoice_status = 'overdue'
               OR COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE)
        )
        OR (
          COALESCE(i.negotiated_due_date, i.due_date) >= (
            SELECT date_trunc('month', COALESCE((
              SELECT MIN(COALESCE(i2.negotiated_due_date, i2.due_date)) FROM invoices i2
              WHERE i2.invoice_status IS DISTINCT FROM 'cancelled'
                AND COALESCE(i2.negotiated_due_date, i2.due_date) >= CURRENT_DATE
            ), CURRENT_DATE))::date
          )
          AND COALESCE(i.negotiated_due_date, i.due_date) < (
            SELECT (date_trunc('month', COALESCE((
              SELECT MIN(COALESCE(i2.negotiated_due_date, i2.due_date)) FROM invoices i2
              WHERE i2.invoice_status IS DISTINCT FROM 'cancelled'
                AND COALESCE(i2.negotiated_due_date, i2.due_date) >= CURRENT_DATE
            ), CURRENT_DATE)) + INTERVAL '1 month')::date
          )
        )
      )
  `);
  check(hubPaid.rows[0].n === 32, `Hub upcoming+paid count ${hubPaid.rows[0].n} vs 32`);
  check(
    !/dev test/i.test(hubPaid.rows[0].buildings || ''),
    `Hub paid buildings have no Dev Test: ${hubPaid.rows[0].buildings}`
  );

  const rentDue = await client.query(`
    SELECT COUNT(*)::int AS tenants
    FROM (
      SELECT t.id
      FROM tenants t
      JOIN invoices i ON i.tenant_id = t.id
        AND i.invoice_status IN ('sent', 'partial', 'overdue')
        AND i.balance_due > 0
      WHERE t.tenant_status = 'active' AND t.is_active = true
      GROUP BY t.id
      HAVING SUM(i.balance_due) > 0
    ) open
  `);
  check(
    rentDue.rows[0].tenants === 2,
    `Quick link rent tenants ${rentDue.rows[0].tenants} vs 2 (Unit 7 + Unit 27)`
  );

  const utils = await client.query(
    `SELECT r.room_number, ub.utility_type, ub.amount::float
     FROM utility_bills ub
     JOIN rooms r ON r.id = ub.room_id
     WHERE ub.billing_period_start = $1::date
       AND ub.billing_period_end = $2::date
       AND COALESCE(ub.bill_status, 'pending') NOT IN ('paid', 'PAID')
     ORDER BY r.room_number, ub.utility_type`,
    [PERIOD_START, PERIOD_END]
  );
  check(utils.rows.length === 4, `Unpaid utilities ${utils.rows.length} vs 4`);
  for (const expected of UNPAID_UTILS) {
    const found = utils.rows.find(
      (r) => r.room_number === expected.room && r.utility_type === expected.type
    );
    check(
      !!found && Math.abs(found.amount - expected.amount) < 0.01,
      `Unpaid util ${expected.room} ${expected.type} ${found ? found.amount : 'MISSING'} vs ${expected.amount}`
    );
  }

  const extraInv = await client.query(
    `SELECT COUNT(*)::int n FROM invoices
     WHERE invoice_status IS DISTINCT FROM 'cancelled'
       AND (notes IS NULL OR notes NOT ILIKE $1)`,
    [`%${INVOICE_TAG}%`]
  );
  check(
    extraInv.rows[0].n === 0,
    `Non-excel invoices remaining ${extraInv.rows[0].n} (expect 0)`
  );

  const moduleIds = [apt1.id, apt2.id];
  const occupiedTenants = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM tenants t
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = t.id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = ANY($1::uuid[])`,
    [moduleIds]
  );
  const occN = occupiedTenants.rows[0].n;
  check(occN === 34, `Occupied Apt 1/2 tenants ${occN} vs 34`);

  const portal = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM tenants t
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = t.id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = ANY($1::uuid[]) AND t.user_id IS NOT NULL`,
    [moduleIds]
  );
  check(portal.rows[0].n === occN, `Portal users ${portal.rows[0].n} vs occupied ${occN}`);

  const people = await client.query(
    `SELECT COUNT(DISTINCT c.tenant_id)::int AS n
     FROM contacts c
     JOIN contact_roles cr ON cr.contact_id = c.id AND cr.role = 'TENANT'
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = c.tenant_id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = ANY($1::uuid[])`,
    [moduleIds]
  );
  check(people.rows[0].n === occN, `People/contacts ${people.rows[0].n} vs occupied ${occN}`);

  const activity = await client.query(
    `SELECT COUNT(DISTINCT al.entity_id)::int AS n
     FROM activity_log al
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = al.entity_id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = ANY($1::uuid[])
       AND al.entity_type = 'tenant'`,
    [moduleIds]
  );
  check(activity.rows[0].n === occN, `Activity log ${activity.rows[0].n} vs occupied ${occN}`);

  const onboard = await client.query(
    `SELECT COUNT(DISTINCT c.tenant_id)::int AS n
     FROM pipeline_cards c
     JOIN pipeline_boards b ON b.id = c.board_id AND b.slug = 'onboarding'
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = c.tenant_id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = ANY($1::uuid[])`,
    [moduleIds]
  );
  check(onboard.rows[0].n === occN, `Onboarding cards ${onboard.rows[0].n} vs occupied ${occN}`);

  const payCards = await client.query(
    `SELECT COUNT(DISTINCT c.tenant_id)::int AS n
     FROM pipeline_cards c
     JOIN pipeline_boards b ON b.id = c.board_id AND b.slug = 'payments'
     JOIN tenant_room_assignments tra
       ON tra.tenant_id = c.tenant_id AND tra.assignment_status = 'active'
     JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = ANY($1::uuid[])`,
    [moduleIds]
  );
  check(payCards.rows[0].n === occN, `Payments cards ${payCards.rows[0].n} vs occupied ${occN}`);

  const payStages = await client.query(
    `SELECT s.slug AS stage, r.room_number, trim(b.name) AS building
     FROM pipeline_cards c
     JOIN pipeline_boards pb ON pb.id = c.board_id AND pb.slug = 'payments'
     JOIN pipeline_stages s ON s.id = c.stage_id
     JOIN rooms r ON r.id = c.room_id
     JOIN buildings b ON b.id = r.building_id
     WHERE r.building_id = ANY($1::uuid[])
       AND c.card_status IN ('open', 'won')
     ORDER BY s.slug, r.room_number`,
    [moduleIds]
  );
  const paidCards = payStages.rows.filter((r) => r.stage === 'paid');
  const chaseCards = payStages.rows.filter((r) => r.stage !== 'paid');
  const pendingVerify = payStages.rows.filter((r) => r.stage === 'pending_verification');
  check(paidCards.length === 32, `Payments board Paid ${paidCards.length} vs 32`);
  check(
    pendingVerify.length === 0,
    `Payments board pending_verification ${pendingVerify.length} vs 0 (do not chase Sep drafts or ask for GCash refs on synced cash)`
  );
  check(chaseCards.length === 2, `Payments board open chase ${chaseCards.length} vs 2`);
  const chaseRooms = chaseCards.map((r) => r.room_number).sort();
  check(
    chaseRooms.join(',') === 'Unit 27,Unit 7',
    `Payments board open units ${chaseRooms.join(', ') || 'none'} vs Unit 7 + Unit 27`
  );
  const unit7 = chaseCards.find((r) => r.room_number === 'Unit 7');
  const unit27 = chaseCards.find((r) => r.room_number === 'Unit 27');
  check(
    !!unit7 && unit7.stage !== 'paid' && unit7.stage !== 'pending_verification',
    `Unit 7 board stage ${unit7?.stage || 'MISSING'} (partial Aug rent — due/upcoming/overdue, not paid)`
  );
  check(
    !!unit27 && unit27.stage === 'overdue',
    `Unit 27 board stage ${unit27?.stage || 'MISSING'} vs overdue`
  );

  const expCards = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM pipeline_cards c
     JOIN expenses e ON e.id = c.expense_id
     WHERE e.building_id = ANY($1::uuid[])
       AND e.notes ILIKE '%ledger-exp:2026-06-16:2026-07-15%'`,
    [moduleIds]
  );
  const expRows = await client.query(
    `SELECT COUNT(*)::int AS n FROM expenses
     WHERE building_id = ANY($1::uuid[])
       AND notes ILIKE '%ledger-exp:2026-06-16:2026-07-15%'`,
    [moduleIds]
  );
  check(
    expCards.rows[0].n === expRows.rows[0].n,
    `Expense cards ${expCards.rows[0].n} vs tagged expenses ${expRows.rows[0].n}`
  );

  const fail = checks.filter((c) => !c.ok);
  const pass = checks.filter((c) => c.ok);
  console.log(
    JSON.stringify(
      {
        ok: fail.length === 0,
        checks: checks.length,
        pass: pass.length,
        fail: fail.length,
        apt1: s1,
        apt2: s2,
        julyWaterfall: {
          ...waterfall,
          afterExpenses,
          cashForDeposit,
          grandTotal,
          expected: JULY_WATERFALL,
        },
        hubPaid: hubPaid.rows[0],
        rentDueTenants: rentDue.rows[0].tenants,
        paymentBoard: {
          paid: paidCards.length,
          chase: chaseCards.map((r) => `${r.room_number}:${r.stage}`),
        },
        pendingClaims: pendingClaims.rows[0].n,
        unpaidUtils: utils.rows,
        buildings: names,
        failures: fail.map((f) => f.msg),
      },
      null,
      2
    )
  );
  process.exitCode = fail.length ? 1 : 0;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
