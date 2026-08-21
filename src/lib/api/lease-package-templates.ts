import pool from '@/lib/db';
import type {
  LeasePackageTemplate,
  LeasePackageTemplateDetail,
  LeasePackageTemplateInput,
  LeasePackageAppliedBuilding,
} from '@/lib/lease-package-templates-shared';

export type {
  LeasePackagePenaltyType,
  LeasePackageTemplate,
  LeasePackageTemplateDetail,
  LeasePackageTemplateInput,
  LeasePackageAppliedBuilding,
  LeasePackageAppliedRoom,
} from '@/lib/lease-package-templates-shared';

export {
  formatTermLabel,
  formatDepositLabel,
  formatAdvanceLabel,
  formatGraceLabel,
  formatPenaltyTypeLabel,
  formatPenaltyFeeLabel,
} from '@/lib/lease-package-templates-shared';

function mapLeasePackageWriteError(err: unknown): Error {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  const message = err instanceof Error ? err.message : String(err);
  if (code === '23505' || /idx_lease_package_templates_name_unique/i.test(message)) {
    return new Error('A lease template with this name already exists.');
  }
  if (code === '23502' && /penalty_type|penalty_fee|grace_period_days/i.test(message)) {
    return new Error(
      'This database still requires penalty fields. Apply migrations/optional-lease-package-penalties.sql, then try again.'
    );
  }
  return err instanceof Error ? err : new Error(message);
}

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
    appliedUnitCount:
      row.applied_unit_count == null ? undefined : Number(row.applied_unit_count),
    appliedBuildingCount:
      row.applied_building_count == null ? undefined : Number(row.applied_building_count),
  };
}

export async function listLeasePackageTemplates(options?: {
  activeOnly?: boolean;
}): Promise<LeasePackageTemplate[]> {
  const activeOnly = options?.activeOnly !== false;
  const result = await pool.query(
    `
    SELECT
      lpt.*,
      COUNT(tra.id) FILTER (
        WHERE tra.assignment_status IN ('active', 'pending')
          AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
      )::int AS applied_unit_count,
      COUNT(DISTINCT r.building_id) FILTER (
        WHERE tra.assignment_status IN ('active', 'pending')
          AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
      )::int AS applied_building_count
    FROM lease_package_templates lpt
    LEFT JOIN tenant_room_assignments tra
      ON tra.lease_package_template_id = lpt.id
    LEFT JOIN rooms r ON r.id = tra.room_id
    ${activeOnly ? 'WHERE lpt.is_active = true' : ''}
    GROUP BY lpt.id
    ORDER BY lpt.name ASC, lpt.created_at ASC
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

export async function getLeasePackageTemplateDetail(
  id: string
): Promise<LeasePackageTemplateDetail | null> {
  const template = await getLeasePackageTemplate(id);
  if (!template) return null;

  const applied = await pool.query(
    `
    SELECT
      b.id AS building_id,
      b.name AS building_name,
      r.id AS room_id,
      r.room_number,
      r.room_status,
      t.id AS tenant_id,
      t.first_name,
      t.last_name,
      tra.start_date,
      tra.end_date
    FROM tenant_room_assignments tra
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    LEFT JOIN tenants t ON t.id = tra.tenant_id
    WHERE tra.lease_package_template_id = $1
      AND tra.assignment_status IN ('active', 'pending')
      AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
    ORDER BY
      regexp_replace(lower(b.name), '[0-9]+', '', 'g'),
      COALESCE(NULLIF(regexp_replace(b.name, '[^0-9]', '', 'g'), '')::bigint, 0),
      lower(b.name),
      regexp_replace(lower(r.room_number), '[0-9]+', '', 'g'),
      COALESCE(NULLIF(regexp_replace(r.room_number, '[^0-9]', '', 'g'), '')::bigint, 0),
      r.room_number
    `,
    [id]
  );

  const byBuilding = new Map<string, LeasePackageAppliedBuilding>();
  for (const row of applied.rows) {
    const buildingId = String(row.building_id);
    let group = byBuilding.get(buildingId);
    if (!group) {
      group = {
        buildingId,
        buildingName: String(row.building_name || 'Building'),
        rooms: [],
      };
      byBuilding.set(buildingId, group);
    }
    const first = String(row.first_name || '').trim();
    const last = String(row.last_name || '').trim();
    const tenantName = [first, last].filter(Boolean).join(' ') || null;
    group.rooms.push({
      roomId: String(row.room_id),
      roomNumber: String(row.room_number || ''),
      roomStatus: String(row.room_status || ''),
      tenantId: row.tenant_id ? String(row.tenant_id) : null,
      tenantName,
      startDate: row.start_date ? String(row.start_date).slice(0, 10) : null,
      endDate: row.end_date ? String(row.end_date).slice(0, 10) : null,
    });
  }

  const appliedBuildings = Array.from(byBuilding.values());
  return {
    ...template,
    appliedUnitCount: appliedBuildings.reduce((sum, b) => sum + b.rooms.length, 0),
    appliedBuildingCount: appliedBuildings.length,
    appliedBuildings,
  };
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

  try {
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
  } catch (err) {
    throw mapLeasePackageWriteError(err);
  }
}

export async function updateLeasePackageTemplate(
  id: string,
  input: LeasePackageTemplateInput
): Promise<LeasePackageTemplate> {
  const existing = await getLeasePackageTemplate(id);
  if (!existing) throw new Error('Lease template not found');

  const name = input.name.trim();
  if (!name) throw new Error('Template name is required');

  try {
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
  } catch (err) {
    throw mapLeasePackageWriteError(err);
  }
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
