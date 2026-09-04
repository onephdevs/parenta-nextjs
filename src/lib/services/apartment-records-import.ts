import ExcelJS from 'exceljs';
import pool from '@/lib/db';
import {
  bulkUpsertApartmentUtilities,
  type ApartmentUtilityUpdate,
} from '@/lib/services/apartment-records-service';

export type ApartmentImportBuildingKey = 'balibago' | 'villasol';

export interface ParsedApartmentImportRow {
  buildingKey: ApartmentImportBuildingKey;
  unitKey: string;
  unitLabel: string;
  electric: number | null;
  water: number | null;
  electricStatus: 'pending' | 'paid';
  waterStatus: 'pending' | 'paid';
}

export interface ApartmentImportPreviewRow extends ParsedApartmentImportRow {
  roomId: string | null;
  buildingName: string | null;
  matched: boolean;
}

export interface ApartmentImportPreview {
  fileName: string;
  rows: ApartmentImportPreviewRow[];
  matched: number;
  unmatched: number;
}

export const APARTMENT_IMPORT_CSV_TEMPLATE = `building,unit,electric,water,electric_status,water_status
Balibago,1,2734,194,paid,paid
Villasol,1,6009,683,paid,paid
`;

function cellText(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const cell = value as {
      text?: string;
      result?: unknown;
      richText?: Array<{ text?: string }>;
      hyperlink?: string;
    };
    if (Array.isArray(cell.richText)) {
      return cell.richText.map((part) => part.text || '').join('').trim();
    }
    if (cell.result != null) return cellText(cell.result);
    if (typeof cell.text === 'string') return cell.text.trim();
  }
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }
  const text = cellText(value).replace(/,/g, '').replace(/₱/g, '').trim();
  if (!text || text === '-' || text === '—') return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}

export function buildingKeyFromName(name: string): ApartmentImportBuildingKey | null {
  const upper = name.toUpperCase();
  if (upper.includes('BALIBAGO') || /APARTMENT-?\s*1/.test(upper)) return 'balibago';
  if (upper.includes('VILLASOL') || /APRT?MENT-?\s*2/.test(upper)) return 'villasol';
  return null;
}

export function unitKeyFromLabel(value: string): string | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (/collection|total expenses|monthly bills|due date/.test(text)) return null;
  if (text === 'vacant') return null;
  if (/^admin\b/.test(text) || text === 'admin') return 'admin';
  if (/^store\b/.test(text) || text === 'store') return 'store';
  const match = text.match(/^(?:unit\s*)?(\d+)$/i);
  if (match) return match[1];
  return null;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === '\t') && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): ParsedApartmentImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const buildingIdx = headers.findIndex((h) => h === 'building' || h === 'apartment');
  const unitIdx = headers.findIndex((h) => h === 'unit' || h === 'room' || h === 'unit_number');
  const electricIdx = headers.findIndex((h) => h === 'electric' || h === 'electricity' || h === 'electric_bill');
  const waterIdx = headers.findIndex((h) => h === 'water' || h === 'water_bill');
  const electricStatusIdx = headers.findIndex((h) => h === 'electric_status' || h === 'electricity_status');
  const waterStatusIdx = headers.findIndex((h) => h === 'water_status');

  if (unitIdx < 0 || (electricIdx < 0 && waterIdx < 0)) {
    throw new Error(
      'CSV must include unit plus electric and/or water columns. Or upload the APRT. RECORDS .xlsx.'
    );
  }

  const rows: ParsedApartmentImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const unitLabel = cells[unitIdx] || '';
    const unitKey = unitKeyFromLabel(unitLabel);
    const buildingKey = buildingKeyFromName(buildingIdx >= 0 ? cells[buildingIdx] || '' : '');
    if (!unitKey || !buildingKey) continue;
    const electric = electricIdx >= 0 ? cellNumber(cells[electricIdx]) : null;
    const water = waterIdx >= 0 ? cellNumber(cells[waterIdx]) : null;
    if (electric == null && water == null) continue;
    const electricStatus =
      electricStatusIdx >= 0 && /paid/i.test(cells[electricStatusIdx] || '') ? 'paid' : 'pending';
    const waterStatus =
      waterStatusIdx >= 0 && /paid/i.test(cells[waterStatusIdx] || '') ? 'paid' : 'pending';
    rows.push({
      buildingKey,
      unitKey,
      unitLabel: unitLabel || `Unit ${unitKey}`,
      electric,
      water,
      electricStatus,
      waterStatus,
    });
  }
  return rows;
}

function readSheetCell(sheet: ExcelJS.Worksheet, row: number, col: number): unknown {
  return sheet.getRow(row).getCell(col).value;
}

