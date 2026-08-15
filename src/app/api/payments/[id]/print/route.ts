import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrCaretaker } from '@/lib/api-auth';
import { generateReceiptPDF } from '@/lib/services/receipt-generator';
import { formatPaymentNotesForPeople } from '@/lib/format-payment-notes';
import { contentDispositionHeader } from '@/lib/format/upload-filename';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]/print
 * Generate an official PDF receipt for a payment (admin).
 * ?inline=1 → open in browser for print preview; otherwise attachment download.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdminOrCaretaker();
    if (error) return error;

    const { id: paymentId } = await params;
    const inline =
      request.nextUrl.searchParams.get('inline') === '1' ||
      request.nextUrl.searchParams.get('inline') === 'true';

    const paymentResult = await pool.query(
      `
      SELECT
        p.id,
        p.amount,
        p.payment_type,
        p.payment_method,
        p.payment_date,
        p.reference_number,
        p.parenta_txn_id,
        p.or_number,
        p.notes,
        t.first_name,
        t.last_name,
        t.email AS tenant_email,
        t.phone AS tenant_phone,
        COALESCE(r.room_number, current_r.room_number) AS room_number,
        COALESCE(b.name, current_b.name) AS building_name,
        COALESCE(b.address_line1, current_b.address_line1) AS address_line1,
        COALESCE(b.address_line2, current_b.address_line2) AS address_line2,
        COALESCE(b.city, current_b.city) AS city,
        COALESCE(b.state, current_b.state) AS state,
        COALESCE(b.postal_code, current_b.postal_code) AS postal_code
      FROM payments p
      INNER JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
      LEFT JOIN rooms r ON ra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN LATERAL (
        SELECT tra.room_id
        FROM tenant_room_assignments tra
        WHERE tra.tenant_id = p.tenant_id AND tra.assignment_status = 'active'
        ORDER BY tra.start_date DESC
        LIMIT 1
      ) current_ra ON true
      LEFT JOIN rooms current_r ON current_ra.room_id = current_r.id
      LEFT JOIN buildings current_b ON current_r.building_id = current_b.id
      WHERE p.id = $1
      LIMIT 1
      `,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];
    const addressParts = [
      payment.address_line1,
      payment.address_line2,
      payment.city,
      payment.state,
      payment.postal_code,
    ].filter(Boolean);

    const receiptNumber =
      payment.or_number ||
      payment.parenta_txn_id ||
      payment.reference_number ||
      `PAY-${String(payment.id).substring(0, 8).toUpperCase()}`;

    const pdfBuffer = await generateReceiptPDF({
      receiptNumber,
      paymentDate: payment.payment_date,
      paymentAmount: parseFloat(payment.amount || 0),
      paymentMethod: payment.payment_method || 'cash',
      paymentType: payment.payment_type || 'rent',
      referenceNumber: payment.or_number || payment.reference_number || undefined,
      tenantName: `${payment.first_name} ${payment.last_name}`,
      tenantEmail: payment.tenant_email || undefined,
      tenantPhone: payment.tenant_phone || undefined,
      buildingName: payment.building_name || undefined,
      roomNumber: payment.room_number || undefined,
      address: addressParts.length ? addressParts.join(', ') : undefined,
      companyName: 'Alfonso Property Management System',
      companyAddress: 'Manila, Philippines',
      notes: formatPaymentNotesForPeople(payment.notes) || undefined,
    });

    const fileName = `receipt-${receiptNumber}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDispositionHeader(
          fileName,
          inline ? 'inline' : 'attachment'
        ),
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating admin receipt PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
