import pool from '@/lib/db';
import {
  AnalyticsFilter,
  FinancialMetrics,
  FinancialTrend,
  CashFlowData,
  OccupancyMetrics,
  OccupancyTrend,
  TenantMetrics,
  TenantDemographics,
  UtilityMetrics,
  UtilityTrend,
  AssetMetrics,
  MaintenanceAnalytics,
  BuildingPerformance,
  DashboardMetrics,
  AnalyticsPeriodComparison
} from '../../types/analytics';

// Utility function to format date for SQL
const formatDateForSQL = (date: string): string => {
  return new Date(date).toISOString().split('T')[0];
};

// Financial Analytics
export async function getFinancialMetrics(filters: AnalyticsFilter): Promise<FinancialMetrics> {
  const client = await pool.connect();
  try {
    const { buildingId, dateRange } = filters;
    const buildingFilter = buildingId ? 'AND r.building_id = $3' : '';
    const params = [formatDateForSQL(dateRange.startDate), formatDateForSQL(dateRange.endDate)];
    if (buildingId) params.push(buildingId);

    const query = `
      WITH financial_summary AS (
        SELECT 
          COALESCE(SUM(CASE WHEN p.type = 'rent' THEN p.amount ELSE 0 END), 0) as occupancy_revenue,
          COALESCE(SUM(CASE WHEN p.type = 'utility' THEN p.amount ELSE 0 END), 0) as utility_revenue,
          COALESCE(SUM(CASE WHEN p.type NOT IN ('rent', 'utility') THEN p.amount ELSE 0 END), 0) as other_revenue,
          COALESCE(SUM(CASE WHEN ub.bill_type = 'operating' THEN ub.amount ELSE 0 END), 0) as operating_expenses,
          COALESCE(SUM(CASE WHEN mr.cost IS NOT NULL THEN mr.cost ELSE 0 END), 0) as maintenance_expenses,
          COALESCE(SUM(CASE WHEN ub.bill_type = 'utility' THEN ub.amount ELSE 0 END), 0) as utility_expenses
        FROM rooms r
        LEFT JOIN leases l ON r.id = l.room_id
        LEFT JOIN payments p ON l.id = p.lease_id AND p.payment_date BETWEEN $1 AND $2
        LEFT JOIN utility_bills ub ON r.building_id = ub.building_id AND ub.bill_date BETWEEN $1 AND $2
        LEFT JOIN maintenance_requests mr ON r.id = mr.room_id AND mr.completed_date BETWEEN $1 AND $2
        WHERE 1=1 ${buildingFilter}
      )
      SELECT 
        occupancy_revenue,
        utility_revenue,
        other_revenue,
        (occupancy_revenue + utility_revenue + other_revenue) as total_revenue,
        operating_expenses,
        maintenance_expenses,
        utility_expenses,
        (operating_expenses + maintenance_expenses + utility_expenses) as total_expenses,
        (occupancy_revenue + utility_revenue + other_revenue - operating_expenses - maintenance_expenses - utility_expenses) as net_income
      FROM financial_summary;
    `;

    const result = await client.query(query, params);
    const data = result.rows[0];

    const totalRevenue = parseFloat(data.total_revenue) || 0;
    const totalExpenses = parseFloat(data.total_expenses) || 0;
    const netIncome = parseFloat(data.net_income) || 0;
    
    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      occupancyRevenue: parseFloat(data.occupancy_revenue) || 0,
      utilityRevenue: parseFloat(data.utility_revenue) || 0,
      otherRevenue: parseFloat(data.other_revenue) || 0,
      operatingExpenses: parseFloat(data.operating_expenses) || 0,
      maintenanceExpenses: parseFloat(data.maintenance_expenses) || 0,
      utilityExpenses: parseFloat(data.utility_expenses) || 0,
      profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      roi: totalExpenses > 0 ? (netIncome / totalExpenses) * 100 : 0
    };
  } finally {
    client.release();
  }
}

