#!/usr/bin/env node
/**
 * Seed tenant portal accounts for APRTMENT-2 VILLASOL (Units 1–10).
 *
 * Usernames: Apartment2Unit1 … Apartment2Unit10
 * Shared password: SEED_TENANT_PASSWORD or tenant123
 *
 * Usage: node scripts/seed-apartment2-tenants.mjs
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
const UNIT_RENT = Number(process.env.SEED_APARTMENT2_RENT || 6000);

/**
 * Occupied units from Jun 16–Jul 15 Apartment-2 ledger.
 * Vacant (no portal account): Unit 3, Unit 8.
 * Unit 10 is a new tenant (advance/deposit); still gets a portal account.
 */
const OCCUPIED = [
  'Unit 1',
  'Unit 2',
  'Unit 4',
  'Unit 5',
  'Unit 6',
  'Unit 7',
  'Unit 9',
  'Unit 10',
];

function usernameForRoom(roomNumber) {
  const match = String(roomNumber).match(/(\d+)/);
  if (!match) throw new Error(`Cannot derive username for room ${roomNumber}`);
  return `Apartment2Unit${match[1]}`;
}

function rentForRoom(roomNumber) {
  // Unit 10 ledger shows ₱8,000 advance/deposit; others pay ₱6,000 rent.
  if (/unit\s*10/i.test(roomNumber)) return 8000;
  return UNIT_RENT;
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
     WHERE is_active = true
       AND (
         lower(trim(name)) LIKE '%aprtment-2%'
         OR lower(trim(name)) LIKE '%apartment-2%'
         OR lower(trim(name)) LIKE '%villasol%'
       )
     ORDER BY name
     LIMIT 1`
  );
  if (buildingRes.rows.length === 0) {
    throw new Error('Apartment 2 / Villasol building not found');
  }
  const building = buildingRes.rows[0];
  console.log(`Building: ${building.name.trim()} (${building.id})`);

  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 12);
  const created = [];
  const skipped = [];

  for (const roomNumber of OCCUPIED) {
    const username = usernameForRoom(roomNumber);

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

      const rent = rentForRoom(roomNumber);

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
         VALUES ($1, $2, $3, NULL, NULL, 'active', true, $4)
         RETURNING id`,
        [
          userId,
          'Tenant',
          roomNumber,
          `Seeded for APRTMENT-2 VILLASOL; portal login ${username}`,
        ]
      );
      const tenantId = tenantRes.rows[0].id;

      await client.query(
        `INSERT INTO tenant_room_assignments (
           tenant_id, room_id, start_date, monthly_rate, deposit_paid, notes,
           assignment_status, tenant_name_snapshot
         )
         VALUES ($1, $2, CURRENT_DATE, $3, 0, $4, 'active', $5)`,
        [
          tenantId,
          room.id,
          rent,
          'Seeded Apartment 2 tenant portal account',
          `Tenant ${roomNumber}`,
        ]
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
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