function parseExcelBlock(
  sheet: ExcelJS.Worksheet,
  startCol: number,
  buildingKey: ApartmentImportBuildingKey
): ParsedApartmentImportRow[] {
  const byUnit = new Map<string, ParsedApartmentImportRow>();
  let current: ParsedApartmentImportRow | null = null;

  for (let r = 4; r <= sheet.rowCount; r += 1) {
    const unitLabel = cellText(readSheetCell(sheet, r, startCol));
    const dueLabel = cellText(readSheetCell(sheet, r, startCol + 1)).toLowerCase();
    const paid = cellNumber(readSheetCell(sheet, r, startCol + 2));
    const electric = cellNumber(readSheetCell(sheet, r, startCol + 4));
    const water = cellNumber(readSheetCell(sheet, r, startCol + 5));
    const unitKey = unitKeyFromLabel(unitLabel);

    if (/collection|total expenses|over all collection|previous total/.test(unitLabel.toLowerCase())) {
      current = null;
      continue;
    }

    if (unitKey) {
      current = byUnit.get(unitKey) || {
        buildingKey,
        unitKey,
        unitLabel: unitLabel || `Unit ${unitKey}`,
        electric: null,
        water: null,
        electricStatus: 'pending',
        waterStatus: 'pending',
      };
      byUnit.set(unitKey, current);
    }
    if (!current) continue;

    const isUtilityDue = /electric/.test(dueLabel) || /water/.test(dueLabel);
    // Totals sit on blank rows after the last unit. Only read meter columns on
    // the unit's own rows or Electric/Water Bill lines.
    if (unitKey || isUtilityDue) {
      if (electric != null) current.electric = electric;
      if (water != null) current.water = water;
    }
    if (/electric/.test(dueLabel)) {
      if (paid != null) current.electricStatus = 'paid';
      if (current.electric == null && paid != null) current.electric = paid;
    }
    if (/water/.test(dueLabel)) {
      if (paid != null) current.waterStatus = 'paid';
      if (current.water == null && paid != null) current.water = paid;
    }
  }

  return [...byUnit.values()].filter((row) => row.electric != null || row.water != null);
}

async function parseExcel(buffer: Buffer): Promise<ParsedApartmentImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The spreadsheet has no sheets');

  const leftKey =
    buildingKeyFromName(cellText(readSheetCell(sheet, 3, 1))) ||
    buildingKeyFromName(cellText(readSheetCell(sheet, 3, 5))) ||
    'balibago';
  const rightKey =
    buildingKeyFromName(cellText(readSheetCell(sheet, 3, 8))) ||
    buildingKeyFromName(cellText(readSheetCell(sheet, 3, 12))) ||
    'villasol';

  const left = parseExcelBlock(sheet, 1, leftKey);
  const rightHasUnits = [...Array(Math.min(sheet.rowCount, 80)).keys()].some((i) =>
    Boolean(unitKeyFromLabel(cellText(readSheetCell(sheet, i + 4, 8))))
  );
  const right = rightHasUnits ? parseExcelBlock(sheet, 8, rightKey) : [];
  return [...left, ...right];
}

export async function parseApartmentRecordsUpload(
  buffer: Buffer,
  fileName: string
): Promise<ParsedApartmentImportRow[]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseCsv(buffer.toString('utf8'));
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xls')) {
    return parseExcel(buffer);
  }
  throw new Error('Upload an .xlsx apartment records file or a .csv');
}

async function loadImportRooms(buildingId?: string | null) {
  const result = await pool.query(
    `
    SELECT r.id, r.room_number, b.id AS building_id, b.name AS building_name
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id
    WHERE COALESCE(r.is_active, true)
      AND COALESCE(b.is_active, true)
      AND (
        COALESCE(r.is_revenue_unit, true) = true
        OR LOWER(TRIM(r.room_number)) IN ('admin', 'store')
      )
      AND r.room_number !~* '^MO-'
      AND ($1::uuid IS NULL OR b.id = $1)
    `,
    [buildingId || null]
  );
  return result.rows as Array<{
    id: string;
    room_number: string;
    building_id: string;
    building_name: string;
  }>;
}

export async function previewApartmentRecordsImport(params: {
  buffer: Buffer;
  fileName: string;
  buildingId?: string | null;
}): Promise<ApartmentImportPreview> {
  const parsed = await parseApartmentRecordsUpload(params.buffer, params.fileName);
  const rooms = await loadImportRooms(params.buildingId);
  const roomMap = new Map<string, { id: string; buildingName: string }>();
  for (const room of rooms) {
    const bKey = buildingKeyFromName(room.building_name);
    const uKey = unitKeyFromLabel(room.room_number);
    if (!bKey || !uKey) continue;
    roomMap.set(`${bKey}:${uKey}`, { id: room.id, buildingName: room.building_name });
  }

  const rows: ApartmentImportPreviewRow[] = parsed
    .filter((row) => {
      if (!params.buildingId) return true;
      const match = rooms.find((room) => buildingKeyFromName(room.building_name) === row.buildingKey);
      return Boolean(match);
    })
    .map((row) => {
      const hit = roomMap.get(`${row.buildingKey}:${row.unitKey}`) || null;
      return {
        ...row,
        roomId: hit?.id || null,
        buildingName: hit?.buildingName || (row.buildingKey === 'balibago' ? 'Balibago' : 'Villasol'),
        matched: Boolean(hit),
      };
    });

  return {
    fileName: params.fileName,
    rows,
    matched: rows.filter((row) => row.matched).length,
    unmatched: rows.filter((row) => !row.matched).length,
  };
}

export async function commitApartmentRecordsImport(params: {
  preview: ApartmentImportPreview;
  startDate: string;
  endDate: string;
}): Promise<{ created: number; updated: number; units: number }> {
  const updates: ApartmentUtilityUpdate[] = params.preview.rows
    .filter((row) => row.matched && row.roomId)
    .map((row) => ({
      roomId: row.roomId as string,
      electric: row.electric,
      water: row.water,
      electricStatus: row.electricStatus,
      waterStatus: row.waterStatus,
    }));

  const result = await bulkUpsertApartmentUtilities({
    startDate: params.startDate,
    endDate: params.endDate,
    notes: '[apartment-records-import]',
    updates,
  });

  return { ...result, units: updates.length };
}
