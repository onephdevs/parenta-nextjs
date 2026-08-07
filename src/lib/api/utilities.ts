import pool from '../db';

export interface UtilityBill {
  id: string;
  buildingId?: string; // Optional: can be room-specific or building-wide
  roomId?: string; // Optional: room/apartment this bill is for
  utilityType: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'waste' | 'other';
  amount: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  billStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  provider: string;
  accountNumber?: string;
  meterReading?: number;
  usageAmount?: number;
  usageUnit?: string;
  billUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  buildingName?: string;
  roomNumber?: string;
}

interface UtilityFilters {
  buildingId?: number;
  roomId?: number;
  utilityType?: string;
  billStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UtilityBillResult {
  bills: UtilityBill[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function syncUtilityBillToExpensesBoard(bill: UtilityBill): Promise<void> {
  try {
    const { ensureUtilityBillPipelineCard } = await import('@/lib/api/pipeline');
    await ensureUtilityBillPipelineCard({
      utilityBillId: bill.id,
      utilityType: bill.utilityType,
      amount: bill.amount,
      billStatus: bill.billStatus,
      dueDate: bill.dueDate,
      providerName: bill.provider,
      buildingId: bill.buildingId,
      roomId: bill.roomId,
      buildingName: bill.buildingName,
      roomNumber: bill.roomNumber,
      notes: bill.notes,
    });
  } catch (err) {
    console.error('Expenses pipeline sync after utility bill failed:', err);
  }
}

/**
 * Get all utility bills with filtering and pagination
 */
export async function getUtilityBills(
  filters: UtilityFilters = {},
  page = 1,
  limit = 20
): Promise<UtilityBillResult> {
  try {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    if (filters.buildingId) {
      paramCount++;
      conditions.push(`ub.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters.roomId) {
      paramCount++;
      conditions.push(`ub.room_id = $${paramCount}`);
      values.push(filters.roomId);
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
        r.room_number
      FROM utility_bills ub
      LEFT JOIN buildings b ON ub.building_id = b.id
      LEFT JOIN rooms r ON ub.room_id = r.id
      ${whereClause}
      ORDER BY ub.due_date DESC, ub.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(query, [...values, limit, offset]);
    const bills = result.rows.map(mapRowToUtilityBill);

    return {
      bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    throw new Error('Failed to fetch utility bills');
  }
}

/**
 * Get a single utility bill by ID
 */
export async function getUtilityBillById(id: string): Promise<UtilityBill | null> {
  try {
    const query = `
      SELECT 
        ub.*,
        b.name as building_name,
        r.room_number
      FROM utility_bills ub
      LEFT JOIN buildings b ON ub.building_id = b.id
      LEFT JOIN rooms r ON ub.room_id = r.id
      WHERE ub.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapRowToUtilityBill(result.rows[0]);
  } catch (error) {
    console.error('Error fetching utility bill by ID:', error);
    throw new Error('Failed to fetch utility bill');
  }
}

/**
 * Create a new utility bill
 */
export async function createUtilityBill(billData: Partial<UtilityBill>): Promise<UtilityBill> {
  try {
    const query = `
      INSERT INTO utility_bills (
        building_id, room_id, utility_type, amount, billing_period_start,
        billing_period_end, due_date, bill_status, provider_name, provider_account_number,
        usage_amount, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    // Ensure either buildingId or roomId is provided
    if (!billData.buildingId && !billData.roomId) {
      throw new Error('Either buildingId or roomId must be provided');
    }
    
    const values = [
      billData.buildingId || null,
      billData.roomId || null,
      billData.utilityType,
      billData.amount,
      billData.billingPeriodStart,
      billData.billingPeriodEnd,
      billData.dueDate,
      billData.billStatus || 'pending',
      billData.provider,
      billData.accountNumber || null,
      billData.meterReading || null,
      billData.notes || null,
    ];
    
    const result = await pool.query(query, values);
    const bill = mapRowToUtilityBill(result.rows[0]);
    await syncUtilityBillToExpensesBoard(bill);
    return bill;
  } catch (error) {
    console.error('Error creating utility bill:', error);
    throw new Error('Failed to create utility bill');
  }
}

/**
 * Update a utility bill
 */
export async function updateUtilityBill(
  id: string,
  updates: Partial<UtilityBill>
): Promise<UtilityBill> {
  try {
    const fieldMap: Record<string, string> = {
      buildingId: 'building_id',
      roomId: 'room_id',
      utilityType: 'utility_type',
      amount: 'amount',
      billingPeriodStart: 'billing_period_start',
      billingPeriodEnd: 'billing_period_end',
      dueDate: 'due_date',
      billStatus: 'bill_status',
      provider: 'provider_name',
      accountNumber: 'provider_account_number',
      meterReading: 'usage_amount',
      notes: 'notes',
    };
    
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      const column = fieldMap[key];
      if (column) {
        paramCount++;
        setClauses.push(`${column} = $${paramCount}`);
        values.push(value);
      }
    });

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    values.push(id);

    const query = `
      UPDATE utility_bills
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Utility bill not found');
    }

    const bill = mapRowToUtilityBill(result.rows[0]);
    await syncUtilityBillToExpensesBoard(bill);
    return bill;
  } catch (error) {
    console.error('Error updating utility bill:', error);
    throw error;
  }
}

/**
 * Delete a utility bill (cancel / soft delete via status)
 */
export async function deleteUtilityBill(id: string): Promise<void> {
  try {
    const query = `
      UPDATE utility_bills
      SET bill_status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND bill_status <> 'cancelled'
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Utility bill not found');
    }
  } catch (error) {
    console.error('Error deleting utility bill:', error);
    throw error;
  }
}

/**
 * Mark utility bill as paid
 */
export async function markUtilityBillPaid(id: string): Promise<UtilityBill> {
  try {
    const query = `
      UPDATE utility_bills
      SET bill_status = 'paid', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Utility bill not found');
    }

    const bill = mapRowToUtilityBill(result.rows[0]);
    await syncUtilityBillToExpensesBoard(bill);
    return bill;
  } catch (error) {
    console.error('Error marking utility bill as paid:', error);
    throw error;
  }
}

/**
 * Get utility bill summary statistics
 */
export async function getUtilityBillSummary(filters: UtilityFilters = {}): Promise<{
  totalBills: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  byUtilityType: Array<{ type: string; amount: number; count: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
}> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    if (filters.buildingId) {
      paramCount++;
      conditions.push(`building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`billing_period_start >= $${paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`billing_period_end <= $${paramCount}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN bill_status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN bill_status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN bill_status = 'overdue' THEN amount ELSE 0 END), 0) as overdue_amount
      FROM utility_bills
      ${whereClause}
    `;
    const summaryResult = await pool.query(summaryQuery, values);

    // Get breakdown by utility type
    const typeQuery = `
      SELECT 
        utility_type as type,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM utility_bills
      ${whereClause}
      GROUP BY utility_type
      ORDER BY amount DESC
    `;
    const typeResult = await pool.query(typeQuery, values);

    // Get monthly trend
    const trendQuery = `
      SELECT 
        TO_CHAR(billing_period_start, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as amount
      FROM utility_bills
      ${whereClause}
      GROUP BY TO_CHAR(billing_period_start, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;
    const trendResult = await pool.query(trendQuery, values);

    return {
      totalBills: parseInt(summaryResult.rows[0].total_bills),
      totalAmount: parseFloat(summaryResult.rows[0].total_amount),
      paidAmount: parseFloat(summaryResult.rows[0].paid_amount),
      pendingAmount: parseFloat(summaryResult.rows[0].pending_amount),
      overdueAmount: parseFloat(summaryResult.rows[0].overdue_amount),
      byUtilityType: typeResult.rows.map(row => ({
        type: row.type,
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      })),
      monthlyTrend: trendResult.rows.map(row => ({
        month: row.month,
        amount: parseFloat(row.amount),
      })),
    };
  } catch (error) {
    console.error('Error getting utility bill summary:', error);
    throw new Error('Failed to get utility bill summary');
  }
}

/**
 * Helper: Map database row to UtilityBill type
 */
function mapRowToUtilityBill(row: Record<string, unknown>): UtilityBill {
  return {
    id: String(row.id),
    buildingId: row.building_id ? String(row.building_id) : undefined,
    roomId: row.room_id ? String(row.room_id) : undefined,
    utilityType: String(row.utility_type) as UtilityBill['utilityType'],
    amount: Number(row.amount),
    billingPeriodStart: new Date(String(row.billing_period_start)),
    billingPeriodEnd: new Date(String(row.billing_period_end)),
    dueDate: new Date(String(row.due_date)),
    billStatus: String(row.bill_status) as UtilityBill['billStatus'],
    provider: String(row.provider_name ?? row.provider ?? ''),
    accountNumber: row.provider_account_number
      ? String(row.provider_account_number)
      : row.account_number
        ? String(row.account_number)
        : undefined,
    meterReading: row.usage_amount != null
      ? Number(row.usage_amount)
      : row.meter_reading != null
        ? Number(row.meter_reading)
        : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    billUrl: row.bill_url ? String(row.bill_url) : undefined,
    usageAmount: row.usage_amount != null ? Number(row.usage_amount) : undefined,
    usageUnit: row.usage_unit ? String(row.usage_unit) : undefined,
    isActive: row.is_active != null ? Boolean(row.is_active) : String(row.bill_status) !== 'cancelled',
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    buildingName: row.building_name ? String(row.building_name) : undefined,
    roomNumber: row.room_number ? String(row.room_number) : undefined,
  };
}

/**
 * Update bill status
 */
export async function updateBillStatus(id: string, status: string): Promise<UtilityBill> {
  const query = `
    UPDATE utility_bills
    SET bill_status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [status, id]);
  const bill = mapRowToUtilityBill(result.rows[0]);
  await syncUtilityBillToExpensesBoard(bill);
  return bill;
}

/**
 * Get utility statistics
 */
export async function getUtilityStats(buildingId?: string) {
  const whereClause = buildingId ? 'WHERE building_id = $1' : '';
  const values = buildingId ? [buildingId] : [];
  
  const query = `
    SELECT
      COUNT(*) as total_bills,
      SUM(amount) as total_amount,
      SUM(CASE WHEN bill_status = 'paid' THEN amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN bill_status = 'pending' THEN amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN bill_status = 'overdue' THEN amount ELSE 0 END) as overdue_amount
    FROM utility_bills
    ${whereClause}
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get utility trends over time
 */
export async function getUtilityTrends(buildingId?: string, months = 12) {
  const whereClause = buildingId ? 'AND building_id = $2' : '';
  const values = buildingId ? [months, buildingId] : [months];
  
  const query = `
    SELECT
      TO_CHAR(billing_period_start, 'YYYY-MM') as month,
      utility_type,
      SUM(amount) as amount
    FROM utility_bills
    WHERE billing_period_start >= NOW() - INTERVAL '${months} months' ${whereClause}
    GROUP BY month, utility_type
    ORDER BY month DESC, utility_type
  `;
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Get provider statistics
 */
export async function getProvidersStats() {
  const query = `
    SELECT
      provider_name as provider,
      COUNT(*) as bill_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount
    FROM utility_bills
    WHERE bill_status <> 'cancelled'
    GROUP BY provider_name
    ORDER BY total_amount DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get upcoming due bills
 */
export async function getUpcomingDueBills(days = 7) {
  const query = `
    SELECT
      ub.*,
      b.name as building_name,
      r.room_number
    FROM utility_bills ub
    LEFT JOIN buildings b ON ub.building_id = b.id
    LEFT JOIN rooms r ON ub.room_id = r.id
    WHERE ub.due_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
      AND ub.bill_status = 'pending'
    ORDER BY ub.due_date ASC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(mapRowToUtilityBill);
}
