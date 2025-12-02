import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * GET /api/tenant/reports
 * Generate reports for tenant (payment history, invoice history, financial summary)
 */
export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;
    
    let reportData: any = {};
    
    switch (reportType) {
      case 'payments':
        // Payment history report
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
            ${dateFrom ? 'AND p.payment_date >= $2' : ''}
            ${dateTo ? `AND p.payment_date <= $${dateFrom ? '3' : '2'}` : ''}
          GROUP BY p.id, p.amount, p.payment_type, p.payment_method, p.payment_date, 
                   p.due_date, p.payment_status, p.reference_number, p.notes,
                   r.room_number, b.name
          ORDER BY p.payment_date DESC
        `;
        
        const paymentParams: any[] = [tenant.id];
        if (dateFrom) paymentParams.push(dateFrom);
        if (dateTo) paymentParams.push(dateTo);
        
        const paymentResult = await pool.query(paymentQuery, paymentParams);
        
        const paymentSummary = paymentResult.rows.reduce((acc, row) => {
          acc.totalPayments += 1;
          acc.totalAmount += parseFloat(row.amount || 0);
          if (row.payment_status === 'paid') {
            acc.paidAmount += parseFloat(row.amount || 0);
            acc.paidCount += 1;
          }
          return acc;
        }, { totalPayments: 0, totalAmount: 0, paidAmount: 0, paidCount: 0 });
        
        reportData = {
          type: 'payments',
          summary: {
            ...paymentSummary,
            period: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
          },
          payments: paymentResult.rows.map(row => ({
            id: row.id,
            amount: parseFloat(row.amount || 0),
            paymentType: row.payment_type,
            paymentMethod: row.payment_method,
            paymentDate: row.payment_date,
            dueDate: row.due_date,
            status: row.payment_status,
            referenceNumber: row.reference_number,
            notes: row.notes,
            roomNumber: row.room_number,
            buildingName: row.building_name,
            invoiceNumbers: row.invoice_numbers,
          })),
        };
        break;
        
      case 'invoices':
        // Invoice history report
        const invoiceQuery = `
          SELECT 
            i.id,
            i.invoice_number,
            i.issue_date,
            i.due_date,
            i.billing_period_start,
            i.billing_period_end,
            i.total_amount,
            i.amount_paid,
            i.balance_due,
            i.invoice_status,
            i.notes,
            r.room_number,
            b.name as building_name
          FROM invoices i
          LEFT JOIN tenants t ON i.tenant_id = t.id
          LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
          LEFT JOIN rooms r ON tra.room_id = r.id
          LEFT JOIN buildings b ON r.building_id = b.id
          WHERE i.tenant_id = $1
            ${dateFrom ? 'AND i.issue_date >= $2' : ''}
            ${dateTo ? `AND i.issue_date <= $${dateFrom ? '3' : '2'}` : ''}
          ORDER BY i.issue_date DESC
        `;
        
        const invoiceParams: any[] = [tenant.id];
        if (dateFrom) invoiceParams.push(dateFrom);
        if (dateTo) invoiceParams.push(dateTo);
        
        const invoiceResult = await pool.query(invoiceQuery, invoiceParams);
        
        const invoiceSummary = invoiceResult.rows.reduce((acc, row) => {
          acc.totalInvoices += 1;
          acc.totalAmount += parseFloat(row.total_amount || 0);
          acc.paidAmount += parseFloat(row.amount_paid || 0);
          acc.outstandingAmount += parseFloat(row.balance_due || 0);
          if (row.invoice_status === 'paid') acc.paidCount += 1;
          if (row.invoice_status === 'overdue') acc.overdueCount += 1;
          return acc;
        }, { 
          totalInvoices: 0, 
          totalAmount: 0, 
          paidAmount: 0, 
          outstandingAmount: 0,
          paidCount: 0,
          overdueCount: 0,
        });
        
        reportData = {
          type: 'invoices',
          summary: {
            ...invoiceSummary,
            period: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
          },
          invoices: invoiceResult.rows.map(row => ({
            id: row.id,
            invoiceNumber: row.invoice_number,
            issueDate: row.issue_date,
            dueDate: row.due_date,
            billingPeriodStart: row.billing_period_start,
            billingPeriodEnd: row.billing_period_end,
            totalAmount: parseFloat(row.total_amount || 0),
            amountPaid: parseFloat(row.amount_paid || 0),
            balanceDue: parseFloat(row.balance_due || 0),
            status: row.invoice_status,
            notes: row.notes,
            roomNumber: row.room_number,
            buildingName: row.building_name,
          })),
        };
        break;
        
      case 'summary':
      default:
        // Financial summary report
        const summaryQuery = `
          SELECT 
            COUNT(DISTINCT p.id) as total_payments,
            COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as total_paid,
            COUNT(DISTINCT i.id) as total_invoices,
            COALESCE(SUM(i.total_amount), 0) as total_invoiced,
            COALESCE(SUM(i.amount_paid), 0) as total_invoice_paid,
            COALESCE(SUM(i.balance_due), 0) as total_outstanding
          FROM payments p
          FULL OUTER JOIN invoices i ON i.tenant_id = p.tenant_id
          WHERE (p.tenant_id = $1 OR i.tenant_id = $1)
            ${dateFrom ? 'AND (p.payment_date >= $2 OR i.issue_date >= $2)' : ''}
            ${dateTo ? `AND (p.payment_date <= $${dateFrom ? '3' : '2'} OR i.issue_date <= $${dateFrom ? '3' : '2'})` : ''}
        `;
        
        const summaryParams: any[] = [tenant.id];
        if (dateFrom) summaryParams.push(dateFrom);
        if (dateTo) summaryParams.push(dateTo);
        
        const summaryResult = await pool.query(summaryQuery, summaryParams);
        const summary = summaryResult.rows[0];
        
        reportData = {
          type: 'summary',
          summary: {
            totalPayments: parseInt(summary.total_payments || 0),
            totalPaid: parseFloat(summary.total_paid || 0),
            totalInvoices: parseInt(summary.total_invoices || 0),
            totalInvoiced: parseFloat(summary.total_invoiced || 0),
            totalInvoicePaid: parseFloat(summary.total_invoice_paid || 0),
            totalOutstanding: parseFloat(summary.total_outstanding || 0),
            period: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All time',
          },
        };
        break;
    }
    
    return NextResponse.json({
      success: true,
      data: reportData,
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
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
