import { NextResponse } from 'next/server';
import { getBuildingStats, getOccupancyStats } from '@/lib/api/buildings';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Get building and occupancy stats
    const [buildingStats, occupancyStats] = await Promise.all([
      getBuildingStats(),
      getOccupancyStats()
    ]);
    
    // Get tenant stats
    const tenantStatsQuery = `
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(*) FILTER (WHERE tenant_status = 'active') as active_tenants,
        COUNT(*) FILTER (WHERE tenant_status = 'pending') as pending_tenants
      FROM tenants 
      WHERE is_active = true
    `;
    
    const tenantStatsResult = await pool.query(tenantStatsQuery);
    const tenantStats = tenantStatsResult.rows[0];
    
    // Get financial stats (basic for now)
    const financialStatsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_payments,
        COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payments,
        COUNT(*) FILTER (WHERE payment_status = 'overdue') as overdue_payments,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'pending'), 0) as pending_revenue
      FROM payments
    `;
    
    const financialStatsResult = await pool.query(financialStatsQuery);
    const financialStats = financialStatsResult.rows[0];
    
    // Calculate additional metrics
    const occupancyRate = parseFloat(occupancyStats.occupancy_rate || '0');
    const activeTenantsCount = parseInt(tenantStats.active_tenants || '0');
    const totalRevenue = parseFloat(financialStats.total_revenue || '0');
    
    return NextResponse.json({
      success: true,
      data: {
        buildings: {
          total: parseInt(buildingStats.total_buildings || '0'),
          active: parseInt(buildingStats.active_buildings || '0'),
          totalUnits: parseInt(buildingStats.total_units || '0'),
          activeUnits: parseInt(buildingStats.active_units || '0')
        },
        rooms: {
          total: parseInt(occupancyStats.total_rooms || '0'),
          occupied: parseInt(occupancyStats.occupied_rooms || '0'),
          vacant: parseInt(occupancyStats.vacant_rooms || '0'),
          maintenance: parseInt(occupancyStats.maintenance_rooms || '0'),
          occupancyRate: occupancyRate
        },
        tenants: {
          total: parseInt(tenantStats.total_tenants || '0'),
          active: activeTenantsCount,
          pending: parseInt(tenantStats.pending_tenants || '0')
        },
        financial: {
          totalPayments: parseInt(financialStats.total_payments || '0'),
          paidPayments: parseInt(financialStats.paid_payments || '0'),
          pendingPayments: parseInt(financialStats.pending_payments || '0'),
          overduePayments: parseInt(financialStats.overdue_payments || '0'),
          totalRevenue: totalRevenue,
          pendingRevenue: parseFloat(financialStats.pending_revenue || '0')
        },
        summary: {
          occupancyRate: occupancyRate,
          activeBuildings: parseInt(buildingStats.active_buildings || '0'),
          activeTenants: activeTenantsCount,
          monthlyRevenue: totalRevenue
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 