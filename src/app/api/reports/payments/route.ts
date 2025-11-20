import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePaymentHistoryReport } from '@/lib/services/reports-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, tenantId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const report = await generatePaymentHistoryReport(startDate, endDate, tenantId);

    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating payment history report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate payment history report' 
      },
      { status: 500 }
    );
  }
}

