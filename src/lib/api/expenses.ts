import pool from '../db';
import { Expense } from '@/types/database';

interface ExpenseFilters {
  search?: string;
  category?: string;
  buildingId?: number;
  roomId?: number;
  vendor?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ExpenseResult {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get all expenses with optional filtering and pagination
 */
export async function getExpenses(
  filters: ExpenseFilters = {},
  page = 1,
  limit = 20
): Promise<ExpenseResult> {
  try {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    // Search filter (description or vendor)
    if (filters.search) {
      paramCount++;
      conditions.push(`(e.description ILIKE $${paramCount} OR e.vendor_name ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
    }

    // Category filter
    if (filters.category) {
      paramCount++;
      conditions.push(`e.category = $${paramCount}`);
      values.push(filters.category);
    }

    // Building filter
    if (filters.buildingId) {
      paramCount++;
      conditions.push(`e.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    // Vendor filter
    if (filters.vendor) {
      paramCount++;
      conditions.push(`e.vendor_name ILIKE $${paramCount}`);
      values.push(`%${filters.vendor}%`);
    }

    // Date range filters
    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`e.expense_date >= $${paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`e.expense_date <= $${paramCount}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM expenses e
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get expenses with related data
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT 
        e.*,
        b.name as building_name,
        b.address_line1 as building_address
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(query, [...values, limit, offset]);
    const expenses = result.rows.map(mapRowToExpense);

    return {
      expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw new Error('Failed to fetch expenses');
  }
}

/**
 * Get a single expense by ID
 */
export async function getExpenseById(id: string): Promise<Expense | null> {
  try {
    const query = `
      SELECT 
        e.*,
        b.name as building_name,
        b.address_line1 as building_address
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      WHERE e.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return mapRowToExpense(result.rows[0]);
  } catch (error) {
    console.error('Error fetching expense by ID:', error);
    throw new Error('Failed to fetch expense');
  }
}

/**
 * Create a new expense
 */
export async function createExpense(expenseData: Partial<Expense>): Promise<Expense> {
  try {
    // Always try to include room_id if provided, fallback to building-only if column doesn't exist
    const hasRoomId = expenseData.roomId !== undefined && expenseData.roomId !== null;
    
    let query: string;
    let values: unknown[];
    
    if (hasRoomId) {
      query = `
        INSERT INTO expenses (
          building_id, room_id, category, amount, description,
          vendor_name, expense_date, receipt_url, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      values = [
        expenseData.buildingId || null,
        expenseData.roomId || null,
        expenseData.expenseCategory || expenseData.category || 'other',
        expenseData.amount,
        expenseData.description,
        expenseData.vendor || expenseData.vendorName || null,
        expenseData.expenseDate || new Date(),
        expenseData.receiptUrl || null,
        expenseData.notes || null,
      ];
    } else {
      query = `
        INSERT INTO expenses (
          building_id, category, amount, description,
          vendor_name, expense_date, receipt_url, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      values = [
        expenseData.buildingId || null,
        expenseData.expenseCategory || expenseData.category || 'other',
        expenseData.amount,
        expenseData.description,
        expenseData.vendor || expenseData.vendorName || null,
        expenseData.expenseDate || new Date(),
        expenseData.receiptUrl || null,
        expenseData.notes || null,
      ];
    }
    
    const result = await pool.query(query, values);
    return mapRowToExpense(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    // Provide more detailed error message
    if (error instanceof Error) {
      // Check if it's a column doesn't exist error (room_id column not migrated yet)
      if (error.message.includes('room_id') || error.message.includes('column "room_id" does not exist')) {
        // Try again without room_id (graceful fallback)
        console.warn('room_id column not found, creating expense without room_id');
        try {
          const query = `
            INSERT INTO expenses (
              building_id, category, amount, description,
              vendor_name, expense_date, receipt_url, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `;
          
          const values = [
            expenseData.buildingId || null,
            expenseData.expenseCategory || expenseData.category || 'other',
            expenseData.amount,
            expenseData.description,
            expenseData.vendor || expenseData.vendorName || null,
            expenseData.expenseDate || new Date(),
            expenseData.receiptUrl || null,
            expenseData.notes || null,
          ];
          
          const result = await pool.query(query, values);
          return mapRowToExpense(result.rows[0]);
        } catch (retryError) {
          throw new Error(`Failed to create expense: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      throw new Error(`Failed to create expense: ${error.message}`);
    }
    throw new Error('Failed to create expense');
  }
}

/**
 * Update an expense
 */
export async function updateExpense(
  id: string,
  updates: Partial<Expense>
): Promise<Expense> {
  try {
    const allowedFields = [
      'building_id',
      'category',
      'amount',
      'description',
      'vendor_name',
      'expense_date',
      'receipt_url',
      'notes',
    ];
    
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    // Build dynamic SET clause
    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = camelToSnake(key);
      if (allowedFields.includes(snakeKey)) {
        paramCount++;
        setClauses.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
      }
    });

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at
    paramCount++;
    setClauses.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    // Add expense ID
    paramCount++;
    values.push(id);

    const query = `
      UPDATE expenses
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Expense not found');
    }
    
    return mapRowToExpense(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

/**
 * Delete an expense (soft delete)
 */
export async function deleteExpense(id: string): Promise<void> {
  try {
    const query = `
      UPDATE expenses
      SET updated_at = NOW()
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Expense not found');
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

/**
 * Get expense summary statistics
 */
export async function getExpenseSummary(filters: ExpenseFilters = {}): Promise<{
  totalExpenses: number;
  totalAmount: number;
  categoryBreakdown: Array<{ category: string; total: number; count: number }>;
  monthlyTrend: Array<{ month: string; total: number }>;
}> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    // Apply filters
    if (filters.buildingId) {
      paramCount++;
      conditions.push(`building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`expense_date >= $${paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`expense_date <= $${paramCount}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total expenses and amount
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_expenses,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses
      ${whereClause}
    `;
    const summaryResult = await pool.query(summaryQuery, values);

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM expenses
      ${whereClause}
      GROUP BY category
      ORDER BY total DESC
    `;
    const categoryResult = await pool.query(categoryQuery, values);

    // Get monthly trend (last 6 months)
    const trendQuery = `
      SELECT 
        TO_CHAR(expense_date, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as total
      FROM expenses
      ${whereClause}
      GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 6
    `;
    const trendResult = await pool.query(trendQuery, values);

    // Calculate current month's data
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthData = trendResult.rows.find(row => row.month === currentMonth);
    const monthlyAmount = currentMonthData ? parseFloat(currentMonthData.total) : 0;
    
    // Get current month expense count
    const monthlyCountCondition = whereClause 
      ? `${whereClause} AND TO_CHAR(expense_date, 'YYYY-MM') = $${values.length + 1}`
      : `WHERE TO_CHAR(expense_date, 'YYYY-MM') = $1`;
    const monthlyCountQuery = `
      SELECT COUNT(*) as count
      FROM expenses
      ${monthlyCountCondition}
    `;
    const monthlyCountValues = whereClause ? [...values, currentMonth] : [currentMonth];
    const monthlyCountResult = await pool.query(monthlyCountQuery, monthlyCountValues);
    const monthlyExpenses = parseInt(monthlyCountResult.rows[0]?.count || '0');

    return {
      totalExpenses: parseInt(summaryResult.rows[0].total_expenses),
      totalAmount: parseFloat(summaryResult.rows[0].total_amount),
      monthlyAmount,
      monthlyExpenses,
      categoryBreakdown: categoryResult.rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total),
        count: parseInt(row.count),
      })),
      monthlyTrend: trendResult.rows.map(row => ({
        month: row.month,
        total: parseFloat(row.total),
      })),
    };
  } catch (error) {
    console.error('Error getting expense summary:', error);
    throw new Error('Failed to get expense summary');
  }
}

/**
 * Helper: Map database row to Expense type
 */
function mapRowToExpense(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    buildingId: row.building_id ? String(row.building_id) : undefined,
    roomId: row.room_id ? String(row.room_id) : undefined,
    category: String(row.category || row.expense_category || 'other'),
    expenseCategory: String(row.category || row.expense_category || 'other'),
    amount: Number(row.amount),
    description: String(row.description),
    vendor: row.vendor_name ? String(row.vendor_name) : (row.vendor ? String(row.vendor) : undefined),
    vendorName: row.vendor_name ? String(row.vendor_name) : (row.vendor ? String(row.vendor) : undefined),
    vendorContact: row.vendor_contact ? String(row.vendor_contact) : undefined,
    paymentMethod: String(row.payment_method || 'cash'),
    expenseDate: row.expense_date ? new Date(String(row.expense_date)) : new Date(),
    receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined,
    expenseStatus: String(row.expense_status || 'pending') as 'pending' | 'approved' | 'paid' | 'rejected',
    isRecurring: Boolean(row.is_recurring),
    recurrenceInterval: row.recurrence_interval ? String(row.recurrence_interval) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    // Additional fields from joins
    buildingName: row.building_name ? String(row.building_name) : undefined,
    buildingAddress: row.building_address ? String(row.building_address) : undefined,
  };
}

/**
 * Helper: Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
