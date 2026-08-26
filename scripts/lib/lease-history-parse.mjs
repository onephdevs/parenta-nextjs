/**
 * Shared parser + deposit templates for apartment lease-history Excel imports.
 * Apartment 2 later: swap `DEPOSIT_TEMPLATES.apartment2` and the source file.
 */

export const DEPOSIT_TEMPLATES = {
  apartment1: {
    id: 'apartment1',
    label: 'Apt 1 Balibago — 2mo deposit + 1mo advance + utility column',
    split(totalDeposited, monthlyRent, utilityDeposit) {
      const rent = Number(monthlyRent) || 0;
      const utility = Number(utilityDeposit) || 0;
      const actual = Number(totalDeposited);
      const expected = rent * 3 + utility;
      if (!(rent > 0) || !Number.isFinite(actual)) {
        return {
          matched: false,
          expected,
          actual: Number.isFinite(actual) ? actual : null,
          deposit: null,
          advance: null,
          utility,
        };
      }
      const matched = Math.abs(actual - expected) < 0.01;
      return {
        matched,
        expected,
        actual,
        deposit: matched ? rent * 2 : null,
        advance: matched ? rent * 1 : null,
        utility,
      };
    },
  },
  apartment2: {
    id: 'apartment2',
    label: 'Apt 2 Villasol — ₱6,000 deposit + ₱6,000 advance + ₱3,000 utility',
    split(totalDeposited, _monthlyRent, utilityDeposit) {
      const deposit = 6000;
      const advance = 6000;
      const utility = utilityDeposit == null || utilityDeposit === '' ? 3000 : Number(utilityDeposit) || 0;
      const expected = deposit + advance + utility;
      const actual = Number(totalDeposited);
      const matched = Number.isFinite(actual) && Math.abs(actual - expected) < 0.01;
      return {
        matched,
        expected,
        actual: Number.isFinite(actual) ? actual : null,
        deposit: matched ? deposit : null,
        advance: matched ? advance : null,
        utility,
      };
    },
  },
};

const NOTE_CONNECTORS =
  /\b(frm|from|up to|terminated|refund|temporary|paid|contract|cash|budget|only|until|end of)\b/i;
const PLACEHOLDER_NAMES = /^(old tenant|new tenant|former occupant|vacant|n\/?a|none|-)$/i;

