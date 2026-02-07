import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateFinancialReport,
  getRevenueByCategory,
  getExpenseByCategory,
  getMonthlyTrends,
  getOutstandingBalances,
} from '@/lib/api/financial-reports';
import { generateFinancialReportExcel } from '@/lib/services/excel-export-service';

/**
 * GET /api/reports/financial/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=xlsx
 * Exports the financial report for the given period as Excel.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const [financialReport, revenueByCategory, expenseByCategory, monthlyTrends, outstandingBalances] =
      await Promise.all([
        generateFinancialReport(startDate, endDate),
        getRevenueByCategory(startDate, endDate),
        getExpenseByCategory(startDate, endDate),
        getMonthlyTrends(6),
        getOutstandingBalances(),
      ]);

    if (format !== 'xlsx') {
      return NextResponse.json(
        { error: 'Only format=xlsx is supported for financial report export' },
        { status: 400 }
      );
    }

    const buffer = await generateFinancialReportExcel({
      financialReport: {
        ...financialReport,
        period: {
          start: financialReport.period.start,
          end: financialReport.period.end,
        },
      },
      revenueByCategory,
      expenseByCategory,
      monthlyTrends,
      outstandingBalances,
    });

    const filename = `financial-report-${startDate}-to-${endDate}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Financial report export error:', error);
    return NextResponse.json(
      { error: 'Failed to export financial report' },
      { status: 500 }
    );
  }
}
