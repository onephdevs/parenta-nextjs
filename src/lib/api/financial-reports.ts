import { Pool } from 'pg';
import { FinancialReport } from '@/types/financial';

// Use the same pool configuration as other API files
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export interface RevenueByCategory {
  category: string;
  amount: number;
  count: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface OutstandingBalance {
  tenantId: number;
  tenantName: string;
  totalAmount: number;
  overdueAmount: number;
  daysPastDue: number;
}

// Generate comprehensive financial report for a date range
export async function generateFinancialReport(
  startDate: string,
  endDate: string
): Promise<FinancialReport> {
  const client = await pool.connect();
  
  try {
    // Revenue analysis
    const revenueQuery = `
      SELECT 
        SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END) as rent_revenue,
        SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposit_revenue,
        SUM(CASE WHEN type = 'fee' THEN amount ELSE 0 END) as fee_revenue,
        SUM(CASE WHEN type = 'utilities' THEN amount ELSE 0 END) as utilities_revenue,
        SUM(amount) as total_revenue
      FROM payments
      WHERE status = 'completed' 
        AND payment_date >= $1 
        AND payment_date <= $2
    `;

    const revenueResult = await client.query(revenueQuery, [startDate, endDate]);
    const revenue = revenueResult.rows[0];

    // Expense analysis
    const expenseQuery = `
      SELECT 
        SUM(CASE WHEN category = 'maintenance' THEN amount ELSE 0 END) as maintenance_expenses,
        SUM(CASE WHEN category = 'utilities' THEN amount ELSE 0 END) as utilities_expenses,
        SUM(CASE WHEN category = 'supplies' THEN amount ELSE 0 END) as supplies_expenses,
        SUM(CASE WHEN category = 'services' THEN amount ELSE 0 END) as services_expenses,
        SUM(CASE WHEN category = 'insurance' THEN amount ELSE 0 END) as insurance_expenses,
        SUM(CASE WHEN category = 'taxes' THEN amount ELSE 0 END) as taxes_expenses,
        SUM(CASE WHEN category = 'other' THEN amount ELSE 0 END) as other_expenses,
        SUM(amount) as total_expenses
      FROM expenses
      WHERE expense_date >= $1 
        AND expense_date <= $2
    `;

    const expenseResult = await client.query(expenseQuery, [startDate, endDate]);
    const expenses = expenseResult.rows[0];

    // Outstanding balances
    const outstandingQuery = `
      SELECT 
        SUM(i.total_amount - COALESCE(i.paid_amount, 0)) as total_outstanding,
        SUM(CASE 
          WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' 
          THEN (i.total_amount - COALESCE(i.paid_amount, 0)) 
          ELSE 0 
        END) as overdue_outstanding,
        SUM(CASE 
          WHEN i.due_date >= CURRENT_DATE AND i.status != 'paid' 
          THEN (i.total_amount - COALESCE(i.paid_amount, 0)) 
          ELSE 0 
        END) as current_outstanding,
        AVG(CASE 
          WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' 
          THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date) 
          ELSE NULL 
        END) as average_days_overdue
      FROM invoices i
      WHERE i.status != 'paid' 
        AND i.status != 'cancelled'
        AND i.issue_date <= $2
    `;

    const outstandingResult = await client.query(outstandingQuery, [endDate]);
    const outstanding = outstandingResult.rows[0];

    // Calculate profit metrics
    const totalRevenue = parseFloat(revenue.total_revenue || '0');
    const totalExpenses = parseFloat(expenses.total_expenses || '0');
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      period: {
        start: new Date(startDate),
        end: new Date(endDate),
      },
      revenue: {
        totalRevenue,
        rentRevenue: parseFloat(revenue.rent_revenue || '0'),
        depositRevenue: parseFloat(revenue.deposit_revenue || '0'),
        feeRevenue: parseFloat(revenue.fee_revenue || '0'),
        utilitiesRevenue: parseFloat(revenue.utilities_revenue || '0'),
      },
      expenses: {
        totalExpenses,
        maintenanceExpenses: parseFloat(expenses.maintenance_expenses || '0'),
        utilitiesExpenses: parseFloat(expenses.utilities_expenses || '0'),
        suppliesExpenses: parseFloat(expenses.supplies_expenses || '0'),
        servicesExpenses: parseFloat(expenses.services_expenses || '0'),
        insuranceExpenses: parseFloat(expenses.insurance_expenses || '0'),
        taxesExpenses: parseFloat(expenses.taxes_expenses || '0'),
        otherExpenses: parseFloat(expenses.other_expenses || '0'),
      },
      profitLoss: {
        grossProfit,
        netProfit: grossProfit, // In this simple model, gross = net
        profitMargin,
      },
      outstandingBalances: {
        totalOutstanding: parseFloat(outstanding.total_outstanding || '0'),
        currentOutstanding: parseFloat(outstanding.current_outstanding || '0'),
        overdueOutstanding: parseFloat(outstanding.overdue_outstanding || '0'),
        averageDaysOverdue: parseFloat(outstanding.average_days_overdue || '0'),
      },
    };
  } finally {
    client.release();
  }
}

