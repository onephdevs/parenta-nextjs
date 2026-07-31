import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * Comprehensive analytics endpoint for dashboard charts and visualizations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const buildingId = searchParams.get('buildingId');
    const dateFrom = searchParams.get('dateFrom') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const dateTo = searchParams.get('dateTo') || new Date().toISOString().split('T')[0];

    const buildingFilter = buildingId ? `AND building_id = ${parseInt(buildingId)}` : '';

    switch (type) {
      case 'dashboard':
        // Return complete dashboard metrics matching DashboardMetrics interface
        return NextResponse.json({
          success: true,
          data: {
            financial: {
              totalRevenue: 0,
              totalExpenses: 0,
              netIncome: 0,
              occupancyRevenue: 0,
              utilityRevenue: 0,
              otherRevenue: 0,
              operatingExpenses: 0,
              maintenanceExpenses: 0,
              utilityExpenses: 0,
              profitMargin: 0,
              roi: 0
            },
            occupancy: {
              totalUnits: 0,
              occupiedUnits: 0,
              vacantUnits: 0,
              occupancyRate: 0,
              averageRent: 0,
              totalRentableArea: 0,
              averageOccupancyDuration: 0
            },
            tenant: {
              totalTenants: 0,
              activeTenants: 0,
              inactiveTenants: 0,
              averageLeaseLength: 0,
              tenantRetentionRate: 0,
              averageRent: 0
            },
            utility: {
              totalConsumption: 0,
              totalCost: 0,
              averageCostPerUnit: 0,
              utilityTypes: []
            },
            asset: {
              totalAssets: 0,
              totalValue: 0,
              maintenanceRequests: 0,
              maintenanceCosts: 0,
              depreciation: 0,
              assetUtilization: 0
            },
            maintenance: {
              totalRequests: 0,
              completedRequests: 0,
              pendingRequests: 0,
              averageCompletionTime: 0,
              costByCategory: [],
              requestsByPriority: []
            },
            buildings: []
          }
        });
        
      case 'financial-trends':
        // Return empty financial trends
        return NextResponse.json({
          success: true,
          data: []
        });
      
      case 'occupancy-trends':
        // Return empty occupancy trends
        return NextResponse.json({
          success: true,
          data: []
        });
        
      case 'cash-flow':
        return NextResponse.json({
          success: true,
          data: []
        });
      
      case 'revenue-trend':
        return await getRevenueTrend(dateFrom, dateTo, buildingFilter);
      
      case 'expense-breakdown':
        return await getExpenseBreakdown(dateFrom, dateTo, buildingFilter);
      
      case 'payment-status':
        return await getPaymentStatusChart(dateFrom, dateTo, buildingFilter);
      
      case 'tenant-distribution':
        return await getTenantDistribution(buildingFilter);
      
      case 'financial-summary':
        return await getFinancialSummary(dateFrom, dateTo, buildingFilter);
      
      case 'maintenance-stats':
        return await getMaintenanceStats(dateFrom, dateTo, buildingFilter);
      
      case 'asset-utilization':
        return await getAssetUtilization(buildingFilter);
        
      default:
        // Return all analytics data
        const [revenue, expenses, occupancy, payments, tenants, financial, maintenance, assets] = await Promise.all([
          getRevenueTrendData(dateFrom, dateTo, buildingFilter),
          getExpenseBreakdownData(dateFrom, dateTo, buildingFilter),
          getOccupancyTrendData(buildingFilter),
          getPaymentStatusData(dateFrom, dateTo, buildingFilter),
          getTenantDistributionData(buildingFilter),
          getFinancialSummaryData(dateFrom, dateTo, buildingFilter),
          getMaintenanceStatsData(dateFrom, dateTo, buildingFilter),
          getAssetUtilizationData(buildingFilter),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            revenueTrend: revenue,
            expenseBreakdown: expenses,
            occupancyTrend: occupancy,
            paymentStatus: payments,
            tenantDistribution: tenants,
            financialSummary: financial,
            maintenanceStats: maintenance,
            assetUtilization: assets,
          }
        });
    }
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Revenue Trend Chart Data
async function getRevenueTrendData(dateFrom: string, dateTo: string, buildingFilter: string) {
  const query = `
    SELECT 
      TO_CHAR(payment_date, 'YYYY-MM') as month,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as paid,
      COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN payment_status = 'overdue' THEN amount ELSE 0 END), 0) as overdue
    FROM payments p
    LEFT JOIN rooms r ON p.room_id = r.id
    WHERE p.payment_date BETWEEN $1 AND $2
      ${buildingFilter.replace('building_id', 'r.building_id')}
    GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
    ORDER BY month ASC
  `;
  
  const result = await pool.query(query, [dateFrom, dateTo]);
  return result.rows.map(row => ({
    month: row.month,
    paid: parseFloat(row.paid),
    pending: parseFloat(row.pending),
    overdue: parseFloat(row.overdue),
    total: parseFloat(row.paid) + parseFloat(row.pending) + parseFloat(row.overdue),
  }));
}

