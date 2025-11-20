import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUpcomingDueDates, getTopTenantsByPayments, getInvoiceStatusBreakdown } from '@/lib/services/dashboard-service';

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
    const days = parseInt(searchParams.get('days') || '30');
    const includeTopTenants = searchParams.get('tenants') === 'true';
    const includeBreakdown = searchParams.get('breakdown') === 'true';

    const upcoming = await getUpcomingDueDates(days);
    const topTenants = includeTopTenants ? await getTopTenantsByPayments(5) : null;
    const breakdown = includeBreakdown ? await getInvoiceStatusBreakdown() : null;

    return NextResponse.json({
      success: true,
      data: {
        upcoming,
        ...(topTenants && { topTenants }),
        ...(breakdown && { breakdown })
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming due dates:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch upcoming due dates' 
      },
      { status: 500 }
    );
  }
}

