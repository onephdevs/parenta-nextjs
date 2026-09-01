import type { PoolClient } from 'pg';
import pool from '@/lib/db';

export interface TenantContactSnapshot {
  tenantNameSnapshot: string | null;
  tenantEmailSnapshot: string | null;
  tenantPhoneSnapshot: string | null;
  tenantEmergencyNameSnapshot: string | null;
  tenantEmergencyPhoneSnapshot: string | null;
}

export async function loadTenantContactSnapshot(
  client: PoolClient,
  tenantId: string
): Promise<TenantContactSnapshot> {
  const result = await client.query(
    `SELECT first_name, last_name, email, phone,
            emergency_contact_name, emergency_contact_phone
     FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const snap = result.rows[0];
  if (!snap) {
    return {
      tenantNameSnapshot: null,
      tenantEmailSnapshot: null,
      tenantPhoneSnapshot: null,
      tenantEmergencyNameSnapshot: null,
      tenantEmergencyPhoneSnapshot: null,
    };
  }
  return {
    tenantNameSnapshot: `${snap.first_name || ''} ${snap.last_name || ''}`.trim() || null,
    tenantEmailSnapshot: snap.email || null,
    tenantPhoneSnapshot: snap.phone || null,
    tenantEmergencyNameSnapshot: snap.emergency_contact_name || null,
    tenantEmergencyPhoneSnapshot: snap.emergency_contact_phone || null,
  };
}

/** Mark person as current tenant (is_tenant=true, status active) and update lease dates. */
export async function markPersonAsCurrentTenant(
  client: PoolClient,
  params: {
    tenantId: string;
    moveInDate: string | Date;
    leaseEndDate?: string | Date | null;
  }
): Promise<void> {
  await client.query(
    `UPDATE tenants
     SET is_tenant = true,
         tenant_status = 'active',
         is_active = true,
         move_in_date = $2,
         lease_start_date = $2,
         lease_end_date = $3,
         move_out_date = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [params.tenantId, params.moveInDate, params.leaseEndDate ?? null]
  );
}

/**
 * End active tenancy for a room: keep assignment history row, vacate room,
 * set is_tenant=false. Never deletes assignment rows.
 */
export async function endTenancyAndVacate(
  client: PoolClient,
  params: {
    roomId: string;
    tenantId: string;
    endDate: string | Date;
    notes?: string | null;
    /** When set, terminate this assignment id; otherwise active for room+tenant */
    assignmentId?: string | null;
    deactivatePerson?: boolean;
  }
): Promise<{ assignmentId: string } | null> {
  const endDate = params.endDate;
  let assignmentResult;

  if (params.assignmentId) {
    assignmentResult = await client.query(
      `UPDATE tenant_room_assignments
       SET end_date = $1,
           assignment_status = 'terminated',
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, tenant_id, room_id`,
      [endDate, params.notes ?? null, params.assignmentId]
    );
  } else {
    assignmentResult = await client.query(
      `UPDATE tenant_room_assignments
       SET end_date = $1,
           assignment_status = 'terminated',
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE room_id = $3
         AND tenant_id = $4
         AND assignment_status = 'active'
       RETURNING id, tenant_id, room_id`,
      [endDate, params.notes ?? null, params.roomId, params.tenantId]
    );
  }

  if (assignmentResult.rows.length === 0) {
    return null;
  }

  const row = assignmentResult.rows[0];
  const roomId = String(row.room_id || params.roomId);
  const tenantId = String(row.tenant_id || params.tenantId);

  await client.query(
    `UPDATE rooms
     SET room_status = 'vacant', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [roomId]
  );

  // Only clear is_tenant if they have no other active assignment
  const otherActive = await client.query(
    `SELECT 1 FROM tenant_room_assignments
     WHERE tenant_id = $1
       AND assignment_status = 'active'
       AND (end_date IS NULL OR end_date > CURRENT_DATE)
     LIMIT 1`,
    [tenantId]
  );

  if (otherActive.rows.length === 0) {
    await client.query(
      `UPDATE tenants
       SET is_tenant = false,
           tenant_status = 'inactive',
           is_active = CASE WHEN $3::boolean THEN false ELSE is_active END,
           move_out_date = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [tenantId, endDate, Boolean(params.deactivatePerson)]
    );
  }

  return { assignmentId: String(row.id) };
}

/**
 * Convenience wrapper with its own transaction for API DELETE unassign.
 */
export async function endTenancyAndVacateTx(params: {
  roomId: string;
  tenantId: string;
  endDate: string | Date;
  notes?: string | null;
}): Promise<{ assignmentId: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await endTenancyAndVacate(client, params);
    if (!result) {
      throw new Error('No active assignment found');
    }
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
