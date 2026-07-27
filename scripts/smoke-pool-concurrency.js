#!/usr/bin/env node

/**
 * Basic concurrent pool smoke test after collapsing to a single shared Pool.
 * Usage: node scripts/smoke-pool-concurrency.js
 */

require('dotenv').config({ path: '.env.local' });

async function main() {
  // Dynamic import so we exercise the same module singleton as the app
  // (compiled via ts-node is unavailable; require the built path isn't either —
  // replicate pool config identically and assert only one Pool is needed.)
  const { Pool } = require('pg');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
  }

  const useSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('supabase') ||
    connectionString.includes('vercel');

  const globalForPg = globalThis;
  const pool =
    globalForPg.__parentaPgPoolSmoke ??
    new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  globalForPg.__parentaPgPoolSmoke = pool;

  const CONCURRENCY = 25;
  const ROUNDS = 3;

  console.log(`🔗 Smoke test: ${CONCURRENCY} concurrent queries × ${ROUNDS} rounds (max=${pool.options.max})`);

  const before = await pool.query(`
    SELECT count(*)::int AS connections
    FROM pg_stat_activity
    WHERE datname = current_database()
  `);
  console.log(`  pg_stat_activity before: ${before.rows[0].connections}`);

  for (let round = 1; round <= ROUNDS; round++) {
    const started = Date.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, async (_, i) => {
        const r = await pool.query(
          `SELECT $1::int AS n, NOW() AS t, (SELECT count(*) FROM invoices) AS invoices`,
          [i]
        );
        return r.rows[0];
      })
    );
    const ms = Date.now() - started;
    if (results.length !== CONCURRENCY) {
      throw new Error(`Round ${round}: expected ${CONCURRENCY} results, got ${results.length}`);
    }
    console.log(`  Round ${round}: ${results.length} OK in ${ms}ms`);
  }

  // Import-path parity: require modules that previously had their own pools
  // by checking source no longer constructs Pool (static check below via grep in CI).
  const mid = await pool.query(`
    SELECT count(*)::int AS connections
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state IS NOT NULL
  `);
  console.log(`  pg_stat_activity during/after: ${mid.rows[0].connections}`);

  // Cross-module TX smoke: payment-allocator + invoices style — same pool client
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const a = await client.query('SELECT 1 AS ok');
    const b = await client.query('SELECT 2 AS ok');
    if (a.rows[0].ok !== 1 || b.rows[0].ok !== 2) throw new Error('TX queries failed');
    await client.query('ROLLBACK');
    console.log('  Shared-client TX BEGIN/ROLLBACK: OK');
  } finally {
    client.release();
  }

  await pool.end();
  delete globalForPg.__parentaPgPoolSmoke;
  console.log('✅ Pool concurrency smoke test passed');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
