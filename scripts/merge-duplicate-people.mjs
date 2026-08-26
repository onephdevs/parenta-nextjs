#!/usr/bin/env node
/**
 * Merge a duplicate Person (former occupancy-history row) into the live
 * Person that has the portal login / invoices. Stays re-point; the absorb
 * tenant row is deleted.
 *
 * Usage:
 *   node scripts/merge-duplicate-people.mjs --keep=<uuid> --absorb=<uuid>
 *   node scripts/merge-duplicate-people.mjs --name="Crispin D. Manuel"
 *   node scripts/merge-duplicate-people.mjs --name="Crispin D. Manuel" --commit
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

function parseArgs(argv) {
  const args = { commit: false, keep: null, absorb: null, name: null };
  for (const raw of argv.slice(2)) {
    if (raw === '--commit') args.commit = true;
    else if (raw.startsWith('--keep=')) args.keep = raw.slice('--keep='.length);
    else if (raw.startsWith('--absorb=')) args.absorb = raw.slice('--absorb='.length);
    else if (raw.startsWith('--name=')) args.name = raw.slice('--name='.length).replace(/^"|"$/g, '');
    else throw new Error(`Unknown argument: ${raw}`);
  }
  return args;
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) throw new Error(`Need first and last name: ${full}`);
  return { first: parts[0], last: parts.slice(1).join(' ') };
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

function safeIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Unsafe identifier: ${name}`);
  return name;
}

async function resolvePair(args) {
  if (args.keep && args.absorb) {
    const res = await client.query(
      `SELECT id, first_name, last_name, phone, user_id, is_tenant, tenant_status
       FROM tenants WHERE id = ANY($1::uuid[])`,
      [[args.keep, args.absorb]]
    );
    const keep = res.rows.find((r) => r.id === args.keep);
    const absorb = res.rows.find((r) => r.id === args.absorb);
    if (!keep || !absorb) throw new Error('keep or absorb tenant not found');
    return { keep, absorb };
  }
  if (!args.name) throw new Error('Pass --keep and --absorb, or --name="First Last"');
  const { first, last } = splitName(args.name);
  const res = await client.query(
    `SELECT t.id, t.first_name, t.last_name, t.phone, t.user_id, t.is_tenant, t.tenant_status,
            (SELECT count(*)::int FROM tenant_room_assignments tra
              WHERE tra.tenant_id = t.id AND tra.assignment_status = 'active'
                AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)) AS live_stays
     FROM tenants t
     WHERE lower(trim(t.first_name)) = lower($1)
       AND lower(trim(t.last_name)) = lower($2)
     ORDER BY t.is_tenant DESC, t.user_id NULLS LAST`,
    [first, last]
  );
  if (res.rows.length !== 2) {
    throw new Error(`Expected exactly 2 people named "${args.name}", found ${res.rows.length}`);
  }
  const keep = res.rows.find((r) => r.user_id && r.live_stays > 0) || res.rows[0];
  const absorb = res.rows.find((r) => r.id !== keep.id);
  return { keep, absorb };
}

async function mergePair(keep, absorb, commit) {
  const label = `${keep.first_name} ${keep.last_name}`;
  console.log(`\n${label}`);
  console.log(`  keep   ${keep.id} portal=${Boolean(keep.user_id)} is_tenant=${keep.is_tenant}`);
  console.log(`  absorb ${absorb.id} portal=${Boolean(absorb.user_id)} is_tenant=${absorb.is_tenant}`);

  if (absorb.user_id) {
    throw new Error(`Refusing to absorb ${absorb.id}: has a portal user. Merge manually.`);
  }

  const tables = await client.query(
    `SELECT table_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'tenant_id' AND table_name <> 'tenants'`
  );

  if (!commit) {
    for (const row of tables.rows) {
      const n = await client.query(
        `SELECT count(*)::int AS n FROM ${safeIdent(row.table_name)} WHERE tenant_id = $1`,
        [absorb.id]
      );
      if (n.rows[0].n) console.log(`  ${row.table_name}: ${n.rows[0].n} row(s) would re-point`);
    }
    return 'dry-run';
  }

  await client.query('BEGIN');
  try {
    await client.query(`DELETE FROM contacts WHERE tenant_id = $1`, [absorb.id]);

    for (const row of tables.rows) {
      if (row.table_name === 'contacts') continue;
      const updated = await client.query(
        `UPDATE ${safeIdent(row.table_name)} SET tenant_id = $1 WHERE tenant_id = $2`,
        [keep.id, absorb.id]
      );
      if (updated.rowCount) console.log(`  ${row.table_name}: ${updated.rowCount}`);
    }

    const entityTables = [
      ['activity_log', 'entity_id'],
      ['entity_notes', 'entity_id'],
      ['images', 'entity_id'],
    ];
    for (const [table, col] of entityTables) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (!exists.rows[0]) continue;
      const typeCol = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'entity_type'`,
        [table]
      );
      const sql = typeCol.rows[0]
        ? `UPDATE ${safeIdent(table)} SET ${safeIdent(col)} = $1
           WHERE ${safeIdent(col)} = $2 AND entity_type = 'tenant'`
        : `UPDATE ${safeIdent(table)} SET ${safeIdent(col)} = $1 WHERE ${safeIdent(col)} = $2`;
      const updated = await client.query(sql, [keep.id, absorb.id]);
      if (updated.rowCount) console.log(`  ${table}: ${updated.rowCount}`);
    }

    if (absorb.phone && !keep.phone) {
      await client.query(`UPDATE tenants SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
        absorb.phone,
        keep.id,
      ]);
      await client.query(
        `UPDATE contacts SET phone = COALESCE(phone, $1), updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2`,
        [absorb.phone, keep.id]
      );
    }

    await client.query(`DELETE FROM tenants WHERE id = $1`, [absorb.id]);
    await client.query('COMMIT');
    return 'merged';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

const args = parseArgs(process.argv);
await client.connect();
try {
  const { keep, absorb } = await resolvePair(args);
  const result = await mergePair(keep, absorb, args.commit);
  console.log(args.commit ? `\nDone: ${result}` : '\nDry-run. Re-run with --commit to merge.');
} finally {
  await client.end();
}
