import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateRevenueReportPDF,
  generatePaymentHistoryReportPDF,
  generateOccupancyReportPDF,
  generateExpenseReportPDF
} from '@/lib/services/pdf-export-service';

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
    const { reportType, data, filename } = body;

    if (!reportType || !data) {
      return NextResponse.json(
        { error: 'Report type and data are required' },
        { status: 400 }
      );
    }

    let pdfBuffer: Buffer;

    switch (reportType) {
      case 'revenue':
        pdfBuffer = await generateRevenueReportPDF(data);
        break;
      case 'payments':
        pdfBuffer = await generatePaymentHistoryReportPDF(data);
        break;
      case 'occupancy':
        pdfBuffer = await generateOccupancyReportPDF(data);
        break;
      case 'expenses':
        pdfBuffer = await generateExpenseReportPDF(data);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    const defaultFilename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || defaultFilename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate PDF' 
      },
      { status: 500 }
    );
  }
}

