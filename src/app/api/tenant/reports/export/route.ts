import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { generatePaymentHistoryReportExcel } from '@/lib/services/excel-export-service';
import { generatePaymentHistoryReportPDF } from '@/lib/services/pdf-export-service';
import pool from '@/lib/db';

/**
 * POST /api/tenant/reports/export
 * Export tenant reports as Excel or PDF
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);
    
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const { reportType, format, dateFrom, dateTo } = body;
    
    if (!reportType || !format) {
      return NextResponse.json(
        {
          success: false,
          error: 'Report type and format are required',
        },
        { status: 400 }
      );
    }
    
    // Get report data
    const startDate = dateFrom || '2020-01-01';
    const endDate = dateTo || new Date().toISOString().split('T')[0];
    
    let reportData: any;
    let filename: string;
    
    if (reportType === 'payments') {
      // Fetch payment history
      const paymentQuery = `
        SELECT 
          p.id,
          p.amount,
          p.payment_type,
          p.payment_method,
          p.payment_date,
          p.due_date,
          p.payment_status,
          p.reference_number,
          p.notes,
          r.room_number,
          b.name as building_name,
          STRING_AGG(DISTINCT i.invoice_number, ', ') as invoice_numbers
        FROM payments p
        LEFT JOIN rooms r ON p.room_id = r.id
        LEFT JOIN buildings b ON r.building_id = b.id
        LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
        LEFT JOIN invoices i ON i.id = pa.invoice_id
        WHERE p.tenant_id = $1
          AND p.payment_date BETWEEN $2 AND $3
        GROUP BY p.id, p.amount, p.payment_type, p.payment_method, p.payment_date, 
                 p.due_date, p.payment_status, p.reference_number, p.notes,
                 r.room_number, b.name
        ORDER BY p.payment_date DESC
      `;
      
      const paymentResult = await pool.query(paymentQuery, [tenant.id, startDate, endDate]);
      
      const summary = paymentResult.rows.reduce((acc, row) => {
        acc.totalPayments += 1;
        acc.totalAmount += parseFloat(row.amount || 0);
        if (row.payment_status === 'paid') {
          acc.paidAmount += parseFloat(row.amount || 0);
        }
        return acc;
      }, { totalPayments: 0, totalAmount: 0, paidAmount: 0 });
      
      reportData = {
        summary: {
          ...summary,
          period: `${startDate} to ${endDate}`,
          tenantName: `${tenant.first_name} ${tenant.last_name}`,
        },
        payments: paymentResult.rows.map(row => ({
          paymentDate: row.payment_date,
          amount: parseFloat(row.amount || 0),
          paymentMethod: row.payment_method,
          paymentType: row.payment_type,
          status: row.payment_status,
          referenceNumber: row.reference_number,
          roomNumber: row.room_number,
          buildingName: row.building_name,
          invoiceNumbers: row.invoice_numbers,
        })),
      };
      
      filename = `payment-history-${startDate}-to-${endDate}`;
    } else if (reportType === 'invoices') {
      // Fetch invoice history
      const invoiceQuery = `
        SELECT 
          i.id,
          i.invoice_number,
          i.issue_date,
          i.due_date,
          i.total_amount,
          i.amount_paid,
          i.balance_due,
          i.invoice_status,
          r.room_number,
          b.name as building_name
        FROM invoices i
        LEFT JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
        LEFT JOIN rooms r ON tra.room_id = r.id
        LEFT JOIN buildings b ON r.building_id = b.id
        WHERE i.tenant_id = $1
          AND i.issue_date BETWEEN $2 AND $3
        ORDER BY i.issue_date DESC
      `;
      
      const invoiceResult = await pool.query(invoiceQuery, [tenant.id, startDate, endDate]);
      
      const summary = invoiceResult.rows.reduce((acc, row) => {
        acc.totalInvoices += 1;
        acc.totalAmount += parseFloat(row.total_amount || 0);
        acc.paidAmount += parseFloat(row.amount_paid || 0);
        acc.outstandingAmount += parseFloat(row.balance_due || 0);
        return acc;
      }, { totalInvoices: 0, totalAmount: 0, paidAmount: 0, outstandingAmount: 0 });
      
      reportData = {
        summary: {
          ...summary,
          period: `${startDate} to ${endDate}`,
          tenantName: `${tenant.first_name} ${tenant.last_name}`,
        },
        invoices: invoiceResult.rows.map(row => ({
          invoiceNumber: row.invoice_number,
          issueDate: row.issue_date,
          dueDate: row.due_date,
          totalAmount: parseFloat(row.total_amount || 0),
          amountPaid: parseFloat(row.amount_paid || 0),
          balanceDue: parseFloat(row.balance_due || 0),
          status: row.invoice_status,
          roomNumber: row.room_number,
          buildingName: row.building_name,
        })),
      };
      
      filename = `invoice-history-${startDate}-to-${endDate}`;
      
      // For invoices, use payment history format (similar structure)
      // In production, you might want a dedicated invoice export function
      reportData = {
        summary: {
          ...summary,
          period: `${startDate} to ${endDate}`,
          tenantName: `${tenant.first_name} ${tenant.last_name}`,
          totalPayments: summary.totalInvoices, // Map to payment format
        },
        payments: invoiceResult.rows.map(row => ({
          paymentDate: row.issue_date,
          amount: parseFloat(row.total_amount || 0),
          paymentMethod: 'invoice',
          paymentType: 'rent',
          status: row.invoice_status,
          referenceNumber: row.invoice_number,
          roomNumber: row.room_number,
          buildingName: row.building_name,
        })),
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid report type',
        },
        { status: 400 }
      );
    }
    
    // Generate export file
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;
    
    if (format === 'excel') {
      fileBuffer = await generatePaymentHistoryReportExcel(reportData);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else if (format === 'pdf') {
      fileBuffer = await generatePaymentHistoryReportPDF(reportData);
      contentType = 'application/pdf';
      fileExtension = 'pdf';
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format. Use "excel" or "pdf"',
        },
        { status: 400 }
      );
    }
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${fileExtension}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
