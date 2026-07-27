#!/usr/bin/env node

/**
 * Correctness check for batched invoice status recalculation.
 * Compares set-based aggregates to per-invoice SUM queries (old N+1 shape).
 *
 * Usage: node scripts/verify-invoice-status-recalc.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

function deriveInvoiceStatus({ totalAmount, totalPaid, dueDate, now = new Date() }) {
  const balanceDue = totalAmount - totalPaid;
  const due = dueDate ? new Date(dueDate) : null;
  const isOverdue = Boolean(due && due < now && balanceDue > 0);
  let newStatus;
  if (balanceDue <= 0) newStatus = 'paid';
  else if (totalPaid > 0) newStatus = isOverdue ? 'overdue' : 'partial';
  else newStatus = isOverdue ? 'overdue' : 'sent';
  return { newStatus, balanceDue };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
  }

  const useSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('supabase') ||
    connectionString.includes('vercel');

  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  const now = new Date();

  try {
    const invoices = await pool.query(`
      SELECT id, invoice_number, tenant_id, total_amount, amount_paid, invoice_status, due_date
      FROM invoices
      ORDER BY due_date ASC NULLS LAST, created_at ASC
    `);

    console.log(`📋 Comparing aggregates for ${invoices.rows.length} invoices...\n`);

    // Batched fetch (same shape as new service)
    const batched = await pool.query(`
      SELECT
        i.id,
        COALESCE(pa.total_allocated, 0) AS total_allocated,
        COALESCE(tc.total_advance, 0) AS total_advance,
        COALESCE(dl.total_deposit, 0) AS total_deposit
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(allocated_amount) AS total_allocated
        FROM payment_allocations
        GROUP BY invoice_id
      ) pa ON pa.invoice_id = i.id
      LEFT JOIN (
        SELECT applied_to_invoice_id, SUM(amount) AS total_advance
        FROM tenant_credits
        WHERE status = 'applied'
        GROUP BY applied_to_invoice_id
      ) tc ON tc.applied_to_invoice_id = i.id
      LEFT JOIN (
        SELECT applied_to_invoice_id, SUM(amount) AS total_deposit
        FROM deposit_ledger
        WHERE transaction_type = 'applied'
        GROUP BY applied_to_invoice_id
      ) dl ON dl.applied_to_invoice_id = i.id
    `);
    const batchedMap = new Map(batched.rows.map((r) => [r.id, r]));

    let mismatches = 0;

    for (const inv of invoices.rows) {
      const [alloc, credit, deposit] = await Promise.all([
        pool.query(
          `SELECT COALESCE(SUM(allocated_amount), 0) AS t FROM payment_allocations WHERE invoice_id = $1`,
          [inv.id]
        ),
        pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS t FROM tenant_credits WHERE applied_to_invoice_id = $1 AND status = 'applied'`,
          [inv.id]
        ),
        pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS t FROM deposit_ledger WHERE applied_to_invoice_id = $1 AND transaction_type = 'applied'`,
          [inv.id]
        ),
      ]);

      const perInvoicePaid =
        parseFloat(alloc.rows[0].t) +
        parseFloat(credit.rows[0].t) +
        parseFloat(deposit.rows[0].t);

      const b = batchedMap.get(inv.id);
      const batchedPaid =
        parseFloat(b.total_allocated) +
        parseFloat(b.total_advance) +
        parseFloat(b.total_deposit);

      const expected = deriveInvoiceStatus({
        totalAmount: parseFloat(inv.total_amount),
        totalPaid: perInvoicePaid,
        dueDate: inv.due_date,
        now,
      });
      const fromBatch = deriveInvoiceStatus({
        totalAmount: parseFloat(inv.total_amount),
        totalPaid: batchedPaid,
        dueDate: inv.due_date,
        now,
      });

      if (
        Math.abs(perInvoicePaid - batchedPaid) > 0.001 ||
        expected.newStatus !== fromBatch.newStatus
      ) {
        mismatches++;
        console.log(`✗ ${inv.invoice_number} (${inv.id})`);
        console.log(`  per-invoice paid=${perInvoicePaid} status=${expected.newStatus}`);
        console.log(`  batched paid=${batchedPaid} status=${fromBatch.newStatus}`);
      }
    }

    if (mismatches > 0) {
      console.error(`\n❌ ${mismatches} mismatches — aborting apply`);
      process.exit(1);
    }
    console.log('✅ Batched aggregates match per-invoice SUMs for all invoices');

    // Apply batched UPDATE path (mirrors service) and re-check status columns
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const rows = await client.query(`
        SELECT
          i.id,
          i.invoice_number,
          i.total_amount,
          i.amount_paid,
          i.invoice_status,
          i.due_date,
          COALESCE(pa.total_allocated, 0) AS total_allocated,
          COALESCE(tc.total_advance, 0) AS total_advance,
          COALESCE(dl.total_deposit, 0) AS total_deposit
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id, SUM(allocated_amount) AS total_allocated
          FROM payment_allocations GROUP BY invoice_id
        ) pa ON pa.invoice_id = i.id
        LEFT JOIN (
          SELECT applied_to_invoice_id, SUM(amount) AS total_advance
          FROM tenant_credits WHERE status = 'applied'
          GROUP BY applied_to_invoice_id
        ) tc ON tc.applied_to_invoice_id = i.id
        LEFT JOIN (
          SELECT applied_to_invoice_id, SUM(amount) AS total_deposit
          FROM deposit_ledger WHERE transaction_type = 'applied'
          GROUP BY applied_to_invoice_id
        ) dl ON dl.applied_to_invoice_id = i.id
      `);

      const updates = [];
      for (const row of rows.rows) {
        const totalPaid =
          parseFloat(row.total_allocated) +
          parseFloat(row.total_advance) +
          parseFloat(row.total_deposit);
        const { newStatus } = deriveInvoiceStatus({
          totalAmount: parseFloat(row.total_amount),
          totalPaid,
          dueDate: row.due_date,
          now,
        });
        const changed =
          row.invoice_status !== newStatus ||
          Math.abs(parseFloat(row.amount_paid) - totalPaid) > 0.01;
        if (changed) {
          updates.push({ id: row.id, totalPaid, newStatus });
        }
      }

      if (updates.length > 0) {
        await client.query(
          `
          UPDATE invoices AS i
          SET amount_paid = v.amount_paid,
              invoice_status = v.invoice_status,
              updated_at = CURRENT_TIMESTAMP
          FROM (
            SELECT * FROM UNNEST($1::uuid[], $2::numeric[], $3::text[])
              AS t(id, amount_paid, invoice_status)
          ) AS v
          WHERE i.id = v.id
          `,
          [updates.map((u) => u.id), updates.map((u) => u.totalPaid), updates.map((u) => u.newStatus)]
        );
      }
      await client.query('COMMIT');
      console.log(`✅ Applied batched updates for ${updates.length} invoices`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Final: every invoice's amount_paid equals independent per-invoice sum
    let finalMismatches = 0;
    for (const inv of (await pool.query(`SELECT id, invoice_number, amount_paid, invoice_status, total_amount, due_date FROM invoices`)).rows) {
      const [alloc, credit, deposit] = await Promise.all([
        pool.query(`SELECT COALESCE(SUM(allocated_amount), 0) AS t FROM payment_allocations WHERE invoice_id = $1`, [inv.id]),
        pool.query(`SELECT COALESCE(SUM(amount), 0) AS t FROM tenant_credits WHERE applied_to_invoice_id = $1 AND status = 'applied'`, [inv.id]),
        pool.query(`SELECT COALESCE(SUM(amount), 0) AS t FROM deposit_ledger WHERE applied_to_invoice_id = $1 AND transaction_type = 'applied'`, [inv.id]),
      ]);
      const expectedPaid =
        parseFloat(alloc.rows[0].t) +
        parseFloat(credit.rows[0].t) +
        parseFloat(deposit.rows[0].t);
      const { newStatus } = deriveInvoiceStatus({
        totalAmount: parseFloat(inv.total_amount),
        totalPaid: expectedPaid,
        dueDate: inv.due_date,
        now,
      });
      if (
        Math.abs(parseFloat(inv.amount_paid) - expectedPaid) > 0.01 ||
        inv.invoice_status !== newStatus
      ) {
        finalMismatches++;
        console.log(`✗ post-apply ${inv.invoice_number}: db paid=${inv.amount_paid} status=${inv.invoice_status}; expected paid=${expectedPaid} status=${newStatus}`);
      }
    }

    if (finalMismatches > 0) {
      console.error(`\n❌ ${finalMismatches} post-apply mismatches`);
      process.exit(1);
    }

    console.log('✅ Post-apply DB state matches independent per-invoice truth');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
