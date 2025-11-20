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
 */
export async function completeMoveOut(
  moveoutId: string,
  data: {
    actual_moveout_date: Date;
    deposit_return_amount: number;
    deposit_deduction_amount?: number;
    deduction_reason?: string;
  },
  dbPool: Pool = pool
): Promise<{ success: boolean; message: string }> {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get move-out details
    const moveoutResult = await client.query(
      'SELECT * FROM moveout_processing WHERE id = $1',
      [moveoutId]
    );
    
    if (moveoutResult.rows.length === 0) {
      throw new Error('Move-out record not found');
    }
    
    const moveout = moveoutResult.rows[0];
    
    // Update move-out record
    await client.query(
      `UPDATE moveout_processing
       SET actual_moveout_date = $2,
           deposit_return_amount = $3,
           deposit_deduction_amount = $4,
           deduction_reason = $5,
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
      ]
    );
    
    // Update tenant status to inactive
    await client.query(
      `UPDATE tenants SET status = 'inactive' WHERE id = $1`,
      [moveout.tenant_id]
    );
    
    // Update room assignment status to past
    await client.query(
      `UPDATE tenant_room_assignments
       SET status = 'past', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
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

