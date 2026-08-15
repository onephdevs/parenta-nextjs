import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrCaretaker } from '@/lib/api-auth';
import pool from '@/lib/db';
import { generateReceiptPDF } from '@/lib/services/receipt-generator';
import { peekNextParentaOrId } from '@/lib/services/transaction-id-service';
import { txnTypeFromPaymentType } from '@/lib/constants/transaction-ids';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/preview-receipt
 * Generate a draft PDF receipt from Process Payment form values (not persisted).
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdminOrCaretaker();
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const amount = Number(body.amount);
    const paymentMethod =
      typeof body.paymentMethod === 'string' && body.paymentMethod.trim()
        ? body.paymentMethod.trim()
        : 'cash';
    const paymentType =
      typeof body.paymentType === 'string' && body.paymentType.trim()
        ? body.paymentType.trim()
        : 'rent';
    const paymentDateRaw =
      typeof body.paymentDate === 'string' && body.paymentDate.trim()
        ? body.paymentDate.trim()
        : new Date().toISOString().slice(0, 10);
    const notes =
      typeof body.notes === 'string' && body.notes.trim()
        ? body.notes.trim()
        : undefined;
    let orNumber =
      typeof body.orNumber === 'string' && body.orNumber.trim()
        ? body.orNumber.trim()
        : '';

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'A valid amount is required' },
        { status: 400 }
      );
    }

    const tenantResult = await pool.query(
      `
      SELECT
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        r.room_number,
        b.name AS building_name,
        b.address_line1,
        b.address_line2,
        b.city,
        b.state,
        b.postal_code
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

    const tenant = tenantResult.rows[0];
    if (!orNumber) {
      try {
        orNumber = await peekNextParentaOrId(txnTypeFromPaymentType(paymentType));
      } catch {
        orNumber = 'DRAFT';
      }
    }

    const addressParts = [
      tenant.address_line1,
      tenant.address_line2,
      [tenant.city, tenant.state, tenant.postal_code].filter(Boolean).join(', '),
    ].filter(Boolean);

    const pdfBuffer = await generateReceiptPDF({
      receiptNumber: orNumber,
      paymentDate: new Date(paymentDateRaw).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      paymentAmount: amount,
      paymentMethod: paymentMethod.replace(/_/g, ' '),
      paymentType,
      referenceNumber: orNumber,
      tenantName: `${tenant.first_name} ${tenant.last_name}`.trim(),
      tenantEmail: tenant.email || undefined,
      tenantPhone: tenant.phone || undefined,
      buildingName: tenant.building_name || undefined,
      roomNumber: tenant.room_number || undefined,
      address: addressParts.join(', ') || undefined,
      companyName: 'Alfonso Property Management',
      notes: notes ? `[Preview] ${notes}` : '[Preview — not yet recorded]',
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="receipt-preview.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('POST /api/payments/preview-receipt', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate receipt preview' },
      { status: 500 }
    );
  }
}
