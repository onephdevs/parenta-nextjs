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
  key: 'payments' | 'utilities' | 'inquiries' | 'maintenance' | 'deposits' | 'deposit_funded';
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

const PREVIEW_LIMIT = 5;

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
            WHEN COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE
              AND i.invoice_status != 'paid'
              AND i.bill_status != 'PAID'
            THEN i.balance_due
            ELSE 0
          END
        ),
        0
      ) AS past_due_amount,
      COALESCE(
        MAX(
          CASE
            WHEN COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE
              AND i.invoice_status != 'paid'
              AND i.bill_status != 'PAID'
            THEN (CURRENT_DATE - COALESCE(i.negotiated_due_date, i.due_date))
            ELSE 0
          END
        ),
        0
      ) AS days_past_due,
      MIN(
        CASE
          WHEN COALESCE(i.negotiated_due_date, i.due_date) >= CURRENT_DATE
            AND i.invoice_status != 'paid'
            AND i.bill_status != 'PAID'
          THEN (COALESCE(i.negotiated_due_date, i.due_date) - CURRENT_DATE)
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
        href: `/admin/tasks?board=payments`,
        urgencyRank: status.urgencyRank,
      };
    })
    .sort((a, b) => b.urgencyRank - a.urgencyRank);

  return {
    key: 'payments',
    title: 'Rent due',
    count: ranked.length,
    items: ranked.slice(0, PREVIEW_LIMIT).map(({ urgencyRank: _, ...item }) => item),
    viewAllHref: '/admin/tasks?board=payments',
    viewAllLabel: 'View rent payment board',
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
      href: '/admin/tasks?board=expenses',
    };
  });

  return {
    key: 'utilities',
    title: 'Utilities due',
    count: items.length,
    items: items.slice(0, PREVIEW_LIMIT),
    viewAllHref: '/admin/tasks?board=expenses',
    viewAllLabel: 'View electricity, water and expense board',
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
      href: '/admin/tasks?board=onboarding',
    };
  });

  return {
    key: 'inquiries',
    title: 'New inquiries',
    count: items.length,
    items: items.slice(0, PREVIEW_LIMIT),
    viewAllHref: '/admin/tasks?board=onboarding',
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
      href: '/admin/tasks?board=maintenance',
    };
  });

  return {
    key: 'maintenance',
    title: 'Maintenance',
    count: items.length,
    items: items.slice(0, PREVIEW_LIMIT),
    viewAllHref: '/admin/tasks?board=maintenance',
    viewAllLabel: 'View maintenance pipeline',
  };
}

async function getDepositFundedAlerts(): Promise<NeedsAttentionCard> {
  try {
    // Bills recently paid (or partially covered) via deposit ledger apply — not cash
    const result = await pool.query(`
      SELECT DISTINCT ON (i.id)
        i.id,
        i.invoice_number,
        i.balance_due,
        i.bill_status,
        t.id AS tenant_id,
        t.first_name,
        t.last_name,
        r.room_number,
        dt.amount AS deposit_amount,
        dt.transaction_date,
        dt.reason
      FROM deposit_transactions dt
      JOIN deposit_ledgers dl ON dl.id = dt.deposit_ledger_id
      JOIN invoices i ON i.id = dt.applied_to_invoice_id
      JOIN tenants t ON t.id = i.tenant_id
      LEFT JOIN tenant_room_assignments tra
        ON tra.tenant_id = t.id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON r.id = tra.room_id
      WHERE dt.amount < 0
        AND dt.applied_to_invoice_id IS NOT NULL
        AND dt.transaction_date >= CURRENT_DATE - INTERVAL '60 days'
      ORDER BY i.id, dt.transaction_date DESC
      LIMIT 50
    `);

    const items: NeedsAttentionItem[] = result.rows.map((row) => {
      const name = `${row.first_name} ${row.last_name}`.trim();
      const room = row.room_number ? `Unit ${row.room_number}` : 'Unit';
      const applied = Math.abs(Number(row.deposit_amount || 0));
      return {
        id: String(row.id),
        title: name,
        subtitle: `${room} • ${row.invoice_number} paid ₱${applied.toLocaleString('en-PH')} from deposit`,
        meta: row.reason ? String(row.reason) : undefined,
        urgency: 'soon' as const,
        href: `/admin/tenants/${row.tenant_id}`,
      };
    });

    return {
      key: 'deposit_funded',
      title: 'Deposit-funded rent',
      count: items.length,
      items: items.slice(0, PREVIEW_LIMIT),
      viewAllHref: '/admin/reports/deposits',
      viewAllLabel: 'View deposits',
    };
  } catch (error) {
    console.warn(
      'deposit-funded alerts skipped:',
      error instanceof Error ? error.message : error
    );
    return {
      key: 'deposit_funded',
      title: 'Deposit-funded rent',
      count: 0,
      items: [],
      viewAllHref: '/admin/reports/deposits',
      viewAllLabel: 'View deposits',
    };
  }
}

