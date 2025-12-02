import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCollectedAmountReport } from '@/lib/services/reports-service';

/**
 * GET /api/reports/collected-amount
 * Generate collected amount report
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
    const startDate = searchParams.get('startDate') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const periodType = (searchParams.get('periodType') || 'monthly') as 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
    
    const reportData = await generateCollectedAmountReport(startDate, endDate, periodType);
    
    return NextResponse.json({
      success: true,
      data: reportData,
    });
    
  } catch (error) {
    console.error('Error generating collected amount report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate collected amount report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
