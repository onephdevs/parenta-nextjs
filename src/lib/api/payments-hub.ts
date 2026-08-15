import pool from '@/lib/db';

export interface PaymentsHubStats {
  totalAmountDue: number;
  totalAmountPaid: number;
  totalBalance: number;
  overdueCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
}

export type PaymentsHubUiStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface PaymentsHubRow {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  roomNumber?: string;
  buildingName?: string;
  buildingId?: string;
  dueDate: Date;
  typeLabel: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  uiStatus: PaymentsHubUiStatus;
  isOverdue: boolean;
  paidAt?: Date | null;
  latestPaymentId?: string | null;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
}

export interface PaymentsHubFilters {
  search?: string;
  buildingId?: string;
  dueDate?:
    | 'upcoming_month'
    | 'overdue'
    | 'this_week'
    | 'this_month'
    | 'next_30'
    | 'past'
    | 'all';
  type?: 'rent' | 'utilities' | 'deposit' | 'penalty' | 'other';
  status?: 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  /** Billing period start as YYYY-MM-DD */
  paymentPeriod?: string;
  page?: number;
  limit?: number;
}

export interface PaymentsHubListResult {
  rows: PaymentsHubRow[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentPeriodOption {
  value: string;
  label: string;
}

/** @deprecated Prefer PaymentsHubRow via getPaymentsHubList */
export interface UpcomingDueItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  roomNumber?: string;
  buildingName?: string;
  buildingId?: string;
  dueDate: Date;
  amount: number;
  remainingAmount: number;
  penaltyAmount: number;
  uiStatus: 'due' | 'overdue';
}

export interface UpcomingDueFilters {
  search?: string;
  buildingId?: string;
  status?: 'due' | 'overdue' | 'all';
  limit?: number;
}

function typeLabelFromItemType(itemType: string | null | undefined): string {
  const t = String(itemType || 'rent').toLowerCase();
  if (t.includes('util') || t === 'electricity' || t === 'water') return 'Utilities';
  if (t === 'deposit') return 'Deposit';
  if (t === 'late_fee' || t === 'penalty') return 'Penalty';
  if (t === 'advance') return 'Advance';
  return 'Rent';
}

function formatPeriodLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function mapRow(row: Record<string, unknown>): PaymentsHubRow {
  const amountDue = parseFloat(String(row.total_amount ?? 0));
  const amountPaid = parseFloat(String(row.amount_paid ?? 0));
  const balance = parseFloat(
    String(row.balance_due ?? amountDue - amountPaid)
  );
  const invoiceStatus = String(row.invoice_status || '').toLowerCase();
  const dueDate = new Date(String(row.due_date));
  const isOverdue =
    balance > 0.009 &&
    (invoiceStatus === 'overdue' || dueDate < new Date(new Date().toDateString()));

  let uiStatus: PaymentsHubUiStatus = 'unpaid';
  if (invoiceStatus === 'paid' || balance <= 0.009) {
    uiStatus = 'paid';
  } else if (amountPaid > 0.009) {
    uiStatus = 'partially_paid';
  }

  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name || ''),
    roomNumber: row.room_number ? String(row.room_number) : undefined,
    buildingName: row.building_name ? String(row.building_name) : undefined,
    buildingId: row.building_id ? String(row.building_id) : undefined,
    dueDate,
    typeLabel: typeLabelFromItemType(
      row.primary_item_type ? String(row.primary_item_type) : undefined
    ),
    amountDue,
    amountPaid,
    balance: Math.max(0, balance),
    uiStatus,
    isOverdue,
    paidAt: row.paid_at ? new Date(String(row.paid_at)) : null,
    latestPaymentId: row.latest_payment_id
      ? String(row.latest_payment_id)
      : null,
    billingPeriodStart: row.billing_period_start
      ? new Date(String(row.billing_period_start))
      : null,
    billingPeriodEnd: row.billing_period_end
      ? new Date(String(row.billing_period_end))
      : null,
  };
}