export async function getFinancialTrends(filters: AnalyticsFilter): Promise<FinancialTrend[]> {
  const client = await pool.connect();
  try {
    const { buildingId, dateRange, period } = filters;
    const buildingFilter = buildingId ? 'AND r.building_id = $3' : '';
    const params = [formatDateForSQL(dateRange.startDate), formatDateForSQL(dateRange.endDate)];
    if (buildingId) params.push(buildingId);

    let dateGrouping: string;
    switch (period) {
      case 'monthly':
        dateGrouping = "DATE_TRUNC('month', p.payment_date)";
        break;
      case 'quarterly':
        dateGrouping = "DATE_TRUNC('quarter', p.payment_date)";
        break;
      case 'yearly':
        dateGrouping = "DATE_TRUNC('year', p.payment_date)";
        break;
      default:
        dateGrouping = "DATE_TRUNC('month', p.payment_date)";
    }

    const query = `
      WITH monthly_data AS (
        SELECT 
          ${dateGrouping} as period,
          COALESCE(SUM(p.amount), 0) as revenue,
          COALESCE(
            (SELECT SUM(ub.amount) 
             FROM utility_bills ub 
             WHERE ${dateGrouping.replace('p.payment_date', 'ub.bill_date')} = ${dateGrouping}
             ${buildingId ? 'AND ub.building_id = $3' : ''}), 0
          ) as expenses
        FROM rooms r
        LEFT JOIN leases l ON r.id = l.room_id
        LEFT JOIN payments p ON l.id = p.lease_id 
          AND p.payment_date BETWEEN $1 AND $2
        WHERE 1=1 ${buildingFilter}
        GROUP BY ${dateGrouping}
        ORDER BY period
      )
      SELECT 
        period::date as date,
        revenue,
        expenses,
        (revenue - expenses) as net_income,
        CASE 
          WHEN revenue > 0 THEN ((revenue - expenses) / revenue) * 100 
          ELSE 0 
        END as profit_margin
      FROM monthly_data
      WHERE period IS NOT NULL;
    `;

    const result = await client.query(query, params);
    
    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      revenue: parseFloat(row.revenue) || 0,
      expenses: parseFloat(row.expenses) || 0,
      netIncome: parseFloat(row.net_income) || 0,
      profitMargin: parseFloat(row.profit_margin) || 0
    }));
  } finally {
    client.release();
  }
}

export async function getCashFlowData(filters: AnalyticsFilter): Promise<CashFlowData[]> {
  const client = await pool.connect();
  try {
    const { buildingId, dateRange } = filters;
    const buildingFilter = buildingId ? 'AND r.building_id = $3' : '';
    const params = [formatDateForSQL(dateRange.startDate), formatDateForSQL(dateRange.endDate)];
    if (buildingId) params.push(buildingId);

    const query = `
      WITH daily_flows AS (
        SELECT 
          p.payment_date as date,
          SUM(p.amount) as inflow,
          0 as outflow
        FROM rooms r
        LEFT JOIN leases l ON r.id = l.room_id
        LEFT JOIN payments p ON l.id = p.lease_id
        WHERE p.payment_date BETWEEN $1 AND $2 ${buildingFilter}
        GROUP BY p.payment_date
        
        UNION ALL
        
        SELECT 
          ub.bill_date as date,
          0 as inflow,
          SUM(ub.amount) as outflow
        FROM utility_bills ub
        WHERE ub.bill_date BETWEEN $1 AND $2 ${buildingId ? 'AND ub.building_id = $3' : ''}
        GROUP BY ub.bill_date
      ),
      aggregated_flows AS (
        SELECT 
          date,
          SUM(inflow) as inflow,
          SUM(outflow) as outflow,
          (SUM(inflow) - SUM(outflow)) as net_flow
        FROM daily_flows
        WHERE date IS NOT NULL
        GROUP BY date
        ORDER BY date
      )
      SELECT 
        date,
        inflow,
        outflow,
        net_flow,
        SUM(net_flow) OVER (ORDER BY date) as cumulative_flow
      FROM aggregated_flows;
    `;

    const result = await client.query(query, params);
    
    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      inflow: parseFloat(row.inflow) || 0,
      outflow: parseFloat(row.outflow) || 0,
      netFlow: parseFloat(row.net_flow) || 0,
      cumulativeFlow: parseFloat(row.cumulative_flow) || 0
    }));
  } finally {
    client.release();
  }
}