export function cellText(value) {
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

export function toIsoDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = cellText(value);
  if (!text) return null;
  if (/^up to present$/i.test(text) || /^vacant$/i.test(text)) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    const y = epoch.getUTCFullYear();
    const m = String(epoch.getUTCMonth() + 1).padStart(2, '0');
    const d = String(epoch.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

export function toNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = cellText(value).replace(/[₱$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseUnitNumber(raw) {
  const text = cellText(raw);
  if (!text) return null;
  if (/^store$/i.test(text) || /unit\s*no\.?\s*store/i.test(text)) return 'Store';
  const match = text.match(/(\d+)/);
  if (!match) return null;
  return `Unit ${Number(match[1])}`;
}

export function splitPersonName(full) {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Tenant' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function normalizePersonName(full) {
  return String(full || '')
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits : '';
}

export function isDummyPerson(firstName, lastName, roomNumber) {
  return (
    String(firstName || '').trim().toLowerCase() === 'tenant' &&
    String(lastName || '').trim().toLowerCase() === String(roomNumber || '').trim().toLowerCase()
  );
}

export function classifyTenantName(raw) {
  const text = cellText(raw);
  if (!text) return { kind: 'blank', name: null, note: null };
  if (PLACEHOLDER_NAMES.test(text)) {
    return { kind: 'placeholder', name: null, note: text };
  }
  const looksLikeSentence =
    text.length > 40 ||
    /\d/.test(text) ||
    NOTE_CONNECTORS.test(text) ||
    /[,;]/.test(text);
  if (looksLikeSentence) {
    return { kind: 'note', name: null, note: text };
  }
  return { kind: 'name', name: text, note: null };
}

export function classifyContact(raw) {
  const text = cellText(raw);
  if (!text) return { phone: null, newTenant: false };
  if (/new tenant/i.test(text)) return { phone: null, newTenant: true };
  if (!/\d{7,}/.test(text.replace(/\s+/g, ''))) return { phone: null, newTenant: false };
  return { phone: text.replace(/\s+/g, ''), newTenant: false };
}

function isVacantToken(value) {
  return /^vacant$/i.test(cellText(value));
}

function isPresentToken(value) {
  return /^up to present$/i.test(cellText(value));
}

function isPaddingRow(raw) {
  return !raw.startRaw && !raw.tenantRaw && raw.totalDeposited == null && raw.rent == null;
}

/**
 * Group sheet rows into unit blocks, then emit lease periods with
 * forward-filled names and notes attached to the previous real tenant.
 */
export function groupAndResolve(rawRows, { depositTemplate, sheetStatusByUnit }) {
  const blocks = [];
  let current = null;

  for (const raw of rawRows) {
    if (raw.unitNumber && (!current || current.unitNumber !== raw.unitNumber)) {
      current = {
        unitNumber: raw.unitNumber,
        sheetStatus: raw.status || sheetStatusByUnit.get(raw.unitNumber) || null,
        excelRows: [],
      };
      blocks.push(current);
    }
    if (!current) continue;
    if (isPaddingRow(raw)) continue;
    current.excelRows.push(raw);
    if (raw.status) current.sheetStatus = raw.status;
  }

  const periods = [];
  const skipped = [];
  const unitFlags = [];

  for (const block of blocks) {
    let lastRealName = null;
    let lastPhone = null;
    const blockPeriods = [];

    for (let i = 0; i < block.excelRows.length; i += 1) {
      const raw = block.excelRows[i];
      const startVacant = isVacantToken(raw.startRaw);
      const endVacant = isVacantToken(raw.endRaw);
      if (startVacant || endVacant) {
        skipped.push({
          unitNumber: block.unitNumber,
          excelRow: raw.excelRow,
          reason: 'corrupted_vacant_in_date_column',
          detail: `Literal "VACANT" in ${startVacant ? 'start' : 'end'} date cell — not imported`,
        });
        continue;
      }

      if (!raw.startDate) {
        skipped.push({
          unitNumber: block.unitNumber,
          excelRow: raw.excelRow,
          reason: 'no_start_date',
          detail: 'Row has amounts or a name but no parseable start date',
        });
        continue;
      }

      const classified = classifyTenantName(raw.tenantRaw);
      const contact = classifyContact(raw.contactRaw);
      const presentEnd = isPresentToken(raw.endRaw);
      const isLastDataRow = i === block.excelRows.length - 1;
      const blankEnd = !cellText(raw.endRaw);
      const active = presentEnd || (blankEnd && isLastDataRow);
      const endDate = active ? null : raw.endDate;

      if (contact.newTenant) {
        lastRealName = classified.kind === 'name' ? classified.name : null;
        lastPhone = contact.phone;
      } else if (classified.kind === 'name') {
        lastRealName = classified.name;
        if (contact.phone) lastPhone = contact.phone;
      } else if (classified.kind === 'blank' || classified.kind === 'note') {
        if (contact.phone) lastPhone = contact.phone;
      } else if (classified.kind === 'placeholder') {
        lastRealName = null;
      }

      const resolvedName =
        classified.kind === 'name'
          ? classified.name
          : contact.newTenant
            ? classified.kind === 'name'
              ? classified.name
              : null
            : lastRealName;

      const notes = [classified.kind === 'note' || classified.kind === 'placeholder' ? classified.note : null]
        .filter(Boolean);

      const split = depositTemplate.split(raw.totalDeposited, raw.rent, raw.utilityDeposit);
      const flags = [];

      if (classified.kind === 'placeholder') {
        flags.push({
          code: 'placeholder_name',
          blockCommit: true,
          detail: `Tenant name is placeholder "${classified.note}"`,
        });
      }
      if (!resolvedName) {
        flags.push({
          code: 'unresolved_tenant',
          blockCommit: true,
          detail: 'No real tenant name after forward-fill',
        });
      }
      if (!split.matched) {
        flags.push({
          code: 'deposit_mismatch',
          blockCommit: true,
          detail: `Total deposited ₱${split.actual ?? '—'} ≠ expected ₱${split.expected} (rent×3 + utility)`,
        });
      }
      if (classified.kind === 'note') {
        flags.push({
          code: 'note_attached',
          blockCommit: false,
          detail: `Sentence treated as note on previous tenant "${resolvedName || '—'}"`,
        });
      }
      if (contact.newTenant) {
        flags.push({
          code: 'new_tenant_marker',
          blockCommit: false,
          detail: '"New Tenant" in contact column — did not forward-fill from above',
        });
      }

      const period = {
        unitNumber: block.unitNumber,
        sheetStatus: block.sheetStatus,
        excelRow: raw.excelRow,
        resolvedName,
        phone: contact.phone || lastPhone,
        notes: notes.join(' — ') || null,
        startDate: raw.startDate,
        endDate,
        active,
        monthlyRent: raw.rent,
        totalDeposited: raw.totalDeposited,
        utilityDeposit: raw.utilityDeposit,
        split,
        flags,
        classified: classified.kind,
      };
      blockPeriods.push(period);
      periods.push(period);
    }

    if (block.unitNumber === 'Unit 2') {
      unitFlags.push({
        unitNumber: 'Unit 2',
        code: 'unit2_old_tenant_placeholder',
        blockCommit: true,
        detail: 'Tenant name is "Old Tenant" while Status says Vacant but a date range exists — name/decision needed',
      });
    }
    if (block.unitNumber === 'Unit 5') {
      unitFlags.push({
        unitNumber: 'Unit 5',
        code: 'unit5_vacant_unnamed_stack',
        blockCommit: true,
        detail: `${blockPeriods.length} stacked historical rows on a Vacant unit, including a corrupted VACANT-as-date row — review before import`,
      });
    }
    if (block.unitNumber === 'Unit 6') {
      unitFlags.push({
        unitNumber: 'Unit 6',
        code: 'unit6_no_real_history',
        blockCommit: true,
        detail: 'Only one unnamed row with no move-out — not real occupancy history',
      });
    }
  }

  const namePhoneKey = (p) =>
    `${normalizePersonName(p.resolvedName || '')}|${normalizePhone(p.phone)}`;
  const activeByKey = new Map();
  for (const p of periods) {
    if (!p.active || !p.resolvedName) continue;
    const key = namePhoneKey(p);
    if (!activeByKey.has(key)) activeByKey.set(key, []);
    activeByKey.get(key).push(p);
  }
  for (const [, group] of activeByKey) {
    const units = [...new Set(group.map((p) => p.unitNumber))];
    if (units.length < 2) continue;
    unitFlags.push({
      unitNumber: units.join(' + '),
      code: 'same_person_two_rooms',
      blockCommit: false,
      detail: `"${group[0].resolvedName}" / ${group[0].phone || 'no phone'} listed as current on ${units.join(' and ')} — likely duplicate data-entry, not one person renting two rooms. Will not activate a second occupancy; review which unit is correct.`,
    });
    for (const p of group) {
      p.flags.push({
        code: 'same_person_two_rooms',
        blockCommit: false,
        detail: `Same name+contact as ${units.filter((u) => u !== p.unitNumber).join(', ')}`,
      });
    }
  }

  return { blocks, periods, skipped, unitFlags };
}

export async function parseLeaseHistoryWorkbook(xlsxPath, { depositTemplate }) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet =
    workbook.worksheets.find((ws) => /apartment/i.test(ws.name)) || workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found');

  const maxRow = Math.max(
    sheet.actualRowCount || 0,
    sheet.rowCount || 0,
    sheet.lastRow?.number || 0
  );
  const rawRows = [];
  const sheetStatusByUnit = new Map();

  for (let r = 5; r <= maxRow; r += 1) {
    const row = sheet.getRow(r);
    const status = cellText(row.getCell(1).value);
    const unitNumber = parseUnitNumber(row.getCell(2).value);
    const tenantRaw = row.getCell(3).value;
    const contactRaw = row.getCell(4).value;
    const startRaw = row.getCell(5).value;
    const endRaw = row.getCell(9).value;

    const unitHeader = cellText(row.getCell(2).value);
    const looksLikeHeader =
      /select occupied/i.test(status) ||
      /unit no\.?\s*\/\s*room/i.test(unitHeader) ||
      /^name of tenant$/i.test(cellText(row.getCell(3).value));
    if (looksLikeHeader) continue;

    const hasAnything =
      status ||
      unitNumber ||
      cellText(tenantRaw) ||
      cellText(contactRaw) ||
      cellText(startRaw) ||
      cellText(endRaw) ||
      row.getCell(6).value != null ||
      row.getCell(7).value != null;

    if (!hasAnything) continue;
    if (!unitNumber && !cellText(startRaw) && !cellText(tenantRaw)) continue;

    if (status && unitNumber) sheetStatusByUnit.set(unitNumber, status);

    rawRows.push({
      excelRow: r,
      status: /^(occupied|vacant)$/i.test(status) ? status : '',
      unitNumber,
      tenantRaw,
      contactRaw,
      startRaw,
      endRaw,
      startDate: toIsoDate(startRaw),
      endDate: toIsoDate(endRaw),
      totalDeposited: toNumber(row.getCell(6).value),
      rent: toNumber(row.getCell(7).value),
      utilityDeposit: toNumber(row.getCell(8).value),
    });
  }

  const resolved = groupAndResolve(rawRows, { depositTemplate, sheetStatusByUnit });
  return {
    sheetName: sheet.name,
    ...resolved,
  };
}
