import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateBillsExpensesReport } from '@/lib/services/bills-expenses-report';
import type {
  ReportPeriodPreset,
  ReportView,
} from '@/lib/constants/bills-expenses';

/**
 * GET /api/reports/bills-expenses
 * Combined utility bill + expense report (summary or detail)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = (searchParams.get('view') || 'summary') as ReportView;
    const periodPreset = (searchParams.get('period') ||
      'this_month') as ReportPeriodPreset;
    const buildingId = searchParams.get('buildingId') || undefined;
    const customStart = searchParams.get('startDate') || undefined;
    const customEnd = searchParams.get('endDate') || undefined;

    if (view !== 'summary' && view !== 'detail') {
      return NextResponse.json(
        { error: 'view must be summary or detail' },
        { status: 400 }
      );
    }

    const data = await generateBillsExpensesReport({
      view,
      periodPreset,
      buildingId,
      customStart,
      customEnd,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error generating bills-expenses report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