async function getRevenueTrend(dateFrom: string, dateTo: string, buildingFilter: string) {
  const data = await getRevenueTrendData(dateFrom, dateTo, buildingFilter);
  return NextResponse.json({ success: true, data });
}

// Expense Breakdown Chart Data
async function getExpenseBreakdownData(dateFrom: string, dateTo: string, buildingFilter: string) {
  const query = `
    SELECT 
      category,
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
    FROM expenses
    WHERE expense_date BETWEEN $1 AND $2
      ${buildingFilter}
    GROUP BY category
    ORDER BY total DESC
  `;
  
  const result = await pool.query(query, [dateFrom, dateTo]);
  return result.rows.map(row => ({
    category: row.category,
    amount: parseFloat(row.total),
    count: parseInt(row.count),
    percentage: 0, // Calculated on frontend
  }));
}

async function getExpenseBreakdown(dateFrom: string, dateTo: string, buildingFilter: string) {
  const data = await getExpenseBreakdownData(dateFrom, dateTo, buildingFilter);
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const withPercentage = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.amount / total) * 100 : 0,
  }));
  return NextResponse.json({ success: true, data: withPercentage });
}

// Occupancy Trend Chart Data
async function getOccupancyTrendData(buildingFilter: string) {
  const query = `
    SELECT 
      b.name as building_name,
      COUNT(*) as total_rooms,
      COUNT(*) FILTER (WHERE r.room_status = 'occupied') as occupied,
      COUNT(*) FILTER (WHERE r.room_status = 'vacant') as vacant,
      COUNT(*) FILTER (WHERE r.room_status = 'maintenance') as maintenance
    FROM rooms r
    INNER JOIN buildings b ON r.building_id = b.id
    WHERE r.is_active = true ${buildingFilter.replace('building_id', 'r.building_id')}
    GROUP BY b.id, b.name
    ORDER BY b.name
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => ({
    building: row.building_name,
    total: parseInt(row.total_rooms),
    occupied: parseInt(row.occupied),
    vacant: parseInt(row.vacant),
    maintenance: parseInt(row.maintenance),
    occupancyRate: parseInt(row.total_rooms) > 0 
      ? (parseInt(row.occupied) / parseInt(row.total_rooms)) * 100 
      : 0,
  }));
}

async function getOccupancyTrend(buildingFilter: string) {
  const data = await getOccupancyTrendData(buildingFilter);
  return NextResponse.json({ success: true, data });
}

// Payment Status Chart Data
async function getPaymentStatusData(dateFrom: string, dateTo: string, buildingFilter: string) {
  const query = `
    SELECT 
      payment_status,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as total
    FROM payments p
    LEFT JOIN rooms r ON p.room_id = r.id
    WHERE p.payment_date BETWEEN $1 AND $2
      ${buildingFilter.replace('building_id', 'r.building_id')}
    GROUP BY payment_status
  `;
  
  const result = await pool.query(query, [dateFrom, dateTo]);
  return result.rows.map(row => ({
    status: row.payment_status,
    count: parseInt(row.count),
    amount: parseFloat(row.total),
  }));
}

async function getPaymentStatusChart(dateFrom: string, dateTo: string, buildingFilter: string) {
  const data = await getPaymentStatusData(dateFrom, dateTo, buildingFilter);
  return NextResponse.json({ success: true, data });
}

// Tenant Distribution Chart Data
async function getTenantDistributionData(buildingFilter: string) {
  const query = `
    SELECT 
      b.name as building_name,
      COUNT(DISTINCT t.id) as tenant_count,
      COUNT(DISTINCT t.id) FILTER (WHERE t.tenant_status = 'active') as active,
      COUNT(DISTINCT t.id) FILTER (WHERE t.tenant_status = 'pending') as pending
    FROM tenants t
    INNER JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
    INNER JOIN rooms r ON tra.room_id = r.id
    INNER JOIN buildings b ON r.building_id = b.id
    WHERE t.is_active = true ${buildingFilter.replace('building_id', 'r.building_id')}
    GROUP BY b.id, b.name
    ORDER BY tenant_count DESC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => ({
    building: row.building_name,
    total: parseInt(row.tenant_count),
    active: parseInt(row.active || 0),
    pending: parseInt(row.pending || 0),
  }));
}

