import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrCaretaker } from '@/lib/api-auth';
import pool from '@/lib/db';
import { queueNotification } from '@/lib/services/notification-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/payments/[id]/email-receipt
 * Queue a payment confirmation email to the tenant (best-effort).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdminOrCaretaker();
    if (error) return error;

    const { id } = await params;

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.reference_number,
        p.parenta_txn_id,
        p.or_number,
        t.id AS tenant_id,
        t.email,
        t.first_name,
        t.last_name,
        (
          SELECT i.invoice_number
          FROM payment_allocations pa
          JOIN invoices i ON i.id = pa.invoice_id
          WHERE pa.payment_id = p.id
          ORDER BY pa.created_at ASC
          LIMIT 1
        ) AS invoice_number
      FROM payments p
      JOIN tenants t ON t.id = p.tenant_id
      WHERE p.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = result.rows[0];
    if (!payment.email) {
      return NextResponse.json(
        { success: false, error: 'Tenant has no email address' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await queueNotification(
        payment.email,
        'payment_confirmation',
        {
          tenant_name: `${payment.first_name} ${payment.last_name}`,
          invoice_number: payment.invoice_number || 'N/A',
          amount_paid: Number(payment.amount).toFixed(2),
          payment_date: new Date(payment.payment_date).toLocaleDateString(),
          payment_method: payment.payment_method || 'N/A',
          reference_number:
            payment.or_number ||
            payment.parenta_txn_id ||
            payment.reference_number ||
            'N/A',
        },
        new Date(),
        payment.tenant_id,
        client
      );
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt email queued',
    });
  } catch (err) {
    console.error('POST /api/payments/[id]/email-receipt', err);
    return NextResponse.json(
      { success: false, error: 'Failed to queue receipt email' },
      { status: 500 }
    );
  }
}
