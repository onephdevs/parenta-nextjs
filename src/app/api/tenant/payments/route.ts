import { NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import pool from '@/lib/db';

/**
 * GET /api/tenant/payments
 * Fetches payment schedule (upcoming invoices) and payment history for the logged-in tenant
 */
export async function GET() {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { tenant } = access;

    // Release invoices whose issue_date has arrived before building the schedule
    try {
      const { releaseDueInvoices } = await import('@/lib/services/invoice-issue-timing');
      await releaseDueInvoices();
    } catch (releaseError) {
      console.warn('Invoice release skipped:', releaseError);
    }
    
    // Fetch upcoming invoices (payment schedule)
    // Status: sent, partial, or overdue (not paid) — drafts stay hidden until issued
    const scheduleQuery = `
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
        b.name as building_name,
        b.address_line1,
        b.city
      FROM invoices i
      INNER JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE i.tenant_id = $1
        AND i.invoice_status IN ('sent', 'partial', 'overdue')
        AND i.balance_due > 0
      ORDER BY i.due_date ASC
      LIMIT 50
    `;
    
    const scheduleResult = await pool.query(scheduleQuery, [tenant.id]);
    
    // Fetch payment history (only completed/paid payments, not pending invoices)
    // Join through assignment_id to get room information, with fallback to room_id
    const historyQuery = `
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
        COALESCE(ra_r.room_number, direct_r.room_number) as room_number,
        COALESCE(ra_b.name, direct_b.name) as building_name,
        STRING_AGG(DISTINCT i.invoice_number, ', ') as invoice_numbers
      FROM payments p
      -- Join through assignment_id (preferred method)
      LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
      LEFT JOIN rooms ra_r ON ra.room_id = ra_r.id
      LEFT JOIN buildings ra_b ON ra_r.building_id = ra_b.id
      -- Fallback: direct room_id join (for older payments)
      LEFT JOIN rooms direct_r ON p.room_id = direct_r.id
      LEFT JOIN buildings direct_b ON direct_r.building_id = direct_b.id
      -- Join for invoice numbers
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      LEFT JOIN invoices i ON i.id = pa.invoice_id
      WHERE p.tenant_id = $1
        AND p.payment_status IN ('paid', 'partial', 'completed', 'pending')
        AND p.payment_type IS NOT NULL
        AND p.payment_status IS NOT NULL
      GROUP BY p.id, p.amount, p.payment_type, p.payment_method, p.payment_date, 
               p.due_date, p.payment_status, p.reference_number, p.notes,
               ra_r.room_number, ra_b.name, direct_r.room_number, direct_b.name
      ORDER BY p.payment_date DESC, p.due_date DESC
      LIMIT 50
    `;
    
    const historyResult = await pool.query(historyQuery, [tenant.id]);
    
    // Calculate summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN p.payment_status = 'paid' THEN p.id END) as total_payments,
        COALESCE(SUM(CASE WHEN p.payment_status = 'paid' THEN p.amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN p.payment_status = 'pending' THEN p.amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN p.payment_status = 'overdue' THEN p.amount ELSE 0 END), 0) as total_overdue,
        COUNT(DISTINCT CASE WHEN i.invoice_status IN ('sent', 'partial', 'overdue') THEN i.id END) as upcoming_invoices,
        COALESCE(SUM(CASE WHEN i.invoice_status IN ('sent', 'partial', 'overdue') THEN i.balance_due ELSE 0 END), 0) as outstanding_balance
      FROM payments p
      FULL OUTER JOIN invoices i ON i.tenant_id = p.tenant_id
      WHERE (p.tenant_id = $1 OR i.tenant_id = $1)
    `;
    
    const summaryResult = await pool.query(summaryQuery, [tenant.id]);
    const summary = summaryResult.rows[0];

    // Room utility bills for the tenant's active unit (electric / water)
    const utilityBillsQuery = `
      SELECT
        ub.id,
        ub.utility_type,
        ub.amount,
        ub.billing_period_start,
        ub.billing_period_end,
        ub.due_date,
        ub.bill_status,
        ub.provider_name,
        ub.notes,
        r.room_number,
        b.name AS building_name
      FROM utility_bills ub
      JOIN rooms r ON r.id = ub.room_id
      JOIN buildings b ON b.id = COALESCE(ub.building_id, r.building_id)
      JOIN tenant_room_assignments tra
        ON tra.room_id = r.id
       AND tra.assignment_status = 'active'
       AND (tra.end_date IS NULL OR tra.end_date > CURRENT_DATE)
      WHERE tra.tenant_id = $1
        AND ub.parent_bill_id IS NULL
      ORDER BY ub.due_date DESC, ub.created_at DESC
      LIMIT 50
    `;
    const utilityBillsResult = await pool.query(utilityBillsQuery, [tenant.id]);
    const utilityBills = utilityBillsResult.rows.map((row) => ({
      id: row.id,
      utilityType: row.utility_type,
      amount: parseFloat(row.amount || 0),
      billingPeriodStart: row.billing_period_start,
      billingPeriodEnd: row.billing_period_end,
      dueDate: row.due_date,
      status: row.bill_status,
      providerName: row.provider_name,
      notes: row.notes,
      roomNumber: row.room_number,
      buildingName: row.building_name,
    }));
    
    // Format schedule items
    const schedule = scheduleResult.rows.map(row => ({
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
      address: row.address_line1 ? `${row.address_line1}, ${row.city || ''}`.trim() : null,
    }));
    
    // Format history items - ensure all fields are properly extracted
    const history = historyResult.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount || 0),
      paymentType: row.payment_type || 'other',
      paymentMethod: row.payment_method || 'cash',
      paymentDate: row.payment_date,
      dueDate: row.due_date,
      status: row.payment_status || 'pending',
      referenceNumber: row.reference_number || null,
      notes: row.notes || null,
      roomNumber: row.room_number || null,
      buildingName: row.building_name || null,
      invoiceNumbers: row.invoice_numbers || null,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        schedule,
        history,
        utilityBills,
        summary: {
          totalPayments: parseInt(summary.total_payments || 0),
          totalPaid: parseFloat(summary.total_paid || 0),
          totalPending: parseFloat(summary.total_pending || 0),
          totalOverdue: parseFloat(summary.total_overdue || 0),
          upcomingInvoices: parseInt(summary.upcoming_invoices || 0),
          outstandingBalance: parseFloat(summary.outstanding_balance || 0),
        },
      },
    });
    
  } catch (error) {
    console.error('Error fetching payment schedule and history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