// Occupancy Analytics
export async function getOccupancyMetrics(filters: AnalyticsFilter): Promise<OccupancyMetrics> {
  const client = await pool.connect();
  try {
    const { buildingId } = filters;
    const buildingFilter = buildingId ? 'WHERE r.building_id = $1' : '';
    const params = buildingId ? [buildingId] : [];

    const query = `
      WITH occupancy_stats AS (
        SELECT 
          COUNT(r.id) as total_units,
          COUNT(CASE WHEN l.id IS NOT NULL AND l.status = 'active' THEN 1 END) as occupied_units,
          COUNT(CASE WHEN l.id IS NULL OR l.status != 'active' THEN 1 END) as vacant_units,
          AVG(CASE WHEN l.monthly_rent IS NOT NULL THEN l.monthly_rent ELSE 0 END) as average_rent,
          SUM(r.square_feet) as total_rentable_area,
          AVG(CASE 
            WHEN l.start_date IS NOT NULL AND l.end_date IS NOT NULL 
            THEN EXTRACT(DAYS FROM (l.end_date - l.start_date))
            ELSE 0 
          END) as average_occupancy_duration
        FROM rooms r
        LEFT JOIN leases l ON r.id = l.room_id AND l.status = 'active'
        ${buildingFilter}
      )
      SELECT 
        total_units,
        occupied_units,
        vacant_units,
        CASE 
          WHEN total_units > 0 THEN (occupied_units::float / total_units::float) * 100 
          ELSE 0 
        END as occupancy_rate,
        average_rent,
        total_rentable_area,
        average_occupancy_duration
      FROM occupancy_stats;
    `;

    const result = await client.query(query, params);
    const data = result.rows[0];

    return {
      totalUnits: parseInt(data.total_units) || 0,
      occupiedUnits: parseInt(data.occupied_units) || 0,
      vacantUnits: parseInt(data.vacant_units) || 0,
      occupancyRate: parseFloat(data.occupancy_rate) || 0,
      averageRent: parseFloat(data.average_rent) || 0,
      totalRentableArea: parseFloat(data.total_rentable_area) || 0,
      averageOccupancyDuration: parseFloat(data.average_occupancy_duration) || 0
    };
  } finally {
    client.release();
  }
}

