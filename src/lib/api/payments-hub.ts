import pool from '@/lib/db';
import { getOutstandingInvoices } from '@/lib/services/dashboard-service';
import { getPaymentSummary } from '@/lib/api/payments';

export interface PaymentsHubStats {
  collectedThisMonth: number;
  outstanding: number;
  overdueCount: number;
  penaltiesApplied: number;
}

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

export async function getPaymentsHubStats(): Promise<PaymentsHubStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [monthSummary, outstanding, penaltiesResult] = await Promise.all([
    getPaymentSummary(monthStart, monthEnd),
    getOutstandingInvoices(),
    pool.query(`
      SELECT COALESCE(SUM(fee_amount), 0) as total
      FROM late_fee_applications
      WHERE status = 'applied'
    `).catch(() => ({ rows: [{ total: 0 }] })),
  ]);

  return {
    collectedThisMonth: monthSummary.completedAmount || 0,
    outstanding: outstanding.total || 0,
    overdueCount: outstanding.overdueCount || 0,
    penaltiesApplied: parseFloat(penaltiesResult.rows[0]?.total || '0'),
  };
}

export async function getUpcomingAndDueInvoices(
  filters: UpcomingDueFilters = {}
): Promise<UpcomingDueItem[]> {
  const limit = filters.limit ?? 50;
  const params: unknown[] = [];
  let paramIndex = 1;

  let query = `
    SELECT
      i.id,
      i.invoice_number,
      i.tenant_id,
      CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
      i.due_date,
      i.total_amount,
      (i.total_amount - COALESCE(i.amount_paid, 0)) as remaining_amount,
      i.invoice_status,
      unit.room_number,
      unit.building_name,
      unit.building_id,
      COALESCE(penalties.penalty_amount, 0) as penalty_amount,
      CASE
        WHEN i.invoice_status = 'overdue' OR i.due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'due'
      END as ui_status
    FROM invoices i
    JOIN tenants t ON t.id = i.tenant_id
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
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(lfa.fee_amount), 0) as penalty_amount
      FROM late_fee_applications lfa
      WHERE lfa.invoice_id = i.id
        AND lfa.status = 'applied'
    ) penalties ON true
    WHERE i.invoice_status IN ('sent', 'partial', 'overdue')
      AND i.total_amount > COALESCE(i.amount_paid, 0)
  `;

  if (filters.search?.trim()) {
    query += ` AND (
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
    query += ` AND unit.building_id = $${paramIndex}`;
    params.push(filters.buildingId);
    paramIndex++;
  }

  if (filters.status === 'due') {
    query += ` AND i.invoice_status IN ('sent', 'partial') AND i.due_date >= CURRENT_DATE`;
  } else if (filters.status === 'overdue') {
    query += ` AND (i.invoice_status = 'overdue' OR i.due_date < CURRENT_DATE)`;
  }

  query += ` ORDER BY
    CASE WHEN i.invoice_status = 'overdue' OR i.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
    i.due_date ASC
    LIMIT $${paramIndex}`;
  params.push(limit);

  try {
    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      roomNumber: row.room_number || undefined,
      buildingName: row.building_name || undefined,
      buildingId: row.building_id || undefined,
      dueDate: new Date(row.due_date),
      amount: parseFloat(row.total_amount),
      remainingAmount: parseFloat(row.remaining_amount),
      penaltyAmount: parseFloat(row.penalty_amount),
      uiStatus: row.ui_status as 'due' | 'overdue',
    }));
  } catch (error) {
    console.error('Error fetching upcoming/due invoices:', error);
    return [];
  }
}
