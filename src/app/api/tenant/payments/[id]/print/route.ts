import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { generateReceiptPDF } from '@/lib/services/receipt-generator';
import pool from '@/lib/db';

/**
 * GET /api/tenant/payments/[id]/print
 * Generate and return a printable PDF receipt for a payment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const paymentId = params.id;
    
    // Get payment details with tenant and property info
    const paymentQuery = `
      SELECT 
        p.id,
        p.tenant_id,
        p.amount,
        p.payment_type,
        p.payment_method,
        p.payment_date,
        p.due_date,
        p.reference_number,
        p.notes,
        t.first_name,
        t.last_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        r.room_number,
        b.name as building_name,
        b.address_line1,
        b.address_line2,
        b.city,
        b.state,
        b.postal_code
      FROM payments p
      INNER JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN rooms r ON p.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE p.id = $1
    `;
    
    const paymentResult = await pool.query(paymentQuery, [paymentId]);
    
    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found',
        },
        { status: 404 }
      );
    }
    
    const payment = paymentResult.rows[0];
    
    // Verify tenant owns this payment
    if (payment.tenant_id !== tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - You can only print receipts for your own payments',
        },
        { status: 403 }
      );
    }
    
    // Build address string
    const addressParts = [
      payment.address_line1,
      payment.address_line2,
      payment.city,
      payment.state,
      payment.postal_code,
    ].filter(Boolean);
    const address = addressParts.join(', ');
    
    // Prepare receipt data
    const receiptData = {
      receiptNumber: payment.reference_number || `PAY-${payment.id.substring(0, 8).toUpperCase()}`,
      paymentDate: payment.payment_date,
      paymentAmount: parseFloat(payment.amount || 0),
      paymentMethod: payment.payment_method || 'cash',
      paymentType: payment.payment_type || 'rent',
      referenceNumber: payment.reference_number,
      tenantName: `${payment.first_name} ${payment.last_name}`,
      tenantEmail: payment.tenant_email,
      tenantPhone: payment.tenant_phone,
      buildingName: payment.building_name,
      roomNumber: payment.room_number,
      address: address || undefined,
      companyName: 'Alfonso Property Management System',
      companyAddress: 'Manila, Philippines',
      notes: payment.notes,
    };
    
    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(receiptData);
    
    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${receiptData.receiptNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
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
