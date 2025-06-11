import pool from '../db';
import { UtilityBill, DatabaseUtilityBill, CreateUtilityBillData } from '../../types/database';

// Helper function to map database utility bill to UtilityBill interface
function mapDatabaseUtilityBillToUtilityBill(dbBill: DatabaseUtilityBill): UtilityBill {
  return {
    id: dbBill.id,
    buildingId: dbBill.building_id,
    utilityType: dbBill.utility_type,
    providerName: dbBill.provider_name,
    providerAccountNumber: dbBill.provider_account_number,
    billingPeriodStart: dbBill.billing_period_start,
    billingPeriodEnd: dbBill.billing_period_end,
    dueDate: dbBill.due_date,
    amount: dbBill.amount,
    usageAmount: dbBill.usage_amount,
    usageUnit: dbBill.usage_unit,
    billStatus: dbBill.bill_status,
    billUrl: dbBill.bill_url,
    notes: dbBill.notes,
    createdAt: dbBill.created_at,
    updatedAt: dbBill.updated_at
  };
}

// Get all utility bills with optional filters
export async function getAllUtilityBills(filters?: {
  buildingId?: string;
  utilityType?: string;
  billStatus?: string;
  providerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ bills: UtilityBill[]; total: number }> {
  try {
    let countQuery = `
      SELECT COUNT(*) as total
      FROM utility_bills ub
      LEFT JOIN buildings b ON ub.building_id = b.id
      WHERE 1=1
    `;
    
    let query = `
      SELECT 
        ub.*,
        b.name as building_name,
        b.address_line1,
        b.city,
        b.state
      FROM utility_bills ub
      LEFT JOIN buildings b ON ub.building_id = b.id
      WHERE 1=1
    `;
    
    const values: unknown[] = [];
    let paramCount = 0;

    // Apply filters
    if (filters?.buildingId) {
      paramCount++;
      const condition = ` AND ub.building_id = $${paramCount}`;
      query += condition;
      countQuery += condition;
      values.push(filters.buildingId);
    }

    if (filters?.utilityType) {
      paramCount++;
      const condition = ` AND ub.utility_type = $${paramCount}`;
      query += condition;
      countQuery += condition;
      values.push(filters.utilityType);
    }

    if (filters?.billStatus) {
      paramCount++;
      const condition = ` AND ub.bill_status = $${paramCount}`;
      query += condition;
      countQuery += condition;
      values.push(filters.billStatus);
    }

    if (filters?.startDate) {
      paramCount++;
      const condition = ` AND ub.billing_period_start >= $${paramCount}`;
      query += condition;
      countQuery += condition;
      values.push(filters.startDate);
    }

    if (filters?.endDate) {
      paramCount++;
      const condition = ` AND ub.billing_period_end <= $${paramCount}`;
      query += condition;
      countQuery += condition;
      values.push(filters.endDate);
    }

    if (filters?.search) {
      paramCount++;
      const condition = ` AND (
        ub.provider_name ILIKE $${paramCount} OR 
        ub.provider_account_number ILIKE $${paramCount} OR
        b.name ILIKE $${paramCount} OR
        ub.notes ILIKE $${paramCount}
      )`;
      query += condition;
      countQuery += condition;
      values.push(`%${filters.search}%`);
    }

    // Get total count
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Add sorting and pagination
    query += ` ORDER BY ub.due_date DESC, ub.created_at DESC`;
    
    if (filters?.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }
    
    if (filters?.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    const bills = result.rows.map(mapDatabaseUtilityBillToUtilityBill);

    return { bills, total };
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    throw error;
  }
}

// Get utility bill by ID
export async function getUtilityBillById(id: string): Promise<UtilityBill | null> {
  try {
    const query = `
      SELECT 
        ub.*,
        b.name as building_name,
        b.address_line1,
        b.city,
        b.state
      FROM utility_bills ub
      LEFT JOIN buildings b ON ub.building_id = b.id
      WHERE ub.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapDatabaseUtilityBillToUtilityBill(result.rows[0]);
  } catch (error) {
    console.error('Error fetching utility bill:', error);
    throw error;
  }
}

// Create utility bill
export async function createUtilityBill(billData: CreateUtilityBillData): Promise<UtilityBill> {
  try {
    const query = `
      INSERT INTO utility_bills (
        building_id, utility_type, provider_name, provider_account_number,
        billing_period_start, billing_period_end, due_date, amount,
        usage_amount, usage_unit, bill_status, bill_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    
    const values = [
      billData.buildingId,
      billData.utilityType,
      billData.providerName,
      billData.providerAccountNumber,
      billData.billingPeriodStart,
      billData.billingPeriodEnd,
      billData.dueDate,
      billData.amount,
      billData.usageAmount,
      billData.usageUnit,
      billData.billStatus || 'pending',
      billData.billUrl,
      billData.notes
    ];
    
    const result = await pool.query(query, values);
    return mapDatabaseUtilityBillToUtilityBill(result.rows[0]);
  } catch (error) {
    console.error('Error creating utility bill:', error);
    throw error;
  }
}

// Update utility bill
export async function updateUtilityBill(id: string, billData: Partial<CreateUtilityBillData>): Promise<UtilityBill> {
  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    Object.entries(billData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        const dbKey = key === 'buildingId' ? 'building_id' : 
                     key === 'utilityType' ? 'utility_type' :
                     key === 'providerName' ? 'provider_name' :
                     key === 'providerAccountNumber' ? 'provider_account_number' :
                     key === 'billingPeriodStart' ? 'billing_period_start' :
                     key === 'billingPeriodEnd' ? 'billing_period_end' :
                     key === 'dueDate' ? 'due_date' :
                     key === 'usageAmount' ? 'usage_amount' :
                     key === 'usageUnit' ? 'usage_unit' :
                     key === 'billStatus' ? 'bill_status' :
                     key === 'billUrl' ? 'bill_url' :
                     key;
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE utility_bills 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Utility bill not found');
    }
    
    return mapDatabaseUtilityBillToUtilityBill(result.rows[0]);
  } catch (error) {
    console.error('Error updating utility bill:', error);
    throw error;
  }
}

// Delete utility bill
export async function deleteUtilityBill(id: string): Promise<void> {
  try {
    const query = 'DELETE FROM utility_bills WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Utility bill not found');
    }
  } catch (error) {
    console.error('Error deleting utility bill:', error);
    throw error;
  }
}