const UNIT_JOIN = `
  LEFT JOIN LATERAL (
    SELECT
      r.room_number,
      b.name as building_name,
      b.id as building_id
    FROM tenant_room_assignments tra
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    WHERE tra.tenant_id = i.tenant_id
      AND tra.assignment_status = 'active'
      AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
    ORDER BY tra.start_date DESC
    LIMIT 1
  ) unit ON true
`;

const TYPE_SELECT = `
  (
    SELECT ili.item_type
    FROM invoice_line_items ili
    WHERE ili.invoice_id = i.id
    ORDER BY ili.created_at ASC, ili.id ASC
    LIMIT 1
  ) AS primary_item_type
`;

const PAYMENT_SELECT = `
  (
    SELECT p.payment_date
    FROM payment_allocations pa
    JOIN payments p ON p.id = pa.payment_id
    WHERE pa.invoice_id = i.id
      AND p.payment_status IN ('paid', 'completed')
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT 1
  ) AS paid_at,
  (
    SELECT p.id
    FROM payment_allocations pa
    JOIN payments p ON p.id = pa.payment_id
    WHERE pa.invoice_id = i.id
      AND p.payment_status IN ('paid', 'completed')
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT 1
  ) AS latest_payment_id
`;

function applyListFilters(
  filters: PaymentsHubFilters,
  params: unknown[],
  startIndex: number
): { clause: string; nextIndex: number } {
  let paramIndex = startIndex;
  let clause = `
    WHERE i.invoice_status IS DISTINCT FROM 'cancelled'
  `;

  if (filters.search?.trim()) {
    clause += ` AND (
      CONCAT(t.first_name, ' ', t.last_name) ILIKE $${paramIndex}
      OR t.email ILIKE $${paramIndex}
      OR i.invoice_number ILIKE $${paramIndex}
      OR unit.room_number ILIKE $${paramIndex}
      OR unit.building_name ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.search.trim()}%`);
    paramIndex++;
  }

  if (filters.buildingId) {
    clause += ` AND unit.building_id = $${paramIndex}`;
    params.push(filters.buildingId);
    paramIndex++;
  }

  if (filters.dueDate === 'overdue') {
    clause += ` AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
      AND (i.invoice_status = 'overdue' OR COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE)`;
  } else if (filters.dueDate === 'upcoming_month') {
    // Focus on the calendar month of the nearest upcoming due date.
    // Always keep overdue open balances visible so nothing slips.
    clause += ` AND (
      (
        COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
        AND (i.invoice_status = 'overdue' OR COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE)
      )
      OR (
        COALESCE(i.negotiated_due_date, i.due_date) >= (
          SELECT date_trunc(
            'month',
            COALESCE(
              (
                SELECT MIN(COALESCE(i2.negotiated_due_date, i2.due_date))
                FROM invoices i2
                WHERE i2.invoice_status IS DISTINCT FROM 'cancelled'
                  AND COALESCE(i2.negotiated_due_date, i2.due_date) >= CURRENT_DATE
              ),
              CURRENT_DATE
            )
          )::date
        )
        AND COALESCE(i.negotiated_due_date, i.due_date) < (
          SELECT (
            date_trunc(
              'month',
              COALESCE(
                (
                  SELECT MIN(COALESCE(i2.negotiated_due_date, i2.due_date))
                  FROM invoices i2
                  WHERE i2.invoice_status IS DISTINCT FROM 'cancelled'
                    AND COALESCE(i2.negotiated_due_date, i2.due_date) >= CURRENT_DATE
                ),
                CURRENT_DATE
              )
            ) + INTERVAL '1 month'
          )::date
        )
      )
    )`;
  } else if (filters.dueDate === 'this_week') {
    clause += ` AND COALESCE(i.negotiated_due_date, i.due_date) >= date_trunc('week', CURRENT_DATE)::date
      AND COALESCE(i.negotiated_due_date, i.due_date) < (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week')::date`;
  } else if (filters.dueDate === 'this_month') {
    clause += ` AND COALESCE(i.negotiated_due_date, i.due_date) >= date_trunc('month', CURRENT_DATE)::date
      AND COALESCE(i.negotiated_due_date, i.due_date) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date`;
  } else if (filters.dueDate === 'next_30') {
    clause += ` AND COALESCE(i.negotiated_due_date, i.due_date) >= CURRENT_DATE
      AND COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE + INTERVAL '30 days'`;
  } else if (filters.dueDate === 'past') {
    clause += ` AND COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE`;
  }

  if (filters.type === 'rent') {
    clause += ` AND COALESCE((
      SELECT ili.item_type FROM invoice_line_items ili
      WHERE ili.invoice_id = i.id ORDER BY ili.created_at ASC, ili.id ASC LIMIT 1
    ), 'rent') ILIKE 'rent'`;
  } else if (filters.type === 'utilities') {
    clause += ` AND COALESCE((
      SELECT ili.item_type FROM invoice_line_items ili
      WHERE ili.invoice_id = i.id ORDER BY ili.created_at ASC, ili.id ASC LIMIT 1
    ), '') ~* '(util|electric|water)'`;
  } else if (filters.type === 'deposit') {
    clause += ` AND COALESCE((
      SELECT ili.item_type FROM invoice_line_items ili
      WHERE ili.invoice_id = i.id ORDER BY ili.created_at ASC, ili.id ASC LIMIT 1
    ), '') ILIKE 'deposit'`;
  } else if (filters.type === 'penalty') {
    clause += ` AND COALESCE((
      SELECT ili.item_type FROM invoice_line_items ili
      WHERE ili.invoice_id = i.id ORDER BY ili.created_at ASC, ili.id ASC LIMIT 1
    ), '') ~* '(late_fee|penalty)'`;
  } else if (filters.type === 'other') {
    clause += ` AND COALESCE((
      SELECT ili.item_type FROM invoice_line_items ili
      WHERE ili.invoice_id = i.id ORDER BY ili.created_at ASC, ili.id ASC LIMIT 1
    ), 'rent') !~* '(^rent$|util|electric|water|^deposit$|late_fee|penalty)'`;
  }

  if (filters.status === 'paid') {
    clause += ` AND (
      i.invoice_status = 'paid'
      OR COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) <= 0.009
    )`;
  } else if (filters.status === 'partially_paid') {
    clause += ` AND COALESCE(i.amount_paid, 0) > 0.009
      AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009`;
  } else if (filters.status === 'unpaid') {
    clause += ` AND COALESCE(i.amount_paid, 0) <= 0.009
      AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009`;
  } else if (filters.status === 'overdue') {
    clause += ` AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
      AND (i.invoice_status = 'overdue' OR COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE)`;
  }

  if (filters.paymentPeriod) {
    clause += ` AND i.billing_period_start = $${paramIndex}::date`;
    params.push(filters.paymentPeriod);
    paramIndex++;
  }

  return { clause, nextIndex: paramIndex };
}

