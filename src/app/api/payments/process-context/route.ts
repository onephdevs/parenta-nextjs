import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrCaretaker } from '@/lib/api-auth';
import pool from '@/lib/db';
import { getUnpaidInvoicesForTenant } from '@/lib/services/invoice-generator';
import { getEffectiveDueDate } from '@/lib/billing/invoice-due';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/process-context?tenantId=
 * Data for the Process Payment screen: tenant, lease, unpaid invoices, recent payments.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdminOrCaretaker();
    if (error) return error;

    const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const tenantResult = await pool.query(
      `
      SELECT
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        r.id AS room_id,
        r.room_number,
        b.id AS building_id,
        b.name AS building_name,
        tra.start_date,
        tra.end_date,
        tra.monthly_rate
      FROM tenants t
      LEFT JOIN tenant_room_assignments tra
        ON tra.tenant_id = t.id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON r.id = tra.room_id
      LEFT JOIN buildings b ON b.id = r.building_id
      WHERE t.id = $1
      LIMIT 1
      `,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const row = tenantResult.rows[0];
    const startDate = row.start_date ? new Date(row.start_date) : null;
    const endDate = row.end_date ? new Date(row.end_date) : null;
    let leaseTermMonths: number | null = null;
    if (startDate && endDate) {
      leaseTermMonths = Math.max(
        1,
        Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        )
      );
    }

    const unpaid = await getUnpaidInvoicesForTenant(tenantId);
    const invoices = unpaid.map((inv) => {
      const due = getEffectiveDueDate({
        due_date: inv.dueDate,
        negotiated_due_date: null,
      });
      const dueDate = due || inv.dueDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDay = dueDate ? new Date(dueDate) : null;
      if (dueDay) dueDay.setHours(0, 0, 0, 0);
      const isOverdue = Boolean(dueDay && dueDay.getTime() < today.getTime());
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        typeLabel: inv.typeLabel,
        amountDue: inv.balanceDue,
        status: isOverdue ? 'overdue' : inv.status === 'partial' ? 'partial' : 'unpaid',
      };
    });

    const paymentsResult = await pool.query(
      `
      SELECT id, amount, payment_date, parenta_txn_id, reference_number, or_number
      FROM payments
      WHERE tenant_id = $1
        AND payment_status IN ('paid', 'partial', 'pending')
      ORDER BY payment_date DESC, created_at DESC
      LIMIT 5
      `,
      [tenantId]
    );

    const recentPayments = paymentsResult.rows.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentDate: p.payment_date,
      receiptNumber: p.parenta_txn_id || p.reference_number || p.or_number || p.id.slice(0, 8),
    }));

    let nextOrNumber: string | null = null;
    try {
      const { peekNextParentaOrId } = await import(
        '@/lib/services/transaction-id-service'
      );
      const { txnTypeFromPaymentType } = await import(
        '@/lib/constants/transaction-ids'
      );
      const typeHint = request.nextUrl.searchParams.get('paymentType') || 'rent';
      nextOrNumber = await peekNextParentaOrId(txnTypeFromPaymentType(typeHint));
    } catch (peekErr) {
      console.error('peekNextParentaOrId failed:', peekErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          buildingId: row.building_id,
          buildingName: row.building_name,
          roomId: row.room_id,
          roomNumber: row.room_number,
          startDate: row.start_date,
          endDate: row.end_date,
          leaseTermMonths,
          monthlyRate: row.monthly_rate != null ? Number(row.monthly_rate) : null,
        },
        invoices,
        recentPayments,
        nextOrNumber,
      },
    });
  } catch (err) {
    console.error('GET /api/payments/process-context', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load payment context' },
      { status: 500 }
    );
  }
}
