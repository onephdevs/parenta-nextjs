#!/usr/bin/env node
/**
 * Inventory or hard-delete specific tenants and related module rows.
 * Does not delete rooms or buildings. Does not touch Apt 1/2 unless
 * --allow-apartment-ledger is passed.
 *
 * Usage:
 *   node scripts/purge-tenants.mjs <tenantId-or-url> [...]
 *   node scripts/purge-tenants.mjs <ids> --confirm
 */
import { config } from 'dotenv';
import { unlink } from 'fs/promises';
import { dirname, isAbsolute, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const APT_NAME_RE = /apartment-1|aprtment-2|villasol|balibago/i;

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const allowApartmentLedger = args.includes('--allow-apartment-ledger');
const ids = [
  ...new Set(
    args
      .filter((a) => !a.startsWith('--'))
      .flatMap((a) => [...(a.match(UUID_RE) || [])].map((id) => id.toLowerCase()))
  ),
];

if (ids.length === 0) {
  console.error(
    'Usage: node scripts/purge-tenants.mjs <tenantId-or-url> [...] [--confirm] [--allow-apartment-ledger]'
  );
  process.exit(1);
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
  ssl:
    url.includes('supabase') || url.includes('vercel')
      ? { rejectUnauthorized: false }
      : undefined,
});

const MODULES = [
  ['Leases', 'SELECT COUNT(*)::int AS n FROM tenant_room_assignments WHERE tenant_id = ANY($1::uuid[])'],
  ['Invoices', 'SELECT COUNT(*)::int AS n FROM invoices WHERE tenant_id = ANY($1::uuid[])'],
  ['Payments', 'SELECT COUNT(*)::int AS n FROM payments WHERE tenant_id = ANY($1::uuid[])'],
  ['Credits', 'SELECT COUNT(*)::int AS n FROM tenant_credits WHERE tenant_id = ANY($1::uuid[])'],
  ['Deposit ledger', 'SELECT COUNT(*)::int AS n FROM deposit_ledger WHERE tenant_id = ANY($1::uuid[])'],
  ['Documents', 'SELECT COUNT(*)::int AS n FROM documents WHERE tenant_id = ANY($1::uuid[])'],
  ['Pipeline', 'SELECT COUNT(*)::int AS n FROM pipeline_cards WHERE tenant_id = ANY($1::uuid[])'],
  ['Maintenance', 'SELECT COUNT(*)::int AS n FROM maintenance_requests WHERE tenant_id = ANY($1::uuid[])'],
  ['Occupants', 'SELECT COUNT(*)::int AS n FROM occupants WHERE tenant_id = ANY($1::uuid[])'],
  ['Reservations', 'SELECT COUNT(*)::int AS n FROM reservations WHERE tenant_id = ANY($1::uuid[])'],
  ['Notifications', 'SELECT COUNT(*)::int AS n FROM notifications WHERE tenant_id = ANY($1::uuid[])'],
  ['Communications', 'SELECT COUNT(*)::int AS n FROM communications WHERE tenant_id = ANY($1::uuid[])'],
  ['Assets', 'SELECT COUNT(*)::int AS n FROM asset_assignments WHERE tenant_id = ANY($1::uuid[])'],
  ['Utilities', 'SELECT COUNT(*)::int AS n FROM tenant_utility_bills WHERE tenant_id = ANY($1::uuid[])'],
  ['Expenses', 'SELECT COUNT(*)::int AS n FROM expenses WHERE tenant_id = ANY($1::uuid[])'],
  ['Contacts', 'SELECT COUNT(*)::int AS n FROM contacts WHERE tenant_id = ANY($1::uuid[])'],
  ['Notes', "SELECT COUNT(*)::int AS n FROM entity_notes WHERE entity_id = ANY($1::uuid[])"],
  ['Photos', "SELECT COUNT(*)::int AS n FROM images WHERE entity_type = 'tenant' AND entity_id = ANY($1::uuid[])"],
  ['Activity', 'SELECT COUNT(*)::int AS n FROM activity_log WHERE entity_id = ANY($1::uuid[])'],
];

async function countOrZero(sql, params) {
  try {
    const res = await client.query(sql, params);
    return res.rows[0]?.n ?? 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist|undefined table/i.test(msg)) return 0;
    throw err;
  }
}

async function del(label, sql, params = []) {
  try {
    const res = await client.query(sql, params);
    const n = res.rowCount ?? 0;
    if (n > 0) console.log(`  ${label}: ${n}`);
    return n;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist|undefined table|undefined column/i.test(msg)) return 0;
    throw err;
  }
}

