import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllDashboardMetrics } from '@/lib/services/dashboard-service';
import {
  cacheGet,
  cacheSet,
  DASHBOARD_METRICS_KEY,
  DASHBOARD_TTL_MS,
} from '@/lib/cache/memory-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const cached = cacheGet<Awaited<ReturnType<typeof getAllDashboardMetrics>>>(
      DASHBOARD_METRICS_KEY
    );
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const metrics = await getAllDashboardMetrics();
    cacheSet(DASHBOARD_METRICS_KEY, metrics, DASHBOARD_TTL_MS);

    return NextResponse.json({
      success: true,
      data: metrics,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard metrics' 
      },
      { status: 500 }
    );
  }
}

