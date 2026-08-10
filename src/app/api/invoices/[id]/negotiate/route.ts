import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  applyInvoiceAdjustment,
  negotiateInvoiceDueDate,
} from '@/lib/services/invoice-negotiation';

/**
 * PATCH /api/invoices/[id]/negotiate
 * Body: { negotiatedDueDate, reason } and/or { adjustmentAmount, adjustmentReason }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await request.json();
    const result: Record<string, unknown> = { invoiceId: id };

    if (body.negotiatedDueDate) {
      const negotiated = await negotiateInvoiceDueDate({
        invoiceId: id,
        negotiatedDueDate: String(body.negotiatedDueDate).slice(0, 10),
        reason: String(body.reason || body.negotiatedDueReason || ''),
        userId: (auth.session?.user as { id?: string } | undefined)?.id ?? null,
      });
      result.negotiation = negotiated;
    }

    if (body.adjustmentAmount != null) {
      const adjustment = await applyInvoiceAdjustment({
        invoiceId: id,
        adjustmentAmount: Number(body.adjustmentAmount),
        adjustmentReason: String(body.adjustmentReason || ''),
      });
      result.adjustment = adjustment;
    }

    if (!result.negotiation && !result.adjustment) {
      return NextResponse.json(
        {
          error:
            'Provide negotiatedDueDate+reason and/or adjustmentAmount+adjustmentReason',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Invoice negotiate error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update invoice negotiation',
      },
      { status: 400 }
    );
  }
}