// Get utility statistics
export async function getUtilityStats(buildingId?: string) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_bills,
        COUNT(*) FILTER (WHERE bill_status = 'pending') as pending_bills,
        COUNT(*) FILTER (WHERE bill_status = 'paid') as paid_bills,
        COUNT(*) FILTER (WHERE bill_status = 'overdue') as overdue_bills,
        COUNT(*) FILTER (WHERE bill_status = 'disputed') as disputed_bills,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN bill_status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN bill_status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN bill_status = 'overdue' THEN amount ELSE 0 END), 0) as overdue_amount,
        COALESCE(AVG(amount), 0) as average_bill_amount,
        COUNT(DISTINCT building_id) as buildings_count,
        COUNT(DISTINCT utility_type) as utility_types_count,
        COUNT(DISTINCT provider_name) as providers_count
      FROM utility_bills
      WHERE 1=1
    `;
    
    const values: unknown[] = [];
    
    if (buildingId) {
      query += ' AND building_id = $1';
      values.push(buildingId);
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching utility stats:', error);
    throw error;
  }
}

// Get utility consumption trends
export async function getUtilityTrends(buildingId?: string, months: number = 12) {
  try {
    let query = `
      SELECT 
        utility_type,
        DATE_TRUNC('month', billing_period_start) as month,
        COUNT(*) as bill_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        SUM(usage_amount) as total_usage,
        AVG(usage_amount) as average_usage
      FROM utility_bills
      WHERE billing_period_start >= CURRENT_DATE - INTERVAL '${months} months'
    `;
    
    const values: unknown[] = [];
    
    if (buildingId) {
      query += ' AND building_id = $1';
      values.push(buildingId);
    }
    
    query += `
      GROUP BY utility_type, DATE_TRUNC('month', billing_period_start)
      ORDER BY month DESC, utility_type ASC
    `;
    
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Error fetching utility trends:', error);
    throw error;
  }
}

// Get providers summary
export async function getProvidersStats() {
  try {
    const query = `
      SELECT 
        provider_name,
        utility_type,
        COUNT(*) as bill_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_bill,
        COUNT(DISTINCT building_id) as buildings_served,
        MIN(billing_period_start) as first_bill_date,
        MAX(billing_period_end) as last_bill_date,
        COUNT(*) FILTER (WHERE bill_status = 'overdue') as overdue_bills
      FROM utility_bills
      GROUP BY provider_name, utility_type
      ORDER BY total_amount DESC, provider_name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching providers stats:', error);
    throw error;
  }
}

