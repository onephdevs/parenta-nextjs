/**
 * Dashboard Service
 * Provides real-time metrics and calculations for the financial dashboard
 */

import pool from '@/lib/db';
import { clampPageLimit } from '@/lib/db/query-limits';

export interface RevenueMetrics {
  monthly: number;
  yearly: number;
  monthlyGrowth: number;
  yearlyGrowth: number;
  currentMonth: string;
  currentYear: number;
}

export interface OutstandingInvoicesMetrics {
  total: number;
  count: number;
  overdue: number;
  overdueCount: number;
  sent: number;
  sentCount: number;
}

export interface OccupancyMetrics {
  occupiedRooms: number;
  totalRooms: number;
  vacantRooms: number;
  occupancyRate: number;
  maintenanceRooms: number;
  byBuilding: Array<{
    buildingId: string;
    buildingName: string;
    occupied: number;
    total: number;
    rate: number;
  }>;
}

export interface RecentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentType: string;
  referenceNumber?: string;
}

export interface UpcomingDueDate {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  dueDate: string;
  amount: number;
  remainingAmount: number;
  status: string;
  daysUntilDue: number;
}

export interface TopTenant {
  tenantId: string;
  tenantName: string;
  totalPaid: number;
  paymentCount: number;
  averagePayment: number;
  lastPaymentDate: string;
  onTimePaymentRate: number;
}

export interface InvoiceStatusBreakdown {
  draft: number;
  sent: number;
  partial: number;
  paid: number;
  overdue: number;
  cancelled: number;
}

/**
 * Get total revenue for specified period
 */
export async function getTotalRevenue(period: 'month' | 'year' = 'month'): Promise<RevenueMetrics> {
  const client = await pool.connect();
  
  try {
    // Current month and year
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentYear = now.getFullYear();
    
    // Current month revenue
    const currentMonthResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        AND payment_status IN ('paid', 'partial', 'completed')
    `);
    
    // Previous month revenue
    const previousMonthResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
        AND payment_date < DATE_TRUNC('month', CURRENT_DATE)
        AND payment_status IN ('paid', 'partial', 'completed')
    `);
    
    // Current year revenue
    const currentYearResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE payment_date >= DATE_TRUNC('year', CURRENT_DATE)
        AND payment_date < DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'
        AND payment_status IN ('paid', 'partial', 'completed')
    `);
    
    // Previous year revenue
    const previousYearResult = await client.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE payment_date >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year'
        AND payment_date < DATE_TRUNC('year', CURRENT_DATE)
        AND payment_status IN ('paid', 'partial', 'completed')
    `);
    
    const monthly = parseFloat(currentMonthResult.rows[0].revenue);
    const previousMonthly = parseFloat(previousMonthResult.rows[0].revenue);
    const yearly = parseFloat(currentYearResult.rows[0].revenue);
    const previousYearly = parseFloat(previousYearResult.rows[0].revenue);
    
    // Calculate growth percentages
    const monthlyGrowth = previousMonthly > 0 
      ? ((monthly - previousMonthly) / previousMonthly) * 100 
      : 0;
    
    const yearlyGrowth = previousYearly > 0
      ? ((yearly - previousYearly) / previousYearly) * 100
      : 0;
    
    return {
      monthly,
      yearly,
      monthlyGrowth,
      yearlyGrowth,
      currentMonth,
      currentYear,
    };
  } finally {
    client.release();
  }
}

/**
 * Get outstanding invoices summary
 */
