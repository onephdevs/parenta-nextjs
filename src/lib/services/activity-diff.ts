/**
 * Human-readable before/after field diffs for activity detail UI.
 * Hides internal IDs and formats enums so non-technical users can follow changes.
 */

import {
  formatMaintenanceCategory,
  formatMaintenancePriority,
  formatMaintenanceStatus,
} from '@/lib/constants/maintenance';

const HIDDEN_FIELDS = new Set([
  'id',
  'tenant_id',
  'tenantId',
  'room_id',
  'roomId',
  'building_id',
  'buildingId',
  'user_id',
  'userId',
  'assigned_to',
  'assignedTo',
  'assigned_to_user_id',
  'created_by',
  'createdBy',
  'created_by_id',
  'updated_by',
  'updatedBy',
  'organization_id',
  'organizationId',
  'pipeline_card_id',
  'pipelineCardId',
  'maintenance_request_id',
  'maintenanceRequestId',
  'invoice_id',
  'invoiceId',
  'payment_id',
  'paymentId',
  'lease_id',
  'leaseId',
  'document_id',
  'documentId',
  'password',
  'password_hash',
  'passwordHash',
  'token',
  'refresh_token',
  'refreshToken',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
]);

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  category: 'Category',
  priority: 'Priority',
  status: 'Status',
  notes: 'Notes',
  attachmentCount: 'Photos attached',
  attachment_count: 'Photos attached',
  photosAttached: 'Photos attached',
  scheduled_date: 'Scheduled date',
  scheduledDate: 'Scheduled date',
  completed_date: 'Completed date',
  completedDate: 'Completed date',
  due_date: 'Due date',
  dueDate: 'Due date',
  amount: 'Amount',
  balance: 'Balance',
  first_name: 'First name',
  firstName: 'First name',
  last_name: 'Last name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  source: 'Source',
  payment_method: 'Payment method',
  paymentMethod: 'Payment method',
  payment_status: 'Payment status',
  paymentStatus: 'Payment status',
  reference_number: 'Reference number',
  referenceNumber: 'Reference number',
  transaction_id: 'Transaction ID',
  transactionId: 'Transaction ID',
  bill_status: 'Bill status',
  billStatus: 'Bill status',
  room_number: 'Room',
  roomNumber: 'Room',
  building_name: 'Building',
  buildingName: 'Building',
  unit: 'Unit',
};

const FIELD_ORDER = [
  'title',
  'description',
  'category',
  'priority',
  'status',
  'notes',
  'attachmentCount',
  'attachment_count',
  'photosAttached',
  'scheduled_date',
  'scheduledDate',
  'completed_date',
  'completedDate',
  'amount',
  'balance',
  'email',
  'phone',
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleCaseWords(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateLike(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatEnumish(value: string): string {
  if (UUID_RE.test(value)) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDateLike(value);
  if (value.includes('_') || value === value.toLowerCase()) {
    return titleCaseWords(value);
  }
  return value;
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toLocaleString('en-PH') : String(value);
  }
  if (value instanceof Date) return formatDateLike(value.toISOString());

  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value.map((v) => formatFieldValue(field, v)).join(', ');
  }

  if (typeof value === 'object') {
    return 'Updated details';
  }

  if (typeof value !== 'string') return String(value);

  const key = field.toLowerCase();
  if (key === 'category') return formatMaintenanceCategory(value);
  if (key === 'priority') return formatMaintenancePriority(value);
  if (key === 'status' || key.endsWith('status')) {
    return formatMaintenanceStatus(value);
  }
  if (
    key.includes('method') ||
    key.includes('type') ||
    key.includes('role') ||
    key.includes('source')
  ) {
    return formatEnumish(value);
  }
  if (UUID_RE.test(value)) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDateLike(value);

  return value;
}

function isHiddenField(key: string): boolean {
  if (HIDDEN_FIELDS.has(key)) return true;
  if (
    /(_id|Id)$/.test(key) &&
    key !== 'transactionId' &&
    key !== 'transaction_id'
  ) {
    return true;
  }
  return false;
}

function sortKeys(keys: string[]): string[] {
  const rank = (key: string) => {
    const idx = FIELD_ORDER.indexOf(key);
    return idx === -1 ? 1000 : idx;
  };
  return [...keys].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

export interface FieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

export function buildFieldDiffs(
  beforeData: Record<string, unknown> | null | undefined,
  afterData: Record<string, unknown> | null | undefined
): FieldDiff[] {
  const before = beforeData || {};
  const after = afterData || {};
  const keys = sortKeys(
    Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
      (key) => !isHiddenField(key)
    )
  );

  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    const beforeStr = formatFieldValue(key, b);
    const afterStr = formatFieldValue(key, a);
    if (beforeStr === '—' && afterStr === '—') continue;
    const changed = JSON.stringify(b) !== JSON.stringify(a);
    if (!changed && beforeData && afterData) continue;
    diffs.push({
      field: key,
      label: humanizeKey(key),
      before: beforeStr,
      after: afterStr,
      changed,
    });
  }

  return diffs.sort((x, y) => Number(y.changed) - Number(x.changed));
}
