import pool from '../db';
import { UtilityBill } from './utilities';

interface RoomUtilityBillFilters {
  roomId?: string;
  buildingId?: string;
  utilityType?: 'electricity' | 'water';
  dateFrom?: string;
  dateTo?: string;
  billStatus?: string;
}

/**
 * Get room-level utility bills (electric/water)
 */
export async function getRoomUtilityBills(
  filters: RoomUtilityBillFilters = {},
  page = 1,
  limit = 20
) {
  try {
    const offset = (page - 1) * limit;
    const conditions: string[] = ['ub.is_active = true', 'ub.room_id IS NOT NULL'];
    const values: unknown[] = [];
    let paramCount = 0;

    if (filters.roomId) {
      paramCount++;
      conditions.push(`ub.room_id = $${paramCount}`);
      values.push(filters.roomId);
    }

    if (filters.buildingId) {
      paramCount++;
      conditions.push(`r.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters.utilityType) {
      paramCount++;
      conditions.push(`ub.utility_type = $${paramCount}`);
      values.push(filters.utilityType);
    }

    if (filters.billStatus) {
      paramCount++;
      conditions.push(`ub.bill_status = $${paramCount}`);
      values.push(filters.billStatus);
    }

    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`ub.billing_period_start >= $${paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`ub.billing_period_end <= $${paramCount}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM utility_bills ub
      LEFT JOIN rooms r ON ub.room_id = r.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get bills with related data
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        ub.*,
        b.name as building_name,
        r.room_number,
        r.id as room_id
      FROM utility_bills ub
      INNER JOIN rooms r ON ub.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      ${whereClause}
      ORDER BY ub.due_date DESC, ub.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(query, [...values, limit, offset]);
    
    const bills = result.rows.map((row: any) => ({
      id: String(row.id),
      buildingId: row.building_id ? String(row.building_id) : undefined,
      roomId: String(row.room_id),
      utilityType: row.utility_type,
      amount: parseFloat(row.amount),
      billingPeriodStart: new Date(row.billing_period_start),
      billingPeriodEnd: new Date(row.billing_period_end),
      dueDate: new Date(row.due_date),
      billStatus: row.bill_status,
      provider: row.provider_name,
      providerName: row.provider_name,
      accountNumber: row.provider_account_number,
      usageAmount: row.usage_amount ? parseFloat(row.usage_amount) : undefined,
      usageUnit: row.usage_unit,
      billUrl: row.bill_url,
      notes: row.notes,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      buildingName: row.building_name,
      roomNumber: row.room_number,
    }));

    return {
      bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching room utility bills:', error);
    throw new Error('Failed to fetch room utility bills');
  }
}

/**
 * Create a room-specific utility bill (electric or water)
 */
export async function createRoomUtilityBill(billData: {
  roomId: string;
  utilityType: 'electricity' | 'water';
  amount: number;
  billingPeriodStart: Date | string;
  billingPeriodEnd: Date | string;
  dueDate: Date | string;
  providerName: string;
  providerAccountNumber?: string;
  usageAmount?: number;
  usageUnit?: string;
  billStatus?: 'pending' | 'paid' | 'overdue' | 'disputed';
  billUrl?: string;
  notes?: string;
}) {
  try {
    // Get room's building_id
    const roomQuery = await pool.query('SELECT building_id FROM rooms WHERE id = $1', [billData.roomId]);
    if (roomQuery.rows.length === 0) {
      throw new Error('Room not found');
    }
    const buildingId = roomQuery.rows[0].building_id;

    const query = `
      INSERT INTO utility_bills (
        building_id, room_id, utility_type, provider_name, provider_account_number,
        billing_period_start, billing_period_end, due_date, amount,
        usage_amount, usage_unit, bill_status, bill_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      buildingId,
      billData.roomId,
      billData.utilityType,
      billData.providerName,
      billData.providerAccountNumber || null,
      billData.billingPeriodStart,
      billData.billingPeriodEnd,
      billData.dueDate,
      billData.amount,
      billData.usageAmount || null,
      billData.usageUnit || null,
      billData.billStatus || 'pending',
      billData.billUrl || null,
      billData.notes || null,
    ];
    
    const result = await pool.query(query, values);
    const row = result.rows[0];
    
    return {
      id: String(row.id),
      buildingId: String(row.building_id),
      roomId: String(row.room_id),
      utilityType: row.utility_type,
      amount: parseFloat(row.amount),
      billingPeriodStart: new Date(row.billing_period_start),
      billingPeriodEnd: new Date(row.billing_period_end),
      dueDate: new Date(row.due_date),
      billStatus: row.bill_status,
      providerName: row.provider_name,
      providerAccountNumber: row.provider_account_number,
      usageAmount: row.usage_amount ? parseFloat(row.usage_amount) : undefined,
      usageUnit: row.usage_unit,
      billUrl: row.bill_url,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error creating room utility bill:', error);
    throw error;
  }
}

/**
 * Update a room utility bill
 */
export async function updateRoomUtilityBill(
  id: string,
  updates: Partial<{
    amount: number;
    billingPeriodStart: Date | string;
    billingPeriodEnd: Date | string;
    dueDate: Date | string;
    providerName: string;
    providerAccountNumber?: string;
    usageAmount?: number;
    usageUnit?: string;
    billStatus?: 'pending' | 'paid' | 'overdue' | 'disputed';
    billUrl?: string;
    notes?: string;
  }>
) {
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    if (updates.amount !== undefined) {
      paramCount++;
      setClauses.push(`amount = $${paramCount}`);
      values.push(updates.amount);
    }

    if (updates.billingPeriodStart !== undefined) {
      paramCount++;
      setClauses.push(`billing_period_start = $${paramCount}`);
      values.push(updates.billingPeriodStart);
    }

    if (updates.billingPeriodEnd !== undefined) {
      paramCount++;
      setClauses.push(`billing_period_end = $${paramCount}`);
      values.push(updates.billingPeriodEnd);
    }

    if (updates.dueDate !== undefined) {
      paramCount++;
      setClauses.push(`due_date = $${paramCount}`);
      values.push(updates.dueDate);
    }

    if (updates.providerName !== undefined) {
      paramCount++;
      setClauses.push(`provider_name = $${paramCount}`);
      values.push(updates.providerName);
    }

    if (updates.providerAccountNumber !== undefined) {
      paramCount++;
      setClauses.push(`provider_account_number = $${paramCount}`);
      values.push(updates.providerAccountNumber);
    }

    if (updates.usageAmount !== undefined) {
      paramCount++;
      setClauses.push(`usage_amount = $${paramCount}`);
      values.push(updates.usageAmount);
    }

    if (updates.usageUnit !== undefined) {
      paramCount++;
      setClauses.push(`usage_unit = $${paramCount}`);
      values.push(updates.usageUnit);
    }

    if (updates.billStatus !== undefined) {
      paramCount++;
      setClauses.push(`bill_status = $${paramCount}`);
      values.push(updates.billStatus);
    }

    if (updates.billUrl !== undefined) {
      paramCount++;
      setClauses.push(`bill_url = $${paramCount}`);
      values.push(updates.billUrl);
    }

    if (updates.notes !== undefined) {
      paramCount++;
      setClauses.push(`notes = $${paramCount}`);
      values.push(updates.notes);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    paramCount++;
    values.push(id);

    const query = `
      UPDATE utility_bills
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount} AND is_active = true AND room_id IS NOT NULL
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Room utility bill not found');
    }
    
    const row = result.rows[0];
    return {
      id: String(row.id),
      buildingId: row.building_id ? String(row.building_id) : undefined,
      roomId: String(row.room_id),
      utilityType: row.utility_type,
      amount: parseFloat(row.amount),
      billingPeriodStart: new Date(row.billing_period_start),
      billingPeriodEnd: new Date(row.billing_period_end),
      dueDate: new Date(row.due_date),
      billStatus: row.bill_status,
      providerName: row.provider_name,
      providerAccountNumber: row.provider_account_number,
      usageAmount: row.usage_amount ? parseFloat(row.usage_amount) : undefined,
      usageUnit: row.usage_unit,
      billUrl: row.bill_url,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error updating room utility bill:', error);
    throw error;
  }
}

/**
 * Delete a room utility bill (soft delete)
 */
export async function deleteRoomUtilityBill(id: string) {
  try {
    const query = `
      UPDATE utility_bills
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true AND room_id IS NOT NULL
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Room utility bill not found');
    }
  } catch (error) {
    console.error('Error deleting room utility bill:', error);
    throw error;
  }
}