export async function getPaymentsHubStats(): Promise<PaymentsHubStats> {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(i.total_amount), 0) AS total_amount_due,
        COALESCE(SUM(i.amount_paid), 0) AS total_amount_paid,
        COALESCE(SUM(COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0))), 0) AS total_balance,
        COUNT(*) FILTER (
          WHERE COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
            AND (i.invoice_status = 'overdue' OR COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE)
        ) AS overdue_count,
        COUNT(*) FILTER (
          WHERE COALESCE(i.amount_paid, 0) <= 0.009
            AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
        ) AS unpaid_count,
        COUNT(*) FILTER (
          WHERE COALESCE(i.amount_paid, 0) > 0.009
            AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
        ) AS partially_paid_count
      FROM invoices i
      WHERE i.invoice_status IS DISTINCT FROM 'cancelled'
    `);

    const row = result.rows[0] || {};
    return {
      totalAmountDue: parseFloat(row.total_amount_due || '0'),
      totalAmountPaid: parseFloat(row.total_amount_paid || '0'),
      totalBalance: parseFloat(row.total_balance || '0'),
      overdueCount: parseInt(row.overdue_count || '0', 10),
      unpaidCount: parseInt(row.unpaid_count || '0', 10),
      partiallyPaidCount: parseInt(row.partially_paid_count || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching payments hub stats:', error);
    return {
      totalAmountDue: 0,
      totalAmountPaid: 0,
      totalBalance: 0,
      overdueCount: 0,
      unpaidCount: 0,
      partiallyPaidCount: 0,
    };
  }
}

export async function getPaymentsHubList(
  filters: PaymentsHubFilters = {}
): Promise<PaymentsHubListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const offset = (page - 1) * limit;
  const params: unknown[] = [];

  const { clause, nextIndex } = applyListFilters(filters, params, 1);

  const fromSql = `
    FROM invoices i
    JOIN tenants t ON t.id = i.tenant_id
    ${UNIT_JOIN}
  `;

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total ${fromSql} ${clause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await pool.query(
      `
      SELECT
        i.id,
        i.invoice_number,
        i.tenant_id,
        CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
        COALESCE(i.negotiated_due_date, i.due_date) AS due_date,
        i.total_amount,
        i.amount_paid,
        COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) AS balance_due,
        i.invoice_status,
        i.billing_period_start,
        i.billing_period_end,
        unit.room_number,
        unit.building_name,
        unit.building_id,
        ${TYPE_SELECT},
        ${PAYMENT_SELECT}
      ${fromSql}
      ${clause}
      ORDER BY
        CASE
          -- Overdue first (action needed), then paid / partial, unpaid last
          WHEN COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
            AND (i.invoice_status = 'overdue' OR COALESCE(i.negotiated_due_date, i.due_date) < CURRENT_DATE)
          THEN 0
          WHEN i.invoice_status = 'paid'
            OR COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) <= 0.009
          THEN 1
          WHEN COALESCE(i.amount_paid, 0) > 0.009
            AND COALESCE(i.balance_due, i.total_amount - COALESCE(i.amount_paid, 0)) > 0.009
          THEN 2
          ELSE 3
        END,
        COALESCE(i.negotiated_due_date, i.due_date) ASC,
        i.created_at DESC
      LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
      `,
      dataParams
    );

    return {
      rows: dataResult.rows.map((row) => mapRow(row)),
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching payments hub list:', error);
    return { rows: [], total: 0, page, limit };
  }
}

export async function getPaymentsHubPeriods(): Promise<PaymentPeriodOption[]> {
  try {
    const result = await pool.query(`
      SELECT DISTINCT billing_period_start, billing_period_end
      FROM invoices
      WHERE billing_period_start IS NOT NULL
        AND billing_period_end IS NOT NULL
        AND invoice_status IS DISTINCT FROM 'cancelled'
      ORDER BY billing_period_start DESC
      LIMIT 24
    `);

    return result.rows.map((row) => {
      const start = new Date(row.billing_period_start);
      const end = new Date(row.billing_period_end);
      const value = start.toISOString().slice(0, 10);
      return { value, label: formatPeriodLabel(start, end) };
    });
  } catch (error) {
    console.error('Error fetching payment periods:', error);
    return [];
  }
}

/** @deprecated Use getPaymentsHubList */
export async function getUpcomingAndDueInvoices(
  filters: UpcomingDueFilters = {}
): Promise<UpcomingDueItem[]> {
  const list = await getPaymentsHubList({
    search: filters.search,
    buildingId: filters.buildingId,
    status:
      filters.status === 'overdue'
        ? 'overdue'
        : filters.status === 'due'
          ? 'unpaid'
          : undefined,
    dueDate: filters.status === 'overdue' ? 'overdue' : undefined,
    limit: filters.limit ?? 50,
    page: 1,
  });

  return list.rows
    .filter((row) => row.uiStatus !== 'paid')
    .map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      roomNumber: row.roomNumber,
      buildingName: row.buildingName,
      buildingId: row.buildingId,
      dueDate: row.dueDate,
      amount: row.amountDue,
      remainingAmount: row.balance,
      penaltyAmount: 0,
      uiStatus: row.isOverdue ? 'overdue' : 'due',
    }));
}
