import { NextRequest, NextResponse } from 'next/server';
import { getAssetStats, getAssetUtilizationMetrics, getMaintenanceSchedule } from '@/lib/api/assets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        const stats = await getAssetStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'utilization':
        const utilization = await getAssetUtilizationMetrics();
        return NextResponse.json({
          success: true,
          data: utilization
        });

      case 'maintenance':
        const maintenance = await getMaintenanceSchedule();
        return NextResponse.json({
          success: true,
          data: maintenance
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid stats type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching asset stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch asset statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 