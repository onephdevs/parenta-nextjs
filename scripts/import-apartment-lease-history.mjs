#!/usr/bin/env node
/**
 * Import apartment lease history from the Start & End Date Excel draft
 * into `tenants` (Person) + `tenant_room_assignments` (Lease).
 *
 * There is no Person / Lease table. Mapping:
 *   Person  → tenants (permanent identity; is_tenant is derived from occupancy)
 *   Room    → rooms (room_number like "Unit 1"; denormalized room_status)
 *   Lease   → tenant_room_assignments (start_date / end_date / assignment_status)
 *
 * Dry-run is the default. Nothing is written unless you pass --commit
 * after reviewing the report. Flagged anomalies are never written.
 *
 * Usage:
 *   node scripts/import-apartment-lease-history.mjs
 *   node scripts/import-apartment-lease-history.mjs --apartment=1
 *   node scripts/import-apartment-lease-history.mjs --file=data/imports/apartment1-balibago-lease-history.xlsx
 *   node scripts/import-apartment-lease-history.mjs --json
 *   node scripts/import-apartment-lease-history.mjs --commit
 *
 * Apartment 2 later:
 *   node scripts/import-apartment-lease-history.mjs --apartment=2 --file=data/imports/apartment2-villasol-lease-history.xlsx
 */
import { config } from 'dotenv';
import { dirname, join, resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  DEPOSIT_TEMPLATES,
  parseLeaseHistoryWorkbook,
  splitPersonName,
  normalizePersonName,
  normalizePhone,
  isDummyPerson,
} from './lib/lease-history-parse.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env.local') });
config({ path: join(root, '.env') });

const APARTMENTS = {
  1: {
    id: 1,
    buildingName: 'APARTMENT-1 BALIBAGO',
    buildingPattern: '%apartment-1%',
    defaultFile: join(root, 'data/imports/apartment1-balibago-lease-history.xlsx'),
    depositTemplate: DEPOSIT_TEMPLATES.apartment1,
    noteTag: '[excel-lease-history:apt1]',
    legacyNoteTag: '[excel-occupancy-history:apt1]',
  },
  2: {
    id: 2,
    buildingName: 'APRTMENT-2 VILLASOL',
    buildingPattern: '%aprtment-2%',
    defaultFile: join(root, 'data/imports/apartment2-villasol-lease-history.xlsx'),
    depositTemplate: DEPOSIT_TEMPLATES.apartment2,
    noteTag: '[excel-lease-history:apt2]',
    legacyNoteTag: '[excel-occupancy-history:apt2]',
  },
};