// Get revenue breakdown by category
export async function getRevenueByCategory(
  startDate: string,
  endDate: string
): Promise<RevenueByCategory[]> {
  const query = `
    SELECT 
      type as category,
      SUM(amount) as amount,
      COUNT(*) as count
    FROM payments
    WHERE status = 'completed' 
      AND payment_date >= $1 
      AND payment_date <= $2
    GROUP BY type
    ORDER BY amount DESC
  `;

  const result = await pool.query(query, [startDate, endDate]);
  
  return result.rows.map(row => ({
    category: row.category,
    amount: parseFloat(row.amount),
    count: parseInt(row.count),
  }));
}

// Get expense breakdown by category
export async function getExpenseByCategory(
  startDate: string,
  endDate: string
): Promise<ExpenseByCategory[]> {
  const query = `
    SELECT 
      category,
      SUM(amount) as amount,
      COUNT(*) as count
    FROM expenses
    WHERE expense_date >= $1 
      AND expense_date <= $2
    GROUP BY category
    ORDER BY amount DESC
  `;

  const result = await pool.query(query, [startDate, endDate]);
  
  return result.rows.map(row => ({
    category: row.category,
    amount: parseFloat(row.amount),
    count: parseInt(row.count),
  }));
}

// Get monthly financial trends
export async function getMonthlyTrends(months: number = 12): Promise<MonthlyTrend[]> {
  const query = `
    WITH monthly_revenue AS (
      SELECT 
        TO_CHAR(payment_date, 'YYYY-MM') as month,
        SUM(amount) as revenue
      FROM payments
      WHERE status = 'completed' 
        AND payment_date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
    ),
    monthly_expenses AS (
      SELECT 
        TO_CHAR(expense_date, 'YYYY-MM') as month,
        SUM(amount) as expenses
      FROM expenses
      WHERE expense_date >= CURRENT_DATE - INTERVAL '${months} months'
      GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
    )
    SELECT 
      COALESCE(r.month, e.month) as month,
      COALESCE(r.revenue, 0) as revenue,
      COALESCE(e.expenses, 0) as expenses,
      COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0) as profit
    FROM monthly_revenue r
    FULL OUTER JOIN monthly_expenses e ON r.month = e.month
    ORDER BY month DESC
  `;

  const result = await pool.query(query);
  
  return result.rows.map(row => ({
    month: row.month,
    revenue: parseFloat(row.revenue),
    expenses: parseFloat(row.expenses),
    profit: parseFloat(row.profit),
  }));
}

// Get outstanding balances by tenant
export async function getOutstandingBalances(): Promise<OutstandingBalance[]> {
  const query = `
    SELECT 
      t.id as tenant_id,
      CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
      SUM(i.total_amount - COALESCE(i.paid_amount, 0)) as total_amount,
      SUM(CASE 
        WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' 
        THEN (i.total_amount - COALESCE(i.paid_amount, 0)) 
        ELSE 0 
      END) as overdue_amount,
      MAX(CASE 
        WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' 
        THEN EXTRACT(DAY FROM CURRENT_DATE - i.due_date) 
        ELSE 0 
      END) as days_past_due
    FROM invoices i
    JOIN tenants t ON i.tenant_id = t.id
    WHERE i.status != 'paid' 
      AND i.status != 'cancelled'
      AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    GROUP BY t.id, t.first_name, t.last_name
    HAVING SUM(i.total_amount - COALESCE(i.paid_amount, 0)) > 0
    ORDER BY overdue_amount DESC, total_amount DESC
  `;

  const result = await pool.query(query);
  
  return result.rows.map(row => ({
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    totalAmount: parseFloat(row.total_amount),
    overdueAmount: parseFloat(row.overdue_amount),
    daysPastDue: parseInt(row.days_past_due),
  }));
}

