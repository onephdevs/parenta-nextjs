/**
 * Real-data preview context for the lease designer.
 * Uses an active assignment (prefer Balibago Unit) so {{tokens}} resolve to
 * live building / unit / tenant / package-backed deposit & advance values.
 */

import pool from '@/lib/db';
import { LANDLORD_COMPANY_NAME } from '@/lib/brand';
import { formatPenaltyFeeLabel } from '@/lib/lease-package-templates-shared';
import type { LeaseTemplateContext, LeaseTemplateVariableDef } from '@/lib/lease-templates/types';
import { SAMPLE_LEASE_CONTEXT, LEASE_TEMPLATE_VARIABLES } from '@/lib/lease-templates/types';
import { formatTokenValue } from '@/lib/lease-templates/render';

function isoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value);
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  // end date is day before anniversary for display clarity
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatAddress(row: {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}): string {
  return [row.address_line1, row.address_line2, row.city, row.state, row.postal_code]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(', ');
}

export interface LeaseDesignerPreviewMeta {
  assignmentId: string | null;
  buildingId: string | null;
  roomId: string | null;
  packageName: string | null;
  source: 'assignment' | 'fallback';
}

/**
 * Load preview context from a real active lease.
 * Prefer Balibago revenue units (Unit 1 first), then any active assignment.
 */