export async function getOutstandingInvoices(): Promise<OutstandingInvoicesMetrics> {
  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE 
        WHEN invoice_status IN ('sent', 'partial', 'overdue') 
        THEN total_amount - amount_paid 
        ELSE 0 
      END), 0) as total_outstanding,
      COUNT(CASE 
        WHEN invoice_status IN ('sent', 'partial', 'overdue') 
        THEN 1 
      END) as count_outstanding,
      COALESCE(SUM(CASE 
        WHEN invoice_status = 'overdue' 
        THEN total_amount - amount_paid 
        ELSE 0 
      END), 0) as overdue_amount,
      COUNT(CASE 
        WHEN invoice_status = 'overdue' 
        THEN 1 
      END) as count_overdue,
      COALESCE(SUM(CASE 
        WHEN invoice_status = 'sent' 
        THEN total_amount - amount_paid 
        ELSE 0 
      END), 0) as sent_amount,
      COUNT(CASE 
        WHEN invoice_status = 'sent' 
        THEN 1 
      END) as count_sent
    FROM invoices
  `);
  
  const row = result.rows[0];
  
  return {
    total: parseFloat(row.total_outstanding),
    count: parseInt(row.count_outstanding),
    overdue: parseFloat(row.overdue_amount),
    overdueCount: parseInt(row.count_overdue),
    sent: parseFloat(row.sent_amount),
    sentCount: parseInt(row.count_sent),
  };
}

/**
 * Get occupancy rate and statistics
 */
export async function getOccupancyRate(): Promise<OccupancyMetrics> {
  const client = await pool.connect();
  
  try {
    // Overall occupancy
    const overallResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN room_status = 'occupied' THEN 1 END) as occupied,
        COUNT(CASE WHEN room_status = 'vacant' THEN 1 END) as vacant,
        COUNT(CASE WHEN room_status = 'maintenance' THEN 1 END) as maintenance,
        COUNT(*) as total
      FROM rooms
      WHERE is_active = true
    `);
    
    const overall = overallResult.rows[0];
    const occupiedRooms = parseInt(overall.occupied);
    const totalRooms = parseInt(overall.total);
    const vacantRooms = parseInt(overall.vacant);
    const maintenanceRooms = parseInt(overall.maintenance);
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    
    // Occupancy by building
    const byBuildingResult = await client.query(`
      SELECT 
        b.id as building_id,
        b.name as building_name,
        COUNT(CASE WHEN r.room_status = 'occupied' THEN 1 END) as occupied,
        COUNT(*) as total
      FROM buildings b
      LEFT JOIN rooms r ON r.building_id = b.id AND r.is_active = true
      WHERE b.is_active = true
      GROUP BY b.id, b.name
      ORDER BY b.name
    `);
    
    const byBuilding = byBuildingResult.rows.map(row => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      occupied: parseInt(row.occupied),
      total: parseInt(row.total),
      rate: row.total > 0 ? (parseInt(row.occupied) / parseInt(row.total)) * 100 : 0,
    }));
    
    return {
      occupiedRooms,
      totalRooms,
      vacantRooms,
      occupancyRate,
      maintenanceRooms,
      byBuilding,
    };
  } finally {
    client.release();
  }
}

/**
 * Get recent payments
 */
export async function getRecentPayments(limit: number = 10): Promise<RecentPayment[]> {
  const take = clampPageLimit(limit, 10, 50);
  const result = await pool.query(`
    SELECT 
      p.id,
      p.tenant_id,
      t.first_name || ' ' || t.last_name as tenant_name,
      p.amount,
      p.payment_date,
      p.payment_method,
      p.payment_type,
      p.reference_number
    FROM payments p
    JOIN tenants t ON t.id = p.tenant_id
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT $1
  `, [take]);
  
  return result.rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    amount: parseFloat(row.amount),
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    paymentType: row.payment_type,
    referenceNumber: row.reference_number,
  }));
}

/**
 * Get upcoming due dates
 */
export async function getUpcomingDueDates(days: number = 30): Promise<UpcomingDueDate[]> {
  // Dashboard widget only (idx_invoices_due_date). Cap rows instead of shipping every invoice in the window.
  const result = await pool.query(`
    SELECT 
      i.id,
      i.invoice_number,
      i.tenant_id,
      t.first_name || ' ' || t.last_name as tenant_name,
      i.due_date,
      i.total_amount,
      i.total_amount - i.amount_paid as remaining_amount,
      i.invoice_status,
      i.due_date - CURRENT_DATE as days_until_due
    FROM invoices i
    JOIN tenants t ON t.id = i.tenant_id
    WHERE i.invoice_status IN ('sent', 'partial')
      AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::INTEGER
      AND i.total_amount > i.amount_paid
    ORDER BY i.due_date ASC, i.created_at ASC
    LIMIT 20
  `, [days]);
  
  return result.rows.map(row => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    dueDate: row.due_date,
    amount: parseFloat(row.total_amount),
    remainingAmount: parseFloat(row.remaining_amount),
    status: row.invoice_status,
    daysUntilDue: parseInt(row.days_until_due),
  }));
}

/**
 * Get top tenants by payment history
 */
