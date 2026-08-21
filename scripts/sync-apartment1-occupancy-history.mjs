#!/usr/bin/env node
/**
 * Sync APARTMENT-1 BALIBAGO room occupancy history from the Start & End Date
 * draft spreadsheet.
 *
 * Records per occupancy row:
 *   unit, start (move in), total deposited, monthly rent, utility deposit, end (move out)
 *
 * Does not change who is currently occupied — Jun 16–Jul 15 ledger remains
 * source of truth for occupancy. Past rows become terminated assignments.
 * "Up to present" rows update the existing active lease when the room is occupied.
 * No deposit/rent payment rows are created (those belong to the cash ledger).
 *
 * Usage:
 *   node scripts/sync-apartment1-occupancy-history.mjs
 *   OCCUPANCY_XLSX=/path/to/file.xlsx node scripts/sync-apartment1-occupancy-history.mjs
 */
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const BUILDING_PATTERN = '%apartment-1%';
const NOTE_TAG = '[excel-occupancy-history:apt1]';
const DEFAULT_XLSX =
  process.env.OCCUPANCY_XLSX ||
  '/Users/adrianestopace/Downloads/Draft Records for Start & End Date_9a84e453-4967-4099-849b-4397e7e40384.xlsx';

/** Encoded fallback when the xlsx is not on disk (units 1–9 from the draft). */
const FALLBACK_ROWS = [
  { room: 'Unit 1', name: 'Roberto Labaton', start: '2023-05-12', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2023-11-04' },
  { room: 'Unit 1', note: 'terminated 8/7/23 contract cash refund 8,345 frm Abel budget', start: '2024-02-17', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2025-01-17' },
  { room: 'Unit 1', name: 'Crispin D. Manuel', phone: null, note: 'New Tenant', start: '2025-03-02', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2025-11-03' },
  { room: 'Unit 1', start: '2026-02-15', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 2', note: 'Old Tenant', start: '2023-11-08', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 3', name: 'Princes Mañebog', start: '2023-05-31', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2023-12-22' },
  { room: 'Unit 3', note: 'temporary only paid 1 month up to end of June', start: '2024-02-13', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2025-02-09' },
  { room: 'Unit 3', name: 'Eugene Villafranca', start: '2025-03-03', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2026-02-03' },
  { room: 'Unit 3', start: '2026-07-13', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 4', name: 'Nihaya Nanagun', start: '2023-06-29', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2023-12-20' },
  { room: 'Unit 4', start: '2024-02-29', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2026-01-19' },
  { room: 'Unit 4', start: '2026-04-28', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 5', start: '2023-11-14', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2024-05-14' },
  { room: 'Unit 5', start: '2024-05-16', totalDeposited: 10600, rent: 4800, utilityDeposit: 1000, end: '2024-08-16' },
  { room: 'Unit 5', start: '2024-10-10', totalDeposited: 10600, rent: 4800, utilityDeposit: 1000, end: '2025-01-10' },
  { room: 'Unit 5', start: '2025-07-23', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2026-01-13' },
  { room: 'Unit 5', start: '2026-01-17', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, end: '2026-06-17' },
  { room: 'Unit 6', start: '2023-12-07', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 7', name: 'Allan Gundran', start: '2023-05-22', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 8', name: 'Derick Claveria', start: '2023-09-25', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
  { room: 'Unit 9', name: 'Ronnalyn Cuna Lopez', phone: '09494113840', start: '2023-08-24', totalDeposited: 15400, rent: 4800, utilityDeposit: 1000, current: true },
];

function cellText(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((t) => t.text).join('').trim();
    if (value.text) return String(value.text).trim();
    if (value.result != null) return cellText(value.result);
    if (value.hyperlink) return String(value.text || value.hyperlink).trim();
  }
  return String(value).trim();
}

function toIsoDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = cellText(value);
  if (!text) return null;
  if (/^up to present$/i.test(text) || /^vacant$/i.test(text)) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    return epoch.toISOString().slice(0, 10);
  }
  return null;
}

function toNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = cellText(value).replace(/[₱$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeRoom(raw) {
  const text = cellText(raw);
  if (!text) return null;
  if (/^store$/i.test(text) || /unit\s*no\.?\s*store/i.test(text)) return 'Store';
  const match = text.match(/(\d+)/);
  if (!match) return null;
  return `Unit ${Number(match[1])}`;
}

function classifyName(raw) {
  const text = cellText(raw);
  if (!text) return { name: null, note: null };
  if (/^(old tenant|new tenant)$/i.test(text)) return { name: null, note: text };
  if (/terminated|refund|temporary|paid 1 month|contract cash|frm abel/i.test(text)) {
    return { name: null, note: text };
  }
  return { name: text, note: null };
}

function classifyPhone(raw) {
  const text = cellText(raw);
  if (!text || /new tenant|old tenant/i.test(text)) return null;
  if (!/\d{7,}/.test(text.replace(/\s+/g, ''))) return null;
  return text;
}

function splitName(full) {
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Former', last: 'occupant' };
  if (parts.length === 1) return { first: parts[0], last: 'Tenant' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function isPlaceholderName(first, last, roomNumber) {
  return (
    String(first || '').toLowerCase() === 'tenant' &&
    String(last || '').toLowerCase() === String(roomNumber || '').toLowerCase()
  );
}

/**
 * Excel "Total Amount Deposited" is security + advance + utility.
 * Split so assignment columns match the rest of the app.
 */
function splitDeposits(totalDeposited, utilityDeposit, rent) {
  const utility = Number(utilityDeposit) || 0;
  const leftover = Math.max(0, (Number(totalDeposited) || 0) - utility);
  const monthly = Number(rent) || 0;
  if (monthly > 0 && leftover + 0.01 >= 3 * monthly) {
    return { deposit: leftover - monthly, advance: monthly, utility };
  }
  if (monthly > 0 && leftover + 0.01 >= 2 * monthly) {
    return { deposit: leftover - monthly, advance: monthly, utility };
  }
  return { deposit: leftover, advance: 0, utility };
}

function isCurrentEnd(value) {
  return /^up to present$/i.test(cellText(value));
}

async function parseWorkbook(xlsxPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet =
    workbook.worksheets.find((ws) => /apartment/i.test(ws.name)) || workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found');

  const rows = [];
  const maxRow = sheet.actualRowCount || sheet.rowCount || 0;
  for (let r = 4; r <= maxRow; r += 1) {
    const row = sheet.getRow(r);
    const startCell = row.getCell(5).value;
    const startText = cellText(startCell);
    if (!startText || /^vacant$/i.test(startText) || /^unit no/i.test(startText)) continue;

    const start = toIsoDate(startCell);
    if (!start) continue;

    const room = normalizeRoom(row.getCell(2).value);
    if (!room) continue;

    const classified = classifyName(row.getCell(3).value);
    const endCell = row.getCell(9).value;
    const currentFromText = isCurrentEnd(endCell);
    const end = currentFromText ? null : toIsoDate(endCell);
    const current = currentFromText || !end;

    rows.push({
      room,
      name: classified.name,
      note: classified.note,
      phone: classifyPhone(row.getCell(4).value),
      start,
      totalDeposited: toNumber(row.getCell(6).value),
      rent: toNumber(row.getCell(7).value),
      utilityDeposit: toNumber(row.getCell(8).value),
      end,
      current,
    });
  }
  return rows;
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

const counts = {
  historyInserted: 0,
  historyUpdated: 0,
  currentUpdated: 0,
  named: 0,
  skipped: 0,
};

try {
  let rows = FALLBACK_ROWS;
  let source = 'encoded fallback (units 1–9)';
  if (existsSync(DEFAULT_XLSX)) {
    rows = await parseWorkbook(DEFAULT_XLSX);
    source = DEFAULT_XLSX;
  }
  if (rows.length === 0) throw new Error('No occupancy rows parsed');
  console.log(`Source: ${source}`);
  console.log(`Occupancy rows: ${rows.length}`);

  const buildingRes = await client.query(
    `SELECT id, name FROM buildings
     WHERE COALESCE(is_active, true) = true AND lower(trim(name)) LIKE $1
     ORDER BY name LIMIT 1`,
    [BUILDING_PATTERN]
  );
  if (buildingRes.rows.length === 0) {
    throw new Error('APARTMENT-1 BALIBAGO not found');
  }
  const building = buildingRes.rows[0];
  console.log(`Building: ${building.name} (${building.id})`);

  const hasIsTenant = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'tenants' AND column_name = 'is_tenant'`
  );

  async function findRoom(roomNumber) {
    const res = await client.query(
      `SELECT id, room_number, monthly_rate, room_status
       FROM rooms
       WHERE building_id = $1 AND COALESCE(is_active, true) = true
         AND lower(room_number) = lower($2)
       LIMIT 1`,
      [building.id, roomNumber]
    );
    return res.rows[0] || null;
  }

  async function findActive(roomId) {
    const res = await client.query(
      `SELECT tra.id, tra.tenant_id, tra.start_date, tra.end_date, tra.notes,
              tra.monthly_rate,
              t.first_name, t.last_name, t.user_id, t.phone
       FROM tenant_room_assignments tra
       LEFT JOIN tenants t ON t.id = tra.tenant_id
       WHERE tra.room_id = $1
         AND tra.assignment_status = 'active'
         AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
       LIMIT 1`,
      [roomId]
    );
    return res.rows[0] || null;
  }

  async function findHistory(roomId, startDate) {
    const res = await client.query(
      `SELECT id FROM tenant_room_assignments
       WHERE room_id = $1 AND start_date = $2::date
         AND (
           notes ILIKE $3
           OR assignment_status = 'terminated'
         )
       ORDER BY created_at ASC
       LIMIT 1`,
      [roomId, startDate, `%${NOTE_TAG}%`]
    );
    return res.rows[0] || null;
  }

  function assignmentNotes(row) {
    const bits = [NOTE_TAG];
    if (row.note) bits.push(row.note);
    if (row.totalDeposited != null) bits.push(`Total deposited ₱${Number(row.totalDeposited)}`);
    return bits.join(' — ');
  }

  async function upsertFormerTenant(row) {
    if (!row.name) return null;
    const { first, last } = splitName(row.name);
    const existing = await client.query(
      `SELECT t.id
       FROM tenants t
       JOIN tenant_room_assignments tra ON tra.tenant_id = t.id
       JOIN rooms r ON r.id = tra.room_id
       WHERE r.building_id = $1
         AND lower(t.first_name) = lower($2)
         AND lower(t.last_name) = lower($3)
       LIMIT 1`,
      [building.id, first, last]
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const inserted = await client.query(
      `INSERT INTO tenants (
         first_name, last_name, phone, tenant_status, is_active,
         move_in_date, move_out_date, lease_start_date, lease_end_date,
         security_deposit, notes
       ) VALUES (
         $1, $2, $3, 'inactive', true,
         $4::date, $5::date, $4::date, $5::date,
         $6, $7
       ) RETURNING id`,
      [
        first,
        last,
        row.phone || null,
        row.start,
        row.end || null,
        splitDeposits(row.totalDeposited, row.utilityDeposit, row.rent).deposit,
        `${NOTE_TAG} former occupant ${row.room}`,
      ]
    );
    const tenantId = inserted.rows[0].id;
    if (hasIsTenant.rows.length > 0) {
      await client.query(`UPDATE tenants SET is_tenant = false WHERE id = $1`, [tenantId]);
    }
    counts.named += 1;
    return tenantId;
  }

  async function insertOrUpdateHistory(room, row, split, snapshotName, tenantId) {
    const existing = await findHistory(room.id, row.start);
    if (existing) {
      await client.query(
        `UPDATE tenant_room_assignments
         SET end_date = $1::date,
             monthly_rate = $2,
             deposit_paid = $3,
             advance_paid = $4,
             utility_deposit_paid = $5,
             assignment_status = 'terminated',
             notes = $6,
             tenant_name_snapshot = COALESCE(NULLIF($7, ''), tenant_name_snapshot),
             tenant_phone_snapshot = COALESCE($8, tenant_phone_snapshot),
             tenant_id = COALESCE(tenant_id, $9),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`,
        [
          row.end || null,
          row.rent ?? room.monthly_rate,
          split.deposit,
          split.advance,
          split.utility,
          assignmentNotes(row),
          snapshotName,
          row.phone || null,
          tenantId,
          existing.id,
        ]
      );
      counts.historyUpdated += 1;
      return;
    }

    await client.query(
      `INSERT INTO tenant_room_assignments (
         tenant_id, room_id, start_date, end_date, monthly_rate,
         deposit_paid, advance_paid, utility_deposit_paid,
         assignment_status, notes, tenant_name_snapshot, tenant_phone_snapshot
       ) VALUES (
         $1, $2, $3::date, $4::date, $5,
         $6, $7, $8,
         'terminated', $9, $10, $11
       )`,
      [
        tenantId,
        room.id,
        row.start,
        row.end || null,
        row.rent ?? room.monthly_rate,
        split.deposit,
        split.advance,
        split.utility,
        assignmentNotes(row),
        snapshotName,
        row.phone || null,
      ]
    );
    counts.historyInserted += 1;
  }

  for (const row of rows) {
    const room = await findRoom(row.room);
    if (!room) {
      console.log(`  skip ${row.room}: room not found`);
      counts.skipped += 1;
      continue;
    }

    const split = splitDeposits(row.totalDeposited, row.utilityDeposit, row.rent);
    const snapshotName = row.name || 'Former occupant';
    const active = await findActive(room.id);

    if (row.rent && Number(room.monthly_rate || 0) <= 0) {
      await client.query(
        `UPDATE rooms SET monthly_rate = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [row.rent, room.id]
      );
    }

    await client.query('BEGIN');
    try {
      if (row.current && active) {
        const activeStart = String(active.start_date).slice(0, 10);
        await client.query(
          `UPDATE tenant_room_assignments
           SET start_date = $1::date,
               end_date = NULL,
               monthly_rate = $2,
               deposit_paid = $3,
               advance_paid = $4,
               utility_deposit_paid = $5,
               notes = CASE
                 WHEN notes ILIKE $6 THEN notes
                 WHEN notes IS NULL OR notes = '' THEN $7
                 ELSE notes || E'\\n' || $7
               END,
               tenant_name_snapshot = CASE
                 WHEN $8::text IS NOT NULL THEN $8
                 ELSE tenant_name_snapshot
               END,
               tenant_phone_snapshot = COALESCE($9, tenant_phone_snapshot),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $10`,
          [
            row.start,
            row.rent ?? active.monthly_rate,
            split.deposit,
            split.advance,
            split.utility,
            `%${NOTE_TAG}%`,
            assignmentNotes(row),
            row.name || null,
            row.phone || null,
            active.id,
          ]
        );

        if (active.tenant_id) {
          await client.query(
            `UPDATE tenants
             SET move_in_date = $1::date,
                 lease_start_date = $1::date,
                 move_out_date = NULL,
                 lease_end_date = NULL,
                 security_deposit = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [row.start, split.deposit, active.tenant_id]
          );

          if (row.name && isPlaceholderName(active.first_name, active.last_name, room.room_number)) {
            const { first, last } = splitName(row.name);
            await client.query(
              `UPDATE tenants
               SET first_name = $1, last_name = $2, phone = COALESCE($3, phone),
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $4`,
              [first, last, row.phone || null, active.tenant_id]
            );
            if (active.user_id) {
              await client.query(
                `UPDATE users
                 SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [first, last, active.user_id]
              );
            }
            await client.query(
              `UPDATE contacts
               SET first_name = $1, last_name = $2, phone = COALESCE($3, phone),
                   updated_at = CURRENT_TIMESTAMP
               WHERE tenant_id = $4`,
              [first, last, row.phone || null, active.tenant_id]
            );
            counts.named += 1;
          }
        }

        counts.currentUpdated += 1;
        console.log(
          `  ${room.room_number}: current start ${activeStart} → ${row.start}` +
            (row.name ? ` (${row.name})` : '')
        );

        const leftover = await client.query(
          `DELETE FROM tenant_room_assignments
           WHERE room_id = $1
             AND start_date = $2::date
             AND assignment_status = 'terminated'
             AND notes ILIKE $3
           RETURNING tenant_id`,
          [room.id, row.start, `%${NOTE_TAG}%`]
        );
        for (const extra of leftover.rows) {
          if (!extra.tenant_id || extra.tenant_id === active.tenant_id) continue;
          const other = await client.query(
            `SELECT COUNT(*)::int AS n FROM tenant_room_assignments WHERE tenant_id = $1`,
            [extra.tenant_id]
          );
          const portal = await client.query(
            `SELECT user_id FROM tenants WHERE id = $1`,
            [extra.tenant_id]
          );
          if ((other.rows[0]?.n || 0) === 0 && !portal.rows[0]?.user_id) {
            await client.query(`DELETE FROM tenants WHERE id = $1`, [extra.tenant_id]);
          }
        }
      } else {
        const tenantId = row.name ? await upsertFormerTenant(row) : null;
        const vacantCurrentNote = row.current && !active
          ? { ...row, note: [row.note, 'Draft listed current; Jun 16–Jul 15 ledger vacant'].filter(Boolean).join(' — ') }
          : row;
        await insertOrUpdateHistory(room, vacantCurrentNote, split, snapshotName, tenantId);
        console.log(
          `  ${room.room_number}: history ${row.start} → ${row.end || (row.current ? 'present (vacant now)' : '—')}` +
            (row.name ? ` ${row.name}` : '')
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log('\nDone');
  console.log(`  current leases updated: ${counts.currentUpdated}`);
  console.log(`  history inserted: ${counts.historyInserted}`);
  console.log(`  history updated: ${counts.historyUpdated}`);
  console.log(`  named people: ${counts.named}`);
  console.log(`  skipped: ${counts.skipped}`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}
