/**
 * Lease Management Service
 * Handles lease renewals, expiration alerts, and move-out processing
 */

import { Pool } from 'pg';
import pool from '../db';

interface LeaseRenewalRequest {
  id: string;
  tenant_id: string;
  room_assignment_id: string;
  current_lease_end_date: Date;
  current_monthly_rent: number;
  proposed_lease_start_date: Date;
  proposed_lease_end_date: Date;
  proposed_monthly_rent: number;
  proposed_deposit_amount?: number;
  status: string;
}

interface LeaseExpirationAlert {
  id: string;
  tenant_id: string;
  lease_end_date: Date;
  days_until_expiry: number;
  alert_type: string;
  status: string;
}

interface MoveOutProcessing {
  id: string;
  tenant_id: string;
  moveout_date: Date;
  status: string;
  inspection_completed_date?: Date;
  settlement_completed: boolean;
}

/**
 * Generate lease expiration alerts
 */
export async function generateLeaseExpirationAlerts(dbPool: Pool = pool): Promise<number> {
  const result = await dbPool.query('SELECT generate_lease_expiration_alerts()');
  return parseInt(result.rows[0].generate_lease_expiration_alerts || '0');
}

/**
 * Get all pending lease expiration alerts
 */
export async function getPendingExpirationAlerts(
  dbPool: Pool = pool
): Promise<LeaseExpirationAlert[]> {
  const result = await dbPool.query<LeaseExpirationAlert>(
    `SELECT 
      lea.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      t.email as tenant_email,
      r.room_number,
      b.name as building_name
    FROM lease_expiration_alerts lea
    JOIN tenants t ON t.id = lea.tenant_id
    JOIN tenant_room_assignments tra ON tra.id = lea.room_assignment_id
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    WHERE lea.status = 'pending'
    ORDER BY lea.days_until_expiry ASC`
  );
  
  return result.rows;
}

/**
 * Create a lease renewal request
 */
export async function createLeaseRenewalRequest(
  data: {
    tenant_id: string;
    room_assignment_id: string;
    proposed_lease_start_date: Date;
    proposed_lease_end_date: Date;
    proposed_monthly_rent: number;
    proposed_deposit_amount?: number;
    terms?: string;
    admin_notes?: string;
  },
  requestedBy?: string,
  dbPool: Pool = pool
): Promise<LeaseRenewalRequest> {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current lease details
    const currentLease = await client.query(
      'SELECT lease_end_date, monthly_rent FROM tenant_room_assignments WHERE id = $1',
      [data.room_assignment_id]
    );
    
    if (currentLease.rows.length === 0) {
      throw new Error('Room assignment not found');
    }
    
    const result = await client.query<LeaseRenewalRequest>(
      `INSERT INTO lease_renewal_requests (
        tenant_id, room_assignment_id,
        current_lease_end_date, current_monthly_rent,
        proposed_lease_start_date, proposed_lease_end_date,
        proposed_monthly_rent, proposed_deposit_amount,
        terms, admin_notes, requested_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.tenant_id,
        data.room_assignment_id,
        currentLease.rows[0].lease_end_date,
        currentLease.rows[0].monthly_rent,
        data.proposed_lease_start_date,
        data.proposed_lease_end_date,
        data.proposed_monthly_rent,
        data.proposed_deposit_amount || null,
        data.terms || null,
        data.admin_notes || null,
        requestedBy || null,
      ]
    );
    
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Approve a lease renewal request
 */
export async function approveLeaseRenewal(
  renewalId: string,
  approvedBy: string,
  dbPool: Pool = pool
): Promise<{ success: boolean; message: string }> {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update renewal status
    await client.query(
      `UPDATE lease_renewal_requests
       SET status = 'approved', approved_by = $2, approved_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [renewalId, approvedBy]
    );
    
    // Process the renewal
    const result = await client.query('SELECT process_lease_renewal($1)', [renewalId]);
    
    if (!result.rows[0].process_lease_renewal) {
      throw new Error('Failed to process lease renewal');
    }
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Lease renewal approved and processed' };
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    client.release();
  }
}

/**
 * Get all lease renewal requests
 */
