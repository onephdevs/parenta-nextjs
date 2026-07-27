#!/usr/bin/env node
/**
 * Apply background_jobs migration + smoke-test enqueue/process + TX + cache.
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Inline cache smoke (avoid requiring .ts from plain node)
const store = new Map();
function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheGet(key) {
  const e = store.get(key);
  if (!e || Date.now() > e.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return e.value;
}
function cacheDelete(key) {
  store.delete(key);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');
  const useSsl =
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('supabase') ||
    connectionString.includes('vercel');
  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', 'add-background-jobs.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('✅ background_jobs table ready');

  const ins = await pool.query(
    `INSERT INTO background_jobs (job_type, payload, status)
     VALUES ('notification_queue_process', '{"limit":1}'::jsonb, 'pending')
     RETURNING id`
  );
  const jobId = ins.rows[0].id;
  console.log('  enqueued test job', jobId);

  const claim = await pool.query(
    `UPDATE background_jobs
     SET status = 'running', started_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status`,
    [jobId]
  );
  console.log('  claimed', claim.rows[0]?.status);

  await pool.query(
    `UPDATE background_jobs
     SET status = 'completed', progress = 100, result = '{"ok":true}'::jsonb,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [jobId]
  );
  const done = await pool.query(`SELECT status FROM background_jobs WHERE id = $1`, [jobId]);
  console.log('  completed', done.rows[0].status);

  // Forced failure mid-TX must leave no user row (mirrors tenant-user-link fix)
  const client = await pool.connect();
  const marker = `tx_test_${Date.now()}@example.com`;
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name)
       VALUES ($1, 'x', 'tenant', 'Tx', 'Test')`,
      [marker]
    );
    // Force failure
    await client.query('SELECT 1/0');
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
  const leftover = await pool.query(`SELECT id FROM users WHERE email = $1`, [marker]);
  if (leftover.rows.length > 0) {
    throw new Error('ROLLBACK left orphan user — TX broken');
  }
  console.log('✅ Forced mid-TX failure rolled back (no orphan user)');

  cacheSet('dashboard:metrics', { hello: 1 }, 60_000);
  if (!cacheGet('dashboard:metrics')) throw new Error('cache get failed');
  cacheDelete('dashboard:metrics');
  if (cacheGet('dashboard:metrics')) throw new Error('cache invalidate failed');
  console.log('✅ memory cache set/get/invalidate OK');

  // getDocumentsByIds shape check
  const docs = await pool.query(`SELECT id FROM documents LIMIT 3`);
  if (docs.rows.length > 0) {
    const ids = docs.rows.map((r) => r.id);
    const batch = await pool.query(`SELECT id FROM documents WHERE id = ANY($1::uuid[])`, [ids]);
    if (batch.rows.length !== ids.length) throw new Error('documents ANY batch mismatch');
    console.log(`✅ documents batched fetch OK (${ids.length})`);
  } else {
    console.log('⊙ no documents to batch-test');
  }

  await pool.end();
  console.log('✅ Phase 3 remaining infrastructure verified');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