export async function getOccupancyTrends(filters: AnalyticsFilter): Promise<OccupancyTrend[]> {
  const client = await pool.connect();
  try {
    const { buildingId, dateRange, period } = filters;
    const buildingFilter = buildingId ? 'AND r.building_id = $3' : '';
    const params = [formatDateForSQL(dateRange.startDate), formatDateForSQL(dateRange.endDate)];
    if (buildingId) params.push(buildingId);

    let dateGrouping: string;
    switch (period) {
      case 'monthly':
        dateGrouping = "DATE_TRUNC('month', l.start_date)";
        break;
      case 'quarterly':
        dateGrouping = "DATE_TRUNC('quarter', l.start_date)";
        break;
      case 'yearly':
        dateGrouping = "DATE_TRUNC('year', l.start_date)";
        break;
      default:
        dateGrouping = "DATE_TRUNC('month', l.start_date)";
    }

    const query = `
      WITH period_stats AS (
        SELECT 
          ${dateGrouping} as period,
          COUNT(DISTINCT r.id) as total_units,
          COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as occupied_units,
          COUNT(DISTINCT CASE WHEN l.created_at BETWEEN $1 AND $2 THEN l.id END) as new_leases,
          COUNT(DISTINCT CASE WHEN l.renewed_at BETWEEN $1 AND $2 THEN l.id END) as renewals,
          COUNT(DISTINCT CASE WHEN l.status = 'terminated' AND l.end_date BETWEEN $1 AND $2 THEN l.id END) as vacancies
        FROM rooms r
        LEFT JOIN leases l ON r.id = l.room_id
        WHERE l.start_date BETWEEN $1 AND $2 ${buildingFilter}
        GROUP BY ${dateGrouping}
        ORDER BY period
      )
      SELECT 
        period::date as date,
        total_units,
        occupied_units,
        CASE 
          WHEN total_units > 0 THEN (occupied_units::float / total_units::float) * 100 
          ELSE 0 
        END as occupancy_rate,
        new_leases,
        renewals,
        vacancies
      FROM period_stats
      WHERE period IS NOT NULL;
    `;

    const result = await client.query(query, params);
    
    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      occupancyRate: parseFloat(row.occupancy_rate) || 0,
      totalUnits: parseInt(row.total_units) || 0,
      occupiedUnits: parseInt(row.occupied_units) || 0,
      newLeases: parseInt(row.new_leases) || 0,
      renewals: parseInt(row.renewals) || 0,
      vacancies: parseInt(row.vacancies) || 0
    }));
  } finally {
    client.release();
  }
}

// Tenant Analytics
export async function getTenantMetrics(filters: AnalyticsFilter): Promise<TenantMetrics> {
  const client = await pool.connect();
  try {
    const { buildingId } = filters;
    const buildingFilter = buildingId ? 'AND r.building_id = $1' : '';
    const params = buildingId ? [buildingId] : [];

    const query = `
      WITH tenant_stats AS (
        SELECT 
          COUNT(DISTINCT t.id) as total_tenants,
          COUNT(DISTINCT CASE WHEN l.status = 'active' THEN t.id END) as active_tenants,
          COUNT(DISTINCT CASE WHEN l.status != 'active' OR l.id IS NULL THEN t.id END) as inactive_tenants,
          AVG(CASE 
            WHEN l.start_date IS NOT NULL AND l.end_date IS NOT NULL 
            THEN EXTRACT(DAYS FROM (l.end_date - l.start_date))
            ELSE 0 
          END) as average_lease_length,
          AVG(CASE WHEN l.monthly_rent IS NOT NULL THEN l.monthly_rent ELSE 0 END) as average_rent
        FROM tenants t
        LEFT JOIN leases l ON t.id = l.tenant_id
        LEFT JOIN rooms r ON l.room_id = r.id
        WHERE 1=1 ${buildingFilter}
      ),
      retention_stats AS (
        SELECT 
          COUNT(CASE WHEN l.renewed_at IS NOT NULL THEN 1 END)::float / 
          NULLIF(COUNT(CASE WHEN l.end_date < CURRENT_DATE THEN 1 END)::float, 0) * 100 as retention_rate
        FROM leases l
        LEFT JOIN rooms r ON l.room_id = r.id
        WHERE 1=1 ${buildingFilter}
      )
      SELECT 
        ts.total_tenants,
        ts.active_tenants,
        ts.inactive_tenants,
        ts.average_lease_length,
        COALESCE(rs.retention_rate, 0) as tenant_retention_rate,
        ts.average_rent
      FROM tenant_stats ts
      CROSS JOIN retention_stats rs;
    `;

    const result = await client.query(query, params);
    const data = result.rows[0];

    return {
      totalTenants: parseInt(data.total_tenants) || 0,
      activeTenants: parseInt(data.active_tenants) || 0,
      inactiveTenants: parseInt(data.inactive_tenants) || 0,
      averageLeaseLength: parseFloat(data.average_lease_length) || 0,
      tenantRetentionRate: parseFloat(data.tenant_retention_rate) || 0,
      averageRent: parseFloat(data.average_rent) || 0
    };
  } finally {
    client.release();
  }
}

