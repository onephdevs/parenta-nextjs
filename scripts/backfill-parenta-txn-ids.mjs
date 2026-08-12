/**
 * Backfill parenta_txn_id for existing payments, expenses, and utility bills.
 *
 * Format: txn-{type}-{######}-{YY}
 * Year comes from the record date (Asia/Manila). Sequence is chronological per type+year.
 *
 * Usage: node --env-file=.env.local scripts/backfill-parenta-txn-ids.mjs
 */
import pg from 'pg';

const { Pool } = pg;

const TXN_PREFIX = 'txn';

function formatParentaTxnId(type, sequence, yearYy) {
  const seq = Math.max(1, Math.floor(sequence));
  const yy = String(yearYy).padStart(2, '0').slice(-2);
  return `${TXN_PREFIX}-${type}-${String(seq).padStart(6, '0')}-${yy}`;
}

function yearYyFromDate(value) {
  if (!value) return new Date().getFullYear() % 100;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().getFullYear() % 100;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: '2-digit',
  }).formatToParts(d);
  const yy = parts.find((p) => p.type === 'year')?.value;
  return yy ? parseInt(yy, 10) : d.getFullYear() % 100;
}

function txnTypeFromPaymentType(paymentType) {
  switch (String(paymentType || '').toLowerCase()) {
    case 'deposit':
      return 'd';
    case 'advance':
      return 'a';
    case 'utility':
    case 'electricity':
    case 'water':
      return 'b';
    case 'expense':
    case 'other':
      return 'e';
    case 'rent':
    case 'late_fee':
    default:
      return 'r';
  }
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS txn_sequences (
      txn_type VARCHAR(8) NOT NULL,
      year_yy SMALLINT NOT NULL,
      last_value INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (txn_type, year_yy)
    )
  `);
  await pool.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT`);
  await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT`);
  await pool.query(`ALTER TABLE utility_bills ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT`);
}

/**
 * Assign sequential IDs chronologically. counters[type][yy] tracks next seq.
 */
function nextId(counters, type, yearYy) {
  if (!counters[type]) counters[type] = {};
  if (!counters[type][yearYy]) counters[type][yearYy] = 1;
  const seq = counters[type][yearYy];
  counters[type][yearYy] = seq + 1;
  return formatParentaTxnId(type, seq, yearYy);
}

async function seedCountersFromExisting(pool, counters) {
  const existing = await pool.query(`
    SELECT parenta_txn_id AS id FROM payments WHERE parenta_txn_id IS NOT NULL
    UNION ALL
    SELECT parenta_txn_id AS id FROM expenses WHERE parenta_txn_id IS NOT NULL
    UNION ALL
    SELECT parenta_txn_id AS id FROM utility_bills WHERE parenta_txn_id IS NOT NULL
  `);

  const re = /^txn-([a-z])-(\d{6})-(\d{2})$/i;
  for (const row of existing.rows) {
    const match = re.exec(String(row.id || '').trim());
    if (!match) continue;
    const type = match[1].toLowerCase();
    const seq = parseInt(match[2], 10);
    const yy = parseInt(match[3], 10);
    if (!counters[type]) counters[type] = {};
    const next = seq + 1;
    if (!counters[type][yy] || counters[type][yy] < next) {
      counters[type][yy] = next;
    }
  }
}

async function backfillPayments(client, counters) {
  const result = await client.query(`
    SELECT id, payment_type, payment_date, created_at
    FROM payments
    WHERE parenta_txn_id IS NULL
    ORDER BY COALESCE(payment_date, created_at::date) ASC NULLS LAST,
             created_at ASC NULLS LAST,
             id ASC
  `);

  let updated = 0;
  for (const row of result.rows) {
    const type = txnTypeFromPaymentType(row.payment_type);
    const yy = yearYyFromDate(row.payment_date || row.created_at);
    const txnId = nextId(counters, type, yy);
    await client.query(
      `UPDATE payments SET parenta_txn_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [txnId, row.id]
    );
    updated += 1;
  }
  return updated;
}

