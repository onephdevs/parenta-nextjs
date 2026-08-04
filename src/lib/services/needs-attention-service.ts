/**
 * Aggregates "Needs Attention" signals for the admin dashboard.
 * Four independent sources — do not merge into notifications/activity.
 */

import pool from '@/lib/db';
import { getPastDueStatus } from '@/lib/past-due-status';
import { listMaintenanceRequests } from '@/lib/api/maintenance';

export interface NeedsAttentionItem {
  id: string;
  title: string;
  subtitle: string;
  /** Optional third line (e.g. "Submitted 2h ago"). */
  meta?: string;
  urgency?: 'late' | 'soon' | 'normal';
  href?: string;
}

export interface NeedsAttentionCard {
  key: 'payments' | 'utilities' | 'inquiries' | 'maintenance';
  title: string;
  count: number;
  items: NeedsAttentionItem[];
  viewAllHref: string;
  viewAllLabel: string;
}

export interface NeedsAttentionPayload {
  updatedAt: string;
  cards: NeedsAttentionCard[];
}

const PREVIEW_LIMIT = 2;

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatShortDate(value: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function relativeTime(value: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

async function getPaymentsDue(): Promise<NeedsAttentionCard> {
  const result = await pool.query(`
    SELECT
      t.id,
      t.first_name,
      t.last_name,
      COALESCE(SUM(i.balance_due), 0) AS balance,
      COALESCE(
        SUM(
          CASE
            WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid'
            THEN i.balance_due
            ELSE 0
          END
        ),
        0
      ) AS past_due_amount,
      COALESCE(
        MAX(
          CASE
            WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid'
            THEN (CURRENT_DATE - i.due_date)
            ELSE 0
          END
        ),
        0
      ) AS days_past_due,
      MIN(
        CASE
          WHEN i.due_date >= CURRENT_DATE AND i.invoice_status != 'paid'
          THEN (i.due_date - CURRENT_DATE)
          ELSE NULL
        END
      ) AS days_until_due
    FROM tenants t
    INNER JOIN invoices i
      ON i.tenant_id = t.id
      AND i.invoice_status IN ('sent', 'partial', 'overdue')
      AND i.balance_due > 0
    WHERE t.tenant_status = 'active' AND t.is_active = true
    GROUP BY t.id, t.first_name, t.last_name
    HAVING COALESCE(SUM(i.balance_due), 0) > 0
  `);

  const ranked = result.rows
    .map((row) => {
      const balance = parseFloat(row.balance || 0);
      const daysPastDue = parseInt(row.days_past_due || 0, 10);
      const daysUntilDue =
        row.days_until_due == null ? null : parseInt(row.days_until_due, 10);
      const status = getPastDueStatus({ balance, daysPastDue, daysUntilDue });
      return {
        id: String(row.id),
        title: `${row.first_name} ${row.last_name}`.trim(),
        subtitle: `${formatPhp(balance)} • ${status.urgencyLabel}`,
        urgency:
          status.tier === 'late' || status.tier === 'escalated'
            ? ('late' as const)
            : status.tier === 'due_soon'
              ? ('soon' as const)
              : ('normal' as const),
        href: `/admin/tenants/${row.id}`,
        urgencyRank: status.urgencyRank,
      };
    })
    .sort((a, b) => b.urgencyRank - a.urgencyRank);

  return {
    key: 'payments',
    title: 'Payments due',
    count: ranked.length,
    items: ranked.slice(0, PREVIEW_LIMIT).map(({ urgencyRank: _, ...item }) => item),
    viewAllHref: '/admin/financial/payments',
    viewAllLabel: 'View all payments',
  };
}

async function getUtilitiesDue(): Promise<NeedsAttentionCard> {
  const result = await pool.query(`
    SELECT
      ub.id,
      ub.utility_type,
      ub.amount,
      ub.due_date,
      ub.bill_status,
      b.name AS building_name,
      CASE
        WHEN ub.due_date < CURRENT_DATE THEN (CURRENT_DATE - ub.due_date::date)
        ELSE 0
      END AS days_past_due,
      CASE
        WHEN ub.due_date >= CURRENT_DATE THEN (ub.due_date::date - CURRENT_DATE)
        ELSE NULL
      END AS days_until_due
    FROM utility_bills ub
    LEFT JOIN buildings b ON b.id = ub.building_id
    WHERE ub.bill_status IN ('pending', 'overdue')
      AND ub.due_date IS NOT NULL
      AND (
        ub.bill_status = 'overdue'
        OR ub.due_date <= CURRENT_DATE + INTERVAL '14 days'
      )
    ORDER BY
      CASE
        WHEN ub.due_date < CURRENT_DATE OR ub.bill_status = 'overdue' THEN 0
        ELSE 1
      END,
      ub.due_date ASC NULLS LAST
    LIMIT 50
  `);

  const items: NeedsAttentionItem[] = result.rows.map((row) => {
    const daysPastDue = parseInt(row.days_past_due || 0, 10);
    const daysUntilDue =
      row.days_until_due == null ? null : parseInt(row.days_until_due, 10);
    const isLate = daysPastDue > 0 || row.bill_status === 'overdue';
    const utilityLabel = String(row.utility_type || 'Utility')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    const building = row.building_name || 'Property';
    let urgencyPhrase = formatShortDate(row.due_date)
      ? `due ${formatShortDate(row.due_date)}`
      : 'due date TBD';
    if (isLate) {
      urgencyPhrase =
        daysPastDue > 0
          ? `${daysPastDue} day${daysPastDue === 1 ? '' : 's'} late`
          : 'overdue';
    } else if (daysUntilDue === 0) {
      urgencyPhrase = 'due today';
    } else if (daysUntilDue === 1) {
      urgencyPhrase = 'due tomorrow';
    }

    return {
      id: String(row.id),
      title: `${utilityLabel} — ${building}`,
      subtitle: `${formatPhp(parseFloat(row.amount || 0))} • ${urgencyPhrase}`,
      urgency: isLate ? 'late' : daysUntilDue != null && daysUntilDue <= 3 ? 'soon' : 'normal',
      href: '/admin/bills-expenses/utility-bills',
    };
  });

  return {
    key: 'utilities',
    title: 'Utilities due',
    count: items.length,
    items: items.slice(0, PREVIEW_LIMIT),
    viewAllHref: '/admin/bills-expenses/utility-bills',
    viewAllLabel: 'View all utilities',
  };
}

async function getNewInquiries(): Promise<NeedsAttentionCard> {
  const result = await pool.query(`
    SELECT
      c.id,
      c.title,
      c.contact_first_name,
      c.contact_last_name,
      c.viewing_at,
      c.created_at,
      s.slug AS stage_slug,
      s.name AS stage_name,
      b.name AS building_name,
      r.room_number
    FROM pipeline_cards c
    JOIN pipeline_boards pb ON pb.id = c.board_id
    JOIN pipeline_stages s ON s.id = c.stage_id
    LEFT JOIN buildings b ON b.id = c.building_id
    LEFT JOIN rooms r ON r.id = c.room_id
    WHERE pb.slug = 'onboarding'
      AND c.card_status = 'open'
      AND s.slug IN ('new_inquiry', 'viewing_scheduled')
    ORDER BY
      CASE s.slug WHEN 'new_inquiry' THEN 0 ELSE 1 END,
      c.created_at DESC
    LIMIT 50
  `);

  const items: NeedsAttentionItem[] = result.rows.map((row) => {
    const name =
      [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ').trim() ||
      row.title ||
      'Untitled';
    let subtitle = 'new inquiry';
    if (row.stage_slug === 'viewing_scheduled' && row.viewing_at) {
      subtitle = `Viewing scheduled ${formatShortDate(row.viewing_at)}`;
    } else if (row.building_name) {
      const room = row.room_number ? ` ${row.room_number}` : '';
      subtitle = `${row.building_name}${room} • new inquiry`;
    } else if (row.stage_slug === 'viewing_scheduled') {
      subtitle = 'Viewing scheduled';
    }

    return {
      id: String(row.id),
      title: name,
      subtitle,
      urgency: row.stage_slug === 'new_inquiry' ? 'soon' : 'normal',
      href: '/admin/tasks',
    };
  });

  return {
    key: 'inquiries',
    title: 'New inquiries',
    count: items.length,
    items: items.slice(0, PREVIEW_LIMIT),
    viewAllHref: '/admin/tasks',
    viewAllLabel: 'View pipeline',
  };
}

async function getMaintenanceOpen(): Promise<NeedsAttentionCard> {
  const { requests } = await listMaintenanceRequests({ status: 'open' });
  const inProgress = await listMaintenanceRequests({ status: 'in_progress' });
  const combined = [...requests, ...inProgress.requests].sort((a, b) => {
    const priorityRank = (p: unknown) => {
      switch (String(p)) {
        case 'urgent':
          return 4;
        case 'high':
          return 3;
        case 'medium':
          return 2;
        default:
          return 1;
      }
    };
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    const aTime = new Date(String(a.created_at || 0)).getTime();
    const bTime = new Date(String(b.created_at || 0)).getTime();
    return bTime - aTime;
  });

  const items: NeedsAttentionItem[] = combined.map((row) => {
    const room = row.room_number ? `Room ${row.room_number}` : null;
    const tenant = row.tenant_name ? String(row.tenant_name) : null;
    const location = [room, tenant].filter(Boolean).join(' • ') || 'Unassigned';
    const submitted = relativeTime(row.created_at as string);

    return {
      id: String(row.id),
      title: String(row.title || 'Maintenance request'),
      subtitle: location,
      meta: submitted ? `Submitted ${submitted}` : undefined,
      urgency:
        row.priority === 'urgent' || row.priority === 'high' ? 'late' : 'soon',
      href: '/admin/maintenance',
    };
  });

  return {
    key: 'maintenance',
    title: 'Maintenance',
    count: items.length,
    items: items.slice(0, PREVIEW_LIMIT),
    viewAllHref: '/admin/maintenance',
    viewAllLabel: 'View all requests',
  };
}

export async function getNeedsAttention(): Promise<NeedsAttentionPayload> {
  const [payments, utilities, inquiries, maintenance] = await Promise.all([
    getPaymentsDue(),
    getUtilitiesDue(),
    getNewInquiries(),
    getMaintenanceOpen(),
  ]);

  return {
    updatedAt: new Date().toISOString(),
    cards: [payments, utilities, inquiries, maintenance],
  };
}
