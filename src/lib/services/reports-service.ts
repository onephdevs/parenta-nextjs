/**
 * Reports Service
 * Generates various financial and operational reports
 */

import { pool } from '@/lib/db';

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