async function backfillExpenses(client, counters) {
  const result = await client.query(`
    SELECT id, expense_date, created_at
    FROM expenses
    WHERE parenta_txn_id IS NULL
    ORDER BY COALESCE(expense_date, created_at::date) ASC NULLS LAST,
             created_at ASC NULLS LAST,
             id ASC
  `);

  let updated = 0;
  for (const row of result.rows) {
    const yy = yearYyFromDate(row.expense_date || row.created_at);
    const txnId = nextId(counters, 'e', yy);
    await client.query(
      `UPDATE expenses SET parenta_txn_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [txnId, row.id]
    );
    updated += 1;
  }
  return updated;
}

async function backfillUtilityBills(client, counters) {
  const result = await client.query(`
    SELECT id, utility_type, due_date, billing_period_end, created_at
    FROM utility_bills
    WHERE parenta_txn_id IS NULL
    ORDER BY COALESCE(due_date, billing_period_end, created_at::date) ASC NULLS LAST,
             created_at ASC NULLS LAST,
             id ASC
  `);

  let updated = 0;
  for (const row of result.rows) {
    const type = txnTypeFromPaymentType(row.utility_type || 'utility');
    const yy = yearYyFromDate(
      row.due_date || row.billing_period_end || row.created_at
    );
    const txnId = nextId(counters, type, yy);
    await client.query(
      `UPDATE utility_bills SET parenta_txn_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [txnId, row.id]
    );
    updated += 1;
  }
  return updated;
}

async function syncSequenceTable(client, counters) {
  for (const [type, byYear] of Object.entries(counters)) {
    for (const [yyRaw, nextSeq] of Object.entries(byYear)) {
      const yy = Number(yyRaw);
      const lastValue = Math.max(0, Number(nextSeq) - 1);
      await client.query(
        `INSERT INTO txn_sequences (txn_type, year_yy, last_value, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (txn_type, year_yy) DO UPDATE SET
           last_value = GREATEST(txn_sequences.last_value, EXCLUDED.last_value),
           updated_at = CURRENT_TIMESTAMP`,
        [type, yy, lastValue]
      );
    }
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await ensureSchema(pool);

    const before = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM payments WHERE parenta_txn_id IS NULL) AS payments_missing,
        (SELECT COUNT(*)::int FROM expenses WHERE parenta_txn_id IS NULL) AS expenses_missing,
        (SELECT COUNT(*)::int FROM utility_bills WHERE parenta_txn_id IS NULL) AS bills_missing,
        (SELECT COUNT(*)::int FROM payments WHERE parenta_txn_id IS NOT NULL) AS payments_have,
        (SELECT COUNT(*)::int FROM expenses WHERE parenta_txn_id IS NOT NULL) AS expenses_have,
        (SELECT COUNT(*)::int FROM utility_bills WHERE parenta_txn_id IS NOT NULL) AS bills_have
    `);
    console.log('Before:', before.rows[0]);

    const counters = {};
    await seedCountersFromExisting(pool, counters);

    await client.query('BEGIN');
    const paymentsUpdated = await backfillPayments(client, counters);
    const expensesUpdated = await backfillExpenses(client, counters);
    const billsUpdated = await backfillUtilityBills(client, counters);
    await syncSequenceTable(client, counters);
    await client.query('COMMIT');

    const after = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM payments WHERE parenta_txn_id IS NULL) AS payments_missing,
        (SELECT COUNT(*)::int FROM expenses WHERE parenta_txn_id IS NULL) AS expenses_missing,
        (SELECT COUNT(*)::int FROM utility_bills WHERE parenta_txn_id IS NULL) AS bills_missing,
        (SELECT COUNT(*)::int FROM payments WHERE parenta_txn_id IS NOT NULL) AS payments_have,
        (SELECT COUNT(*)::int FROM expenses WHERE parenta_txn_id IS NOT NULL) AS expenses_have,
        (SELECT COUNT(*)::int FROM utility_bills WHERE parenta_txn_id IS NOT NULL) AS bills_have
    `);

    const samples = await pool.query(`
      (
        SELECT 'payment' AS kind, parenta_txn_id, payment_date::text AS dated
        FROM payments WHERE parenta_txn_id IS NOT NULL
        ORDER BY payment_date DESC NULLS LAST LIMIT 3
      )
      UNION ALL
      (
        SELECT 'expense' AS kind, parenta_txn_id, expense_date::text AS dated
        FROM expenses WHERE parenta_txn_id IS NOT NULL
        ORDER BY expense_date DESC NULLS LAST LIMIT 3
      )
      UNION ALL
      (
        SELECT 'utility_bill' AS kind, parenta_txn_id, due_date::text AS dated
        FROM utility_bills WHERE parenta_txn_id IS NOT NULL
        ORDER BY due_date DESC NULLS LAST LIMIT 3
      )
    `);

    console.log('Updated:', {
      payments: paymentsUpdated,
      expenses: expensesUpdated,
      utilityBills: billsUpdated,
    });
    console.log('After:', after.rows[0]);
    console.log('Samples:', samples.rows);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
