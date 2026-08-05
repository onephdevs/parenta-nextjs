import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateRevenueReportExcel,
  generatePaymentHistoryReportExcel,
  generateOccupancyReportExcel,
  generateExpenseReportExcel,
  generateBillsExpensesReportExcel,
  generateTenantListReportExcel,
  generateCollectedAmountReportExcel,
  generateDepositReportExcel,
  generateVacantRoomsReportExcel
} from '@/lib/services/excel-export-service';

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

    let excelBuffer: Buffer;

    switch (reportType) {
      case 'revenue':
        excelBuffer = await generateRevenueReportExcel(data);
        break;
      case 'payments':
        excelBuffer = await generatePaymentHistoryReportExcel(data);
        break;
      case 'occupancy':
        excelBuffer = await generateOccupancyReportExcel(data);
        break;
      case 'expenses':
        excelBuffer = await generateExpenseReportExcel(data);
        break;
      case 'bills-expenses':
        excelBuffer = await generateBillsExpensesReportExcel(data);
        break;
      case 'tenant-list':
        excelBuffer = await generateTenantListReportExcel(data);
        break;
      case 'collected-amount':
        excelBuffer = await generateCollectedAmountReportExcel(data);
        break;
      case 'deposits':
        excelBuffer = await generateDepositReportExcel(data);
        break;
      case 'vacant-rooms':
        excelBuffer = await generateVacantRoomsReportExcel(data);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    const defaultFilename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename || defaultFilename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate Excel' 
      },
      { status: 500 }
    );
  }
}

