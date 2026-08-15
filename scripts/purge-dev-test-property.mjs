#!/usr/bin/env node
/**
 * Hard-delete the Dev Test property and all linked tenants, rooms,
 * invoices, payments, txns, docs, pipeline cards, and portal users.
 *
 * Does not touch APARTMENT-1 / APRTMENT-2.
 *
 * Usage: node scripts/purge-dev-test-property.mjs
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

const BUILDING_NAME = 'dev test';

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

async function del(label, sql, params = []) {
  const res = await client.query(sql, params);
  const n = res.rowCount ?? 0;
  if (n > 0) console.log(`  ${label}: ${n}`);
  return n;
}

function collectPaths(rows) {
  return rows
    .map((row) => row.file_path)
    .filter((p) => typeof p === 'string' && p.trim().length > 0);
}

async function removeFiles(paths) {
  let removed = 0;
  for (const filePath of paths) {
    const abs = isAbsolute(filePath) ? filePath : join(root, filePath.replace(/^\//, ''));
    const publicAbs = filePath.startsWith('/uploads/')
      ? join(root, 'public', filePath)
      : abs;
    for (const candidate of [abs, publicAbs, join(root, 'public', filePath)]) {
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
  const buildingRes = await client.query(
    `SELECT id, name FROM buildings WHERE lower(trim(name)) = $1 LIMIT 1`,
    [BUILDING_NAME]
  );
  if (!buildingRes.rows[0]) {
    console.log('Dev Test building not found — nothing to purge.');
    process.exit(0);
  }
  const building = buildingRes.rows[0];
  if (lowerSafe(building.name) !== BUILDING_NAME) {
    throw new Error(`Refusing to purge unexpected building: ${building.name}`);
  }

  const roomsRes = await client.query(
    `SELECT id, room_number FROM rooms WHERE building_id = $1`,
    [building.id]
  );
  const roomIds = roomsRes.rows.map((r) => r.id);

  const tenantsRes = await client.query(
    `SELECT DISTINCT t.id, t.first_name, t.last_name, t.email, t.user_id
     FROM tenants t
     LEFT JOIN tenant_room_assignments tra ON tra.tenant_id = t.id
     LEFT JOIN rooms r ON r.id = tra.room_id
     WHERE r.building_id = $1
        OR t.email ILIKE ANY($2::text[])`,
    [building.id, ['dev@email.com', 'dev2@email.com', 'est@test.com']]
  );
  const tenantIds = [...new Set(tenantsRes.rows.map((t) => t.id))];

  const assignmentRes = await client.query(
    `SELECT id FROM tenant_room_assignments
     WHERE room_id = ANY($1::uuid[]) OR tenant_id = ANY($2::uuid[])`,
    [roomIds, tenantIds]
  );
  const assignmentIds = assignmentRes.rows.map((r) => r.id);

  const invoiceRes = await client.query(
    `SELECT id FROM invoices WHERE tenant_id = ANY($1::uuid[])`,
    [tenantIds]
  );
  const invoiceIds = invoiceRes.rows.map((r) => r.id);

  const paymentRes = await client.query(
    `SELECT id FROM payments
     WHERE tenant_id = ANY($1::uuid[])
        OR room_id = ANY($2::uuid[])
        OR assignment_id = ANY($3::uuid[])`,
    [tenantIds, roomIds, assignmentIds]
  );
  const paymentIds = paymentRes.rows.map((r) => r.id);

  const cardRes = await client.query(
    `SELECT id FROM pipeline_cards
     WHERE building_id = $1
        OR room_id = ANY($2::uuid[])
        OR tenant_id = ANY($3::uuid[])
        OR assignment_id = ANY($4::uuid[])
        OR invoice_id = ANY($5::uuid[])`,
    [building.id, roomIds, tenantIds, assignmentIds, invoiceIds]
  );
  const cardIds = cardRes.rows.map((r) => r.id);

  const docRes = await client.query(
    `SELECT id, file_path FROM documents
     WHERE building_id = $1
        OR room_id = ANY($2::uuid[])
        OR tenant_id = ANY($3::uuid[])
        OR pipeline_card_id = ANY($4::uuid[])`,
    [building.id, roomIds, tenantIds, cardIds]
  );
  const documentIds = docRes.rows.map((r) => r.id);

  const imageRes = await client.query(
    `SELECT id, file_path FROM images
     WHERE (entity_type = 'building' AND entity_id = $1)
        OR (entity_type = 'room' AND entity_id = ANY($2::uuid[]))
        OR (entity_type = 'tenant' AND entity_id = ANY($3::uuid[]))`,
    [building.id, roomIds, tenantIds]
  );

  const userIds = tenantsRes.rows.map((t) => t.user_id).filter(Boolean);

  const entityIds = [building.id, ...roomIds, ...tenantIds, ...assignmentIds, ...invoiceIds, ...paymentIds, ...cardIds];

  console.log(`Purging ${building.name.trim()} (${building.id})`);
  console.log(`  rooms=${roomIds.length} tenants=${tenantIds.length} invoices=${invoiceIds.length} payments=${paymentIds.length} cards=${cardIds.length}`);
  for (const t of tenantsRes.rows) {
    console.log(`  tenant ${t.first_name} ${t.last_name} <${t.email || 'no email'}>`);
  }
  for (const r of roomsRes.rows) {
    console.log(`  room ${r.room_number}`);
  }

  await client.query('BEGIN');

  await del('pipeline_card_events', `DELETE FROM pipeline_card_events WHERE card_id = ANY($1::uuid[])`, [cardIds]);
  await del(
    'documents.pipeline unlink',
    `UPDATE documents SET pipeline_card_id = NULL WHERE pipeline_card_id = ANY($1::uuid[])`,
    [cardIds]
  );
  await del(
    'pipeline_cards',
    `DELETE FROM pipeline_cards WHERE id = ANY($1::uuid[])`,
    [cardIds]
  );

  await del(
    'maintenance_update_reactions',
    `DELETE FROM maintenance_update_reactions
     WHERE update_id IN (
       SELECT u.id FROM maintenance_request_updates u
       JOIN maintenance_requests mr ON mr.id = u.maintenance_request_id
       WHERE mr.building_id = $1 OR mr.room_id = ANY($2::uuid[]) OR mr.tenant_id = ANY($3::uuid[])
     )`,
    [building.id, roomIds, tenantIds]
  );
  await del(
    'maintenance_request_updates',
    `DELETE FROM maintenance_request_updates
     WHERE maintenance_request_id IN (
       SELECT id FROM maintenance_requests
       WHERE building_id = $1 OR room_id = ANY($2::uuid[]) OR tenant_id = ANY($3::uuid[])
     )`,
    [building.id, roomIds, tenantIds]
  );
  await del(
    'maintenance_request_attachments',
    `DELETE FROM maintenance_request_attachments
     WHERE maintenance_request_id IN (
       SELECT id FROM maintenance_requests
       WHERE building_id = $1 OR room_id = ANY($2::uuid[]) OR tenant_id = ANY($3::uuid[])
     )`,
    [building.id, roomIds, tenantIds]
  );
  await del(
    'maintenance_requests',
    `DELETE FROM maintenance_requests
     WHERE building_id = $1 OR room_id = ANY($2::uuid[]) OR tenant_id = ANY($3::uuid[])`,
    [building.id, roomIds, tenantIds]
  );

  await del('lease_signature_events', `DELETE FROM lease_signature_events WHERE document_id = ANY($1::uuid[])`, [documentIds]);
  await del('lease_agreement_snapshots', `DELETE FROM lease_agreement_snapshots WHERE document_id = ANY($1::uuid[])`, [documentIds]);
  await del('documents', `DELETE FROM documents WHERE id = ANY($1::uuid[])`, [documentIds]);
  await del(
    'images',
    `DELETE FROM images
     WHERE (entity_type = 'building' AND entity_id = $1)
        OR (entity_type = 'room' AND entity_id = ANY($2::uuid[]))
        OR (entity_type = 'tenant' AND entity_id = ANY($3::uuid[]))`,
    [building.id, roomIds, tenantIds]
  );
  await del(
    'entity_notes',
    `DELETE FROM entity_notes
     WHERE entity_id = $1 OR entity_id = ANY($2::uuid[]) OR entity_id = ANY($3::uuid[])`,
    [building.id, roomIds, tenantIds]
  );
  await del(
    'activity_log',
    `DELETE FROM activity_log
     WHERE entity_id = ANY($1::uuid[])
        OR (entity_type = 'building' AND entity_id = $2)`,
    [entityIds, building.id]
  );

  await del(
    'occupants',
    `DELETE FROM occupants WHERE tenant_id = ANY($1::uuid[]) OR room_id = ANY($2::uuid[])`,
    [tenantIds, roomIds]
  );
  await del(
    'reservations',
    `DELETE FROM reservations WHERE tenant_id = ANY($1::uuid[]) OR room_id = ANY($2::uuid[])`,
    [tenantIds, roomIds]
  );
  await del('notifications', `DELETE FROM notifications WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  await del('notification_queue', `DELETE FROM notification_queue WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  await del('notification_history', `DELETE FROM notification_history WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  await del('communications', `DELETE FROM communications WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  await del('scheduled_reminders', `DELETE FROM scheduled_reminders WHERE tenant_id = ANY($1::uuid[]) OR invoice_id = ANY($2::uuid[])`, [tenantIds, invoiceIds]);
  await del('late_fee_applications', `DELETE FROM late_fee_applications WHERE tenant_id = ANY($1::uuid[]) OR invoice_id = ANY($2::uuid[]) OR late_fee_invoice_id = ANY($2::uuid[])`, [tenantIds, invoiceIds]);
  await del('invoice_effective_dues', `DELETE FROM invoice_effective_dues WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  await del('lease_expiration_alerts', `DELETE FROM lease_expiration_alerts WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);
  await del('lease_renewal_requests', `DELETE FROM lease_renewal_requests WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);

  await del(
    'moveout_inspection_items',
    `DELETE FROM moveout_inspection_items
     WHERE moveout_id IN (SELECT id FROM moveout_processing WHERE tenant_id = ANY($1::uuid[]))`,
    [tenantIds]
  );
  await del('moveout_processing', `DELETE FROM moveout_processing WHERE tenant_id = ANY($1::uuid[])`, [tenantIds]);

  await del('payment_allocations', `DELETE FROM payment_allocations WHERE invoice_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`, [invoiceIds, paymentIds]);
  await del('tenant_credits', `DELETE FROM tenant_credits WHERE tenant_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`, [tenantIds, paymentIds]);
  await del('deposit_ledger', `DELETE FROM deposit_ledger WHERE tenant_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`, [tenantIds, paymentIds]);
  await del('asset_billing', `DELETE FROM asset_billing WHERE tenant_id = ANY($1::uuid[]) OR payment_id = ANY($2::uuid[])`, [tenantIds, paymentIds]);
  await del('payments', `DELETE FROM payments WHERE id = ANY($1::uuid[])`, [paymentIds]);
  await del('invoice_line_items', `DELETE FROM invoice_line_items WHERE invoice_id = ANY($1::uuid[])`, [invoiceIds]);
  await del('invoices', `DELETE FROM invoices WHERE id = ANY($1::uuid[])`, [invoiceIds]);

  await del(
    'expenses',
    `DELETE FROM expenses WHERE building_id = $1 OR room_id = ANY($2::uuid[]) OR tenant_id = ANY($3::uuid[])`,
    [building.id, roomIds, tenantIds]
  );
  await del(
    'asset_assignments',
    `DELETE FROM asset_assignments WHERE room_id = ANY($1::uuid[]) OR tenant_id = ANY($2::uuid[])`,
    [roomIds, tenantIds]
  );
  await del('assets', `DELETE FROM assets WHERE building_id = $1`, [building.id]);

  await del('tenant_utility_bills', `DELETE FROM tenant_utility_bills WHERE building_id = $1 OR tenant_id = ANY($2::uuid[])`, [building.id, tenantIds]);
  await del(
    'utility_bill_unit_splits',
    `DELETE FROM utility_bill_unit_splits
     WHERE room_id = ANY($1::uuid[])
        OR utility_bill_id IN (SELECT id FROM utility_bills WHERE building_id = $2)`,
    [roomIds, building.id]
  );
  await del('utility_bills', `DELETE FROM utility_bills WHERE building_id = $1 OR room_id = ANY($2::uuid[])`, [building.id, roomIds]);
  await del('utility_meter_readings', `DELETE FROM utility_meter_readings WHERE building_id = $1 OR room_id = ANY($2::uuid[])`, [building.id, roomIds]);

  await del('contacts', `DELETE FROM contacts WHERE tenant_id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])`, [tenantIds, userIds]);
  await del('tenant_room_assignments', `DELETE FROM tenant_room_assignments WHERE id = ANY($1::uuid[])`, [assignmentIds]);
  await del('tenants.user unlink', `UPDATE tenants SET user_id = NULL WHERE id = ANY($1::uuid[])`, [tenantIds]);
  await del('tenants', `DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [tenantIds]);
  await del('rooms', `DELETE FROM rooms WHERE building_id = $1`, [building.id]);
  await del('buildings', `DELETE FROM buildings WHERE id = $1`, [building.id]);
  await del(
    'users',
    `DELETE FROM users
     WHERE id = ANY($1::uuid[])
       AND role = 'tenant'
       AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.user_id = users.id)`,
    [userIds]
  );
  await del('dashboard_metrics', `DELETE FROM dashboard_metrics`);

  await client.query('COMMIT');

  await removeFiles([...collectPaths(docRes.rows), ...collectPaths(imageRes.rows)]);
  console.log('Dev Test purge complete.');
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

function lowerSafe(name) {
  return String(name || '').trim().toLowerCase();
}