export async function getLeaseDesignerPreviewContext(options?: {
  buildingId?: string | null;
  assignmentId?: string | null;
}): Promise<{ context: LeaseTemplateContext; meta: LeaseDesignerPreviewMeta }> {
  const params: unknown[] = [];
  let where = `
    a.assignment_status = 'active'
    AND COALESCE(r.is_active, true) = true
    AND COALESCE(r.is_revenue_unit, true) = true
  `;

  if (options?.assignmentId) {
    params.push(options.assignmentId);
    where += ` AND a.id = $${params.length}`;
  } else if (options?.buildingId) {
    params.push(options.buildingId);
    where += ` AND b.id = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      a.id AS assignment_id,
      a.start_date,
      a.end_date,
      a.monthly_rate,
      a.deposit_paid,
      a.advance_paid,
      a.billing_cycle_start_day,
      r.id AS room_id,
      r.room_number,
      b.id AS building_id,
      b.name AS building_name,
      b.address_line1,
      b.address_line2,
      b.city,
      b.state,
      b.postal_code,
      b.description AS building_description,
      t.first_name,
      t.last_name,
      t.email,
      t.phone,
      lpt.name AS package_name,
      lpt.deposit_months,
      lpt.advance_months,
      lpt.term_months,
      lpt.grace_period_days,
      lpt.penalty_type,
      lpt.penalty_fee,
      cfg.utility_deposit_amount,
      COALESCE(lfs.grace_period_days, 5) AS late_fee_grace_days,
      lfs.fee_type AS late_fee_type,
      lfs.flat_rate_amount AS late_fee_amount,
      lfs.percentage_amount AS late_fee_percentage
    FROM tenant_room_assignments a
    JOIN rooms r ON r.id = a.room_id
    JOIN buildings b ON b.id = r.building_id
    JOIN tenants t ON t.id = a.tenant_id
    LEFT JOIN lease_package_templates lpt ON lpt.id = a.lease_package_template_id
    LEFT JOIN building_deposit_config cfg ON cfg.building_id = b.id AND COALESCE(cfg.is_active, true)
    LEFT JOIN LATERAL (
      SELECT grace_period_days, fee_type, flat_rate_amount, percentage_amount
      FROM late_fee_settings
      WHERE building_id = b.id AND COALESCE(is_active, true)
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    ) lfs ON true
    WHERE ${where}
    ORDER BY
      CASE WHEN lower(b.name) LIKE '%balibago%' THEN 0 ELSE 1 END,
      CASE WHEN lower(r.room_number) ~ '^unit\\s*1$' THEN 0
           WHEN lower(r.room_number) LIKE 'unit%' THEN 1
           ELSE 2 END,
      r.room_number
    LIMIT 1
    `,
    params
  );

  if (result.rows.length === 0) {
    return {
      context: SAMPLE_LEASE_CONTEXT,
      meta: {
        assignmentId: null,
        buildingId: null,
        roomId: null,
        packageName: null,
        source: 'fallback',
      },
    };
  }

  const row = result.rows[0];
  const rent = Number(row.monthly_rate || 0);
  const depositMonths =
    row.deposit_months == null ? null : Number(row.deposit_months);
  const advanceMonths = Number(row.advance_months ?? 1);
  const depositFromPackage =
    depositMonths == null ? 0 : Math.round(rent * depositMonths * 100) / 100;
  const advanceFromPackage = Math.round(rent * advanceMonths * 100) / 100;
  const depositPaid = Number(row.deposit_paid || 0);
  const advancePaid = Number(row.advance_paid || 0);

  const startDate = isoDate(row.start_date) || new Date().toISOString().slice(0, 10);
  let endDate = isoDate(row.end_date);
  if (!endDate && row.term_months != null) {
    endDate = addMonthsIso(startDate, Number(row.term_months));
  }

  const packagePenaltyLabel = formatPenaltyFeeLabel(
    row.penalty_type == null
      ? null
      : String(row.penalty_type) === 'flat_fee'
        ? 'flat_fee'
        : 'percentage',
    row.penalty_fee == null ? null : Number(row.penalty_fee)
  );

  let lateFeeLabel: string | null =
    packagePenaltyLabel !== '—' ? packagePenaltyLabel : null;
  if (!lateFeeLabel) {
    if (row.late_fee_type === 'percentage' && row.late_fee_percentage != null) {
      lateFeeLabel = `${Number(row.late_fee_percentage)}%`;
    } else if (row.late_fee_amount != null) {
      lateFeeLabel = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(row.late_fee_amount));
    } else {
      lateFeeLabel = 'None';
    }
  }

  const graceDays =
    row.grace_period_days != null
      ? Number(row.grace_period_days)
      : Number(row.late_fee_grace_days ?? 5);

  const tenantName = [row.first_name, row.last_name]
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join(' ') || 'Tenant';

  const houseRules =
    row.building_description && String(row.building_description).trim()
      ? String(row.building_description).trim()
      : 'Quiet hours and house rules as posted by management.';

  const context: LeaseTemplateContext = {
    lease: {
      rentAmount: rent,
      securityDeposit: depositPaid > 0 ? depositPaid : depositFromPackage,
      advanceRent: advancePaid > 0 ? advancePaid : advanceFromPackage,
      dueDay: Number(row.billing_cycle_start_day || 5),
      lateFeeGraceDays: graceDays,
      lateFeeLabel,
      startDate,
      endDate,
      moveInDate: startDate,
    },
    building: {
      name: String(row.building_name || '').trim(),
      address: formatAddress(row),
      depositValidityDays: 5,
      nonRefundableAfterDays: 5,
      petPolicy: 'No pets without prior written approval from management.',
      houseRules,
    },
    tenant: {
      name: tenantName,
      email: row.email ? String(row.email) : null,
      phone: row.phone ? String(row.phone) : null,
    },
    landlord: {
      companyName: LANDLORD_COMPANY_NAME,
    },
    unit: {
      number: String(row.room_number || '').replace(/^unit\s*/i, '') || String(row.room_number),
    },
    occupants: [{ name: tenantName, role: 'Primary' }],
    customClauses: [],
    documentId: null,
    isDraft: true,
    conditions: {
      has_co_tenants: false,
      has_pet_policy: true,
      has_house_rules: true,
      has_custom_clauses: false,
    },
  };

  return {
    context,
    meta: {
      assignmentId: String(row.assignment_id),
      buildingId: String(row.building_id),
      roomId: String(row.room_id),
      packageName: row.package_name ? String(row.package_name) : null,
      source: 'assignment',
    },
  };
}

/** Refresh variable catalog sample chips from a live preview context. */
export function variablesFromPreviewContext(
  context: LeaseTemplateContext
): LeaseTemplateVariableDef[] {
  const get = (path: string): unknown => {
    const parts = path.split('.');
    let cur: unknown = context;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  };

  return LEASE_TEMPLATE_VARIABLES.map((v) => {
    const raw = get(v.key);
    if (raw === undefined || raw === null || raw === '') return v;
    const sampleValue = formatTokenValue(v.key, raw, false);
    return { ...v, sampleValue };
  });
}
