import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPaymentById, updatePayment } from '@/lib/api/payments';
import { allocatePaymentToInvoices } from '@/lib/services/payment-allocator';
import { logActivitySafe } from '@/lib/services/activity-logger';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function extractInvoiceIdFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/invoice_id=([0-9a-f-]{36})/i);
  return match?.[1] || null;
}

/**
 * POST /api/payments/[id]/confirm
 * Admin verifies tenant payment claim (transaction ID / receipt) and confirms or rejects.
 * Body: { action: 'confirm' | 'reject', note?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action === 'reject' ? 'reject' : 'confirm';
    const adminNote = typeof body.note === 'string' ? body.note.trim() : '';
    const confirmedReference =
      typeof body.confirmedReference === 'string'
        ? body.confirmedReference.trim()
        : '';

    const payment = await getPaymentById(id);
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.paymentStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending payment claims can be confirmed or rejected' },
        { status: 400 }
      );
    }

    if (action === 'confirm') {
      const expected = String(payment.referenceNumber || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
      const entered = confirmedReference
        .toLowerCase()
        .replace(/\s+/g, '');

      if (!expected) {
        return NextResponse.json(
          {
            error:
              'Payment has no transaction / reference number. Ask the tenant to resubmit with one.',
          },
          { status: 400 }
        );
      }

      if (!entered || entered !== expected) {
        return NextResponse.json(
          {
            error:
              'Transaction ID does not match. Re-check the receipt reference number.',
          },
          { status: 400 }
        );
      }

      if (!payment.receiptFilePath) {
        return NextResponse.json(
          {
            error: 'Payment has no receipt attached. Cannot confirm without proof.',
          },
          { status: 400 }
        );
      }
    }

    if (action === 'reject') {
      const noteParts = [
        payment.notes,
        `Rejected by office${adminNote ? `: ${adminNote}` : ''}`,
      ].filter(Boolean);
      const updated = await updatePayment(id, {
        paymentStatus: 'failed',
        notes: noteParts.join('\n'),
      });

      logActivitySafe({
        actorUserId: session.user.id || null,
        actorRole: 'admin',
        actionType: 'payment.rejected',
        category: 'payments',
        entityType: 'payment',
        entityId: id,
        entityLabel: `₱${Number(payment.amount).toLocaleString()} rejected`,
        beforeData: payment as unknown as Record<string, unknown>,
        afterData: updated as unknown as Record<string, unknown>,
        link: `/admin/financial/payments/${id}`,
        metadata: {
          link: `/admin/financial/payments/${id}`,
          referenceNumber: payment.referenceNumber,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Payment claim rejected',
      });
    }

    // Confirm: mark paid, then allocate to invoices
    const confirmNotes = [
      payment.notes,
      `Confirmed by office after verifying transaction ID${
        payment.referenceNumber ? ` (${payment.referenceNumber})` : ''
      }${adminNote ? `: ${adminNote}` : ''}`,
    ]
      .filter(Boolean)
      .join('\n');

    const updated = await updatePayment(id, {
      paymentStatus: 'completed',
      notes: confirmNotes,
    });

    // Apply deposit / advance side-effects only after confirmation
    try {
      if (payment.paymentType === 'deposit') {
        const { createDepositTransaction } = await import(
          '@/lib/api/deposit-ledger'
        );
        await createDepositTransaction({
          tenantId: payment.tenantId,
          amount: payment.amount,
          transactionType: 'deposit',
          description: `Confirmed deposit (txn ${payment.referenceNumber || 'n/a'})`,
          paymentId: id,
        });
      } else if (payment.paymentType === 'advance') {
        const { createTenantCredit } = await import('@/lib/api/tenant-credits');
        await createTenantCredit({
          tenantId: payment.tenantId,
          amount: payment.amount,
          source: 'manual',
          description: `Confirmed advance (txn ${payment.referenceNumber || 'n/a'})`,
        });
      }
    } catch (sideEffectError) {
      console.error('Post-confirm deposit/advance side effect failed:', sideEffectError);
    }

    const invoiceId = extractInvoiceIdFromNotes(payment.notes);
    let allocationMessage = 'Payment confirmed';

    try {
      if (invoiceId) {
        const inv = await pool.query(
          `SELECT id, invoice_number, balance_due
           FROM invoices WHERE id = $1 AND tenant_id = $2`,
          [invoiceId, payment.tenantId]
        );
        if (inv.rows[0] && parseFloat(inv.rows[0].balance_due) > 0) {
          const amountToAllocate = Math.min(
            payment.amount,
            parseFloat(inv.rows[0].balance_due)
          );
          // Trigger on payment_allocations updates invoice amount_paid / status
          await pool.query(
            `INSERT INTO payment_allocations (
               payment_id, invoice_id, allocated_amount, allocation_date, notes
             ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
            [
              id,
              invoiceId,
              amountToAllocate,
              `Allocated on admin confirm (txn ${payment.referenceNumber || 'n/a'})`,
            ]
          );
          allocationMessage = `Confirmed and allocated ₱${amountToAllocate.toLocaleString()} to ${inv.rows[0].invoice_number}`;

          const remainder = payment.amount - amountToAllocate;
          if (remainder > 0.009) {
            const result = await allocatePaymentToInvoices({
              paymentId: id,
              tenantId: payment.tenantId,
              paymentAmount: remainder,
            });
            allocationMessage = `${allocationMessage}. ${result.message}`;
          }
        } else {
          const result = await allocatePaymentToInvoices({
            paymentId: id,
            tenantId: payment.tenantId,
            paymentAmount: payment.amount,
          });
          allocationMessage = result.message;
        }
      } else {
        const result = await allocatePaymentToInvoices({
          paymentId: id,
          tenantId: payment.tenantId,
          paymentAmount: payment.amount,
        });
        allocationMessage = result.message;
      }
    } catch (allocError) {
      console.error('Allocation after confirm failed:', allocError);
      allocationMessage =
        'Payment confirmed, but automatic invoice allocation failed — allocate manually if needed.';
    }

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'payment.confirmed',
      category: 'payments',
      entityType: 'payment',
      entityId: id,
      entityLabel: `₱${Number(payment.amount).toLocaleString()} confirmed`,
      beforeData: payment as unknown as Record<string, unknown>,
      afterData: updated as unknown as Record<string, unknown>,
      link: `/admin/financial/payments/${id}`,
      metadata: {
        link: `/admin/financial/payments/${id}`,
        referenceNumber: payment.referenceNumber,
        invoiceId,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: allocationMessage,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
