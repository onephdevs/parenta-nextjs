/**
 * POST /api/tenant/payments/process
 * Tenant submits a payment claim for an invoice (pending admin verification).
 * Does NOT allocate to invoices / update balance until an admin confirms the payment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { getTenantCompleteDataByTenantId } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { tenant, session } = access;

    const body = await request.json();
    const { invoiceId, amount, paymentMethod, referenceNumber, notes } = body;

    if (!invoiceId || !amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payment data',
          details: 'Invoice ID and amount are required',
        },
        { status: 400 }
      );
    }

    const method = String(paymentMethod || 'bank_transfer');
    if (method === 'bank_transfer' && !String(referenceNumber || '').trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reference number required',
          details:
            'Please enter your bank/GCash transfer reference so we can verify payment.',
        },
        { status: 400 }
      );
    }

    const invoiceResult = await pool.query(
      `SELECT
         i.id,
         i.tenant_id,
         i.invoice_number,
         i.total_amount,
         i.amount_paid,
         i.balance_due,
         i.invoice_status,
         i.due_date
       FROM invoices i
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.tenant_id !== tenant.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - You can only pay for your own invoices' },
        { status: 403 }
      );
    }

    const balanceDue = parseFloat(invoice.balance_due ?? invoice.total_amount);
    if (parseFloat(amount) > balanceDue) {
      return NextResponse.json(
        { success: false, error: 'Payment amount exceeds invoice balance' },
        { status: 400 }
      );
    }

    const tenantData = await getTenantCompleteDataByTenantId(String(tenant.id));
    const claimNotes = [
      `Tenant payment claim for invoice ${invoice.invoice_number} (invoice_id=${invoiceId})`,
      'Status: awaiting office verification — invoice balance not updated yet.',
      notes ? `Tenant notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const paymentResult = await pool.query(
      `INSERT INTO payments (
        tenant_id,
        room_id,
        amount,
        payment_type,
        payment_method,
        payment_date,
        due_date,
        payment_status,
        reference_number,
        notes
      )
      VALUES ($1, $2, $3, 'rent', $4, CURRENT_DATE, $5, 'pending', $6, $7)
      RETURNING *`,
      [
        tenant.id,
        tenantData?.room_id || null,
        amount,
        method === 'online' || method === 'credit_card' ? 'online' : method,
        invoice.due_date || new Date().toISOString().split('T')[0],
        referenceNumber || null,
        claimNotes,
      ]
    );

    const payment = paymentResult.rows[0];

    logActivitySafe({
      actorUserId: session.user.id,
      actorRole: 'tenant',
      actionType: 'payment.claim_submitted',
      category: 'payments',
      entityType: 'payment',
      entityId: String(payment.id),
      entityLabel: `₱${parseFloat(amount).toLocaleString()} — ${invoice.invoice_number}`,
      afterData: payment as Record<string, unknown>,
      link: `/admin/financial/payments/${payment.id}`,
      metadata: {
        link: `/admin/financial/payments/${payment.id}`,
        invoiceId,
        tenantId: tenant.id,
        referenceNumber: payment.reference_number,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: payment.id,
          invoiceId,
          amount: parseFloat(payment.amount),
          status: 'pending',
          referenceNumber: payment.reference_number,
          message:
            'Payment submitted for verification. Your invoice balance will update after the office confirms it.',
        },
        message:
          'Payment submitted for verification. You will see the balance update once confirmed.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