export async function getTenantDemographics(filters: AnalyticsFilter): Promise<TenantDemographics> {
  const client = await pool.connect();
  try {
    const { buildingId } = filters;
    const buildingFilter = buildingId ? 'AND r.building_id = $1' : '';
    const params = buildingId ? [buildingId] : [];

    // Age groups
    const ageQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.date_of_birth)) < 25 THEN '18-24'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.date_of_birth)) < 35 THEN '25-34'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.date_of_birth)) < 45 THEN '35-44'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.date_of_birth)) < 55 THEN '45-54'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.date_of_birth)) < 65 THEN '55-64'
          ELSE '65+'
        END as age_group,
        COUNT(*) as count
      FROM tenants t
      LEFT JOIN leases l ON t.id = l.tenant_id
      LEFT JOIN rooms r ON l.room_id = r.id
      WHERE t.date_of_birth IS NOT NULL ${buildingFilter}
      GROUP BY age_group
      ORDER BY age_group;
    `;

    // Lease types
    const leaseQuery = `
      SELECT 
        l.lease_type as type,
        COUNT(*) as count
      FROM leases l
      LEFT JOIN rooms r ON l.room_id = r.id
      WHERE l.status = 'active' ${buildingFilter}
      GROUP BY l.lease_type
      ORDER BY count DESC;
    `;

    // Payment status
    const paymentQuery = `
      WITH latest_payments AS (
        SELECT DISTINCT ON (l.tenant_id)
          l.tenant_id,
          CASE 
            WHEN p.payment_date IS NULL THEN 'No Payments'
            WHEN p.payment_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'Current'
            WHEN p.payment_date >= CURRENT_DATE - INTERVAL '60 days' THEN 'Late'
            ELSE 'Overdue'
          END as payment_status
        FROM leases l
        LEFT JOIN payments p ON l.id = p.lease_id
        LEFT JOIN rooms r ON l.room_id = r.id
        WHERE l.status = 'active' ${buildingFilter}
        ORDER BY l.tenant_id, p.payment_date DESC NULLS LAST
      )
      SELECT 
        payment_status as status,
        COUNT(*) as count
      FROM latest_payments
      GROUP BY payment_status
      ORDER BY count DESC;
    `;

    // Tenant duration
    const durationQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(DAYS FROM (CURRENT_DATE - l.start_date)) < 90 THEN '0-3 months'
          WHEN EXTRACT(DAYS FROM (CURRENT_DATE - l.start_date)) < 180 THEN '3-6 months'
          WHEN EXTRACT(DAYS FROM (CURRENT_DATE - l.start_date)) < 365 THEN '6-12 months'
          WHEN EXTRACT(DAYS FROM (CURRENT_DATE - l.start_date)) < 730 THEN '1-2 years'
          ELSE '2+ years'
        END as duration,
        COUNT(*) as count
      FROM leases l
      LEFT JOIN rooms r ON l.room_id = r.id
      WHERE l.status = 'active' ${buildingFilter}
      GROUP BY duration
      ORDER BY 
        CASE duration
          WHEN '0-3 months' THEN 1
          WHEN '3-6 months' THEN 2
          WHEN '6-12 months' THEN 3
          WHEN '1-2 years' THEN 4
          WHEN '2+ years' THEN 5
        END;
    `;

    const [ageResult, leaseResult, paymentResult, durationResult] = await Promise.all([
      client.query(ageQuery, params),
      client.query(leaseQuery, params),
      client.query(paymentQuery, params),
      client.query(durationQuery, params)
    ]);

    return {
      ageGroups: ageResult.rows.map(row => ({ label: row.age_group, count: parseInt(row.count) })),
      leaseTypes: leaseResult.rows.map(row => ({ type: row.type, count: parseInt(row.count) })),
      paymentStatus: paymentResult.rows.map(row => ({ status: row.status, count: parseInt(row.count) })),
      tenantDuration: durationResult.rows.map(row => ({ duration: row.duration, count: parseInt(row.count) }))
    };
  } finally {
    client.release();
  }
}

