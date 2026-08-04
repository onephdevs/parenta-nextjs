/**
 * Activity / notification taxonomy and preference defaults.
 */

export const ACTIVITY_CATEGORIES = [
  'tenants',
  'buildings',
  'payments',
  'invoices',
  'expenses',
  'maintenance',
  'leases',
  'utilities',
  'documents',
  'assets',
  'system',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export type ActorRole = 'admin' | 'tenant' | 'system';

export interface CategoryDefault {
  inApp: boolean;
  email: boolean;
  label: string;
  description: string;
}

/** Defaults when no notification_preferences row exists */
export const CATEGORY_DEFAULTS: Record<ActivityCategory, CategoryDefault> = {
  payments: {
    inApp: true,
    email: false,
    label: 'Payments',
    description: 'Payment recorded, claims, refunds, deposits',
  },
  invoices: {
    inApp: true,
    email: false,
    label: 'Invoices',
    description: 'Invoice created, paid, generated',
  },
  maintenance: {
    inApp: true,
    email: false,
    label: 'Maintenance',
    description: 'Requests opened, status changes, completed',
  },
  leases: {
    inApp: true,
    email: false,
    label: 'Leases & reservations',
    description: 'Reservations, conversions, renewals, expiry alerts',
  },
  tenants: {
    inApp: true,
    email: false,
    label: 'Tenants',
    description: 'Tenant profile and assignment changes',
  },
  buildings: {
    inApp: false,
    email: false,
    label: 'Buildings & rooms',
    description: 'Property and room inventory changes',
  },
  expenses: {
    inApp: false,
    email: false,
    label: 'Expenses',
    description: 'Expense create/update/delete',
  },
  utilities: {
    inApp: false,
    email: false,
    label: 'Utilities & meters',
    description: 'Utility bills and meter readings',
  },
  documents: {
    inApp: false,
    email: false,
    label: 'Documents',
    description: 'Document uploads and template changes',
  },
  assets: {
    inApp: false,
    email: false,
    label: 'Assets',
    description: 'Asset inventory and assignments',
  },
  system: {
    inApp: false,
    email: false,
    label: 'System',
    description: 'Bulk imports, settings, and system jobs',
  },
};

const ACTION_TITLES: Record<string, string> = {
  'tenant.created': 'Tenant created',
  'tenant.preview_started': 'Tenant portal preview started',
  'tenant.preview_ended': 'Tenant portal preview ended',
  'tenant.updated': 'Tenant updated',
  'tenant.deleted': 'Tenant deleted',
  'tenant.status_changed': 'Tenant status changed',
  'tenant.assigned': 'Tenant assigned to room',
  'tenant.unassigned': 'Tenant unassigned from room',
  'building.created': 'Building created',
  'building.updated': 'Building updated',
  'building.deleted': 'Building deleted',
  'room.created': 'Room created',
  'room.updated': 'Room updated',
  'room.deleted': 'Room deleted',
  'payment.recorded': 'Payment recorded',
  'payment.updated': 'Payment updated',
  'payment.deleted': 'Payment deleted',
  'payment.allocated': 'Payment allocated',
  'payment.claim_submitted': 'Payment claim submitted',
  'invoice.created': 'Invoice created',
  'invoice.updated': 'Invoice updated',
  'invoice.deleted': 'Invoice deleted',
  'invoice.generated': 'Invoices generated',
  'expense.created': 'Expense created',
  'expense.updated': 'Expense updated',
  'expense.deleted': 'Expense deleted',
  'maintenance.requested': 'Maintenance requested',
  'maintenance.updated': 'Maintenance updated',
  'maintenance.status_changed': 'Maintenance status changed',
  'maintenance.completed': 'Maintenance completed',
  'maintenance.deleted': 'Maintenance deleted',
  'reservation.created': 'Reservation created',
  'reservation.updated': 'Reservation updated',
  'reservation.cancelled': 'Reservation cancelled',
  'reservation.converted': 'Reservation converted',
  'document.uploaded': 'Document uploaded',
  'document.updated': 'Document updated',
  'document.deleted': 'Document deleted',
  'asset.created': 'Asset created',
  'asset.updated': 'Asset updated',
  'asset.deleted': 'Asset deleted',
  'asset.assigned': 'Asset assigned',
  'meter_reading.recorded': 'Meter reading recorded',
  'utility_bill.created': 'Utility bill created',
  'utility_bill.updated': 'Utility bill updated',
  'utility_bill.deleted': 'Utility bill deleted',
  'deposit.ledger_entry': 'Deposit ledger entry',
  'bulk.payments_imported': 'Payments imported',
  'bulk.invoices_generated': 'Bulk invoices generated',
  'bulk.tenants_status_updated': 'Bulk tenant status update',
  'settings.updated': 'Settings updated',
  'job.completed': 'Job completed',
  'job.failed': 'Job failed',
  'pipeline.website_inquiry': 'Website inquiry',
  'pipeline.card_created': 'Opportunity created',
  'pipeline.card_updated': 'Opportunity updated',
  'pipeline.card_moved': 'Opportunity moved',
  'pipeline.card_deleted': 'Opportunity deleted',
  'pipeline.moved_to_nurture': 'Moved to nurture',
  'pipeline.resumed_onboarding': 'Resumed onboarding',
  'pipeline.moved_to_board': 'Moved to another pipeline',
};

export function getActionTitle(actionType: string): string {
  if (ACTION_TITLES[actionType]) return ACTION_TITLES[actionType];
  const [entity, verb] = actionType.split('.');
  if (!entity || !verb) return actionType;
  return `${entity.replace(/_/g, ' ')} ${verb.replace(/_/g, ' ')}`;
}

/**
 * Build an actor display name from a users row. Always resolve this at read
 * time so renamed users are reflected in historical activity and notifications.
 */
export function formatActorName(params: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  actorRole?: string | null;
  /** When false/null, treat as a system actor if no name is available. */
  hasActorUserId?: boolean | null;
}): string | null {
  const name = `${params.firstName || ''} ${params.lastName || ''}`.trim();
  if (name) return name;
  if (params.email) return params.email;
  if (params.actorRole === 'system' || params.hasActorUserId === false) return 'System';
  return null;
}

