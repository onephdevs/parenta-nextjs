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
    const conditions: string[] = ['e.is_active = true'];
    const values: unknown[] = [];
    let paramCount = 0;

    // Search filter (description or vendor)
    if (filters.search) {
      paramCount++;
      conditions.push(`(e.description ILIKE $${paramCount} OR e.vendor ILIKE $${paramCount})`);
      values.push(`%${filters.search}%`);
    }

    // Category filter
    if (filters.category) {
      paramCount++;
      conditions.push(`e.expense_category = $${paramCount}`);
      values.push(filters.category);
    }

    // Building filter
    if (filters.buildingId) {
      paramCount++;
      conditions.push(`e.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    // Room filter
    if (filters.roomId) {
      paramCount++;
      conditions.push(`e.room_id = $${paramCount}`);
      values.push(filters.roomId);
    }

    // Vendor filter
    if (filters.vendor) {
      paramCount++;
      conditions.push(`e.vendor ILIKE $${paramCount}`);
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
        b.building_name,
        b.address as building_address,
        r.room_number
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN rooms r ON e.room_id = r.id
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
        b.building_name,
        b.address as building_address,
        r.room_number
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN rooms r ON e.room_id = r.id
      WHERE e.id = $1 AND e.is_active = true
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
    const query = `
      INSERT INTO expenses (
        building_id, room_id, expense_category, amount, description,
        vendor, expense_date, receipt_url, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      expenseData.buildingId || null,
      expenseData.roomId || null,
      expenseData.expenseCategory || 'other',
      expenseData.amount,
      expenseData.description,
      expenseData.vendor || null,
      expenseData.expenseDate || new Date(),
      expenseData.receiptUrl || null,
      expenseData.notes || null,
    ];
    
    const result = await pool.query(query, values);
    return mapRowToExpense(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
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
      'room_id',
      'expense_category',
      'amount',
      'description',
      'vendor',
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
      WHERE id = $${paramCount} AND is_active = true
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
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND is_active = true
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
    const conditions: string[] = ['is_active = true'];
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
        expense_category as category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total
      FROM expenses
      ${whereClause}
      GROUP BY expense_category
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

    return {
      totalExpenses: parseInt(summaryResult.rows[0].total_expenses),
      totalAmount: parseFloat(summaryResult.rows[0].total_amount),
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
    expenseCategory: String(row.expense_category),
    amount: Number(row.amount),
    description: String(row.description),
    vendor: row.vendor ? String(row.vendor) : undefined,
    expenseDate: row.expense_date ? new Date(String(row.expense_date)) : new Date(),
    receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    isActive: Boolean(row.is_active),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    // Additional fields from joins
    buildingName: row.building_name ? String(row.building_name) : undefined,
    buildingAddress: row.building_address ? String(row.building_address) : undefined,
    roomNumber: row.room_number ? String(row.room_number) : undefined,
  };
}

/**
 * Helper: Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
