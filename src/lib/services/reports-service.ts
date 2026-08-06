/**
 * Reports Service
 * Generates various financial and operational reports
 */

import pool from '@/lib/db';

export interface RevenueReportData {
  summary: {
    totalRevenue: number;
    totalPayments: number;
    averagePayment: number;
    period: string;
  };
  byMonth: Array<{
    month: string;
    revenue: number;
    payments: number;
  }>;
  byProperty: Array<{
    buildingId: string;
    buildingName: string;
    revenue: number;
    payments: number;
  }>;
  byTenant: Array<{
    tenantId: string;
    tenantName: string;
    revenue: number;
    payments: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    revenue: number;
    count: number;
  }>;
}

export interface PaymentHistoryReportData {
  summary: {
    totalPayments: number;
    totalAmount: number;
    period: string;
    tenantName?: string;
  };
  payments: Array<{
    id: string;
    paymentDate: string;
    tenantId: string;
    tenantName: string;
    amount: number;
    paymentMethod: string;
    paymentType: string;
    status: string;
    referenceNumber?: string;
    roomNumber?: string;
    buildingName?: string;
  }>;
  timeline: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}

export interface OccupancyReportData {
  summary: {
    currentOccupancyRate: number;
    occupiedRooms: number;
    totalRooms: number;
    vacantRooms: number;
    averageRate: number;
  };
  byMonth: Array<{
    month: string;
    occupancyRate: number;
    occupied: number;
    total: number;
  }>;
  byBuilding: Array<{
    buildingId: string;
    buildingName: string;
    occupancyRate: number;
    occupied: number;
    total: number;
  }>;
  moveInOut: Array<{
    month: string;
    moveIns: number;
    moveOuts: number;
    netChange: number;
  }>;
}

export interface ExpenseReportData {
  summary: {
    totalExpenses: number;
    totalCount: number;
    averageExpense: number;
    period: string;
  };
  byCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  byMonth: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  byBuilding: Array<{
    buildingId: string;
    buildingName: string;
    amount: number;
    count: number;
  }>;
  topExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
}

export interface TenantListReportData {
  summary: {
    totalTenants: number;
    totalBalance: number;
    totalPastDue: number;
    tenantsWithBalance: number;
    tenantsPastDue: number;
    period: string;
  };
  tenants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    roomNumber?: string;
    buildingName?: string;
    buildingId?: string;
    balance: number;
    pastDueAmount: number;
    daysPastDue: number;
    leaseStart?: string;
    leaseEnd?: string;
    tenantStatus: string;
  }>;
}

export interface CollectedAmountReportData {
  summary: {
    totalCollected: number;
    totalPayments: number;
    averagePayment: number;
    period: string;
    previousPeriodCollected?: number;
    growth?: number;
  };
  byPeriod: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  byPaymentType: Array<{
    type: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  timeline: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}

export interface DepositReportData {
  summary: {
    totalDepositsReceived: number;
    totalRefundsIssued: number;
    netDepositBalance: number;
    totalTransactions: number;
    tenantCount: number;
    period: string;
  };
  byPeriod: Array<{
    period: string;
    depositsReceived: number;
    refundsIssued: number;
    netAmount: number;
    tenantCount: number;
  }>;
  byBuilding: Array<{
    buildingId: string;
    buildingName: string;
    depositsReceived: number;
    refundsIssued: number;
    netAmount: number;
  }>;
  byTenant: Array<{
    tenantId: string;
    tenantName: string;
    depositsReceived: number;
    refundsIssued: number;
    netAmount: number;
  }>;
}

export interface VacantRoomsReportData {
  summary: {
    totalVacant: number;
    totalRooms: number;
    vacancyRate: number;
    averageMonthlyRate: number;
    totalPotentialRevenue: number;
  };
  rooms: Array<{
    id: string;
    roomNumber: string;
    buildingName: string;
    buildingId: string;
    floorNumber?: number;
    roomType?: string;
    monthlyRate: number;
    daysVacant?: number;
    lastTenantName?: string;
    maintenanceStatus?: string;
  }>;
}

export interface TenantFinancialSummary {
  tenant: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    moveInDate?: string;
    leaseEndDate?: string;
  };
  financial: {
    totalPaid: number;
    totalInvoiced: number;
    outstanding: number;
    creditBalance: number;
    depositBalance: number;
  };
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    method: string;
    type: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    dueDate: string;
    amount: number;
    paid: number;
    status: string;
  }>;
}

/**
 * Generate Revenue Report
 */
