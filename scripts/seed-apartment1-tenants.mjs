#!/usr/bin/env node
/**
 * Seed real-life tenant portal accounts for APARTMENT-1 BALIBAGO occupied units.
 *
 * Usernames: Apartment1Unit1 … Apartment1Unit29, Apartment1Store
 * Shared password: SEED_TENANT_PASSWORD or tenant123
 *
 * Usage: node scripts/seed-apartment1-tenants.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const SHARED_PASSWORD = process.env.SEED_TENANT_PASSWORD || 'tenant123';
const BUILDING_NAME = 'APARTMENT-1 BALIBAGO';
const UNIT_RENT = 4800;
const STORE_RENT = 3500;

/** Occupied units from June 16–July 15 apartment ledger. Vacant: 5, 8, 9, 28, 30. */
const OCCUPIED = [
  'Unit 1',
  'Unit 2',
  'Unit 3',
  'Unit 4',
  'Unit 6',
  'Unit 7',
  'Unit 10',
  'Unit 11',
  'Unit 12',
  'Unit 13',
  'Unit 14',
  'Unit 15',
  'Unit 16',
  'Unit 17',
  'Unit 18',
  'Unit 19',
  'Unit 20',
  'Unit 21',
  'Unit 22',
  'Unit 23',
  'Unit 24',
  'Unit 25',
  'Unit 26',
  'Unit 27',
  'Unit 29',
  'Store',
];

function usernameForRoom(roomNumber) {
  if (/^store$/i.test(roomNumber)) return 'Apartment1Store';
  const match = String(roomNumber).match(/(\d+)/);
  if (!match) throw new Error(`Cannot derive username for room ${roomNumber}`);
  return `Apartment1Unit${match[1]}`;
}

function rentForRoom(roomNumber) {
  return /^store$/i.test(roomNumber) ? STORE_RENT : UNIT_RENT;
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
  const buildingRes = await client.query(
    `SELECT id, name FROM buildings
     WHERE is_active = true AND lower(name) = lower($1)
     LIMIT 1`,
    [BUILDING_NAME]
  );
  if (buildingRes.rows.length === 0) {
    throw new Error(`Building not found: ${BUILDING_NAME}`);
  }
  const building = buildingRes.rows[0];
  console.log(`Building: ${building.name} (${building.id})`);

  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 12);
  const created = [];
  const skipped = [];

  for (const roomNumber of OCCUPIED) {
    const username = usernameForRoom(roomNumber);
    const rent = rentForRoom(roomNumber);

    await client.query('BEGIN');
    try {
      const roomRes = await client.query(
        `SELECT id, room_number, monthly_rate
         FROM rooms
         WHERE building_id = $1 AND is_active = true
           AND lower(room_number) = lower($2)
         LIMIT 1`,
        [building.id, roomNumber]
      );
      if (roomRes.rows.length === 0) {
        throw new Error(`Room not found: ${roomNumber}`);
      }
      const room = roomRes.rows[0];

      const existingUser = await client.query(
        `SELECT id FROM users WHERE lower(username) = lower($1) LIMIT 1`,
        [username]
      );
      if (existingUser.rows.length > 0) {
        skipped.push({ roomNumber, username, reason: 'username exists' });
        await client.query('ROLLBACK');
        continue;
      }

      const activeAssignment = await client.query(
        `SELECT id FROM tenant_room_assignments
         WHERE room_id = $1 AND assignment_status = 'active'
           AND (end_date IS NULL OR end_date > CURRENT_DATE)
         LIMIT 1`,
        [room.id]
      );
      if (activeAssignment.rows.length > 0) {
        skipped.push({ roomNumber, username, reason: 'room already assigned' });
        await client.query('ROLLBACK');
        continue;
      }

      await client.query(
        `UPDATE rooms
         SET monthly_rate = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [rent, room.id]
      );

      const userRes = await client.query(
        `INSERT INTO users (
           email, username, password_hash, role, first_name, last_name,
           is_active, profile_completed
         )
         VALUES (NULL, $1, $2, 'tenant', $3, $4, true, false)
         RETURNING id`,
        [username, passwordHash, 'Tenant', roomNumber]
      );
      const userId = userRes.rows[0].id;

      const tenantRes = await client.query(
        `INSERT INTO tenants (
           user_id, first_name, last_name, email, phone,
           tenant_status, is_active, notes
         )
         VALUES ($1, $2, $3, NULL, NULL, 'active', true, NULL)
         RETURNING id`,
        [userId, 'Tenant', roomNumber]
      );
      const tenantId = tenantRes.rows[0].id;

      await client.query(
        `INSERT INTO tenant_room_assignments (
           tenant_id, room_id, start_date, monthly_rate, deposit_paid, notes,
           assignment_status, tenant_name_snapshot
         )
         VALUES ($1, $2, CURRENT_DATE, $3, 0, NULL, 'active', $4)`,
        [tenantId, room.id, rent, `Tenant ${roomNumber}`]
      );

      await client.query(
        `UPDATE rooms
         SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [room.id]
      );

      await client.query('COMMIT');
      created.push({ roomNumber, username, rent, userId, tenantId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log(`\nCreated ${created.length} tenant accounts:`);
  for (const row of created) {
    console.log(`  ${row.roomNumber.padEnd(10)} → ${row.username}  (₱${row.rent})`);
  }
  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length}:`);
    for (const row of skipped) {
      console.log(`  ${row.roomNumber}: ${row.reason}`);
    }
  }
  console.log(`\nShared password: ${SHARED_PASSWORD}`);
  console.log('Tenants must complete profile (email, name, username, phone) on first login.');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
