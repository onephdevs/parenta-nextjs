import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDisbursementReport } from '@/lib/services/disbursement-report';

/**
 * GET /api/reports/disbursement
 * Cash-flow waterfall: Total Collection − Expenses = Cash Allowance
 * + Cash for Deposit + Cheque payments = Grand Total
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
    const startDate =
      searchParams.get('startDate') ||
      new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString()
        .split('T')[0];
    const endDate =
      searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const buildingId = searchParams.get('buildingId');

    const reportData = await generateDisbursementReport({
      startDate,
      endDate,
      buildingId: buildingId || null,
    });

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('Error generating disbursement report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate disbursement report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
