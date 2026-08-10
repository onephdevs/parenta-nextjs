/**
 * Historical spreadsheet migration tooling.
 * Import past months/years of CSV data into the stabilized schema.
 * Always preview (dry-run) before commit.
 */

import pool from '@/lib/db';
import { toCanonicalPaymentMethod } from '@/lib/constants/payment-methods';
import { normalizeExpenseCategory } from '@/lib/constants/bills-expenses';

export type HistoryImportType =
  | 'payments'
  | 'expenses'
  | 'tenants'
  | 'meter_readings';

export interface HistoryImportRowError {
  row: number;
  message: string;
  raw?: Record<string, string>;
}

export interface HistoryImportPreview {
  importType: HistoryImportType;
  dryRun: boolean;
  rowCount: number;
  validCount: number;
  errorCount: number;
  errors: HistoryImportRowError[];
  sample: Array<Record<string, unknown>>;
  batchId?: string;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = splitLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, '_')
  );
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[₱$,\s]/g, '');
  return Math.round((Number(cleaned) || 0) * 100) / 100;
}

async function resolveTenantId(
  row: Record<string, string>
): Promise<string | null> {
  if (row.tenant_id && /^[0-9a-f-]{36}$/i.test(row.tenant_id)) {
    return row.tenant_id;
  }
  const email = row.tenant_email || row.email;
  if (email) {
    const r = await pool.query(
      `SELECT id FROM tenants WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    if (r.rows[0]) return String(r.rows[0].id);
  }
  const first = row.first_name || row.tenant_first_name;
  const last = row.last_name || row.tenant_last_name;
  const full = row.tenant_name;
  if (full) {
    const parts = full.trim().split(/\s+/);
    const f = parts[0];
    const l = parts.slice(1).join(' ');
    const r = await pool.query(
      `SELECT id FROM tenants
       WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
       LIMIT 1`,
      [f, l]
    );
    if (r.rows[0]) return String(r.rows[0].id);
  }
  if (first && last) {
    const r = await pool.query(
      `SELECT id FROM tenants
       WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
       LIMIT 1`,
      [first, last]
    );
    if (r.rows[0]) return String(r.rows[0].id);
  }
  return null;
}

async function resolveBuildingId(
  row: Record<string, string>
): Promise<string | null> {
  if (row.building_id && /^[0-9a-f-]{36}$/i.test(row.building_id)) {
    return row.building_id;
  }
  const name = row.building_name || row.building || row.property;
  if (!name) return null;
  const r = await pool.query(
    `SELECT id FROM buildings WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [name.trim()]
  );
  return r.rows[0] ? String(r.rows[0].id) : null;
}

async function resolveRoomId(
  buildingId: string | null,
  row: Record<string, string>
): Promise<string | null> {
  if (row.room_id && /^[0-9a-f-]{36}$/i.test(row.room_id)) {
    return row.room_id;
  }
  const roomNumber = row.room_number || row.unit || row.unit_number;
  if (!roomNumber || !buildingId) return null;
  const r = await pool.query(
    `SELECT id FROM rooms
     WHERE building_id = $1 AND LOWER(room_number) = LOWER($2)
     LIMIT 1`,
    [buildingId, roomNumber.trim()]
  );
  return r.rows[0] ? String(r.rows[0].id) : null;
}

export function getHistoryImportTemplateCsv(type: HistoryImportType): string {
  switch (type) {
    case 'payments':
      return [
        'payment_date,amount,payment_method,payment_type,tenant_email,tenant_name,building_name,room_number,reference_number,notes',
        '2024-01-15,4800,cash,rent,juan@example.com,Juan Dela Cruz,Balibago,7,OR-001,January rent',
      ].join('\n');
    case 'expenses':
      return [
        'expense_date,amount,category,description,building_name,room_number,payment_method,notes',
        '2024-01-20,1500,cleaning,Monthly cleaning,Balibago,,cash,',
      ].join('\n');
    case 'tenants':
      return [
        'first_name,last_name,email,phone,building_name,room_number,start_date,monthly_rate,deposit_paid,status',
        'Juan,Dela Cruz,juan@example.com,09171234567,Balibago,7,2023-06-16,4800,4800,active',
      ].join('\n');
    case 'meter_readings':
      return [
        'reading_date,utility_type,building_name,room_number,reading_value,previous_reading,notes',
        '2024-01-31,electricity,Balibago,7,1250.5,1200,',
      ].join('\n');
    default:
      return '';
  }
}

async function logBatch(params: {
  importType: HistoryImportType;
  filename?: string;
  dryRun: boolean;
  status: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: HistoryImportRowError[];
  summary?: Record<string, unknown>;
  createdBy?: string | null;
}): Promise<string> {
  const result = await pool.query(
    `INSERT INTO history_import_batches (
       import_type, filename, dry_run, status, row_count, success_count,
       error_count, errors, summary, created_by, committed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,
       CASE WHEN $4 = 'committed' THEN NOW() ELSE NULL END)
     RETURNING id`,
    [
      params.importType,
      params.filename || null,
      params.dryRun,
      params.status,
      params.rowCount,
      params.successCount,
      params.errorCount,
      JSON.stringify(params.errors.slice(0, 100)),
      JSON.stringify(params.summary || {}),
      params.createdBy || null,
    ]
  );
  return String(result.rows[0].id);
}

export async function importHistoricalPayments(
  csvText: string,
  options: {
    dryRun: boolean;
    filename?: string;
    createdBy?: string | null;
  }
): Promise<HistoryImportPreview> {
  const { rows } = parseCsv(csvText);
  const errors: HistoryImportRowError[] = [];
  const sample: Array<Record<string, unknown>> = [];
  let successCount = 0;

  const client = await pool.connect();
  try {
    if (!options.dryRun) await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const amount = num(row.amount);
        const paymentDate = row.payment_date || row.date;
        if (!paymentDate || amount <= 0) {
          throw new Error('payment_date and positive amount required');
        }
        const tenantId = await resolveTenantId(row);
        if (!tenantId) throw new Error('Tenant not found (email/name/id)');

        const method = toCanonicalPaymentMethod(
          row.payment_method || 'cash'
        );
        const paymentType = (row.payment_type || 'rent').toLowerCase();

        const payload = {
          tenantId,
          amount,
          paymentDate,
          paymentMethod: method,
          paymentType,
          reference: row.reference_number || null,
          notes: row.notes || null,
        };
        if (sample.length < 5) sample.push(payload);

        if (!options.dryRun) {
          await client.query(
            `INSERT INTO payments (
               tenant_id, amount, payment_date, due_date, payment_method, payment_type,
               payment_status, reference_number, notes
             ) VALUES ($1,$2,$3::date,$3::date,$4,$5,'paid',$6,$7)`,
            [
              tenantId,
              amount,
              paymentDate,
              method,
              paymentType,
              row.reference_number || null,
              row.notes || `Historical import`,
            ]
          );
        }
        successCount += 1;
      } catch (err) {
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown error',
          raw: row,
        });
      }
    }

    if (!options.dryRun) {
      if (errors.length > 0 && successCount === 0) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }
    }

    const batchId = await logBatch({
      importType: 'payments',
      filename: options.filename,
      dryRun: options.dryRun,
      status: options.dryRun
        ? 'previewed'
        : errors.length && successCount === 0
          ? 'failed'
          : 'committed',
      rowCount: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
      summary: { sampleCount: sample.length },
      createdBy: options.createdBy,
    });

    return {
      importType: 'payments',
      dryRun: options.dryRun,
      rowCount: rows.length,
      validCount: successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      sample,
      batchId,
    };
  } catch (error) {
    if (!options.dryRun) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function importHistoricalExpenses(
  csvText: string,
  options: {
    dryRun: boolean;
    filename?: string;
    createdBy?: string | null;
  }
): Promise<HistoryImportPreview> {
  const { rows } = parseCsv(csvText);
  const errors: HistoryImportRowError[] = [];
  const sample: Array<Record<string, unknown>> = [];
  let successCount = 0;

  const client = await pool.connect();
  try {
    if (!options.dryRun) await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const amount = num(row.amount);
        const expenseDate = row.expense_date || row.date;
        if (!expenseDate || amount <= 0) {
          throw new Error('expense_date and positive amount required');
        }
        const buildingId = await resolveBuildingId(row);
        if (!buildingId) throw new Error('Building not found');
        const roomId = await resolveRoomId(buildingId, row);
        const category = normalizeExpenseCategory(row.category || 'other');
        const description =
          row.description || `Historical ${category} expense`;

        const payload = {
          buildingId,
          roomId,
          amount,
          expenseDate,
          category,
          description,
        };
        if (sample.length < 5) sample.push(payload);

        if (!options.dryRun) {
          await client.query(
            `INSERT INTO expenses (
               building_id, room_id, category, description, amount,
               expense_date, payment_method, expense_status, notes
             ) VALUES ($1,$2,$3,$4,$5,$6::date,$7,'paid',$8)`,
            [
              buildingId,
              roomId,
              category,
              description,
              amount,
              expenseDate,
              row.payment_method || 'cash',
              row.notes || 'Historical import',
            ]
          );
        }
        successCount += 1;
      } catch (err) {
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown error',
          raw: row,
        });
      }
    }

    if (!options.dryRun) {
      if (errors.length > 0 && successCount === 0) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }
    }

    const batchId = await logBatch({
      importType: 'expenses',
      filename: options.filename,
      dryRun: options.dryRun,
      status: options.dryRun
        ? 'previewed'
        : errors.length && successCount === 0
          ? 'failed'
          : 'committed',
      rowCount: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
      createdBy: options.createdBy,
    });

    return {
      importType: 'expenses',
      dryRun: options.dryRun,
      rowCount: rows.length,
      validCount: successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      sample,
      batchId,
    };
  } catch (error) {
    if (!options.dryRun) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function importHistoricalTenants(
  csvText: string,
  options: {
    dryRun: boolean;
    filename?: string;
    createdBy?: string | null;
  }
): Promise<HistoryImportPreview> {
  const { rows } = parseCsv(csvText);
  const errors: HistoryImportRowError[] = [];
  const sample: Array<Record<string, unknown>> = [];
  let successCount = 0;

  const client = await pool.connect();
  try {
    if (!options.dryRun) await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const first = row.first_name;
        const last = row.last_name;
        if (!first || !last) throw new Error('first_name and last_name required');
        const buildingId = await resolveBuildingId(row);
        if (!buildingId) throw new Error('Building not found');
        const roomId = await resolveRoomId(buildingId, row);
        if (!roomId) throw new Error('Room not found');
        const startDate = row.start_date || row.move_in_date;
        if (!startDate) throw new Error('start_date required');
        const monthlyRate = num(row.monthly_rate || row.rent);
        const depositPaid = num(row.deposit_paid || row.deposit);
        const status = (row.status || 'active').toLowerCase();

        const payload = {
          first,
          last,
          email: row.email || null,
          buildingId,
          roomId,
          startDate,
          monthlyRate,
          depositPaid,
          status,
        };
        if (sample.length < 5) sample.push(payload);

        if (!options.dryRun) {
          const tenantResult = await client.query(
            `INSERT INTO tenants (
               first_name, last_name, email, phone, tenant_status, is_active
             ) VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING id`,
            [
              first,
              last,
              row.email || null,
              row.phone || null,
              status === 'active' ? 'active' : 'inactive',
              status === 'active',
            ]
          );
          const tenantId = tenantResult.rows[0].id;
          await client.query(
            `INSERT INTO tenant_room_assignments (
               tenant_id, room_id, start_date, monthly_rate, deposit_paid,
               assignment_status, billing_cycle_start_day
             ) VALUES (
               $1,$2,$3::date,$4,$5,
               $6,
               EXTRACT(DAY FROM $3::date)::int
             )`,
            [
              tenantId,
              roomId,
              startDate,
              monthlyRate || null,
              depositPaid || 0,
              status === 'active' ? 'active' : 'past',
            ]
          );
          if (status === 'active') {
            await client.query(
              `UPDATE rooms SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [roomId]
            );
          }
        }
        successCount += 1;
      } catch (err) {
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown error',
          raw: row,
        });
      }
    }

    if (!options.dryRun) {
      if (errors.length > 0 && successCount === 0) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }
    }

    const batchId = await logBatch({
      importType: 'tenants',
      filename: options.filename,
      dryRun: options.dryRun,
      status: options.dryRun
        ? 'previewed'
        : errors.length && successCount === 0
          ? 'failed'
          : 'committed',
      rowCount: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
      createdBy: options.createdBy,
    });

    return {
      importType: 'tenants',
      dryRun: options.dryRun,
      rowCount: rows.length,
      validCount: successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      sample,
      batchId,
    };
  } catch (error) {
    if (!options.dryRun) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function importHistoricalMeterReadings(
  csvText: string,
  options: {
    dryRun: boolean;
    filename?: string;
    createdBy?: string | null;
  }
): Promise<HistoryImportPreview> {
  const { rows } = parseCsv(csvText);
  const errors: HistoryImportRowError[] = [];
  const sample: Array<Record<string, unknown>> = [];
  let successCount = 0;

  const client = await pool.connect();
  try {
    if (!options.dryRun) await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const readingDate = row.reading_date || row.date;
        const utilityType = (row.utility_type || 'electricity').toLowerCase();
        const readingValue = num(row.reading_value || row.reading);
        if (!readingDate || readingValue <= 0) {
          throw new Error('reading_date and reading_value required');
        }
        const buildingId = await resolveBuildingId(row);
        if (!buildingId) throw new Error('Building not found');
        const roomId = await resolveRoomId(buildingId, row);

        const payload = {
          buildingId,
          roomId,
          utilityType,
          readingDate,
          readingValue,
          previousReading: row.previous_reading
            ? num(row.previous_reading)
            : null,
        };
        if (sample.length < 5) sample.push(payload);

        if (!options.dryRun) {
          await client.query(
            `INSERT INTO utility_meter_readings (
               building_id, room_id, utility_type, reading_date,
               reading_value, previous_reading, notes
             ) VALUES ($1,$2,$3,$4::date,$5,$6,$7)`,
            [
              buildingId,
              roomId,
              utilityType,
              readingDate,
              readingValue,
              row.previous_reading ? num(row.previous_reading) : null,
              row.notes || 'Historical import',
            ]
          );
        }
        successCount += 1;
      } catch (err) {
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown error',
          raw: row,
        });
      }
    }

    if (!options.dryRun) {
      if (errors.length > 0 && successCount === 0) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }
    }

    const batchId = await logBatch({
      importType: 'meter_readings',
      filename: options.filename,
      dryRun: options.dryRun,
      status: options.dryRun
        ? 'previewed'
        : errors.length && successCount === 0
          ? 'failed'
          : 'committed',
      rowCount: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
      createdBy: options.createdBy,
    });

    return {
      importType: 'meter_readings',
      dryRun: options.dryRun,
      rowCount: rows.length,
      validCount: successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
      sample,
      batchId,
    };
  } catch (error) {
    if (!options.dryRun) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function runHistoryImport(
  type: HistoryImportType,
  csvText: string,
  options: {
    dryRun: boolean;
    filename?: string;
    createdBy?: string | null;
  }
): Promise<HistoryImportPreview> {
  switch (type) {
    case 'payments':
      return importHistoricalPayments(csvText, options);
    case 'expenses':
      return importHistoricalExpenses(csvText, options);
    case 'tenants':
      return importHistoricalTenants(csvText, options);
    case 'meter_readings':
      return importHistoricalMeterReadings(csvText, options);
    default:
      throw new Error(`Unsupported import type: ${type}`);
  }
}