// Utility Analytics
export async function getUtilityMetrics(filters: AnalyticsFilter): Promise<UtilityMetrics> {
  const client = await pool.connect();
  try {
    const { buildingId, dateRange } = filters;
    const buildingFilter = buildingId ? 'AND ub.building_id = $3' : '';
    const params = [formatDateForSQL(dateRange.startDate), formatDateForSQL(dateRange.endDate)];
    if (buildingId) params.push(buildingId);

    const query = `
      WITH utility_stats AS (
        SELECT 
          ub.utility_type,
          SUM(ub.usage_amount) as consumption,
          SUM(ub.amount) as cost
        FROM utility_bills ub
        WHERE ub.bill_date BETWEEN $1 AND $2 ${buildingFilter}
        GROUP BY ub.utility_type
      ),
      totals AS (
        SELECT 
          SUM(consumption) as total_consumption,
          SUM(cost) as total_cost,
          COUNT(DISTINCT 
            CASE WHEN buildingId IS NOT NULL 
            THEN ub.building_id 
            ELSE (SELECT COUNT(*) FROM buildings) 
            END
          ) as unit_count
        FROM utility_stats us
        LEFT JOIN utility_bills ub ON 1=1 ${buildingFilter}
      )
      SELECT 
        us.utility_type as type,
        us.consumption,
        us.cost,
        CASE 
          WHEN t.total_cost > 0 THEN (us.cost / t.total_cost) * 100 
          ELSE 0 
        END as percentage,
        t.total_consumption,
        t.total_cost,
        CASE 
          WHEN t.unit_count > 0 THEN t.total_cost / t.unit_count 
          ELSE 0 
        END as average_cost_per_unit
      FROM utility_stats us
      CROSS JOIN totals t
      ORDER BY us.cost DESC;
    `;

    const result = await client.query(query, params);
    
    let totalConsumption = 0;
    let totalCost = 0;
    let averageCostPerUnit = 0;
    
    if (result.rows.length > 0) {
      totalConsumption = parseFloat(result.rows[0].total_consumption) || 0;
      totalCost = parseFloat(result.rows[0].total_cost) || 0;
      averageCostPerUnit = parseFloat(result.rows[0].average_cost_per_unit) || 0;
    }

    const utilityTypes = result.rows.map(row => ({
      type: row.type,
      consumption: parseFloat(row.consumption) || 0,
      cost: parseFloat(row.cost) || 0,
      percentage: parseFloat(row.percentage) || 0
    }));

    return {
      totalConsumption,
      totalCost,
      averageCostPerUnit,
      utilityTypes
    };
  } finally {
    client.release();
  }
}