export async function generateRevenueReport(
  startDate: string,
  endDate: string
): Promise<RevenueReportData> {
  const client = await pool.connect();
  
  try {
    // Summary
    const summaryResult = await client.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_payments,
        COALESCE(AVG(amount), 0) as average_payment
      FROM payments
      WHERE payment_date BETWEEN $1 AND $2
        AND payment_status IN ('paid', 'pending')
    `, [startDate, endDate]);
    
    const summary = {
      totalRevenue: parseFloat(summaryResult.rows[0].total_revenue),
      totalPayments: parseInt(summaryResult.rows[0].total_payments),
      averagePayment: parseFloat(summaryResult.rows[0].average_payment),
      period: `${startDate} to ${endDate}`,
    };
    
    // By Month
    const byMonthResult = await client.query(`
      SELECT 
        TO_CHAR(payment_date, 'Mon YYYY') as month,
        DATE_TRUNC('month', payment_date) as month_date,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as payments
      FROM payments
      WHERE payment_date BETWEEN $1 AND $2
        AND payment_status IN ('paid', 'pending')
      GROUP BY DATE_TRUNC('month', payment_date), TO_CHAR(payment_date, 'Mon YYYY')
      ORDER BY month_date ASC
    `, [startDate, endDate]);
    
    const byMonth = byMonthResult.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue),
      payments: parseInt(row.payments),
    }));
    
    // By Property
    const byPropertyResult = await client.query(`
      SELECT 
        b.id as building_id,
        b.name as building_name,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(p.id) as payments
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.id
      LEFT JOIN payments p ON p.room_id = r.id 
        AND p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'pending')
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      ORDER BY revenue DESC
    `, [startDate, endDate]);
    
    const byProperty = byPropertyResult.rows.map(row => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      revenue: parseFloat(row.revenue),
      payments: parseInt(row.payments),
    }));
    
    // By Tenant
    const byTenantResult = await client.query(`
      SELECT 
        t.id as tenant_id,
        t.first_name || ' ' || t.last_name as tenant_name,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(p.id) as payments
      FROM tenants t
      LEFT JOIN payments p ON p.tenant_id = t.id
        AND p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'pending')
      WHERE t.is_active = true
      GROUP BY t.id, tenant_name
      HAVING SUM(p.amount) > 0
      ORDER BY revenue DESC
      LIMIT 20
    `, [startDate, endDate]);
    
    const byTenant = byTenantResult.rows.map(row => ({
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      revenue: parseFloat(row.revenue),
      payments: parseInt(row.payments),
    }));
    
    // By Payment Method
    const byMethodResult = await client.query(`
      SELECT 
        payment_method as method,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as count
      FROM payments
      WHERE payment_date BETWEEN $1 AND $2
        AND payment_status IN ('paid', 'pending')
      GROUP BY payment_method
      ORDER BY revenue DESC
    `, [startDate, endDate]);
    
    const byPaymentMethod = byMethodResult.rows.map(row => ({
      method: row.method,
      revenue: parseFloat(row.revenue),
      count: parseInt(row.count),
    }));
    
    return {
      summary,
      byMonth,
      byProperty,
      byTenant,
      byPaymentMethod,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Payment History Report
 */
export async function generatePaymentHistoryReport(
  startDate: string,
  endDate: string,
  tenantId?: string
): Promise<PaymentHistoryReportData> {
  const client = await pool.connect();
  
  try {
    const params: any[] = [startDate, endDate];
    const tenantFilter = tenantId ? 'AND p.tenant_id = $3' : '';
    if (tenantId) params.push(tenantId);
    
    // Summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        ${tenantId ? "t.first_name || ' ' || t.last_name as tenant_name" : 'NULL as tenant_name'}
      FROM payments p
      ${tenantId ? 'JOIN tenants t ON t.id = p.tenant_id' : ''}
      WHERE p.payment_date BETWEEN $1 AND $2
        ${tenantFilter}
        AND p.payment_status IN ('paid', 'pending')
    `, params);
    
    const summary = {
      totalPayments: parseInt(summaryResult.rows[0].total_payments),
      totalAmount: parseFloat(summaryResult.rows[0].total_amount),
      period: `${startDate} to ${endDate}`,
      tenantName: summaryResult.rows[0].tenant_name,
    };
    
    // Detailed Payments
    const paymentsResult = await client.query(`
      SELECT 
        p.id,
        p.payment_date,
        p.tenant_id,
        t.first_name || ' ' || t.last_name as tenant_name,
        p.amount,
        p.payment_method,
        p.payment_type,
        p.payment_status,
        p.reference_number,
        r.room_number,
        b.name as building_name
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
      LEFT JOIN rooms r ON r.id = p.room_id
      LEFT JOIN buildings b ON b.id = r.building_id
      WHERE p.payment_date BETWEEN $1 AND $2
        ${tenantFilter}
        AND p.payment_status IN ('paid', 'pending')
      ORDER BY p.payment_date DESC, p.created_at DESC
    `, params);
    
    const payments = paymentsResult.rows.map(row => ({
      id: row.id,
      paymentDate: row.payment_date,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      amount: parseFloat(row.amount),
      paymentMethod: row.payment_method,
      paymentType: row.payment_type,
      status: row.payment_status,
      referenceNumber: row.reference_number,
      roomNumber: row.room_number,
      buildingName: row.building_name,
    }));
    
    // Timeline (daily aggregates)
    const timelineResult = await client.query(`
      SELECT 
        payment_date::DATE as date,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as count
      FROM payments
      WHERE payment_date BETWEEN $1 AND $2
        ${tenantFilter}
        AND payment_status IN ('paid', 'pending')
      GROUP BY payment_date::DATE
      ORDER BY date ASC
    `, params);
    
    const timeline = timelineResult.rows.map(row => ({
      date: row.date,
      amount: parseFloat(row.amount),
      count: parseInt(row.count),
    }));
    
    return {
      summary,
      payments,
      timeline,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Occupancy Report
 */
export async function generateOccupancyReport(
  startDate: string,
  endDate: string
): Promise<OccupancyReportData> {
  const client = await pool.connect();
  
  try {
    // Current Summary
    const summaryResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN room_status = 'occupied' THEN 1 END) as occupied,
        COUNT(*) as total,
        COUNT(CASE WHEN room_status = 'vacant' THEN 1 END) as vacant
      FROM rooms
      WHERE is_active = true
    `);
    
    const occupiedRooms = parseInt(summaryResult.rows[0].occupied);
    const totalRooms = parseInt(summaryResult.rows[0].total);
    const vacantRooms = parseInt(summaryResult.rows[0].vacant);
    const currentOccupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    
    const summary = {
      currentOccupancyRate,
      occupiedRooms,
      totalRooms,
      vacantRooms,
      averageRate: currentOccupancyRate, // Could be calculated historically
    };
    
    // By Building
    const byBuildingResult = await client.query(`
      SELECT 
        b.id as building_id,
        b.name as building_name,
        COUNT(CASE WHEN r.room_status = 'occupied' THEN 1 END) as occupied,
        COUNT(r.id) as total
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      ORDER BY b.name
    `);
    
    const byBuilding = byBuildingResult.rows.map(row => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      occupancyRate: row.total > 0 ? (parseInt(row.occupied) / parseInt(row.total)) * 100 : 0,
      occupied: parseInt(row.occupied),
      total: parseInt(row.total),
    }));
    
    // Move-ins and Move-outs
    const moveInOutResult = await client.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') as month,
        DATE_TRUNC('month', date) as month_date,
        SUM(CASE WHEN type = 'move_in' THEN 1 ELSE 0 END) as move_ins,
        SUM(CASE WHEN type = 'move_out' THEN 1 ELSE 0 END) as move_outs
      FROM (
        SELECT start_date as date, 'move_in' as type
        FROM tenant_room_assignments
        WHERE start_date BETWEEN $1 AND $2
        UNION ALL
        SELECT end_date as date, 'move_out' as type
        FROM tenant_room_assignments
        WHERE end_date BETWEEN $1 AND $2 AND end_date IS NOT NULL
      ) moves
      GROUP BY DATE_TRUNC('month', date), TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY')
      ORDER BY month_date ASC
    `, [startDate, endDate]);
    
    const moveInOut = moveInOutResult.rows.map(row => ({
      month: row.month,
      moveIns: parseInt(row.move_ins),
      moveOuts: parseInt(row.move_outs),
      netChange: parseInt(row.move_ins) - parseInt(row.move_outs),
    }));
    
    // Historical occupancy (simplified - using move-ins/outs as proxy)
    const byMonth = moveInOut.map(row => ({
      month: row.month,
      occupancyRate: currentOccupancyRate, // Placeholder - could calculate historically
      occupied: occupiedRooms,
      total: totalRooms,
    }));
    
    return {
      summary,
      byMonth,
      byBuilding,
      moveInOut,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Expense Report
 */
export async function generateExpenseReport(
  startDate: string,
  endDate: string
): Promise<ExpenseReportData> {
  const client = await pool.connect();
  
  try {
    // Summary
    const summaryResult = await client.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COUNT(*) as total_count,
        COALESCE(AVG(amount), 0) as average_expense
      FROM expenses
      WHERE expense_date BETWEEN $1 AND $2
    `, [startDate, endDate]);
    
    const summary = {
      totalExpenses: parseFloat(summaryResult.rows[0].total_expenses),
      totalCount: parseInt(summaryResult.rows[0].total_count),
      averageExpense: parseFloat(summaryResult.rows[0].average_expense),
      period: `${startDate} to ${endDate}`,
    };
    
    const totalExpenses = summary.totalExpenses;
    
    // By Category
    const byCategoryResult = await client.query(`
      SELECT 
        category,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as count
      FROM expenses
      WHERE expense_date BETWEEN $1 AND $2
      GROUP BY category
      ORDER BY amount DESC
    `, [startDate, endDate]);
    
    const byCategory = byCategoryResult.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.amount),
      count: parseInt(row.count),
      percentage: totalExpenses > 0 ? (parseFloat(row.amount) / totalExpenses) * 100 : 0,
    }));
    
    // By Month
    const byMonthResult = await client.query(`
      SELECT 
        TO_CHAR(expense_date, 'Mon YYYY') as month,
        DATE_TRUNC('month', expense_date) as month_date,
        COALESCE(SUM(amount), 0) as amount,
        COUNT(*) as count
      FROM expenses
      WHERE expense_date BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', expense_date), TO_CHAR(expense_date, 'Mon YYYY')
      ORDER BY month_date ASC
    `, [startDate, endDate]);
    
    const byMonth = byMonthResult.rows.map(row => ({
      month: row.month,
      amount: parseFloat(row.amount),
      count: parseInt(row.count),
    }));
    
    // By Building
    const byBuildingResult = await client.query(`
      SELECT 
        b.id as building_id,
        b.name as building_name,
        COALESCE(SUM(e.amount), 0) as amount,
        COUNT(e.id) as count
      FROM buildings b
      LEFT JOIN expenses e ON e.building_id = b.id
        AND e.expense_date BETWEEN $1 AND $2
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      HAVING SUM(e.amount) > 0
      ORDER BY amount DESC
    `, [startDate, endDate]);
    
    const byBuilding = byBuildingResult.rows.map(row => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      amount: parseFloat(row.amount),
      count: parseInt(row.count),
    }));
    
    // Top Expenses
    const topExpensesResult = await client.query(`
      SELECT 
        id,
        description,
        amount,
        category,
        expense_date
      FROM expenses
      WHERE expense_date BETWEEN $1 AND $2
      ORDER BY amount DESC
      LIMIT 10
    `, [startDate, endDate]);
    
    const topExpenses = topExpensesResult.rows.map(row => ({
      id: row.id,
      description: row.description,
      amount: parseFloat(row.amount),
      category: row.category,
      date: row.expense_date,
    }));
    
    return {
      summary,
      byCategory,
      byMonth,
      byBuilding,
      topExpenses,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Expense Report by Period (Monthly, Quarterly, Semi-Annual, Annual)
 */
export async function generateExpenseReportByPeriod(
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' = 'monthly',
  filters?: {
    category?: string;
    buildingId?: string;
    roomId?: string;
  }
): Promise<{
  summary: {
    totalExpenses: number;
    totalCount: number;
    averageExpense: number;
    largestExpense: number;
    averageMonthlyExpense: number;
    period: string;
    periodType: string;
    periodLabel: string;
  };
  byPeriod: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
  byCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  byBuilding: Array<{
    buildingId: string;
    buildingName: string;
    amount: number;
    count: number;
  }>;
  /** One row per month; category keys hold amounts for the multi-line chart */
  monthlyTrend: Array<Record<string, string | number>>;
  details: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    buildingName?: string;
    roomNumber?: string;
    expenseDate: string;
    vendorName?: string;
    expenseStatus: string;
    notes?: string;
  }>;
}> {
  const client = await pool.connect();
  
  try {
    // Build WHERE clause with filters
    const conditions: string[] = ['e.expense_date BETWEEN $1 AND $2'];
    const values: unknown[] = [startDate, endDate];
    let paramCount = 2;

    if (filters?.category) {
      paramCount++;
      conditions.push(`e.category = $${paramCount}`);
      values.push(filters.category);
    }

    if (filters?.buildingId) {
      paramCount++;
      conditions.push(`e.building_id = $${paramCount}`);
      values.push(filters.buildingId);
    }

    if (filters?.roomId) {
      paramCount++;
      conditions.push(`e.room_id = $${paramCount}`);
      values.push(filters.roomId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Summary
    const summaryQuery = `
      SELECT 
        COALESCE(SUM(e.amount), 0) as total_expenses,
        COUNT(*) as total_count,
        COALESCE(AVG(e.amount), 0) as average_expense,
        COALESCE(MAX(e.amount), 0) as largest_expense
      FROM expenses e
      ${whereClause}
    `;
    const summaryResult = await client.query(summaryQuery, values);
    
    const totalExpenses = parseFloat(summaryResult.rows[0].total_expenses);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthSpan = Math.max(
      1,
      (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1
    );

    const periodLabelMap: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      'semi-annual': 'Semi-Annual',
      annual: 'Annual',
    };

    const summary = {
      totalExpenses,
      totalCount: parseInt(summaryResult.rows[0].total_count),
      averageExpense: parseFloat(summaryResult.rows[0].average_expense),
      largestExpense: parseFloat(summaryResult.rows[0].largest_expense),
      averageMonthlyExpense: totalExpenses / monthSpan,
      period: `${startDate} to ${endDate}`,
      periodType,
      periodLabel: periodLabelMap[periodType] || periodType,
    };

    // Get all expenses for period grouping
    const expensesQuery = `
      SELECT 
        e.id,
        e.description,
        e.amount,
        e.category,
        e.expense_date,
        e.vendor_name,
        e.expense_status,
        e.notes,
        b.name as building_name,
        r.room_number
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN rooms r ON e.room_id = r.id
      ${whereClause}
      ORDER BY e.expense_date ASC
    `;
    const expensesResult = await client.query(expensesQuery, values);
    const expenses = expensesResult.rows;

    // Group by period
    const periodMap = new Map<string, { amount: number; count: number }>();
    
    expenses.forEach((expense: any) => {
      const date = new Date(expense.expense_date);
      let periodKey: string;
      
      switch (periodType) {
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `Q${quarter} ${date.getFullYear()}`;
          break;
        case 'semi-annual':
          const half = date.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${half} ${date.getFullYear()}`;
          break;
        case 'annual':
          periodKey = date.getFullYear().toString();
          break;
        default: // monthly
          periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { amount: 0, count: 0 });
      }
      
      const period = periodMap.get(periodKey)!;
      period.amount += parseFloat(expense.amount || 0);
      period.count += 1;
    });
    
    const byPeriod = Array.from(periodMap.entries())
      .map(([period, data]) => ({ period, amount: data.amount, count: data.count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // By Category
    const categoryQuery = `
      SELECT 
        e.category,
        COALESCE(SUM(e.amount), 0) as amount,
        COUNT(*) as count
      FROM expenses e
      ${whereClause}
      GROUP BY e.category
      ORDER BY amount DESC
    `;
    const categoryResult = await client.query(categoryQuery, values);
    
    const byCategory = categoryResult.rows.map((row: any) => ({
      category: row.category,
      amount: parseFloat(row.amount),
      count: parseInt(row.count),
      percentage: totalExpenses > 0 ? (parseFloat(row.amount) / totalExpenses) * 100 : 0,
    }));

    // By Building
    const buildingQuery = `
      SELECT 
        b.id as building_id,
        b.name as building_name,
        COALESCE(SUM(e.amount), 0) as amount,
        COUNT(e.id) as count
      FROM buildings b
      LEFT JOIN expenses e ON e.building_id = b.id
        AND e.expense_date BETWEEN $1 AND $2
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      HAVING SUM(e.amount) > 0
      ORDER BY amount DESC
    `;
    const buildingResult = await client.query(buildingQuery, [startDate, endDate]);
    
    const byBuilding = buildingResult.rows.map((row: any) => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      amount: parseFloat(row.amount),
      count: parseInt(row.count),
    }));

    // Details (all expenses)
    const details = expenses.map((row: any) => ({
      id: row.id,
      description: row.description,
      amount: parseFloat(row.amount),
      category: row.category,
      buildingName: row.building_name,
      roomNumber: row.room_number || undefined,
      expenseDate: row.expense_date,
      vendorName: row.vendor_name,
      expenseStatus: row.expense_status,
      notes: row.notes || undefined,
    }));

    // Monthly trend per category (for multi-line chart)
    const monthOrder: string[] = [];
    const monthlyMap = new Map<string, { label: string; amounts: Record<string, number> }>();
    expenses.forEach((expense: any) => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { label: monthLabel, amounts: {} });
        monthOrder.push(monthKey);
      }
      const bucket = monthlyMap.get(monthKey)!;
      const cat = String(expense.category || 'other');
      bucket.amounts[cat] = (bucket.amounts[cat] || 0) + parseFloat(expense.amount || 0);
    });

    const monthlyTrend = monthOrder.map((key) => {
      const bucket = monthlyMap.get(key)!;
      return {
        month: bucket.label,
        monthKey: key,
        ...bucket.amounts,
      } as Record<string, string | number>;
    });

    return {
      summary,
      byPeriod,
      byCategory,
      byBuilding,
      monthlyTrend,
      details,
    };
  } catch (error) {
    console.error('Error in generateExpenseReportByPeriod:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get Tenant Financial Summary
 */
export async function getTenantFinancialSummary(tenantId: string): Promise<TenantFinancialSummary> {
  const client = await pool.connect();
  
  try {
    // Tenant Info
    const tenantResult = await client.query(`
      SELECT 
        t.id,
        t.first_name || ' ' || t.last_name as name,
        t.email,
        t.phone,
        t.move_in_date,
        t.lease_end_date
      FROM tenants t
      WHERE t.id = $1
    `, [tenantId]);
    
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const tenant = {
      id: tenantResult.rows[0].id,
      name: tenantResult.rows[0].name,
      email: tenantResult.rows[0].email,
      phone: tenantResult.rows[0].phone,
      moveInDate: tenantResult.rows[0].move_in_date,
      leaseEndDate: tenantResult.rows[0].lease_end_date,
    };
    
    // Financial Summary
    const financialResult = await client.query(`
      SELECT 
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(SUM(i.total_amount), 0) as total_invoiced,
        COALESCE(SUM(i.total_amount - i.amount_paid), 0) as outstanding
      FROM tenants t
      LEFT JOIN payments p ON p.tenant_id = t.id AND p.payment_status IN ('paid', 'pending')
      LEFT JOIN invoices i ON i.tenant_id = t.id AND i.invoice_status != 'cancelled'
      WHERE t.id = $1
      GROUP BY t.id
    `, [tenantId]);
    
    // Get credit and deposit balances
    const balancesResult = await client.query(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM tenant_credits WHERE tenant_id = $1 AND transaction_type = 'credit') -
        (SELECT COALESCE(SUM(amount), 0) FROM tenant_credits WHERE tenant_id = $1 AND transaction_type = 'debit') as credit_balance,
        (SELECT COALESCE(SUM(amount), 0) FROM deposit_ledger WHERE tenant_id = $1 AND transaction_type = 'deposit') -
        (SELECT COALESCE(SUM(amount), 0) FROM deposit_ledger WHERE tenant_id = $1 AND transaction_type IN ('refund', 'applied')) as deposit_balance
    `, [tenantId]);
    
    const financial = {
      totalPaid: parseFloat(financialResult.rows[0].total_paid),
      totalInvoiced: parseFloat(financialResult.rows[0].total_invoiced),
      outstanding: parseFloat(financialResult.rows[0].outstanding),
      creditBalance: parseFloat(balancesResult.rows[0].credit_balance || 0),
      depositBalance: parseFloat(balancesResult.rows[0].deposit_balance || 0),
    };
    
    // Recent Payments
    const paymentsResult = await client.query(`
      SELECT 
        id,
        payment_date,
        amount,
        payment_method,
        payment_type
      FROM payments
      WHERE tenant_id = $1
      ORDER BY payment_date DESC
      LIMIT 20
    `, [tenantId]);
    
    const payments = paymentsResult.rows.map(row => ({
      id: row.id,
      date: row.payment_date,
      amount: parseFloat(row.amount),
      method: row.payment_method,
      type: row.payment_type,
    }));
    
    // Invoices
    const invoicesResult = await client.query(`
      SELECT 
        id,
        invoice_number,
        due_date,
        total_amount,
        amount_paid,
        invoice_status
      FROM invoices
      WHERE tenant_id = $1
      ORDER BY due_date DESC
      LIMIT 20
    `, [tenantId]);
    
    const invoices = invoicesResult.rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      dueDate: row.due_date,
      amount: parseFloat(row.total_amount),
      paid: parseFloat(row.amount_paid),
      status: row.invoice_status,
    }));
    
    return {
      tenant,
      financial,
      payments,
      invoices,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Tenant List Report
 */
export async function generateTenantListReport(
  filters?: { status?: string; buildingId?: string }
): Promise<TenantListReportData> {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.tenant_status,
        r.room_number,
        b.name as building_name,
        b.id as building_id,
        tra.start_date as lease_start,
        tra.end_date as lease_end,
        COALESCE(SUM(i.balance_due), 0) as balance,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN i.balance_due ELSE 0 END), 0) as past_due_amount,
        MAX(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN (CURRENT_DATE - i.due_date) ELSE 0 END) as days_past_due
      FROM tenants t
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN invoices i ON t.id = i.tenant_id AND i.invoice_status IN ('sent', 'partial', 'overdue')
      WHERE t.is_active = true
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (filters?.status) {
      query += ` AND t.tenant_status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    if (filters?.buildingId) {
      query += ` AND b.id = $${paramCount}`;
      params.push(filters.buildingId);
      paramCount++;
    }
    
    query += `
      GROUP BY t.id, t.first_name, t.last_name, t.email, t.phone, t.tenant_status,
               r.room_number, b.name, b.id, tra.start_date, tra.end_date
      ORDER BY past_due_amount DESC, balance DESC, t.last_name ASC
    `;
    
    const result = await client.query(query, params);
    
    const tenants = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      buildingId: row.building_id,
      balance: parseFloat(row.balance || 0),
      pastDueAmount: parseFloat(row.past_due_amount || 0),
      daysPastDue: parseInt(row.days_past_due || 0),
      leaseStart: row.lease_start,
      leaseEnd: row.lease_end,
      tenantStatus: row.tenant_status,
    }));
    
    const summary = {
      totalTenants: tenants.length,
      totalBalance: tenants.reduce((sum, t) => sum + t.balance, 0),
      totalPastDue: tenants.reduce((sum, t) => sum + t.pastDueAmount, 0),
      tenantsWithBalance: tenants.filter(t => t.balance > 0).length,
      tenantsPastDue: tenants.filter(t => t.pastDueAmount > 0).length,
      period: 'Current',
    };
    
    return {
      summary,
      tenants,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Collected Amount Report
 */
export async function generateCollectedAmountReport(
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' = 'monthly'
): Promise<CollectedAmountReportData> {
  const client = await pool.connect();
  
  try {
    // Determine date truncation based on period type
    let dateTrunc: string;
    switch (periodType) {
      case 'quarterly':
        dateTrunc = 'quarter';
        break;
      case 'semi-annual':
        dateTrunc = 'month'; // Group 6 months together
        break;
      case 'annual':
        dateTrunc = 'year';
        break;
      default:
        dateTrunc = 'month';
    }
    
    // Get payments in date range
    const paymentsQuery = `
      SELECT 
        p.id,
        p.amount,
        p.payment_method,
        p.payment_type,
        p.payment_date,
        p.payment_status
      FROM payments p
      WHERE p.payment_date BETWEEN $1 AND $2
        AND p.payment_status = 'paid'
      ORDER BY p.payment_date ASC
    `;
    
    const paymentsResult = await client.query(paymentsQuery, [startDate, endDate]);
    const payments = paymentsResult.rows;
    
    // Calculate summary
    const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalPayments = payments.length;
    const averagePayment = totalPayments > 0 ? totalCollected / totalPayments : 0;
    
    // Get previous period for comparison
    const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevEndDate = startDate;
    
    const prevPaymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE payment_date BETWEEN $1 AND $2
        AND payment_status = 'paid'
    `;
    
    const prevResult = await client.query(prevPaymentsQuery, [prevStartDate, prevEndDate]);
    const previousPeriodCollected = parseFloat(prevResult.rows[0].total || 0);
    const growth = previousPeriodCollected > 0 
      ? ((totalCollected - previousPeriodCollected) / previousPeriodCollected) * 100 
      : 0;
    
    // Group by period
    const periodMap = new Map<string, { amount: number; count: number }>();
    
    payments.forEach((payment: any) => {
      const date = new Date(payment.payment_date);
      let periodKey: string;
      
      switch (periodType) {
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `Q${quarter} ${date.getFullYear()}`;
          break;
        case 'semi-annual':
          const half = date.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${half} ${date.getFullYear()}`;
          break;
        case 'annual':
          periodKey = date.getFullYear().toString();
          break;
        default:
          periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, { amount: 0, count: 0 });
      }
      
      const period = periodMap.get(periodKey)!;
      period.amount += parseFloat(payment.amount || 0);
      period.count += 1;
    });
    
    const byPeriod = Array.from(periodMap.entries())
      .map(([period, data]) => ({ period, amount: data.amount, count: data.count }))
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // Group by payment method
    const methodMap = new Map<string, { amount: number; count: number }>();
    payments.forEach((payment: any) => {
      const method = payment.payment_method || 'unknown';
      if (!methodMap.has(method)) {
        methodMap.set(method, { amount: 0, count: 0 });
      }
      const methodData = methodMap.get(method)!;
      methodData.amount += parseFloat(payment.amount || 0);
      methodData.count += 1;
    });
    
    const byPaymentMethod = Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Group by payment type
    const typeMap = new Map<string, { amount: number; count: number }>();
    payments.forEach((payment: any) => {
      const type = payment.payment_type || 'unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, { amount: 0, count: 0 });
      }
      const typeData = typeMap.get(type)!;
      typeData.amount += parseFloat(payment.amount || 0);
      typeData.count += 1;
    });
    
    const byPaymentType = Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        amount: data.amount,
        count: data.count,
        percentage: totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Daily timeline
    const timelineMap = new Map<string, { amount: number; count: number }>();
    payments.forEach((payment: any) => {
      const dateKey = payment.payment_date.split('T')[0];
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, { amount: 0, count: 0 });
      }
      const dayData = timelineMap.get(dateKey)!;
      dayData.amount += parseFloat(payment.amount || 0);
      dayData.count += 1;
    });
    
    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, amount: data.amount, count: data.count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      summary: {
        totalCollected,
        totalPayments,
        averagePayment,
        period: `${startDate} to ${endDate}`,
        previousPeriodCollected,
        growth,
      },
      byPeriod,
      byPaymentMethod,
      byPaymentType,
      timeline,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Deposit Received Report
 */
