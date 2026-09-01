import type { CreatePipelineCardData, PipelineBoardSlug } from '@/types/database';

export interface PipelineCsvRowError {
  line: number;
  message: string;
}

export interface ParsedPipelineCsvRow {
  line: number;
  data: CreatePipelineCardData;
}

const HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  name: 'title',
  first_name: 'contactFirstName',
  firstname: 'contactFirstName',
  first: 'contactFirstName',
  last_name: 'contactLastName',
  lastname: 'contactLastName',
  last: 'contactLastName',
  email: 'contactEmail',
  phone: 'contactPhone',
  mobile: 'contactPhone',
  amount: 'amount',
  notes: 'notes',
  note: 'notes',
  tags: 'tags',
  tag: 'tags',
  due_at: 'dueAt',
  due: 'dueAt',
  due_date: 'dueAt',
  source: 'source',
  stage: 'stageSlug',
  stage_slug: 'stageSlug',
};

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
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parsePipelineCsv(
  csvText: string,
  boardSlug: PipelineBoardSlug
): { rows: ParsedPipelineCsvRow[]; errors: PipelineCsvRowError[] } {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'CSV needs a header row and at least one data row' }],
    };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const mapped = headers.map((h) => HEADER_ALIASES[h] || '');
  if (!mapped.some(Boolean)) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message:
            'No recognized columns. Use title, first_name, last_name, email, phone, amount, notes, tags, due_at, source, stage.',
        },
      ],
    };
  }

  const rows: ParsedPipelineCsvRow[] = [];
  const errors: PipelineCsvRowError[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const cells = splitCsvLine(lines[i]);
    const record: Record<string, string> = {};
    mapped.forEach((key, idx) => {
      if (!key) return;
      record[key] = cells[idx] || '';
    });

    const title = (record.title || '').trim();
    const first = (record.contactFirstName || '').trim();
    const last = (record.contactLastName || '').trim();
    if (!title && !first && !last) {
      errors.push({ line: lineNo, message: 'Need a title or a contact name' });
      continue;
    }

    let amount: number | undefined;
    if (record.amount) {
      const parsed = Number(String(record.amount).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(parsed)) {
        errors.push({ line: lineNo, message: 'Amount is not a number' });
        continue;
      }
      amount = parsed;
    }

    const tags = (record.tags || '')
      .split(/[|;,]/)
      .map((t) => t.trim())
      .filter(Boolean);

    rows.push({
      line: lineNo,
      data: {
        boardSlug,
        title: title || undefined,
        contactFirstName: first || undefined,
        contactLastName: last || undefined,
        contactEmail: (record.contactEmail || '').trim() || undefined,
        contactPhone: (record.contactPhone || '').trim() || undefined,
        amount,
        notes: (record.notes || '').trim() || undefined,
        tags: tags.length ? tags : undefined,
        dueAt: (record.dueAt || '').trim() || undefined,
        source: (record.source || '').trim() || 'CSV import',
        stageSlug: (record.stageSlug || '').trim() || undefined,
      },
    });
  }

  return { rows, errors };
}
