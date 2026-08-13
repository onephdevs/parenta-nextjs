import pool from '@/lib/db';
import type {
  LeasePackageTemplate,
  LeasePackageTemplateInput,
} from '@/lib/lease-package-templates-shared';

export type {
  LeasePackagePenaltyType,
  LeasePackageTemplate,
  LeasePackageTemplateInput,
} from '@/lib/lease-package-templates-shared';

export {
  formatTermLabel,
  formatDepositLabel,
  formatAdvanceLabel,
  formatGraceLabel,
  formatPenaltyTypeLabel,
  formatPenaltyFeeLabel,
} from '@/lib/lease-package-templates-shared';

function mapRow(row: Record<string, unknown>): LeasePackageTemplate {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    termMonths: row.term_months == null ? null : Number(row.term_months),
    depositMonths: row.deposit_months == null ? null : Number(row.deposit_months),
    advanceMonths: Number(row.advance_months ?? 0),
    gracePeriodDays:
      row.grace_period_days == null ? null : Number(row.grace_period_days),
    penaltyType:
      row.penalty_type == null || row.penalty_type === ''
        ? null
        : String(row.penalty_type) === 'flat_fee'
          ? 'flat_fee'
          : 'percentage',
    penaltyFee: row.penalty_fee == null ? null : Number(row.penalty_fee),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : '',
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : '',
  };
}

export async function listLeasePackageTemplates(options?: {
  activeOnly?: boolean;
}): Promise<LeasePackageTemplate[]> {
  const activeOnly = options?.activeOnly !== false;
  const result = await pool.query(
    `
    SELECT *
    FROM lease_package_templates
    ${activeOnly ? 'WHERE is_active = true' : ''}
    ORDER BY name ASC, created_at ASC
    `
  );
  return result.rows.map(mapRow);
}

export async function getLeasePackageTemplate(
  id: string
): Promise<LeasePackageTemplate | null> {
  const result = await pool.query(
    `SELECT * FROM lease_package_templates WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function createLeasePackageTemplate(
  input: LeasePackageTemplateInput
): Promise<LeasePackageTemplate> {
  const name = input.name.trim();
  if (!name) throw new Error('Template name is required');
  if (input.advanceMonths < 0) throw new Error('Advance period cannot be negative');
  if (input.gracePeriodDays != null && input.gracePeriodDays < 0) {
    throw new Error('Grace period cannot be negative');
  }
  if (input.penaltyFee != null && input.penaltyFee < 0) {
    throw new Error('Penalty fee cannot be negative');
  }
  if (input.penaltyType && input.penaltyFee == null) {
    throw new Error('Penalty fee is required when a penalty type is selected');
  }

  const result = await pool.query(
    `
    INSERT INTO lease_package_templates (
      name, term_months, deposit_months, advance_months,
      grace_period_days, penalty_type, penalty_fee, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true))
    RETURNING *
    `,
    [
      name,
      input.termMonths,
      input.depositMonths,
      input.advanceMonths,
      input.gracePeriodDays,
      input.penaltyType,
      input.penaltyFee,
      input.isActive ?? true,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function updateLeasePackageTemplate(
  id: string,
  input: LeasePackageTemplateInput
): Promise<LeasePackageTemplate> {
  const existing = await getLeasePackageTemplate(id);
  if (!existing) throw new Error('Lease template not found');

  const name = input.name.trim();
  if (!name) throw new Error('Template name is required');

  const result = await pool.query(
    `
    UPDATE lease_package_templates
    SET
      name = $2,
      term_months = $3,
      deposit_months = $4,
      advance_months = $5,
      grace_period_days = $6,
      penalty_type = $7,
      penalty_fee = $8,
      is_active = COALESCE($9, is_active),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [
      id,
      name,
      input.termMonths,
      input.depositMonths,
      input.advanceMonths,
      input.gracePeriodDays,
      input.penaltyType,
      input.penaltyFee,
      input.isActive,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function countActiveAssignmentsForPackage(
  templateId: string
): Promise<number> {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM tenant_room_assignments
    WHERE lease_package_template_id = $1
      AND assignment_status IN ('active', 'pending')
      AND (end_date IS NULL OR end_date::date >= CURRENT_DATE)
    `,
    [templateId]
  );
  return Number(result.rows[0]?.count || 0);
}

export async function deleteLeasePackageTemplate(
  id: string
): Promise<{ deleted: boolean; blockedReason?: string }> {
  const existing = await getLeasePackageTemplate(id);
  if (!existing) throw new Error('Lease template not found');

  const activeCount = await countActiveAssignmentsForPackage(id);
  if (activeCount > 0) {
    return {
      deleted: false,
      blockedReason:
        'This lease template is currently assigned to active tenants. Please update or remove tenants from this template before deleting.',
    };
  }

  // Soft-delete if any historical assignment references it; else hard delete
  const hist = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tenant_room_assignments WHERE lease_package_template_id = $1`,
    [id]
  );
  const histCount = Number(hist.rows[0]?.count || 0);
  if (histCount > 0) {
    await pool.query(
      `UPDATE lease_package_templates SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  } else {
    await pool.query(`DELETE FROM lease_package_templates WHERE id = $1`, [id]);
  }

  return { deleted: true };
}
