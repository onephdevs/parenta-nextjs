import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateExpenseReportByPeriod } from '@/lib/services/reports-service';

/**
 * GET /api/reports/expenses
 * Generate expense report with period type (monthly, quarterly, semi-annual, annual)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const periodType = (searchParams.get('periodType') as 'monthly' | 'quarterly' | 'semi-annual' | 'annual') || 'monthly';
    const category = searchParams.get('category') || undefined;
    const buildingId = searchParams.get('buildingId') || undefined;
    const roomId = searchParams.get('roomId') || undefined;
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Validate period type
    const validPeriodTypes = ['monthly', 'quarterly', 'semi-annual', 'annual'];
    if (!validPeriodTypes.includes(periodType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period type. Must be: monthly, quarterly, semi-annual, or annual' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { success: false, error: 'endDate must be after startDate' },
        { status: 400 }
      );
    }

    const filters = {
      category,
      buildingId,
      roomId,
    };

    const reportData = await generateExpenseReportByPeriod(
      startDate,
      endDate,
      periodType,
      filters
    );
    
    return NextResponse.json({
      success: true,
      data: reportData,
    });
    
  } catch (error) {
    console.error('Error generating expense report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate expense report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