function parseArgs(argv) {
  const args = { apartment: 1, commit: false, json: false, file: null };
  for (const raw of argv.slice(2)) {
    if (raw === '--commit') args.commit = true;
    else if (raw === '--json') args.json = true;
    else if (raw.startsWith('--apartment=')) args.apartment = Number(raw.split('=')[1]);
    else if (raw.startsWith('--file=')) args.file = raw.slice('--file='.length);
    else if (raw === '--help' || raw === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${raw}`);
  }
  return args;
}

function peso(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `₱${v.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function namesMatch(a, b) {
  return normalizePersonName(a) === normalizePersonName(b);
}

function personFullName(p) {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim();
}

function assignmentNotes(cfg, period) {
  const bits = [cfg.noteTag];
  if (period.notes) bits.push(period.notes);
  if (period.totalDeposited != null) bits.push(`Total deposited ${peso(period.totalDeposited)}`);
  if (!period.split.matched && period.split.actual != null) {
    bits.push(`Deposit split unresolved (actual ${peso(period.split.actual)} vs expected ${peso(period.split.expected)})`);
  }
  return bits.join(' — ');
}

function connectClient() {
  const url = (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(
    /[?&]pgbouncer=true/g,
    ''
  );
  if (!url) {
    throw new Error('DIRECT_URL or DATABASE_URL is required');
  }
  return new pg.Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('vercel') ? { rejectUnauthorized: false } : undefined,
  });
}

async function loadBuilding(client, cfg) {
  const exact = await client.query(
    `SELECT id, name FROM buildings
     WHERE COALESCE(is_active, true) = true AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [cfg.buildingName]
  );
  if (exact.rows[0]) return exact.rows[0];
  const like = await client.query(
    `SELECT id, name FROM buildings
     WHERE COALESCE(is_active, true) = true AND lower(trim(name)) LIKE $1
     ORDER BY name LIMIT 1`,
    [cfg.buildingPattern]
  );
  if (!like.rows[0]) {
    throw new Error(`Building not found: ${cfg.buildingName}`);
  }
  return like.rows[0];
}

async function loadRooms(client, buildingId) {
  const res = await client.query(
    `SELECT r.id, r.room_number, r.room_status, r.monthly_rate
     FROM rooms r
     WHERE r.building_id = $1 AND COALESCE(r.is_active, true) = true
     ORDER BY r.room_number`,
    [buildingId]
  );
  const byNumber = new Map();
  for (const row of res.rows) {
    byNumber.set(String(row.room_number).toLowerCase(), row);
  }
  return byNumber;
}

async function loadPeople(client) {
  const res = await client.query(
    `SELECT t.id, t.first_name, t.last_name, t.phone, t.email, t.user_id,
            t.is_tenant, t.tenant_status, t.is_active
     FROM tenants t
     WHERE COALESCE(t.is_active, true) = true`
  );
  return res.rows;
}

async function loadRoomOccupancy(client, roomIds) {
  if (roomIds.length === 0) return new Map();
  const res = await client.query(
    `SELECT tra.id, tra.room_id, tra.tenant_id,
            to_char(tra.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(tra.end_date, 'YYYY-MM-DD') AS end_date,
            tra.assignment_status, tra.monthly_rate, tra.deposit_paid,
            tra.advance_paid, tra.utility_deposit_paid, tra.notes,
            tra.tenant_name_snapshot, tra.tenant_phone_snapshot,
            t.first_name, t.last_name, t.phone, t.user_id, t.is_tenant
     FROM tenant_room_assignments tra
     LEFT JOIN tenants t ON t.id = tra.tenant_id
     WHERE tra.room_id = ANY($1::uuid[])
     ORDER BY tra.start_date, tra.created_at`,
    [roomIds]
  );
  const byRoom = new Map();
  for (const row of res.rows) {
    const key = row.room_id;
    if (!byRoom.has(key)) byRoom.set(key, []);
    byRoom.get(key).push(row);
  }
  return byRoom;
}

function findPersonMatches(people, name, phone) {
  const wantName = normalizePersonName(name);
  const wantPhone = normalizePhone(phone);
  if (!wantName) return [];
  return people.filter((p) => {
    if (!namesMatch(personFullName(p), name)) return false;
    if (!wantPhone || !p.phone) return true;
    const got = normalizePhone(p.phone);
    return !got || got === wantPhone;
  });
}

function findActiveAssignment(assignments) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    (assignments || []).find(
      (a) => a.assignment_status === 'active' && (a.end_date == null || a.end_date >= today)
    ) || null
  );
}

function findDummyOnRoom(assignments, roomNumber) {
  const active = findActiveAssignment(assignments);
  if (!active) return null;
  if (!isDummyPerson(active.first_name, active.last_name, roomNumber)) return null;
  return {
    assignmentId: active.id,
    tenantId: active.tenant_id,
    firstName: active.first_name,
    lastName: active.last_name,
    hasPortal: Boolean(active.user_id),
    startDate: active.start_date || null,
  };
}

function findAssignment(assignments, startDate) {
  return (assignments || []).find((a) => a.start_date === startDate) || null;
}

function periodBlocked(period, unitFlags) {
  if (period.flags.some((f) => f.blockCommit)) return true;
  return unitFlags.some(
    (f) =>
      f.blockCommit &&
      String(f.unitNumber)
        .split('+')
        .map((s) => s.trim())
        .includes(period.unitNumber)
  );
}

function resolvePeriodAgainstDb(period, { room, assignments, people, unitFlags, extraDummies }) {
  const flags = [...period.flags];
  const dummy = room ? findDummyOnRoom(assignments, period.unitNumber) : null;
  const existing = room ? findAssignment(assignments, period.startDate) : null;
  const activeAssignment = room ? findActiveAssignment(assignments) : null;
  const matches = period.resolvedName ? findPersonMatches(people, period.resolvedName, period.phone) : [];
  const blocked = periodBlocked(period, unitFlags);

  if (period.active && room && String(room.room_status || '').toLowerCase() === 'vacant') {
    flags.push({
      code: 'sheet_active_room_vacant',
      blockCommit: true,
      detail: `Sheet lease would be active but ${period.unitNumber} is vacant in the app (ledger occupancy). Will not occupy.`,
    });
  }

  if (extraDummies.length > 1) {
    flags.push({
      code: 'duplicate_dummy_people',
      blockCommit: false,
      detail: `${extraDummies.length} dummy people named "Tenant ${period.unitNumber}" exist in tenants`,
    });
  }

  let personAction = 'none';
  let person = null;
  let dummyReplace = null;

  if (period.active && dummy && period.resolvedName && !isDummyPerson(...splitNameParts(period.resolvedName), period.unitNumber)) {
    dummyReplace = {
      room: period.unitNumber,
      dummyName: `Tenant ${period.unitNumber}`,
      dummyTenantId: dummy.tenantId,
      excelName: period.resolvedName,
      hasPortal: dummy.hasPortal,
      existingSameName: matches.map((m) => ({ id: m.id, name: personFullName(m), isTenant: m.is_tenant })),
    };
    personAction = 'rename_dummy';
    person = {
      id: dummy.tenantId,
      first_name: dummy.firstName,
      last_name: dummy.lastName,
    };
    if (matches.some((m) => m.id !== dummy.tenantId)) {
      flags.push({
        code: 'dummy_rename_vs_existing_person',
        blockCommit: false,
        detail: `Former Person "${period.resolvedName}" already exists. Commit would rename the dummy in place (portal/invoices stay on dummy id) and leave the former row — merge later if they are the same human.`,
      });
    }
  } else if (matches.length === 1) {
    personAction = 'reuse';
    person = matches[0];
  } else if (matches.length > 1) {
    personAction = 'ambiguous';
    flags.push({
      code: 'ambiguous_person',
      blockCommit: true,
      detail: `Multiple Person rows match "${period.resolvedName}"`,
    });
  } else if (period.resolvedName) {
    personAction = 'create';
  }

  let dbAction = 'skip';
  if (!room) dbAction = 'fail_missing_room';
  else if (blocked || flags.some((f) => f.blockCommit)) {
    dbAction = existing ? 'already_present_flagged' : 'flagged_skip';
  } else if (period.active && dummy && personAction === 'rename_dummy') {
    dbAction = 'update_dummy';
  } else if (existing && !existing.tenant_id && personAction === 'reuse') {
    dbAction = 'fix_attach_person';
  } else if (existing) {
    dbAction = 'already_imported';
  } else if (period.active && activeAssignment && !dummy) {
    flags.push({
      code: 'active_lease_already_present',
      blockCommit: true,
      detail: `Room already has an active lease (${activeAssignment.start_date} → ${activeAssignment.end_date || 'present'}, ${activeAssignment.first_name || ''} ${activeAssignment.last_name || ''}). Will not insert a second active occupancy.`,
    });
    dbAction = 'flagged_skip';
  } else {
    dbAction = 'create_lease';
  }

  return {
    ...period,
    flags,
    blocked: blocked || flags.some((f) => f.blockCommit),
    roomId: room?.id || null,
    roomStatus: room?.room_status || null,
    dummyReplace,
    personAction,
    personId: person?.id || null,
    personName: person ? personFullName(person) : null,
    existingAssignmentId:
      period.active && dummy && personAction === 'rename_dummy'
        ? dummy.assignmentId
        : existing?.id || null,
    dbAction,
  };
}

function splitNameParts(full) {
  const { firstName, lastName } = splitPersonName(full);
  return [firstName, lastName];
}

function printReport(report) {
  console.log(`\n=== ${report.apartment.label} ===`);
  console.log(`Building : ${report.building.name} (${report.building.id})`);
  console.log(`Source   : ${report.source}`);
  console.log(`Sheet    : ${report.sheetName}`);
  console.log(`Mode     : ${report.commit ? 'COMMIT' : 'DRY-RUN (no writes)'}`);
  console.log(`Template : ${report.depositTemplate}`);
  console.log('');

  if (report.missingRooms.length) {
    console.log('MISSING ROOMS (fatal):');
    for (const u of report.missingRooms) console.log(`  - ${u}`);
    console.log('');
  }

  const blockingFlags = report.unitFlags.filter((f) => f.blockCommit);
  const warningFlags = report.unitFlags.filter((f) => !f.blockCommit);
  if (blockingFlags.length) {
    console.log('UNIT ANOMALIES (blocked — not written on --commit):');
    for (const f of blockingFlags) {
      console.log(`  [${f.unitNumber}] ${f.code}: ${f.detail}`);
    }
    console.log('');
  }
  if (warningFlags.length) {
    console.log('UNIT WARNINGS (review; dummy rename on the occupied room is still allowed):');
    for (const f of warningFlags) {
      console.log(`  [${f.unitNumber}] ${f.code}: ${f.detail}`);
    }
    console.log('');
  }

  if (report.skipped.length) {
    console.log('SKIPPED ROWS:');
    for (const s of report.skipped) {
      console.log(`  ${s.unitNumber} row ${s.excelRow}: ${s.reason} — ${s.detail}`);
    }
    console.log('');
  }

  const dummyLines = report.periods.filter((p) => p.dummyReplace);
  if (dummyLines.length) {
    console.log('DUMMY TENANT REPLACEMENTS:');
    const seen = new Set();
    for (const p of dummyLines) {
      const d = p.dummyReplace;
      const key = `${d.room}|${d.dummyTenantId}|${d.excelName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const extra = d.existingSameName.length
        ? ` (former Person already exists: ${d.existingSameName.map((x) => x.id.slice(0, 8)).join(', ')})`
        : '';
      console.log(
        `  Room ${d.room}: dummy tenant ${d.dummyName} would be replaced by ${d.excelName}` +
          (d.hasPortal ? ' [has portal login]' : '') +
          extra
      );
    }
    console.log('');
  }

  const byUnit = new Map();
  for (const p of report.periods) {
    if (!byUnit.has(p.unitNumber)) byUnit.set(p.unitNumber, []);
    byUnit.get(p.unitNumber).push(p);
  }

  for (const [unit, rows] of byUnit) {
    const status = rows[0]?.sheetStatus || '';
    const roomStatus = rows[0]?.roomStatus || 'missing';
    console.log(`--- ${unit}  sheet=${status || '—'}  app=${roomStatus} ---`);
    for (const p of rows) {
      const end = p.active ? 'present' : p.endDate || '—';
      const split = p.split.matched
        ? `dep ${peso(p.split.deposit)} / adv ${peso(p.split.advance)} / util ${peso(p.split.utility)}`
        : `UNSPLIT actual ${peso(p.split.actual)} expected ${peso(p.split.expected)}`;
      const person =
        p.personAction === 'rename_dummy'
          ? `rename dummy → ${p.resolvedName}`
          : p.personAction === 'reuse'
            ? `reuse ${p.personName} (${String(p.personId).slice(0, 8)})`
            : p.personAction === 'create'
              ? `TO CREATE "${p.resolvedName}"`
              : p.resolvedName
                ? `"${p.resolvedName}"`
                : '(no name)';
      console.log(
        `  r${String(p.excelRow).padStart(2)}  ${p.startDate} → ${end.padEnd(10)}  ${p.active ? 'ACTIVE' : 'closed '}  ${split}`
      );
      console.log(`         tenant: ${person}`);
      console.log(`         db: ${p.dbAction}${p.blocked ? '  BLOCKED' : ''}`);
      if (p.notes) console.log(`         note: ${p.notes}`);
      for (const f of p.flags) {
        console.log(`         flag: ${f.code}${f.blockCommit ? ' [block]' : ''} — ${f.detail}`);
      }
    }
    console.log('');
  }

  const toCreate = [...new Set(report.periods.filter((p) => p.personAction === 'create' && p.resolvedName).map((p) => p.resolvedName))];
  console.log('PEOPLE TO CREATE:');
  if (toCreate.length === 0) console.log('  (none — all resolved names already exist or are dummy renames)');
  else toCreate.forEach((n) => console.log(`  - ${n}`));
  console.log('');

  const counts = report.counts;
  console.log('COUNTS');
  console.log(`  periods parsed     : ${counts.periods}`);
  console.log(`  already imported   : ${counts.alreadyImported}`);
  console.log(`  would create lease : ${counts.wouldCreate}`);
  console.log(`  would fix/update   : ${counts.wouldUpdate}`);
  console.log(`  flagged skip       : ${counts.flaggedSkip}`);
  console.log(`  dummy replacements : ${counts.dummyReplacements}`);
  console.log(`  people to create   : ${toCreate.length}`);
  console.log(`  skipped rows       : ${counts.skipped}`);
}

async function commitPeriod(client, cfg, period, columns) {
  if (period.blocked || period.dbAction === 'flagged_skip' || period.dbAction === 'already_present_flagged') {
    return 'skipped_flagged';
  }
  if (period.dbAction === 'already_imported') return 'skipped_existing';
  if (!period.roomId) throw new Error(`Missing room for ${period.unitNumber}`);

  let tenantId = period.personId;

  if (period.personAction === 'create' && period.resolvedName) {
    const { firstName, lastName } = splitPersonName(period.resolvedName);
    const inserted = await client.query(
      `INSERT INTO tenants (
         first_name, last_name, phone, tenant_status, is_active, is_tenant,
         move_in_date, move_out_date, lease_start_date, lease_end_date,
         security_deposit, notes
       ) VALUES (
         $1, $2, $3, $4, true, $5,
         $6::date, $7::date, $6::date, $7::date,
         $8, $9
       ) RETURNING id`,
      [
        firstName,
        lastName,
        period.phone || null,
        period.active ? 'active' : 'inactive',
        Boolean(period.active),
        period.startDate,
        period.endDate,
        period.split.matched ? period.split.deposit : null,
        `${cfg.noteTag} imported occupant ${period.unitNumber}`,
      ]
    );
    tenantId = inserted.rows[0].id;
  }

  if (period.personAction === 'rename_dummy' && tenantId && period.resolvedName) {
    const { firstName, lastName } = splitPersonName(period.resolvedName);
    await client.query(
      `UPDATE tenants
       SET first_name = $1, last_name = $2, phone = COALESCE($3, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [firstName, lastName, period.phone || null, tenantId]
    );
    const user = await client.query(`SELECT user_id FROM tenants WHERE id = $1`, [tenantId]);
    if (user.rows[0]?.user_id) {
      await client.query(
        `UPDATE users SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [firstName, lastName, user.rows[0].user_id]
      );
    }
    if (columns.hasContacts) {
      await client.query(
        `UPDATE contacts
         SET first_name = $1, last_name = $2, phone = COALESCE($3, phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $4`,
        [firstName, lastName, period.phone || null, tenantId]
      );
    }
  }

  const deposit = period.split.matched ? period.split.deposit : null;
  const advance = period.split.matched ? period.split.advance : null;
  const utility = period.split.matched ? period.split.utility : null;
  const status = period.active ? 'active' : 'terminated';
  const snapshot = period.resolvedName || null;
  const notes = assignmentNotes(cfg, period);

  if (period.existingAssignmentId) {
    await client.query(
      `UPDATE tenant_room_assignments
       SET start_date = $1::date,
           end_date = $2::date,
           monthly_rate = COALESCE($3, monthly_rate),
           deposit_paid = COALESCE($4, deposit_paid),
           advance_paid = COALESCE($5, advance_paid),
           utility_deposit_paid = COALESCE($6, utility_deposit_paid),
           assignment_status = $7,
           notes = $8,
           tenant_name_snapshot = COALESCE(NULLIF($9, ''), tenant_name_snapshot),
           tenant_phone_snapshot = COALESCE($10, tenant_phone_snapshot),
           tenant_id = COALESCE($11, tenant_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        period.startDate,
        period.endDate,
        period.monthlyRent,
        deposit,
        advance,
        utility,
        status,
        notes,
        snapshot,
        period.phone || null,
        tenantId,
        period.existingAssignmentId,
      ]
    );
  } else {
    await client.query(
      `INSERT INTO tenant_room_assignments (
         tenant_id, room_id, start_date, end_date, monthly_rate,
         deposit_paid, advance_paid, utility_deposit_paid,
         assignment_status, notes, tenant_name_snapshot, tenant_phone_snapshot
       ) VALUES (
         $1, $2, $3::date, $4::date, $5,
         $6, $7, $8,
         $9, $10, $11, $12
       )`,
      [
        tenantId,
        period.roomId,
        period.startDate,
        period.endDate,
        period.monthlyRent,
        deposit,
        advance,
        utility,
        status,
        notes,
        snapshot,
        period.phone || null,
      ]
    );
  }

  if (period.active && period.roomId) {
    await client.query(
      `UPDATE rooms SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [period.roomId]
    );
    if (tenantId) {
      await client.query(
        `UPDATE tenants
         SET is_tenant = true, tenant_status = 'active', is_active = true,
             move_in_date = $2::date, lease_start_date = $2::date,
             move_out_date = NULL, lease_end_date = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [tenantId, period.startDate]
      );
    }
  } else if (tenantId) {
    const stillActive = await client.query(
      `SELECT 1 FROM tenant_room_assignments
       WHERE tenant_id = $1 AND assignment_status = 'active'
         AND (end_date IS NULL OR end_date > CURRENT_DATE)
       LIMIT 1`,
      [tenantId]
    );
    if (stillActive.rows.length === 0) {
      await client.query(
        `UPDATE tenants
         SET is_tenant = false,
             tenant_status = CASE WHEN tenant_status = 'active' THEN 'inactive' ELSE tenant_status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [tenantId]
      );
    }
  }

  return period.existingAssignmentId ? 'updated' : 'inserted';
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage: node scripts/import-apartment-lease-history.mjs [--apartment=1] [--file=path] [--json] [--commit]`);
    return;
  }

  const cfg = APARTMENTS[args.apartment];
  if (!cfg) throw new Error(`Unknown apartment ${args.apartment}. Use 1 or 2.`);
  const filePath = resolve(args.file || cfg.defaultFile);
  if (!existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const parsed = await parseLeaseHistoryWorkbook(filePath, { depositTemplate: cfg.depositTemplate });
  const client = connectClient();
  await client.connect();

  try {
    const building = await loadBuilding(client, cfg);
    const rooms = await loadRooms(client, building.id);
    const people = await loadPeople(client);

    const missingRooms = [];
    const unitsInSheet = [...new Set(parsed.periods.map((p) => p.unitNumber).concat(parsed.skipped.map((s) => s.unitNumber)))];
    for (const unit of unitsInSheet) {
      if (!rooms.get(unit.toLowerCase())) missingRooms.push(unit);
    }
    if (missingRooms.length) {
      throw new Error(
        `Sheet unit(s) do not match any room in ${building.name}: ${missingRooms.join(', ')}. Refusing to continue.`
      );
    }

    const roomIds = unitsInSheet.map((u) => rooms.get(u.toLowerCase()).id);
    const occupancy = await loadRoomOccupancy(client, roomIds);

    const extraDummiesByUnit = new Map();
    for (const unit of unitsInSheet) {
      extraDummiesByUnit.set(
        unit,
        people.filter((p) => isDummyPerson(p.first_name, p.last_name, unit))
      );
    }

    const periods = parsed.periods.map((period) => {
      const room = rooms.get(period.unitNumber.toLowerCase());
      return resolvePeriodAgainstDb(period, {
        room,
        assignments: occupancy.get(room.id) || [],
        people,
        unitFlags: parsed.unitFlags,
        extraDummies: extraDummiesByUnit.get(period.unitNumber) || [],
      });
    });

    const dummyReplacements = [];
    const seenDummy = new Set();
    for (const p of periods) {
      if (!p.dummyReplace) continue;
      const key = `${p.dummyReplace.room}|${p.dummyReplace.dummyTenantId}`;
      if (seenDummy.has(key)) continue;
      seenDummy.add(key);
      dummyReplacements.push(p.dummyReplace);
    }

    const report = {
      apartment: { id: cfg.id, label: cfg.buildingName },
      building,
      source: filePath,
      sheetName: parsed.sheetName,
      depositTemplate: cfg.depositTemplate.label,
      commit: args.commit,
      missingRooms,
      unitFlags: parsed.unitFlags,
      skipped: parsed.skipped,
      dummyReplacements,
      periods,
      counts: {
        periods: periods.length,
        alreadyImported: periods.filter((p) => p.dbAction === 'already_imported').length,
        wouldCreate: periods.filter((p) => p.dbAction === 'create_lease').length,
        wouldUpdate: periods.filter((p) => p.dbAction === 'update_dummy' || p.dbAction === 'fix_attach_person').length,
        flaggedSkip: periods.filter((p) => p.dbAction === 'flagged_skip' || p.dbAction === 'already_present_flagged').length,
        dummyReplacements: dummyReplacements.length,
        skipped: parsed.skipped.length,
      },
    };

    if (!args.json) printReport(report);

    const outPath = join(root, `data/imports/apartment${cfg.id}-lease-history.dry-run.json`);
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    if (!args.json) console.log(`Wrote JSON report: ${outPath}`);
    if (args.json) console.log(JSON.stringify(report, null, 2));

    if (!args.commit) return;

    const colRes = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts'`
    );
    const columns = { hasContacts: colRes.rows.length > 0 };
    const results = [];
    await client.query('BEGIN');
    try {
      for (const period of periods) {
        const action = await commitPeriod(client, cfg, period, columns);
        results.push({ unit: period.unitNumber, start: period.startDate, action });
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    console.log('\nCOMMIT RESULTS');
    for (const r of results) {
      console.log(`  ${r.unit} ${r.start}: ${r.action}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