export async function getAllLeaseRenewalRequests(
  status?: string,
  dbPool: Pool = pool
): Promise<any[]> {
  let query = `
    SELECT 
      lrr.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      t.email as tenant_email,
      r.room_number,
      b.name as building_name
    FROM lease_renewal_requests lrr
    JOIN tenants t ON t.id = lrr.tenant_id
    JOIN tenant_room_assignments tra ON tra.id = lrr.room_assignment_id
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
  `;
  
  const params: any[] = [];
  
  if (status) {
    query += ' WHERE lrr.status = $1';
    params.push(status);
  }
  
  query += ' ORDER BY lrr.created_at DESC';
  
  const result = await dbPool.query(query, params);
  return result.rows;
}

/**
 * Initiate move-out processing
 */
export async function initiateMoveOut(
  data: {
    tenant_id: string;
    room_assignment_id: string;
    moveout_date: Date;
    notice_date?: Date;
    forwarding_address?: string;
  },
  createdBy?: string,
  dbPool: Pool = pool
): Promise<MoveOutProcessing> {
  const result = await dbPool.query<MoveOutProcessing>(
    `INSERT INTO moveout_processing (
      tenant_id, room_assignment_id, moveout_date,
      notice_date, forwarding_address, created_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'initiated')
    RETURNING *`,
    [
      data.tenant_id,
      data.room_assignment_id,
      data.moveout_date,
      data.notice_date || null,
      data.forwarding_address || null,
      createdBy || null,
    ]
  );
  
  return result.rows[0];
}

/**
 * Complete move-out processing (mark tenant as moved out)
 * Now handles deposit, advance, and utility deposit for settlement
 */
