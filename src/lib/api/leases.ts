import pool from '@/lib/db';
import type { LeaseDetail, LeaseListItem, LeaseStats, LeaseUiStatus } from '@/lib/leases-shared';
import { resolveRentDueDay } from '@/lib/billing/billing-cycle';

export type { LeaseDetail, LeaseListItem, LeaseStats, LeaseUiStatus };
export {
  formatLeaseTerm,
  formatLeaseTermShort,
  ordinalDay,
} from '@/lib/leases-shared';

export interface LeaseListFilters {
  search?: string;
  status?: LeaseUiStatus | 'all' | '';
  buildingId?: string;
  page?: number;
  limit?: number;
}

/** Normalize pg Date / ISO / date-only values to YYYY-MM-DD. */
function toDateOnlyString(value: unknown): string | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const yy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  const raw = String(value).trim();
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const yy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function computeUiStatus(row: {
  assignment_status: string;
  end_date: string | Date | null;
}): LeaseUiStatus {
  const status = row.assignment_status;
  if (status === 'terminated') return 'terminated';
  if (status === 'pending') return 'draft';
  if (status === 'active' && row.end_date) {
    const endOnly = toDateOnlyString(row.end_date);
    const end = endOnly ? new Date(`${endOnly}T12:00:00`) : new Date(row.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    if (end >= today && end <= in30) return 'expiring_soon';
  }
  if (status === 'active') return 'active';
  return status === 'pending' ? 'draft' : 'terminated';
}

function mapListRow(row: Record<string, unknown>): LeaseListItem {
  const endDate = toDateOnlyString(row.end_date);
  const startDate = toDateOnlyString(row.start_date);
  const assignmentStatus = String(row.assignment_status || '');

  return {
    id: String(row.id),
    tenantId: row.tenant_id ? String(row.tenant_id) : '',
    roomId: row.room_id ? String(row.room_id) : '',
    buildingId: row.building_id ? String(row.building_id) : '',
    buildingName: String(row.building_name || 'Unknown'),
    roomNumber: String(row.room_number || ''),
    tenantFirstName: String(row.first_name || row.tenant_name_snapshot?.toString().split(' ')[0] || ''),
    tenantLastName: String(
      row.last_name ||
        (row.tenant_name_snapshot
          ? String(row.tenant_name_snapshot).split(' ').slice(1).join(' ')
          : '')
    ),
    tenantEmail: String(row.email || row.tenant_email_snapshot || ''),
    startDate,
    endDate,
    monthlyRate: Number(row.monthly_rate || 0),
    depositPaid: Number(row.deposit_paid || 0),
    assignmentStatus,
    uiStatus: computeUiStatus({
      assignment_status: assignmentStatus,
      end_date: endDate,
    }),
    occupantCount: Number(row.occupant_count || 0),
    createdAt: String(row.created_at || ''),
  };
}

export async function getLeaseStats(): Promise<LeaseStats> {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE assignment_status = 'active'
          AND (end_date IS NULL OR end_date > CURRENT_DATE + INTERVAL '30 days')
      )::int AS active,
      COUNT(*) FILTER (
        WHERE assignment_status = 'active'
          AND end_date IS NOT NULL
          AND end_date >= CURRENT_DATE
          AND end_date <= CURRENT_DATE + INTERVAL '30 days'
      )::int AS expiring_soon,
      COUNT(*) FILTER (WHERE assignment_status = 'pending')::int AS draft,
      COUNT(*) FILTER (WHERE assignment_status = 'terminated')::int AS terminated
    FROM tenant_room_assignments
  `);

  const row = result.rows[0] || {};
  return {
    active: Number(row.active || 0),
    expiringSoon: Number(row.expiring_soon || 0),
    draft: Number(row.draft || 0),
    terminated: Number(row.terminated || 0),
  };
}

export async function getLeases(filters: LeaseListFilters = {}): Promise<{
  leases: LeaseListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 50));
  const offset = (page - 1) * limit;
  const params: unknown[] = [];
  const where: string[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    const i = params.length;
    where.push(`(
      t.first_name ILIKE $${i}
      OR t.last_name ILIKE $${i}
      OR t.email ILIKE $${i}
      OR r.room_number ILIKE $${i}
      OR b.name ILIKE $${i}
      OR CONCAT(t.first_name, ' ', t.last_name) ILIKE $${i}
      OR tra.tenant_name_snapshot ILIKE $${i}
    )`);
  }

  if (filters.buildingId) {
    params.push(filters.buildingId);
    where.push(`b.id = $${params.length}`);
  }

  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'expiring_soon') {
      where.push(`tra.assignment_status = 'active'
        AND tra.end_date IS NOT NULL
        AND tra.end_date >= CURRENT_DATE
        AND tra.end_date <= CURRENT_DATE + INTERVAL '30 days'`);
    } else if (filters.status === 'active') {
      where.push(`tra.assignment_status = 'active'
        AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE + INTERVAL '30 days')`);
    } else if (filters.status === 'draft') {
      where.push(`tra.assignment_status = 'pending'`);
    } else if (filters.status === 'terminated') {
      where.push(`tra.assignment_status = 'terminated'`);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM tenant_room_assignments tra
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    ${whereSql}
    `,
    params
  );
  const total = Number(countResult.rows[0]?.total || 0);

  params.push(limit, offset);
  const listResult = await pool.query(
    `
    SELECT
      tra.id,
      tra.tenant_id,
      tra.room_id,
      tra.start_date,
      tra.end_date,
      tra.monthly_rate,
      tra.deposit_paid,
      tra.assignment_status,
      tra.tenant_name_snapshot,
      tra.tenant_email_snapshot,
      tra.created_at,
      r.room_number,
      b.id AS building_id,
      b.name AS building_name,
      t.first_name,
      t.last_name,
      t.email,
      (
        SELECT COUNT(*)::int
        FROM occupants o
        WHERE o.tenant_id = tra.tenant_id
          AND o.room_id = tra.room_id
          AND COALESCE(o.is_active, true) = true
      ) AS occupant_count
    FROM tenant_room_assignments tra
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    ${whereSql}
    ORDER BY
      CASE tra.assignment_status
        WHEN 'active' THEN 0
        WHEN 'pending' THEN 1
        ELSE 2
      END,
      tra.end_date ASC NULLS LAST,
      tra.start_date DESC NULLS LAST
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    leases: listResult.rows.map(mapListRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getLeaseById(id: string): Promise<LeaseDetail | null> {
  const result = await pool.query(
    `
    SELECT
      tra.id,
      tra.tenant_id,
      tra.room_id,
      tra.start_date,
      tra.end_date,
      tra.monthly_rate,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      tra.billing_cycle_start_day,
      tra.assignment_status,
      tra.notes,
      tra.tenant_name_snapshot,
      tra.tenant_email_snapshot,
      tra.created_at,
      tra.lease_package_template_id,
      lpt.name AS lease_package_template_name,
      lpt.term_months AS lease_package_term_months,
      lpt.deposit_months AS lease_package_deposit_months,
      lpt.advance_months AS lease_package_advance_months,
      lpt.grace_period_days AS lease_package_grace_period_days,
      lpt.penalty_type AS lease_package_penalty_type,
      lpt.penalty_fee AS lease_package_penalty_fee,
      r.room_number,
      b.id AS building_id,
      b.name AS building_name,
      t.first_name,
      t.last_name,
      t.email,
      t.phone,
      t.tenant_status,
      t.security_deposit,
      t.tenant_agreement_document_id,
      d.file_path AS agreement_document_url,
      COALESCE(d.document_name, d.file_name) AS agreement_document_name,
      (
        SELECT COUNT(*)::int
        FROM occupants o
        WHERE o.tenant_id = tra.tenant_id
          AND o.room_id = tra.room_id
          AND COALESCE(o.is_active, true) = true
      ) AS occupant_count
    FROM tenant_room_assignments tra
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    LEFT JOIN documents d ON d.id = t.tenant_agreement_document_id
    LEFT JOIN lease_package_templates lpt ON lpt.id = tra.lease_package_template_id
    WHERE tra.id = $1
    LIMIT 1
    `,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const base = mapListRow(row);

  return {
    ...base,
    advancePaid: Number(row.advance_paid || 0),
    utilityDepositPaid: Number(row.utility_deposit_paid || 0),
    notes: row.notes || null,
    tenantPhone: row.phone || null,
    tenantStatus: row.tenant_status || null,
    securityDeposit:
      row.security_deposit != null
        ? Number(row.security_deposit)
        : Number(row.deposit_paid || 0),
    agreementDocumentId: row.tenant_agreement_document_id || null,
    agreementDocumentUrl: row.agreement_document_url || null,
    agreementDocumentName: row.agreement_document_name || null,
    rentDueDay: resolveRentDueDay({
      billingCycleStartDay:
        row.billing_cycle_start_day != null
          ? Number(row.billing_cycle_start_day)
          : null,
      startDate: row.start_date as string | Date | null,
      fallbackDay: 5,
    }),
    leasePackageTemplateId: row.lease_package_template_id
      ? String(row.lease_package_template_id)
      : null,
    leasePackageTemplateName: row.lease_package_template_name
      ? String(row.lease_package_template_name)
      : null,
    leasePackageTermMonths:
      row.lease_package_term_months == null
        ? null
        : Number(row.lease_package_term_months),
    leasePackageDepositMonths:
      row.lease_package_deposit_months == null
        ? null
        : Number(row.lease_package_deposit_months),
    leasePackageAdvanceMonths:
      row.lease_package_advance_months == null
        ? null
        : Number(row.lease_package_advance_months),
    leasePackageGracePeriodDays:
      row.lease_package_grace_period_days == null
        ? null
        : Number(row.lease_package_grace_period_days),
    leasePackagePenaltyType:
      row.lease_package_penalty_type == null || row.lease_package_penalty_type === ''
        ? null
        : String(row.lease_package_penalty_type) === 'flat_fee'
          ? 'flat_fee'
          : 'percentage',
    leasePackagePenaltyFee:
      row.lease_package_penalty_fee == null
        ? null
        : Number(row.lease_package_penalty_fee),
  };
}

export async function getLeasePayments(tenantId: string, limit = 8) {
  const result = await pool.query(
    `
    SELECT
      i.id,
      i.invoice_number,
      i.due_date,
      i.total_amount,
      i.amount_paid,
      i.invoice_status,
      i.issue_date
    FROM invoices i
    WHERE i.tenant_id = $1
    ORDER BY i.due_date DESC NULLS LAST, i.created_at DESC
    LIMIT $2
    `,
    [tenantId, limit]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    invoiceNumber: row.invoice_number as string,
    dueDate: toDateOnlyString(row.due_date),
    totalAmount: Number(row.total_amount || 0),
    amountPaid: Number(row.amount_paid || 0),
    status: String(row.invoice_status || 'draft'),
  }));
}

export async function getLeaseOccupants(tenantId: string, roomId: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      first_name,
      last_name,
      email,
      relationship_to_tenant,
      is_active
    FROM occupants
    WHERE tenant_id = $1
      AND room_id = $2
      AND COALESCE(is_active, true) = true
    ORDER BY created_at ASC
    `,
    [tenantId, roomId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name || ''),
    lastName: String(row.last_name || ''),
    email: row.email ? String(row.email) : null,
    relationship: row.relationship_to_tenant ? String(row.relationship_to_tenant) : 'Occupant',
  }));
}