async function getTenantDistribution(buildingFilter: string) {
  const data = await getTenantDistributionData(buildingFilter);
  return NextResponse.json({ success: true, data });
}

// Financial Summary for Dashboard
async function getFinancialSummaryData(dateFrom: string, dateTo: string, buildingFilter: string) {
  const revenueQuery = `
    SELECT COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as revenue
    FROM payments p
    LEFT JOIN rooms r ON p.room_id = r.id
    WHERE p.payment_date BETWEEN $1 AND $2
      ${buildingFilter.replace('building_id', 'r.building_id')}
  `;
  
  const expenseQuery = `
    SELECT COALESCE(SUM(amount), 0) as expenses
    FROM expenses
    WHERE expense_date BETWEEN $1 AND $2
      ${buildingFilter}
  `;

  const [revenueResult, expenseResult] = await Promise.all([
    pool.query(revenueQuery, [dateFrom, dateTo]),
    pool.query(expenseQuery, [dateFrom, dateTo]),
  ]);

  const revenue = parseFloat(revenueResult.rows[0].revenue);
  const expenses = parseFloat(expenseResult.rows[0].expenses);
  const profit = revenue - expenses;

  return {
    revenue,
    expenses,
    profit,
    profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
}

async function getFinancialSummary(dateFrom: string, dateTo: string, buildingFilter: string) {
  const data = await getFinancialSummaryData(dateFrom, dateTo, buildingFilter);
  return NextResponse.json({ success: true, data });
}

// Maintenance Stats
async function getMaintenanceStatsData(dateFrom: string, dateTo: string, buildingFilter: string) {
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE mr.status = 'pending') as pending,
      COUNT(*) FILTER (WHERE mr.status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE mr.status = 'completed') as completed
    FROM maintenance_requests mr
    LEFT JOIN rooms r ON mr.room_id = r.id
    WHERE mr.request_date BETWEEN $1 AND $2
      ${buildingFilter.replace('building_id', 'r.building_id')}
  `;
  
  const result = await pool.query(query, [dateFrom, dateTo]);
  const row = result.rows[0];
  
  return {
    total: parseInt(row.total),
    pending: parseInt(row.pending || 0),
    inProgress: parseInt(row.in_progress || 0),
    completed: parseInt(row.completed || 0),
  };
}

async function getMaintenanceStats(dateFrom: string, dateTo: string, buildingFilter: string) {
  const data = await getMaintenanceStatsData(dateFrom, dateTo, buildingFilter);
  return NextResponse.json({ success: true, data });
}

// Asset Utilization
async function getAssetUtilizationData(buildingFilter: string) {
  const query = `
    SELECT 
      a.asset_type,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE a.asset_status = 'assigned') as assigned,
      COUNT(*) FILTER (WHERE a.asset_status = 'available') as available,
      COUNT(*) FILTER (WHERE a.asset_status = 'maintenance') as maintenance
    FROM assets a
    WHERE a.is_active = true ${buildingFilter.replace('building_id', 'a.building_id')}
    GROUP BY a.asset_type
    ORDER BY total DESC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => ({
    category: row.asset_type,
    total: parseInt(row.total),
    assigned: parseInt(row.assigned || 0),
    available: parseInt(row.available || 0),
    maintenance: parseInt(row.maintenance || 0),
    utilizationRate: parseInt(row.total) > 0 
      ? (parseInt(row.assigned || 0) / parseInt(row.total)) * 100 
      : 0,
  }));
}

async function getAssetUtilization(buildingFilter: string) {
  const data = await getAssetUtilizationData(buildingFilter);
  return NextResponse.json({ success: true, data });
}
