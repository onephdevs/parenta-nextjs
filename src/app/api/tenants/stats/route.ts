import { NextResponse } from 'next/server';
import { getTenantStats } from '../../../../lib/api/tenants';

export async function GET() {
  try {
    const stats = await getTenantStats();
    
    return NextResponse.json({
      success: true,
      data: {
        totalTenants: parseInt(stats.total_tenants) || 0,
        activeTenants: parseInt(stats.active_tenants) || 0,
        pendingTenants: parseInt(stats.pending_tenants) || 0,
        inactiveTenants: parseInt(stats.inactive_tenants) || 0,
        terminatedTenants: parseInt(stats.terminated_tenants) || 0,
        averageIncome: parseFloat(stats.average_income) || 0,
        averageDeposit: parseFloat(stats.average_deposit) || 0,
        occupancyRate: stats.total_tenants > 0 ? 
          Math.round((stats.active_tenants / stats.total_tenants) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Tenant stats API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tenant statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 