/** Strip trailing status words already implied by the action type (e.g. "… completed"). */
function cleanJobLabel(label: string, verb: string): string {
  const pattern = new RegExp(`\\s+${verb.replace(/_/g, ' ')}$`, 'i');
  return label.replace(pattern, '').trim() || label;
}

export function formatActivityDescription(params: {
  actionType: string;
  entityLabel?: string | null;
  actorName?: string | null;
}): string {
  const actor = params.actorName?.trim() || 'Someone';
  const label = params.entityLabel?.trim();
  const [entity, verb] = params.actionType.split('.');
  const entityWords = (entity || 'item').replace(/_/g, ' ');
  const verbWords = (verb || 'updated').replace(/_/g, ' ');

  // Background jobs: "System completed job: notification_queue_process"
  if (entity === 'job') {
    const jobName = label ? cleanJobLabel(label, verbWords) : null;
    const phrase = `${actor} ${verbWords} job`;
    if (jobName) return `${phrase}: ${jobName}`;
    return phrase;
  }

  // Prefer natural phrasing: "Ada created tenant: Juan"
  const phrase = `${actor} ${verbWords} ${entityWords}`;
  if (label) return `${phrase}: ${label}`;
  return phrase;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'temporaryPassword',
  'token',
  'token_hash',
  'secret',
  'csrfToken',
]);

export function sanitizeActivityData(
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = sanitizeActivityData(value as Record<string, unknown>);
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function isActivityCategory(value: string): value is ActivityCategory {
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(value);
}