export async function getLeaseDocuments(tenantId: string, roomId: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      COALESCE(document_name, file_name) AS file_name,
      file_path,
      document_type,
      created_at
    FROM documents
    WHERE tenant_id = $1 OR room_id = $2
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [tenantId, roomId]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    fileName: String(row.file_name || 'Document'),
    fileUrl: row.file_path ? String(row.file_path) : null,
    category: row.document_type ? String(row.document_type) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  }));
}

export interface UpdateLeaseInput {
  roomId?: string;
  startDate?: string | null;
  endDate?: string | null;
  monthlyRate?: number;
  depositPaid?: number | null;
  advancePaid?: number | null;
  utilityDepositPaid?: number | null;
  notes?: string | null;
  templateName?: string | null;
  leasePackageTemplateId?: string | null;
  reason: string;
}

export async function updateLease(
  id: string,
  input: UpdateLeaseInput
): Promise<{ before: LeaseDetail; after: LeaseDetail }> {
  const existing = await getLeaseById(id);
  if (!existing) {
    throw new Error('Lease not found');
  }

  const reason = input.reason.trim();
  if (!reason) {
    throw new Error('Reason is required');
  }

  const nextRoomId = input.roomId ?? existing.roomId;
  const nextStart = input.startDate !== undefined ? input.startDate : existing.startDate;
  const nextEnd = input.endDate !== undefined ? input.endDate : existing.endDate;
  const nextRate =
    input.monthlyRate !== undefined ? Number(input.monthlyRate) : existing.monthlyRate;
  const nextDeposit =
    input.depositPaid !== undefined
      ? input.depositPaid
      : existing.depositPaid;
  const nextAdvance =
    input.advancePaid !== undefined ? input.advancePaid : existing.advancePaid;
  const nextUtility =
    input.utilityDepositPaid !== undefined
      ? input.utilityDepositPaid
      : existing.utilityDepositPaid;

  if (!nextRoomId) {
    throw new Error('Room is required');
  }
  if (!Number.isFinite(nextRate) || nextRate < 0) {
    throw new Error('Invalid rent amount');
  }

  const nextTemplateId =
    input.leasePackageTemplateId !== undefined
      ? input.leasePackageTemplateId
      : existing.leasePackageTemplateId;
  if (!nextTemplateId) {
    throw new Error('Lease template is required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (nextRoomId !== existing.roomId) {
      const conflict = await client.query(
        `
        SELECT id FROM tenant_room_assignments
        WHERE room_id = $1
          AND id <> $2
          AND assignment_status = 'active'
          AND (end_date IS NULL OR end_date::date >= CURRENT_DATE)
        LIMIT 1
        `,
        [nextRoomId, id]
      );
      if (conflict.rows.length > 0) {
        throw new Error('Selected unit already has an active lease');
      }

      await client.query(
        `UPDATE rooms SET room_status = 'vacant', updated_at = NOW() WHERE id = $1`,
        [existing.roomId]
      );
      await client.query(
        `UPDATE rooms SET room_status = 'occupied', updated_at = NOW() WHERE id = $1`,
        [nextRoomId]
      );
    }

    await client.query(
      `
      UPDATE tenant_room_assignments
      SET
        room_id = $2,
        start_date = $3,
        end_date = $4,
        monthly_rate = $5,
        deposit_paid = $6,
        advance_paid = $7,
        utility_deposit_paid = $8,
        notes = COALESCE($9, notes),
        lease_package_template_id = $10,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        id,
        nextRoomId,
        nextStart || null,
        nextEnd || null,
        nextRate,
        nextDeposit ?? null,
        nextAdvance ?? null,
        nextUtility ?? null,
        input.notes !== undefined ? input.notes : null,
        nextTemplateId,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const after = await getLeaseById(id);
  if (!after) {
    throw new Error('Lease updated but could not be reloaded');
  }

  return { before: existing, after };
}

export interface RenewLeaseInput {
  roomId?: string;
  startDate: string;
  endDate: string;
  monthlyRate: number;
  depositPaid?: number | null;
  advancePaid?: number | null;
  templateName?: string | null;
  leasePackageTemplateId?: string | null;
  notes?: string | null;
  options: {
    retainPreviousDetails: boolean;
    carryOverDeposit: boolean;
    waiveAdvance: boolean;
    waivePenalties: boolean;
    waiveOutstanding: boolean;
  };
}

function addDaysIso(isoDate: string, days: number): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? new Date(`${isoDate}T12:00:00`)
    : new Date(isoDate);
  d.setDate(d.getDate() + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Renew: keep current lease history, create a new upcoming/active assignment.
 * Old lease end is set to the day before the new start when needed.
 */
export async function renewLease(
  currentLeaseId: string,
  input: RenewLeaseInput
): Promise<{ previous: LeaseDetail; renewed: LeaseDetail }> {
  const existing = await getLeaseById(currentLeaseId);
  if (!existing) {
    throw new Error('Lease not found');
  }
  if (!existing.tenantId) {
    throw new Error('Lease has no tenant');
  }

  const startDate = String(input.startDate).slice(0, 10);
  const endDate = String(input.endDate).slice(0, 10);
  const roomId = input.roomId || existing.roomId;
  const monthlyRate = Number(input.monthlyRate);

  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }
  if (!input.leasePackageTemplateId) {
    throw new Error('Lease template is required');
  }
  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
    throw new Error('Invalid rent amount');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${startDate}T12:00:00`);
  const isUpcoming = start > today;
  const newStatus = isUpcoming ? 'pending' : 'active';

  const depositPaid = input.options.carryOverDeposit
    ? existing.depositPaid || 0
    : input.depositPaid ?? 0;
  const advancePaid = input.options.waiveAdvance ? 0 : input.advancePaid ?? 0;

  const client = await pool.connect();
  let newId = '';
  try {
    await client.query('BEGIN');

    // Ensure previous lease ends the day before renewal starts
    const previousEnd = addDaysIso(startDate, -1);
    if (!existing.endDate || existing.endDate > previousEnd) {
      await client.query(
        `
        UPDATE tenant_room_assignments
        SET end_date = $2::date,
            updated_at = NOW()
        WHERE id = $1
        `,
        [currentLeaseId, previousEnd]
      );
    }

    // Conflict: another active lease on room (excluding current)
    const conflict = await client.query(
      `
      SELECT id FROM tenant_room_assignments
      WHERE room_id = $1
        AND id <> $2
        AND assignment_status = 'active'
        AND (end_date IS NULL OR end_date::date >= CURRENT_DATE)
        AND start_date::date <= $3::date
      LIMIT 1
      `,
      [roomId, currentLeaseId, endDate]
    );
    if (conflict.rows.length > 0) {
      throw new Error('Selected unit already has an overlapping active lease');
    }

    const noteParts = [
      input.notes?.trim() || '',
      input.templateName ? `Template: ${input.templateName}` : '',
      'Renewed from previous lease',
      input.options.carryOverDeposit ? 'Deposit carried over' : '',
      input.options.waiveAdvance ? 'Advance waived' : '',
      input.options.waivePenalties ? 'Penalties waived' : '',
      input.options.waiveOutstanding ? 'Outstanding balance waived' : '',
    ].filter(Boolean);

    const insert = await client.query(
      `
      INSERT INTO tenant_room_assignments (
        tenant_id, room_id, start_date, end_date, monthly_rate,
        deposit_paid, advance_paid, utility_deposit_paid,
        assignment_status, notes, lease_package_template_id
      )
      VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        existing.tenantId,
        roomId,
        startDate,
        endDate,
        monthlyRate,
        depositPaid,
        advancePaid,
        existing.utilityDepositPaid || 0,
        newStatus,
        noteParts.join('\n') || null,
        input.leasePackageTemplateId,
      ]
    );
    newId = String(insert.rows[0].id);

    if (input.options.waiveOutstanding) {
      await client.query(
        `
        UPDATE invoices
        SET invoice_status = 'cancelled',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND LOWER(COALESCE(invoice_status, '')) IN ('unpaid', 'pending', 'sent', 'overdue', 'partial')
        `,
        [existing.tenantId]
      ).catch(() => undefined);
    }

    await client.query(
      `UPDATE rooms SET room_status = 'occupied', updated_at = NOW() WHERE id = $1`,
      [roomId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const [previous, renewed] = await Promise.all([
    getLeaseById(currentLeaseId),
    getLeaseById(newId),
  ]);
  if (!previous || !renewed) {
    throw new Error('Renewal saved but could not reload leases');
  }
  return { previous, renewed };
}