// Building Performance
export async function getBuildingPerformance(filters: AnalyticsFilter): Promise<BuildingPerformance[]> {
  const client = await pool.connect();
  try {
    const { dateRange } = filters;
    const params = [formatDateForSQL(dateRange.startDate), formatDateForSQL(dateRange.endDate)];

    const query = `
      WITH building_metrics AS (
        SELECT 
          b.id as building_id,
          b.name as building_name,
          -- Occupancy
          COUNT(r.id) as total_units,
          COUNT(CASE WHEN l.status = 'active' THEN 1 END) as occupied_units,
          -- Revenue
          COALESCE(SUM(p.amount), 0) as total_revenue,
          -- Expenses
          COALESCE(SUM(ub.amount), 0) as total_expenses,
          -- Maintenance
          COUNT(mr.id) as maintenance_requests,
          -- Average rent
          AVG(CASE WHEN l.monthly_rent > 0 THEN l.monthly_rent END) as average_rent
        FROM buildings b
        LEFT JOIN rooms r ON b.id = r.building_id AND r.is_active = true
        LEFT JOIN leases l ON r.id = l.room_id
        LEFT JOIN payments p ON l.id = p.lease_id AND p.payment_date BETWEEN $1 AND $2
        LEFT JOIN utility_bills ub ON b.id = ub.building_id AND ub.bill_date BETWEEN $1 AND $2
        LEFT JOIN maintenance_requests mr ON r.id = mr.room_id AND mr.created_at BETWEEN $1 AND $2
        WHERE b.is_active = true
        GROUP BY b.id, b.name
      )
      SELECT 
        building_id,
        building_name,
        CASE 
          WHEN total_units > 0 THEN (occupied_units::float / total_units::float) * 100 
          ELSE 0 
        END as occupancy_rate,
        total_revenue,
        total_expenses,
        (total_revenue - total_expenses) as net_income,
        CASE 
          WHEN total_expenses > 0 THEN ((total_revenue - total_expenses) / total_expenses) * 100 
          ELSE 0 
        END as roi,
        maintenance_requests,
        COALESCE(average_rent, 0) as average_rent,
        85.0 as tenant_satisfaction  -- Placeholder - would need survey data
      FROM building_metrics
      ORDER BY net_income DESC;
    `;

    const result = await client.query(query, params);
    
    return result.rows.map(row => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      occupancyRate: parseFloat(row.occupancy_rate) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      totalExpenses: parseFloat(row.total_expenses) || 0,
      netIncome: parseFloat(row.net_income) || 0,
      roi: parseFloat(row.roi) || 0,
      maintenanceRequests: parseInt(row.maintenance_requests) || 0,
      averageRent: parseFloat(row.average_rent) || 0,
      tenantSatisfaction: parseFloat(row.tenant_satisfaction) || 0
    }));
  } finally {
    client.release();
  }
}

// Dashboard Overview
export async function getDashboardMetrics(filters: AnalyticsFilter): Promise<DashboardMetrics> {
  try {
    const [
      financial,
      occupancy,
      tenant,
      utility,
      buildings
    ] = await Promise.all([
      getFinancialMetrics(filters),
      getOccupancyMetrics(filters),
      getTenantMetrics(filters),
      getUtilityMetrics(filters),
      getBuildingPerformance(filters)
    ]);

    // Placeholder asset and maintenance metrics - would need actual implementation
    const asset: AssetMetrics = {
      totalAssets: 0,
      totalValue: 0,
      maintenanceRequests: 0,
      maintenanceCosts: 0,
      depreciation: 0,
      assetUtilization: 0
    };

    const maintenance: MaintenanceAnalytics = {
      totalRequests: 0,
      completedRequests: 0,
      pendingRequests: 0,
      averageCompletionTime: 0,
      costByCategory: [],
      requestsByPriority: []
    };

    return {
      financial,
      occupancy,
      tenant,
      utility,
      asset,
      maintenance,
      buildings
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    throw error;
  }
}

// Period Comparison
export async function getPeriodComparison<T>(
  current: AnalyticsFilter,
  previous: AnalyticsFilter,
  metricFunction: (filters: AnalyticsFilter) => Promise<T>
): Promise<AnalyticsPeriodComparison> {
  try {
    const [currentData, previousData] = await Promise.all([
      metricFunction(current),
      metricFunction(previous)
    ]);

    // Calculate change (simplified - would need specific logic per metric type)
    const change = {
      value: 0,
      percentage: 0,
      direction: 'neutral' as 'up' | 'down' | 'neutral'
    };

    return {
      current: currentData,
      previous: previousData,
      change
    };
  } catch (error) {
    console.error('Error getting period comparison:', error);
    throw error;
  }
} 