export async function completeMoveOut(
  moveoutId: string,
  data: {
    actual_moveout_date: Date;
    deposit_return_amount: number;
    deposit_deduction_amount?: number;
    deduction_reason?: string;
    advance_return_amount?: number;
    utility_deposit_return_amount?: number;
    // Allocation of funds
    use_deposit_for_last_month?: boolean;
    use_advance_for_last_month?: boolean;
    use_deposit_for_utilities?: boolean;
    use_advance_for_utilities?: boolean;
    use_deposit_for_damages?: boolean;
    use_advance_for_damages?: boolean;
  },
  dbPool: Pool = pool
): Promise<{ success: boolean; message: string }> {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get move-out details with assignment info
    const moveoutResult = await client.query(
      `SELECT m.*, tra.deposit_paid, tra.advance_paid, tra.utility_deposit_paid,
              tra.deposit_valid_until, tra.deposit_refundable
       FROM moveout_processing m
       INNER JOIN tenant_room_assignments tra ON m.room_assignment_id = tra.id
       WHERE m.id = $1`,
      [moveoutId]
    );
    
    if (moveoutResult.rows.length === 0) {
      throw new Error('Move-out record not found');
    }
    
    const moveout = moveoutResult.rows[0];
    const depositPaid = parseFloat(moveout.deposit_paid || 0);
    const advancePaid = parseFloat(moveout.advance_paid || 0);
    const utilityDepositPaid = parseFloat(moveout.utility_deposit_paid || 0);
    
    // Calculate available funds
    const availableDeposit = depositPaid;
    const availableAdvance = advancePaid;
    const availableUtility = utilityDepositPaid;
    const totalAvailable = availableDeposit + availableAdvance + availableUtility;
    
    // Update move-out record
    await client.query(
      `UPDATE moveout_processing
       SET actual_moveout_date = $2,
           deposit_return_amount = $3,
           deposit_deduction_amount = $4,
           deduction_reason = $5,
           advance_return_amount = $6,
           utility_deposit_return_amount = $7,
           settlement_completed = true,
           settlement_date = CURRENT_DATE,
           status = 'completed',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        moveoutId,
        data.actual_moveout_date,
        data.deposit_return_amount,
        data.deposit_deduction_amount || 0,
        data.deduction_reason || null,
        data.advance_return_amount || 0,
        data.utility_deposit_return_amount || 0,
      ]
    );
    
    // Update tenant: former tenant, keep person row forever
    await client.query(
      `UPDATE tenants
       SET tenant_status = 'inactive',
           is_tenant = false,
           is_active = false,
           move_out_date = COALESCE(move_out_date, $2::date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [moveout.tenant_id, data.actual_moveout_date]
    );
    
    // Terminate assignment (never delete — forever room history)
    await client.query(
      `UPDATE tenant_room_assignments
       SET assignment_status = 'terminated',
           end_date = COALESCE(end_date, $2::date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [moveout.room_assignment_id, data.actual_moveout_date]
    );

    // Free the unit
    await client.query(
      `UPDATE rooms r
       SET room_status = 'vacant', updated_at = CURRENT_TIMESTAMP
       FROM tenant_room_assignments tra
       WHERE tra.id = $1 AND r.id = tra.room_id`,
      [moveout.room_assignment_id]
    );
    
    // Process deposit return/deduction
    if (data.deposit_return_amount > 0) {
      await client.query(
        `INSERT INTO deposit_ledger (
          tenant_id, amount, transaction_type, description
        ) VALUES ($1, $2, 'refund', $3)`,
        [
          moveout.tenant_id,
          data.deposit_return_amount,
          `Deposit refund for move-out on ${data.actual_moveout_date}`,
        ]
      );
    }
    
    if (data.deposit_deduction_amount && data.deposit_deduction_amount > 0) {
      await client.query(
        `INSERT INTO deposit_ledger (
          tenant_id, amount, transaction_type, description
        ) VALUES ($1, $2, 'applied', $3)`,
        [
          moveout.tenant_id,
          -data.deposit_deduction_amount,
          `Deposit deduction: ${data.deduction_reason || 'Damages'}`,
        ]
      );
    }
    
    // Process advance return (if any)
    if (data.advance_return_amount && data.advance_return_amount > 0) {
      // Record advance return in tenant credits (negative amount)
      await client.query(
        `INSERT INTO tenant_credits (
          tenant_id, amount, credit_type, description, transaction_date
        ) VALUES ($1, $2, 'refund', $3, $4)`,
        [
          moveout.tenant_id,
          -data.advance_return_amount,
          `Advance payment refund for move-out on ${data.actual_moveout_date}`,
          new Date(),
        ]
      );
    }
    
    // Process utility deposit return (if any)
    if (data.utility_deposit_return_amount && data.utility_deposit_return_amount > 0) {
      // Record utility deposit return in deposit ledger
      await client.query(
        `INSERT INTO deposit_ledger (
          tenant_id, amount, transaction_type, description
        ) VALUES ($1, $2, 'refund', $3)`,
        [
          moveout.tenant_id,
          data.utility_deposit_return_amount,
          `Utility deposit refund for move-out on ${data.actual_moveout_date}`,
        ]
      );
    }
    
    // Handle allocation of funds to outstanding balances
    // Use deposit/advance for last month rent, utilities, or damages
    if (data.use_deposit_for_last_month || data.use_advance_for_last_month) {
      // This would typically link to an invoice or create a payment allocation
      // For now, we'll record it in the notes/description
      const allocationNote = [];
      if (data.use_deposit_for_last_month) allocationNote.push('Deposit used for last month rent');
      if (data.use_advance_for_last_month) allocationNote.push('Advance used for last month rent');
      
      await client.query(
        `UPDATE moveout_processing SET notes = COALESCE(notes, '') || $1 WHERE id = $2`,
        [`\n${allocationNote.join(', ')}`, moveoutId]
      );
    }
    
    if (data.use_deposit_for_utilities || data.use_advance_for_utilities) {
      const allocationNote = [];
      if (data.use_deposit_for_utilities) allocationNote.push('Deposit used for unpaid utilities');
      if (data.use_advance_for_utilities) allocationNote.push('Advance used for unpaid utilities');
      
      await client.query(
        `UPDATE moveout_processing SET notes = COALESCE(notes, '') || $1 WHERE id = $2`,
        [`\n${allocationNote.join(', ')}`, moveoutId]
      );
    }
    
    if (data.use_deposit_for_damages || data.use_advance_for_damages) {
      const allocationNote = [];
      if (data.use_deposit_for_damages) allocationNote.push('Deposit used for property damages');
      if (data.use_advance_for_damages) allocationNote.push('Advance used for property damages');
      
      await client.query(
        `UPDATE moveout_processing SET notes = COALESCE(notes, '') || $1 WHERE id = $2`,
        [`\n${allocationNote.join(', ')}`, moveoutId]
      );
    }

    // Phase 3: auto-link move-out cash refunds to expense log (category = refund)
    const totalRefundOut =
      Number(data.deposit_return_amount || 0) +
      Number(data.advance_return_amount || 0) +
      Number(data.utility_deposit_return_amount || 0);

    if (totalRefundOut > 0) {
      const loc = await client.query(
        `SELECT tra.id AS assignment_id, tra.room_id, r.building_id,
                t.first_name, t.last_name, r.room_number
         FROM tenant_room_assignments tra
         JOIN rooms r ON r.id = tra.room_id
         JOIN tenants t ON t.id = tra.tenant_id
         WHERE tra.id = $1`,
        [moveout.room_assignment_id]
      );
      const place = loc.rows[0];
      const tenantLabel = place
        ? `${place.first_name} ${place.last_name}`.trim()
        : 'Tenant';
      const unitLabel = place?.room_number ? `Unit ${place.room_number}` : 'unit';
      const moveDate =
        data.actual_moveout_date instanceof Date
          ? data.actual_moveout_date.toISOString().slice(0, 10)
          : String(data.actual_moveout_date).slice(0, 10);

      let refundTxnId: string | null = null;
      try {
        const { allocateParentaTxnId } = await import(
          '@/lib/services/transaction-id-service'
        );
        refundTxnId = await allocateParentaTxnId('e');
      } catch (err) {
        console.error(
          'Parenta txn allocate failed for move-out refund expense (non-fatal):',
          err
        );
      }

      await client.query(
        `INSERT INTO expenses (
           building_id, room_id, category, description, amount,
           expense_date, payment_method, expense_status, notes,
           tenant_id, related_moveout_id, related_assignment_id, parenta_txn_id
         )
         SELECT $1, $2, 'refund', $3, $4, $5::date, 'cash', 'paid', $6, $7, $8, $9, $10
         WHERE NOT EXISTS (
           SELECT 1 FROM expenses
           WHERE related_moveout_id = $8 AND category = 'refund'
         )`,
        [
          place?.building_id || null,
          place?.room_id || null,
          `Move-out refund — ${tenantLabel} (${unitLabel})`,
          totalRefundOut,
          moveDate,
          [
            data.deposit_return_amount
              ? `Security deposit return: ${data.deposit_return_amount}`
              : null,
            data.advance_return_amount
              ? `Advance return: ${data.advance_return_amount}`
              : null,
            data.utility_deposit_return_amount
              ? `Utility deposit return: ${data.utility_deposit_return_amount}`
              : null,
          ]
            .filter(Boolean)
            .join('; '),
          moveout.tenant_id,
          moveoutId,
          moveout.room_assignment_id,
          refundTxnId,
        ]
      );
    }
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Move-out completed successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    client.release();
  }
}

/**
 * Auto-initiate move-outs for expiring leases
 */
export async function autoInitiateMoveOuts(dbPool: Pool = pool): Promise<number> {
  const result = await dbPool.query('SELECT auto_initiate_moveout()');
  return parseInt(result.rows[0].auto_initiate_moveout || '0');
}

/**
 * Get all move-out processing records
 */
export async function getAllMoveOuts(
  status?: string,
  dbPool: Pool = pool
): Promise<any[]> {
  let query = `
    SELECT 
      mp.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      t.email as tenant_email,
      r.room_number,
      b.name as building_name
    FROM moveout_processing mp
    JOIN tenants t ON t.id = mp.tenant_id
    JOIN tenant_room_assignments tra ON tra.id = mp.room_assignment_id
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
  `;
  
  const params: any[] = [];
  
  if (status) {
    query += ' WHERE mp.status = $1';
    params.push(status);
  }
  
  query += ' ORDER BY mp.moveout_date ASC';
  
  const result = await dbPool.query(query, params);
  return result.rows;
}