async function removeFiles(paths) {
  let removed = 0;
  for (const filePath of paths) {
    if (typeof filePath !== 'string' || !filePath.trim()) continue;
    const abs = isAbsolute(filePath) ? filePath : join(root, filePath.replace(/^\//, ''));
    const candidates = [
      abs,
      filePath.startsWith('/uploads/') ? join(root, 'public', filePath) : null,
      join(root, 'public', filePath),
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        await unlink(candidate);
        removed += 1;
        break;
      } catch {
        // not on disk
      }
    }
  }
  if (removed) console.log(`  files removed: ${removed}`);
}

await client.connect();

try {
  const tenants = await client.query(
    `SELECT t.id, t.first_name, t.last_name, t.email, t.user_id, t.tenant_status
     FROM tenants t
     WHERE t.id = ANY($1::uuid[])`,
    [ids]
  );
  const foundIds = tenants.rows.map((t) => t.id);
  const missing = ids.filter((id) => !foundIds.includes(id));
  if (missing.length) {
    console.log(`Not found: ${missing.join(', ')}`);
  }
  if (tenants.rows.length === 0) {
    console.log('No matching tenants.');
    process.exit(0);
  }

  const assignments = await client.query(
    `SELECT tra.id, tra.tenant_id, tra.assignment_status, r.room_number, b.name AS building
     FROM tenant_room_assignments tra
     JOIN rooms r ON r.id = tra.room_id
     JOIN buildings b ON b.id = r.building_id
     WHERE tra.tenant_id = ANY($1::uuid[])
     ORDER BY tra.created_at`,
    [foundIds]
  );

  const aptHits = assignments.rows.filter((row) => APT_NAME_RE.test(row.building));
  if (aptHits.length && !allowApartmentLedger) {
    console.error('Refusing: tenant is linked to APARTMENT-1 / APRTMENT-2.');
    console.error('Pass --allow-apartment-ledger only if the user explicitly asked.');
    for (const row of aptHits) {
      console.error(`  ${row.building} room ${row.room_number} (${row.assignment_status})`);
    }
    process.exit(1);
  }

  console.log(confirm ? 'Deleting tenants + related modules' : 'Inventory (pass --confirm to delete)');
  for (const t of tenants.rows) {
    console.log(
      `  ${t.first_name} ${t.last_name} <${t.email || 'no email'}> ${t.id} [${t.tenant_status}]`
    );
  }
  for (const row of assignments.rows) {
    console.log(`  lease ${row.building} #${row.room_number} ${row.assignment_status}`);
  }

  console.log('Modules:');
  for (const [label, sql] of MODULES) {
    const n = await countOrZero(sql, [foundIds]);
    if (n > 0) console.log(`  ${label}: ${n}`);
  }

  if (!confirm) {
    console.log('Dry run. Re-run with --confirm to delete.');
    process.exit(0);
  }

  const userIds = tenants.rows.map((t) => t.user_id).filter(Boolean);
  const assignmentIds = assignments.rows.map((r) => r.id);
  const invoiceIds = (
    await client.query(`SELECT id FROM invoices WHERE tenant_id = ANY($1::uuid[])`, [foundIds])
  ).rows.map((r) => r.id);
  const paymentIds = (
    await client.query(
      `SELECT id FROM payments
       WHERE tenant_id = ANY($1::uuid[]) OR assignment_id = ANY($2::uuid[])`,
      [foundIds, assignmentIds]
    )
  ).rows.map((r) => r.id);
  const cardIds = (
    await client.query(
      `SELECT id FROM pipeline_cards
       WHERE tenant_id = ANY($1::uuid[])
          OR assignment_id = ANY($2::uuid[])
          OR invoice_id = ANY($3::uuid[])`,
      [foundIds, assignmentIds, invoiceIds]
    )
  ).rows.map((r) => r.id);
  const docs = await client.query(
    `SELECT id, file_path FROM documents
     WHERE tenant_id = ANY($1::uuid[]) OR pipeline_card_id = ANY($2::uuid[])`,
    [foundIds, cardIds]
  );
  const documentIds = docs.rows.map((r) => r.id);
  const images = await client.query(
    `SELECT file_path FROM images WHERE entity_type = 'tenant' AND entity_id = ANY($1::uuid[])`,
    [foundIds]
  );
  const entityIds = [...foundIds, ...assignmentIds, ...invoiceIds, ...paymentIds, ...cardIds];

  await client.query('BEGIN');

  await del('pipeline_card_events', `DELETE FROM pipeline_card_events WHERE card_id = ANY($1::uuid[])`, [cardIds]);
  await del(
    'documents.pipeline unlink',
    `UPDATE documents SET pipeline_card_id = NULL WHERE pipeline_card_id = ANY($1::uuid[])`,
    [cardIds]
  );
  await del('pipeline_cards', `DELETE FROM pipeline_cards WHERE id = ANY($1::uuid[])`, [cardIds]);

  await del(
    'maintenance_update_reactions',
    `DELETE FROM maintenance_update_reactions WHERE update_id IN (
       SELECT u.id FROM maintenance_request_updates u
       JOIN maintenance_requests mr ON mr.id = u.maintenance_request_id
       WHERE mr.tenant_id = ANY($1::uuid[])
     )`,
    [foundIds]
  );
  await del(
    'maintenance_request_updates',
    `DELETE FROM maintenance_request_updates WHERE maintenance_request_id IN (
       SELECT id FROM maintenance_requests WHERE tenant_id = ANY($1::uuid[])
     )`,
    [foundIds]
  );
  await del(
    'maintenance_request_attachments',
    `DELETE FROM maintenance_request_attachments WHERE maintenance_request_id IN (
       SELECT id FROM maintenance_requests WHERE tenant_id = ANY($1::uuid[])
     )`,
    [foundIds]
  );
  await del('maintenance_requests', `DELETE FROM maintenance_requests WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);

  await del('lease_signature_events', `DELETE FROM lease_signature_events WHERE document_id = ANY($1::uuid[])`, [documentIds]);
  await del('lease_agreement_snapshots', `DELETE FROM lease_agreement_snapshots WHERE document_id = ANY($1::uuid[])`, [documentIds]);
  await del('documents', `DELETE FROM documents WHERE id = ANY($1::uuid[])`, [documentIds]);
  await del(
    'images',
    `DELETE FROM images WHERE entity_type = 'tenant' AND entity_id = ANY($1::uuid[])`,
    [foundIds]
  );
  await del('entity_notes', `DELETE FROM entity_notes WHERE entity_id = ANY($1::uuid[])`, [foundIds]);
  await del('activity_log', `DELETE FROM activity_log WHERE entity_id = ANY($1::uuid[])`, [entityIds]);

  await del('occupants', `DELETE FROM occupants WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('reservations', `DELETE FROM reservations WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('notifications', `DELETE FROM notifications WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('notification_queue', `DELETE FROM notification_queue WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('notification_history', `DELETE FROM notification_history WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('communications', `DELETE FROM communications WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del(
    'scheduled_reminders',
    `DELETE FROM scheduled_reminders WHERE tenant_id = ANY($1::uuid[]) OR invoice_id = ANY($2::uuid[])`,
    [foundIds, invoiceIds]
  );
  await del(
    'late_fee_applications',
    `DELETE FROM late_fee_applications
     WHERE tenant_id = ANY($1::uuid[]) OR invoice_id = ANY($2::uuid[]) OR late_fee_invoice_id = ANY($2::uuid[])`,
    [foundIds, invoiceIds]
  );
  await del('lease_expiration_alerts', `DELETE FROM lease_expiration_alerts WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('lease_renewal_requests', `DELETE FROM lease_renewal_requests WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del(
    'moveout_inspection_items',
    `DELETE FROM moveout_inspection_items WHERE moveout_id IN (
       SELECT id FROM moveout_processing WHERE tenant_id = ANY($1::uuid[])
     )`,
    [foundIds]
  );
  await del('moveout_processing', `DELETE FROM moveout_processing WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);

  await del(
    'payment_allocations',
    `DELETE FROM payment_allocations WHERE invoice_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`,
    [invoiceIds, paymentIds]
  );
  await del(
    'tenant_credits',
    `DELETE FROM tenant_credits WHERE tenant_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`,
    [foundIds, paymentIds]
  );
  await del(
    'deposit_ledger',
    `DELETE FROM deposit_ledger WHERE tenant_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`,
    [foundIds, paymentIds]
  );
  await del(
    'asset_billing',
    `DELETE FROM asset_billing WHERE tenant_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`,
    [foundIds, paymentIds]
  );
  await del('asset_assignments', `DELETE FROM asset_assignments WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('payments', `DELETE FROM payments WHERE id = ANY($1::uuid[])`, [paymentIds]);
  await del('invoice_line_items', `DELETE FROM invoice_line_items WHERE invoice_id = ANY($1::uuid[])`, [invoiceIds]);
  await del('invoices', `DELETE FROM invoices WHERE id = ANY($1::uuid[])`, [invoiceIds]);
  await del('expenses', `DELETE FROM expenses WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del('tenant_utility_bills', `DELETE FROM tenant_utility_bills WHERE tenant_id = ANY($1::uuid[])`, [foundIds]);
  await del(
    'contacts',
    `DELETE FROM contacts WHERE tenant_id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])`,
    [foundIds, userIds]
  );
  await del('tenant_room_assignments', `DELETE FROM tenant_room_assignments WHERE id = ANY($1::uuid[])`, [assignmentIds]);
  await del('tenants.user unlink', `UPDATE tenants SET user_id = NULL WHERE id = ANY($1::uuid[])`, [foundIds]);
  await del('tenants', `DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [foundIds]);
  await del(
    'users',
    `DELETE FROM users
     WHERE id = ANY($1::uuid[])
       AND role = 'tenant'
       AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.user_id = users.id)`,
    [userIds]
  );

  await client.query('COMMIT');
  await removeFiles([...docs.rows.map((r) => r.file_path), ...images.rows.map((r) => r.file_path)]);
  console.log('Purge complete.');
} catch (err) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // ignore
  }
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