// Get utility bills by building
export async function getUtilityBillsByBuilding(buildingId: string) {
  try {
    const query = `
      SELECT 
        utility_type,
        COUNT(*) as bill_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        COUNT(*) FILTER (WHERE bill_status = 'overdue') as overdue_count,
        SUM(CASE WHEN bill_status = 'overdue' THEN amount ELSE 0 END) as overdue_amount,
        MAX(due_date) as latest_due_date,
        MIN(due_date) as earliest_due_date
      FROM utility_bills
      WHERE building_id = $1
      GROUP BY utility_type
      ORDER BY total_amount DESC
    `;
    
    const result = await pool.query(query, [buildingId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching utility bills by building:', error);
    throw error;
  }
}

// Get upcoming due bills
export async function getUpcomingDueBills(days: number = 7) {
  try {
    const query = `
      SELECT 
        ub.*,
        b.name as building_name,
        b.address_line1,
        b.city,
        b.state,
        (ub.due_date - CURRENT_DATE) as days_until_due
      FROM utility_bills ub
      LEFT JOIN buildings b ON ub.building_id = b.id
      WHERE ub.bill_status IN ('pending', 'disputed')
        AND ub.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY ub.due_date ASC, ub.amount DESC
    `;
    
    const result = await pool.query(query);
    return result.rows.map(mapDatabaseUtilityBillToUtilityBill);
  } catch (error) {
    console.error('Error fetching upcoming due bills:', error);
    throw error;
  }
}

// Update bill status
export async function updateBillStatus(id: string, status: 'pending' | 'paid' | 'overdue' | 'disputed'): Promise<UtilityBill> {
  try {
    const query = `
      UPDATE utility_bills 
      SET bill_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Utility bill not found');
    }
    
    return mapDatabaseUtilityBillToUtilityBill(result.rows[0]);
  } catch (error) {
    console.error('Error updating bill status:', error);
    throw error;
  }
}

// Get monthly utility summary for all buildings
export async function getMonthlyUtilitySummary(year?: number, month?: number) {
  try {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    
    const query = `
      SELECT 
        b.id as building_id,
        b.name as building_name,
        ub.utility_type,
        COUNT(*) as bill_count,
        SUM(ub.amount) as total_amount,
        AVG(ub.amount) as average_amount,
        SUM(ub.usage_amount) as total_usage,
        STRING_AGG(DISTINCT ub.provider_name, ', ') as providers
      FROM utility_bills ub
      JOIN buildings b ON ub.building_id = b.id
      WHERE EXTRACT(YEAR FROM ub.billing_period_start) = $1
        AND EXTRACT(MONTH FROM ub.billing_period_start) = $2
      GROUP BY b.id, b.name, ub.utility_type
      ORDER BY b.name ASC, total_amount DESC
    `;
    
    const result = await pool.query(query, [currentYear, currentMonth]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching monthly utility summary:', error);
    throw error;
  }
} 