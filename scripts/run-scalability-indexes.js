#!/usr/bin/env node

/**
 * Apply scalability indexes with before/after EXPLAIN ANALYZE evidence.
 * Does NOT wrap CREATE INDEX CONCURRENTLY in a transaction.
 *
 * Usage: node scripts/run-scalability-indexes.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const INDEX_NAMES = [
  'idx_tenant_credits_applied_invoice',
  'idx_deposit_ledger_applied_invoice',
  'idx_maintenance_requests_room',
  'idx_tenant_utility_bills_tenant',
  'idx_tenant_utility_bills_building',
  'idx_tenant_utility_bills_utility_bill',
  'idx_tenant_utility_bills_status',
  'idx_cost_allocation_history_building',
  'idx_cost_allocation_history_utility_bill',
  'idx_notifications_created',
  'idx_invoices_created',
  'idx_payments_created',
];

const EXPLAIN_QUERIES = [
  {
    name: 'tenant_credits by applied_to_invoice_id',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT COALESCE(SUM(amount), 0) AS total_advance
      FROM tenant_credits
      WHERE applied_to_invoice_id = (
        SELECT id FROM invoices ORDER BY created_at DESC NULLS LAST LIMIT 1
      )
      AND status = 'applied'
    `,
  },
  {
    name: 'deposit_ledger by applied_to_invoice_id',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT COALESCE(SUM(amount), 0) AS total_deposit
      FROM deposit_ledger
      WHERE applied_to_invoice_id = (
        SELECT id FROM invoices ORDER BY created_at DESC NULLS LAST LIMIT 1
      )
      AND transaction_type = 'applied'
    `,
  },
  {
    name: 'maintenance_requests join room_id',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT mr.id, r.room_number
      FROM maintenance_requests mr
      LEFT JOIN rooms r ON mr.room_id = r.id
      ORDER BY mr.request_date DESC
      LIMIT 50
    `,
  },
  {
    name: 'tenant_utility_bills by tenant_id',
    sql: `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT *
      FROM tenant_utility_bills
      WHERE tenant_id = (
        SELECT tenant_id FROM tenant_utility_bills LIMIT 1
      )
      LIMIT 50
    `,
  },
];

function extractStatements(sql) {
  // Strip comments, then split on semicolons so multi-line CREATE INDEX works
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return withoutComments
    .split(';')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(
      (s) =>
        s.startsWith('CREATE INDEX') ||
        s.startsWith('CREATE UNIQUE INDEX') ||
        s.startsWith('ANALYZE')
    );
}

function summarizePlan(rows) {
  return rows.map((r) => r['QUERY PLAN']).join('\n');
}

function planUsesIndex(planText, indexHint) {
  return planText.includes('Index') && (!indexHint || planText.includes(indexHint));
}

async function runExplain(pool, label) {
  console.log(`\n--- EXPLAIN ANALYZE (${label}) ---`);
  const results = [];

  for (const q of EXPLAIN_QUERIES) {
    try {
      const res = await pool.query(q.sql);
      const plan = summarizePlan(res.rows);
      console.log(`\n[${q.name}]`);
      console.log(plan);
      results.push({ name: q.name, plan, ok: true });
    } catch (err) {
      console.log(`\n[${q.name}] SKIPPED: ${err.message}`);
      results.push({ name: q.name, plan: err.message, ok: false });
    }
  }

  return results;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl:
      dbUrl.includes('supabase') || dbUrl.includes('vercel') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    console.log('🔗 Connecting...');
    await pool.query('SELECT NOW() AS now');
    console.log('✅ Connected\n');

    // Table existence checks for optional tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `, [[
      'tenant_credits',
      'deposit_ledger',
      'maintenance_requests',
      'tenant_utility_bills',
      'cost_allocation_history',
      'notifications',
      'invoices',
      'payments',
    ]]);
    const existing = new Set(tables.rows.map((r) => r.table_name));
    console.log('📋 Tables present:', [...existing].sort().join(', ') || '(none)');

    const before = await runExplain(pool, 'BEFORE');

    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-scalability-indexes.sql');
    const statements = extractStatements(fs.readFileSync(migrationPath, 'utf8'));
    console.log(`\n📊 Applying ${statements.length} statements (no wrapping transaction)...\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const statement of statements) {
      const isAnalyze = statement.startsWith('ANALYZE');
      const indexMatch = statement.match(/idx_\w+/);
      const label = isAnalyze
        ? statement
        : indexMatch
          ? indexMatch[0]
          : statement.slice(0, 60);

      // Skip indexes for missing tables
      if (!isAnalyze) {
        const tableMatch = statement.match(/ON\s+(\w+)\s*\(/i);
        const tableName = tableMatch?.[1];
        if (tableName && !existing.has(tableName)) {
          console.log(`  ⊙ ${label} (table ${tableName} missing — skip)`);
          skipped++;
          continue;
        }
      } else {
        const tableName = statement.split(/\s+/)[1];
        if (tableName && !existing.has(tableName)) {
          console.log(`  ⊙ ${statement} (table missing — skip)`);
          skipped++;
          continue;
        }
      }

      process.stdout.write(`  ${isAnalyze ? 'Analyzing' : 'Creating'} ${label}... `);
      try {
        await pool.query(statement);
        console.log('✓');
        created++;
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('already exists')) {
          console.log('⊙ (already exists)');
          skipped++;
        } else if (msg.includes('CONCURRENTLY') && msg.includes('transaction')) {
          // Fallback without CONCURRENTLY (e.g. some poolers)
          const fallback = statement.replace(' CONCURRENTLY', '');
          try {
            await pool.query(fallback);
            console.log('✓ (non-concurrent fallback)');
            created++;
          } catch (err2) {
            console.log('✗');
            console.error(`    ${err2.message}`);
            failed++;
          }
        } else {
          console.log('✗');
          console.error(`    ${msg}`);
          failed++;
        }
      }
    }

    const after = await runExplain(pool, 'AFTER');

    const indexCheck = await pool.query(
      `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1)
      ORDER BY indexname
    `,
      [INDEX_NAMES]
    );

    console.log('\n' + '='.repeat(70));
    console.log('✅ Scalability index migration finished');
    console.log('='.repeat(70));
    console.log(`  Created/analyzed OK: ${created}`);
    console.log(`  Skipped:             ${skipped}`);
    console.log(`  Failed:              ${failed}`);
    console.log(`  Indexes present:     ${indexCheck.rows.length}/${INDEX_NAMES.length}`);
    for (const row of indexCheck.rows) {
      console.log(`    ✓ ${row.indexname}`);
    }
    const missing = INDEX_NAMES.filter(
      (n) => !indexCheck.rows.some((r) => r.indexname === n)
    );
    for (const n of missing) {
      console.log(`    ✗ ${n} (missing — table may not exist)`);
    }

    console.log('\n📈 Plan comparison (index usage):');
    for (let i = 0; i < before.length; i++) {
      const b = before[i];
      const a = after[i];
      if (!b.ok || !a.ok) {
        console.log(`  • ${b.name}: incomplete (table empty or missing)`);
        continue;
      }
      const beforeIdx = planUsesIndex(b.plan);
      const afterIdx = planUsesIndex(a.plan);
      console.log(
        `  • ${b.name}: before ${beforeIdx ? 'Index*' : 'Seq Scan?'} → after ${afterIdx ? 'Index*' : 'Seq Scan?'}`
      );
    }
    console.log('='.repeat(70) + '\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