export async function getTopTenantsByPayments(limit: number = 5): Promise<TopTenant[]> {
  // Rank in SQL with LIMIT; 12-month window so the dashboard does not aggregate all-time payments.
  const result = await pool.query(`
    WITH tenant_payments AS (
      SELECT 
        p.tenant_id,
        t.first_name || ' ' || t.last_name as tenant_name,
        SUM(p.amount) as total_paid,
        COUNT(*) as payment_count,
        AVG(p.amount) as average_payment,
        MAX(p.payment_date) as last_payment_date
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
      WHERE p.payment_status IN ('paid', 'partial', 'completed')
        AND p.payment_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY p.tenant_id, tenant_name
    ),
    on_time_payments AS (
      SELECT 
        p.tenant_id,
        COUNT(*) as on_time_count,
        COUNT(*) FILTER (
          WHERE p.payment_date <= (
            SELECT MIN(i.due_date)
            FROM invoices i
            WHERE i.tenant_id = p.tenant_id
              AND i.created_at <= p.payment_date
              AND i.invoice_status != 'cancelled'
          )
        ) as total_count
      FROM payments p
      WHERE p.payment_status IN ('paid', 'partial', 'completed')
        AND p.payment_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY p.tenant_id
    )
    SELECT 
      tp.tenant_id,
      tp.tenant_name,
      tp.total_paid,
      tp.payment_count,
      tp.average_payment,
      tp.last_payment_date,
      CASE 
        WHEN otp.total_count > 0 
        THEN (otp.on_time_count::FLOAT / otp.total_count::FLOAT) * 100
        ELSE 0
      END as on_time_payment_rate
    FROM tenant_payments tp
    LEFT JOIN on_time_payments otp ON otp.tenant_id = tp.tenant_id
    ORDER BY tp.total_paid DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    totalPaid: parseFloat(row.total_paid),
    paymentCount: parseInt(row.payment_count),
    averagePayment: parseFloat(row.average_payment),
    lastPaymentDate: row.last_payment_date,
    onTimePaymentRate: parseFloat(row.on_time_payment_rate),
  }));
}

/**
 * Get invoice status breakdown
 */
export async function getInvoiceStatusBreakdown(): Promise<InvoiceStatusBreakdown> {
  const result = await pool.query(`
    SELECT 
      invoice_status,
      COUNT(*) as count
    FROM invoices
    WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY invoice_status
  `);
  
  const breakdown: InvoiceStatusBreakdown = {
    draft: 0,
    sent: 0,
    partial: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  };
  
  result.rows.forEach(row => {
    const status = row.invoice_status as keyof InvoiceStatusBreakdown;
    breakdown[status] = parseInt(row.count);
  });
  
  return breakdown;
}

/**
 * Get all dashboard metrics in one optimized call
 */
export async function getAllDashboardMetrics() {
  const [
    revenue,
    outstanding,
    occupancy,
    recentPayments,
    upcomingDueDates,
    topTenants,
    invoiceBreakdown,
    monthlyRevenueTrend
  ] = await Promise.all([
    getTotalRevenue(),
    getOutstandingInvoices(),
    getOccupancyRate(),
    getRecentPayments(10),
    getUpcomingDueDates(30),
    getTopTenantsByPayments(5),
    getInvoiceStatusBreakdown(),
    getMonthlyRevenueTrend(),
  ]);
  
  return {
    revenue,
    outstanding,
    occupancy,
    recentPayments,
    upcomingDueDates,
    topTenants,
    invoiceBreakdown,
    monthlyRevenueTrend,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get monthly revenue trend for the past 12 months
 */
export async function getMonthlyRevenueTrend(): Promise<Array<{ month: string; revenue: number; payments: number }>> {
  const result = await pool.query(`
    SELECT 
      TO_CHAR(payment_date, 'Mon YYYY') as month,
      DATE_TRUNC('month', payment_date) as month_date,
      COALESCE(SUM(amount), 0) as revenue,
      COUNT(*) as payments
    FROM payments
    WHERE payment_date >= CURRENT_DATE - INTERVAL '12 months'
      AND payment_status IN ('paid', 'partial', 'completed')
    GROUP BY DATE_TRUNC('month', payment_date), TO_CHAR(payment_date, 'Mon YYYY')
    ORDER BY month_date ASC
  `);
  
  return result.rows.map(row => ({
    month: row.month,
    revenue: parseFloat(row.revenue),
    payments: parseInt(row.payments),
  }));
}