// Get financial metrics for dashboard
export async function getFinancialMetrics(): Promise<{
  monthlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  totalOutstanding: number;
  overdueAmount: number;
  collectionRate: number;
}> {
  const client = await pool.connect();
  
  try {
    // Current month metrics
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const currentMonthEnd = new Date();
    currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
    currentMonthEnd.setDate(0);
    currentMonthEnd.setHours(23, 59, 59, 999);

    // Monthly revenue
    const revenueQuery = `
      SELECT COALESCE(SUM(amount), 0) as monthly_revenue
      FROM payments
      WHERE status = 'completed' 
        AND payment_date >= $1 
        AND payment_date <= $2
    `;
    
    const revenueResult = await client.query(revenueQuery, [
      currentMonthStart.toISOString().split('T')[0],
      currentMonthEnd.toISOString().split('T')[0]
    ]);

    // Monthly expenses
    const expenseQuery = `
      SELECT COALESCE(SUM(amount), 0) as monthly_expenses
      FROM expenses
      WHERE expense_date >= $1 
        AND expense_date <= $2
    `;
    
    const expenseResult = await client.query(expenseQuery, [
      currentMonthStart.toISOString().split('T')[0],
      currentMonthEnd.toISOString().split('T')[0]
    ]);

    // Outstanding balances
    const outstandingQuery = `
      SELECT 
        COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total_outstanding,
        COALESCE(SUM(CASE 
          WHEN due_date < CURRENT_DATE AND status != 'paid' 
          THEN (total_amount - COALESCE(paid_amount, 0)) 
          ELSE 0 
        END), 0) as overdue_amount
      FROM invoices
      WHERE status != 'paid' 
        AND status != 'cancelled'
    `;
    
    const outstandingResult = await client.query(outstandingQuery);

    // Collection rate (payments received vs invoiced this month)
    const collectionQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN i.issue_date >= $1 AND i.issue_date <= $2 THEN i.total_amount ELSE 0 END), 0) as invoiced_amount,
        COALESCE(SUM(CASE WHEN p.payment_date >= $1 AND p.payment_date <= $2 AND p.status = 'completed' THEN p.amount ELSE 0 END), 0) as collected_amount
      FROM invoices i
      FULL OUTER JOIN payments p ON i.tenant_id = p.tenant_id
    `;
    
    const collectionResult = await client.query(collectionQuery, [
      currentMonthStart.toISOString().split('T')[0],
      currentMonthEnd.toISOString().split('T')[0]
    ]);

    const monthlyRevenue = parseFloat(revenueResult.rows[0].monthly_revenue);
    const monthlyExpenses = parseFloat(expenseResult.rows[0].monthly_expenses);
    const totalOutstanding = parseFloat(outstandingResult.rows[0].total_outstanding);
    const overdueAmount = parseFloat(outstandingResult.rows[0].overdue_amount);
    
    const invoicedAmount = parseFloat(collectionResult.rows[0].invoiced_amount);
    const collectedAmount = parseFloat(collectionResult.rows[0].collected_amount);
    const collectionRate = invoicedAmount > 0 ? (collectedAmount / invoicedAmount) * 100 : 0;

    return {
      monthlyRevenue,
      monthlyExpenses,
      monthlyProfit: monthlyRevenue - monthlyExpenses,
      totalOutstanding,
      overdueAmount,
      collectionRate,
    };
  } finally {
    client.release();
  }
}

// Export financial data to CSV format
export async function exportFinancialData(
  type: 'payments' | 'expenses' | 'invoices',
  startDate: string,
  endDate: string
): Promise<string> {
  let query: string;
  let headers: string;

  switch (type) {
    case 'payments':
      headers = 'Date,Tenant,Amount,Type,Status,Payment Method,Description\n';
      query = `
        SELECT 
          p.payment_date,
          CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
          p.amount,
          p.type,
          p.status,
          p.payment_method,
          p.description
        FROM payments p
        LEFT JOIN tenants t ON p.tenant_id = t.id
        WHERE p.payment_date >= $1 AND p.payment_date <= $2
        ORDER BY p.payment_date DESC
      `;
      break;

    case 'expenses':
      headers = 'Date,Amount,Category,Description,Vendor,Building,Notes\n';
      query = `
        SELECT 
          e.expense_date,
          e.amount,
          e.category,
          e.description,
          e.vendor,
          b.name as building_name,
          e.notes
        FROM expenses e
        LEFT JOIN buildings b ON e.building_id = b.id
        WHERE e.expense_date >= $1 AND e.expense_date <= $2
        ORDER BY e.expense_date DESC
      `;
      break;

    case 'invoices':
      headers = 'Issue Date,Due Date,Tenant,Invoice Number,Amount,Status,Description\n';
      query = `
        SELECT 
          i.issue_date,
          i.due_date,
          CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
          i.invoice_number,
          i.total_amount,
          i.status,
          i.description
        FROM invoices i
        LEFT JOIN tenants t ON i.tenant_id = t.id
        WHERE i.issue_date >= $1 AND i.issue_date <= $2
        ORDER BY i.issue_date DESC
      `;
      break;

    default:
      throw new Error('Invalid export type');
  }

  const result = await pool.query(query, [startDate, endDate]);
  
  let csvContent = headers;
  
  result.rows.forEach(row => {
    const values = Object.values(row).map(value => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent += values.join(',') + '\n';
  });

  return csvContent;
}