import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTotalRevenue, getMonthlyRevenueTrend } from '@/lib/services/dashboard-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'month' | 'year' || 'month';
    const includeTrend = searchParams.get('trend') === 'true';

    const revenue = await getTotalRevenue(period);
    const trend = includeTrend ? await getMonthlyRevenueTrend() : null;

    return NextResponse.json({
      success: true,
      data: {
        revenue,
        ...(trend && { trend })
      }
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch revenue data' 
      },
      { status: 500 }
    );
  }
}