export async function generateDepositReport(
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'semi-annual' | 'annual' = 'monthly'
): Promise<DepositReportData> {
  const client = await pool.connect();
  
  try {
    const depositsQuery = `
      SELECT 
        dl.id,
        dl.tenant_id,
        dl.amount,
        dl.transaction_type,
        dl.transaction_date,
        dl.description,
        t.first_name,
        t.last_name,
        tra.room_id,
        r.building_id,
        b.name as building_name
      FROM deposit_ledger dl
      LEFT JOIN tenants t ON dl.tenant_id = t.id
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE dl.transaction_date BETWEEN $1 AND $2
      ORDER BY dl.transaction_date ASC
    `;
    
    const depositsResult = await client.query(depositsQuery, [startDate, endDate]);
    const transactions = depositsResult.rows;
    
    const totalDepositsReceived = transactions
      .filter((t: any) => t.transaction_type === 'deposit')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
    
    const totalRefundsIssued = transactions
      .filter((t: any) => t.transaction_type === 'refund')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
    
    const netDepositBalance = totalDepositsReceived - totalRefundsIssued;
    const totalTransactions = transactions.length;
    const tenantCount = new Set(transactions.map((t: any) => t.tenant_id).filter(Boolean)).size;
    
    const periodMap = new Map<string, {
      depositsReceived: number;
      refundsIssued: number;
      tenantIds: Set<string>;
    }>();
    
    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.transaction_date);
      let periodKey: string;
      
      switch (periodType) {
        case 'semi-annual':
          const half = date.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${half} ${date.getFullYear()}`;
          break;
        case 'annual':
          periodKey = date.getFullYear().toString();
          break;
        default:
          periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          depositsReceived: 0,
          refundsIssued: 0,
          tenantIds: new Set(),
        });
      }
      
      const period = periodMap.get(periodKey)!;
      if (transaction.transaction_type === 'deposit') {
        period.depositsReceived += parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'refund') {
        period.refundsIssued += parseFloat(transaction.amount || 0);
      }
      
      if (transaction.tenant_id) {
        period.tenantIds.add(transaction.tenant_id);
      }
    });
    
    const byPeriod = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        depositsReceived: data.depositsReceived,
        refundsIssued: data.refundsIssued,
        netAmount: data.depositsReceived - data.refundsIssued,
        tenantCount: data.tenantIds.size,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
    
    const buildingMap = new Map<string, {
      buildingName: string;
      depositsReceived: number;
      refundsIssued: number;
    }>();
    
    transactions.forEach((transaction: any) => {
      if (!transaction.building_id) return;
      
      const buildingKey = transaction.building_id;
      if (!buildingMap.has(buildingKey)) {
        buildingMap.set(buildingKey, {
          buildingName: transaction.building_name || 'Unknown',
          depositsReceived: 0,
          refundsIssued: 0,
        });
      }
      
      const building = buildingMap.get(buildingKey)!;
      if (transaction.transaction_type === 'deposit') {
        building.depositsReceived += parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'refund') {
        building.refundsIssued += parseFloat(transaction.amount || 0);
      }
    });
    
    const byBuilding = Array.from(buildingMap.entries())
      .map(([buildingId, data]) => ({
        buildingId,
        buildingName: data.buildingName,
        depositsReceived: data.depositsReceived,
        refundsIssued: data.refundsIssued,
        netAmount: data.depositsReceived - data.refundsIssued,
      }))
      .sort((a, b) => b.depositsReceived - a.depositsReceived);
    
    const tenantMap = new Map<string, {
      tenantName: string;
      depositsReceived: number;
      refundsIssued: number;
    }>();
    
    transactions.forEach((transaction: any) => {
      if (!transaction.tenant_id) return;
      
      const tenantKey = transaction.tenant_id;
      if (!tenantMap.has(tenantKey)) {
        tenantMap.set(tenantKey, {
          tenantName: transaction.first_name && transaction.last_name
            ? `${transaction.first_name} ${transaction.last_name}`
            : 'Unknown',
          depositsReceived: 0,
          refundsIssued: 0,
        });
      }
      
      const tenant = tenantMap.get(tenantKey)!;
      if (transaction.transaction_type === 'deposit') {
        tenant.depositsReceived += parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'refund') {
        tenant.refundsIssued += parseFloat(transaction.amount || 0);
      }
    });
    
    const byTenant = Array.from(tenantMap.entries())
      .map(([tenantId, data]) => ({
        tenantId,
        tenantName: data.tenantName,
        depositsReceived: data.depositsReceived,
        refundsIssued: data.refundsIssued,
        netAmount: data.depositsReceived - data.refundsIssued,
      }))
      .sort((a, b) => b.depositsReceived - a.depositsReceived)
      .slice(0, 50);
    
    return {
      summary: {
        totalDepositsReceived,
        totalRefundsIssued,
        netDepositBalance,
        totalTransactions,
        tenantCount,
        period: `${startDate} to ${endDate}`,
      },
      byPeriod,
      byBuilding,
      byTenant,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Vacant Rooms Report
 */
export async function generateVacantRoomsReport(
  filters?: { buildingId?: string }
): Promise<VacantRoomsReportData> {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        r.id,
        r.room_number,
        r.floor_number,
        r.room_type,
        r.monthly_rate,
        r.room_status,
        b.id as building_id,
        b.name as building_name,
        b.address_line1,
        b.city,
        CASE 
          WHEN tra.end_date IS NOT NULL THEN (CURRENT_DATE - tra.end_date)
          ELSE NULL
        END as days_vacant,
        t.first_name || ' ' || t.last_name as last_tenant_name
      FROM rooms r
      INNER JOIN buildings b ON r.building_id = b.id
      LEFT JOIN tenant_room_assignments tra ON r.id = tra.room_id 
        AND tra.assignment_status = 'active'
      LEFT JOIN tenants t ON tra.tenant_id = t.id
      WHERE r.room_status = 'vacant' AND r.is_active = true
    `;
    
    const params: any[] = [];
    if (filters?.buildingId) {
      query += ` AND b.id = $1`;
      params.push(filters.buildingId);
    }
    
    query += ` ORDER BY b.name, r.room_number`;
    
    const result = await client.query(query, params);
    
    const rooms = result.rows.map(row => ({
      id: row.id,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      buildingId: row.building_id,
      floorNumber: row.floor_number,
      roomType: row.room_type,
      monthlyRate: parseFloat(row.monthly_rate || 0),
      daysVacant: row.days_vacant ? parseInt(row.days_vacant) : undefined,
      lastTenantName: row.last_tenant_name || undefined,
      maintenanceStatus: row.room_status,
    }));
    
    const totalRoomsQuery = `
      SELECT COUNT(*) as total
      FROM rooms
      WHERE is_active = true
      ${filters?.buildingId ? 'AND building_id = $1' : ''}
    `;
    
    const totalRoomsResult = await client.query(totalRoomsQuery, filters?.buildingId ? [filters.buildingId] : []);
    const totalRooms = parseInt(totalRoomsResult.rows[0].total || 0);
    
    const totalVacant = rooms.length;
    const vacancyRate = totalRooms > 0 ? (totalVacant / totalRooms) * 100 : 0;
    const averageMonthlyRate = rooms.length > 0
      ? rooms.reduce((sum, r) => sum + r.monthlyRate, 0) / rooms.length
      : 0;
    const totalPotentialRevenue = rooms.reduce((sum, r) => sum + r.monthlyRate, 0);
    
    return {
      summary: {
        totalVacant,
        totalRooms,
        vacancyRate,
        averageMonthlyRate,
        totalPotentialRevenue,
      },
      rooms,
    };
  } finally {
    client.release();
  }
}