async function getDepositAlerts(): Promise<NeedsAttentionCard> {
  try {
    const result = await pool.query(`
      SELECT
        dl.id,
        dl.deposit_type,
        dl.running_balance,
        t.id AS tenant_id,
        t.first_name,
        t.last_name,
        r.room_number
      FROM deposit_ledgers dl
      JOIN tenants t ON t.id = dl.tenant_id
      JOIN tenant_room_assignments tra ON tra.id = dl.assignment_id
      LEFT JOIN rooms r ON r.id = tra.room_id
      WHERE dl.is_active = true
        AND dl.running_balance = 0
        AND tra.assignment_status = 'active'
      ORDER BY t.last_name, t.first_name
      LIMIT 50
    `);

    const items: NeedsAttentionItem[] = result.rows.map((row) => {
      const name = `${row.first_name} ${row.last_name}`.trim();
      const room = row.room_number ? `Unit ${row.room_number}` : 'Unit';
      const type = String(row.deposit_type || 'SECURITY');
      return {
        id: String(row.id),
        title: name,
        subtitle: `${room} • ${type} deposit balance ₱0`,
        urgency: 'soon' as const,
        href: `/admin/tenants/${row.tenant_id}`,
      };
    });

    return {
      key: 'deposits',
      title: 'Deposit balance zero',
      count: items.length,
      items: items.slice(0, PREVIEW_LIMIT),
      viewAllHref: '/admin/reports/deposits',
      viewAllLabel: 'View deposits report',
    };
  } catch (error) {
    // Table may not exist until Phase 1 migration is applied
    console.warn(
      'deposit alerts skipped:',
      error instanceof Error ? error.message : error
    );
    return {
      key: 'deposits',
      title: 'Deposit balance zero',
      count: 0,
      items: [],
      viewAllHref: '/admin/reports/deposits',
      viewAllLabel: 'View deposits report',
    };
  }
}

export async function getNeedsAttention(): Promise<NeedsAttentionPayload> {
  const empty = (
    key: NeedsAttentionCard['key'],
    title: string,
    viewAllHref: string,
    viewAllLabel: string
  ): NeedsAttentionCard => ({
    key,
    title,
    count: 0,
    items: [],
    viewAllHref,
    viewAllLabel,
  });

  const settled = await Promise.allSettled([
    getNewInquiries(),
    getPaymentsDue(),
    getUtilitiesDue(),
    getMaintenanceOpen(),
    getDepositAlerts(),
    getDepositFundedAlerts(),
  ]);

  const fallbacks: NeedsAttentionCard[] = [
    empty('inquiries', 'New inquiries', '/admin/tasks?board=onboarding', 'View onboarding pipeline'),
    empty('payments', 'Rent due', '/admin/tasks?board=payments', 'View rent payment board'),
    empty('utilities', 'Utilities due', '/admin/tasks?board=expenses', 'View electricity, water and expense board'),
    empty('maintenance', 'Maintenance', '/admin/tasks?board=maintenance', 'View maintenance pipeline'),
    empty('deposits', 'Deposit balance zero', '/admin/reports/deposits', 'View deposits report'),
    empty('deposit_funded', 'Deposit-funded rent', '/admin/reports/deposits', 'View deposits'),
  ];

  const cards = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    console.error(
      `needs-attention card failed (${fallbacks[i].key}):`,
      result.reason instanceof Error ? result.reason.message : result.reason
    );
    return fallbacks[i];
  });

  return {
    updatedAt: new Date().toISOString(),
    cards,
  };
}
