import pool from '../db';

/**
 * Revenue Report - Summary of all revenue sources
 */
export async function getRevenueReport(filters: {
  dateFrom?: string;
  dateTo?: string;
  buildingId?: number;
  roomId?: number;
} = {}): Promise<{
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  revenueByMonth: Array<{ month: string; amount: number; count: number }>;
  revenueByBuilding: Array<{ buildingId: string; buildingName: string; amount: number }>;
  revenueByCategory: Array<{ category: string; amount: number }>;
}> {
  try {
    const conditions: string[] = ['p.is_active = true'];
    const values: unknown[] = [];
    let paramCount = 0;

    // Apply filters
    if (filters.buildingId) {
      paramCount++;
      conditions.push(`r.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters.roomId) {
      paramCount++;
      conditions.push(`p.room_id = $${paramCount}`);
      values.push(filters.roomId);
    }

    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`p.payment_date >= $${paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`p.payment_date <= $${paramCount}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total revenue summary
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(p.amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as paid_revenue,
        COALESCE(SUM(CASE WHEN p.payment_status = 'pending' THEN p.amount ELSE 0 END), 0) as pending_revenue,
        COALESCE(SUM(CASE WHEN p.payment_status = 'overdue' THEN p.amount ELSE 0 END), 0) as overdue_revenue
      FROM payments p
      LEFT JOIN rooms r ON p.room_id = r.id
      ${whereClause}
    `;
    const summaryResult = await pool.query(summaryQuery, values);

    // Revenue by month
    const monthlyQuery = `
      SELECT 
        TO_CHAR(p.payment_date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as amount,
        COUNT(*) FILTER (WHERE p.payment_status = 'paid') as count
      FROM payments p
      LEFT JOIN rooms r ON p.room_id = r.id
      ${whereClause}
      GROUP BY TO_CHAR(p.payment_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;
    const monthlyResult = await pool.query(monthlyQuery, values);

    // Revenue by building
    const buildingQuery = `
      SELECT 
        b.id::text as building_id,
        b.building_name,
        COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as amount
      FROM payments p
      INNER JOIN rooms r ON p.room_id = r.id
      INNER JOIN buildings b ON r.building_id = b.id
      WHERE p.is_active = true
      ${filters.dateFrom ? `AND p.payment_date >= $${values.indexOf(filters.dateFrom) + 1}` : ''}
      ${filters.dateTo ? `AND p.payment_date <= $${values.indexOf(filters.dateTo) + 1}` : ''}
      GROUP BY b.id, b.building_name
      ORDER BY amount DESC
    `;
    const buildingResult = await pool.query(buildingQuery, values.filter(v => v === filters.dateFrom || v === filters.dateTo));

    // Revenue by category (payment type)
    const categoryQuery = `
      SELECT 
        p.payment_type as category,
        COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as amount
      FROM payments p
      LEFT JOIN rooms r ON p.room_id = r.id
      ${whereClause}
      GROUP BY p.payment_type
      ORDER BY amount DESC
    `;
    const categoryResult = await pool.query(categoryQuery, values);

    return {
      totalRevenue: parseFloat(summaryResult.rows[0].total_revenue),
      paidRevenue: parseFloat(summaryResult.rows[0].paid_revenue),
      pendingRevenue: parseFloat(summaryResult.rows[0].pending_revenue),
      overdueRevenue: parseFloat(summaryResult.rows[0].overdue_revenue),
      revenueByMonth: monthlyResult.rows.map(row => ({
        month: row.month,
        amount: parseFloat(row.amount),
        count: parseInt(row.count || 0),
      })),
      revenueByBuilding: buildingResult.rows.map(row => ({
        buildingId: row.building_id,
        buildingName: row.building_name,
        amount: parseFloat(row.amount),
      })),
      revenueByCategory: categoryResult.rows.map(row => ({
        category: row.category || 'other',
        amount: parseFloat(row.amount),
      })),
    };
  } catch (error) {
    console.error('Error generating revenue report:', error);
    throw new Error('Failed to generate revenue report');
  }
}

/**
 * Expense Report - Summary of all expenses
 */
export async function getExpenseReport(filters: {
  dateFrom?: string;
  dateTo?: string;
  buildingId?: number;
  category?: string;
} = {}): Promise<{
  totalExpenses: number;
  expensesByMonth: Array<{ month: string; amount: number; count: number }>;
  expensesByCategory: Array<{ category: string; amount: number; count: number }>;
  expensesByBuilding: Array<{ buildingId: string; buildingName: string; amount: number }>;
  topVendors: Array<{ vendor: string; amount: number; count: number }>;
}> {
  try {
    const conditions: string[] = ['e.is_active = true'];
    const values: unknown[] = [];
    let paramCount = 0;

    if (filters.buildingId) {
      paramCount++;
      conditions.push(`e.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters.category) {
      paramCount++;
      conditions.push(`e.expense_category = $${paramCount}`);
      values.push(filters.category);
    }

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

    // Total expenses
    const summaryQuery = `
      SELECT COALESCE(SUM(e.amount), 0) as total_expenses
      FROM expenses e
      ${whereClause}
    `;
    const summaryResult = await pool.query(summaryQuery, values);

    // Expenses by month
    const monthlyQuery = `
      SELECT 
        TO_CHAR(e.expense_date, 'YYYY-MM') as month,
        COALESCE(SUM(e.amount), 0) as amount,
        COUNT(*) as count
      FROM expenses e
      ${whereClause}
      GROUP BY TO_CHAR(e.expense_date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;
    const monthlyResult = await pool.query(monthlyQuery, values);

    // Expenses by category
    const categoryQuery = `
      SELECT 
        e.expense_category as category,
        COALESCE(SUM(e.amount), 0) as amount,
        COUNT(*) as count
      FROM expenses e
      ${whereClause}
      GROUP BY e.expense_category
      ORDER BY amount DESC
    `;
    const categoryResult = await pool.query(categoryQuery, values);

    // Expenses by building
    const buildingQuery = `
      SELECT 
        b.id::text as building_id,
        b.building_name,
        COALESCE(SUM(e.amount), 0) as amount
      FROM expenses e
      INNER JOIN buildings b ON e.building_id = b.id
      WHERE e.is_active = true
      ${filters.dateFrom ? `AND e.expense_date >= $${values.indexOf(filters.dateFrom) + 1}` : ''}
      ${filters.dateTo ? `AND e.expense_date <= $${values.indexOf(filters.dateTo) + 1}` : ''}
      GROUP BY b.id, b.building_name
      ORDER BY amount DESC
    `;
    const buildingResult = await pool.query(buildingQuery, values.filter(v => v === filters.dateFrom || v === filters.dateTo));

    // Top vendors
    const vendorQuery = `
      SELECT 
        e.vendor,
        COALESCE(SUM(e.amount), 0) as amount,
        COUNT(*) as count
      FROM expenses e
      ${whereClause}
      AND e.vendor IS NOT NULL AND e.vendor != ''
      GROUP BY e.vendor
      ORDER BY amount DESC
      LIMIT 10
    `;
    const vendorResult = await pool.query(vendorQuery, values);

    return {
      totalExpenses: parseFloat(summaryResult.rows[0].total_expenses),
      expensesByMonth: monthlyResult.rows.map(row => ({
        month: row.month,
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      })),
      expensesByCategory: categoryResult.rows.map(row => ({
        category: row.category,
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      })),
      expensesByBuilding: buildingResult.rows.map(row => ({
        buildingId: row.building_id,
        buildingName: row.building_name,
        amount: parseFloat(row.amount),
      })),
      topVendors: vendorResult.rows.map(row => ({
        vendor: row.vendor,
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    console.error('Error generating expense report:', error);
    throw new Error('Failed to generate expense report');
  }
}

/**
 * Rent Roll Report - Current tenant and rent information
 */
export async function getRentRollReport(buildingId?: number): Promise<{
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  units: Array<{
    buildingName: string;
    roomNumber: string;
    tenantName: string | null;
    rentAmount: number | null;
    leaseStart: Date | null;
    leaseEnd: Date | null;
    status: string;
  }>;
}> {
  try {
    const conditions: string[] = ['r.is_active = true'];
    const values: unknown[] = [];
    let paramCount = 0;

    if (buildingId) {
      paramCount++;
      conditions.push(`r.building_id = $${paramCount}`);
      values.push(buildingId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_units,
        COUNT(*) FILTER (WHERE r.room_status = 'occupied') as occupied_units,
        COUNT(*) FILTER (WHERE r.room_status = 'vacant') as vacant_units,
        COALESCE(SUM(r.rent_amount), 0) as total_monthly_rent
      FROM rooms r
      ${whereClause}
    `;
    const summaryResult = await pool.query(summaryQuery, values);

    // Detailed unit information
    const detailQuery = `
      SELECT 
        b.building_name,
        r.room_number,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        r.rent_amount,
        t.lease_start_date,
        t.lease_end_date,
        r.room_status
      FROM rooms r
      INNER JOIN buildings b ON r.building_id = b.id
      LEFT JOIN tenants t ON r.id = t.room_id AND t.tenant_status = 'active' AND t.is_active = true
      ${whereClause}
      ORDER BY b.building_name, r.room_number
    `;
    const detailResult = await pool.query(detailQuery, values);

    const totalUnits = parseInt(summaryResult.rows[0].total_units);
    const occupiedUnits = parseInt(summaryResult.rows[0].occupied_units);

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits: parseInt(summaryResult.rows[0].vacant_units),
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      totalMonthlyRent: parseFloat(summaryResult.rows[0].total_monthly_rent),
      units: detailResult.rows.map(row => ({
        buildingName: row.building_name,
        roomNumber: row.room_number,
        tenantName: row.tenant_name,
        rentAmount: row.rent_amount ? parseFloat(row.rent_amount) : null,
        leaseStart: row.lease_start_date ? new Date(row.lease_start_date) : null,
        leaseEnd: row.lease_end_date ? new Date(row.lease_end_date) : null,
        status: row.room_status,
      })),
    };
  } catch (error) {
    console.error('Error generating rent roll report:', error);
    throw new Error('Failed to generate rent roll report');
  }
}

/**
 * Profit & Loss Statement
 */
export async function getProfitLossStatement(filters: {
  dateFrom: string;
  dateTo: string;
  buildingId?: number;
} = {
  dateFrom: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  dateTo: new Date().toISOString().split('T')[0],
}): Promise<{
  period: { from: string; to: string };
  revenue: {
    rentRevenue: number;
    otherRevenue: number;
    totalRevenue: number;
  };
  expenses: {
    maintenance: number;
    utilities: number;
    supplies: number;
    services: number;
    insurance: number;
    taxes: number;
    other: number;
    totalExpenses: number;
  };
  netIncome: number;
  profitMargin: number;
}> {
  try {
    const values: unknown[] = [filters.dateFrom, filters.dateTo];
    const buildingFilter = filters.buildingId ? `AND building_id = $3` : '';
    if (filters.buildingId) {
      values.push(filters.buildingId);
    }

    // Revenue calculation
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN p.payment_type = 'rent' AND p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as rent_revenue,
        COALESCE(SUM(CASE WHEN p.payment_type != 'rent' AND p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as other_revenue
      FROM payments p
      LEFT JOIN rooms r ON p.room_id = r.id
      WHERE p.is_active = true 
        AND p.payment_date BETWEEN $1 AND $2
        ${buildingFilter.replace('building_id', 'r.building_id')}
    `;
    const revenueResult = await pool.query(revenueQuery, values);

    // Expense calculation by category
    const expenseQuery = `
      SELECT 
        expense_category,
        COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE is_active = true 
        AND expense_date BETWEEN $1 AND $2
        ${buildingFilter}
      GROUP BY expense_category
    `;
    const expenseResult = await pool.query(expenseQuery, values);

    // Map expenses by category
    const expensesByCategory: Record<string, number> = {
      maintenance: 0,
      utilities: 0,
      supplies: 0,
      services: 0,
      insurance: 0,
      taxes: 0,
      other: 0,
    };

    expenseResult.rows.forEach(row => {
      const category = row.expense_category;
      expensesByCategory[category] = parseFloat(row.total);
    });

    const rentRevenue = parseFloat(revenueResult.rows[0].rent_revenue);
    const otherRevenue = parseFloat(revenueResult.rows[0].other_revenue);
    const totalRevenue = rentRevenue + otherRevenue;

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    return {
      period: {
        from: filters.dateFrom,
        to: filters.dateTo,
      },
      revenue: {
        rentRevenue,
        otherRevenue,
        totalRevenue,
      },
      expenses: {
        ...expensesByCategory,
        totalExpenses,
      },
      netIncome,
      profitMargin,
    };
  } catch (error) {
    console.error('Error generating profit & loss statement:', error);
    throw new Error('Failed to generate profit & loss statement');
  }
}

