import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId, getTenantCompleteData } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * POST /api/tenant/payments/process
 * Process online payment for tenant
 * Note: This is a basic implementation. Full payment gateway integration would be added here.
 */
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const {
      invoiceId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
    } = body;
    
    // Validation
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
    
    // Verify invoice belongs to tenant
    const invoiceQuery = `
      SELECT 
        i.id,
        i.tenant_id,
        i.invoice_number,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.invoice_status
      FROM invoices i
      WHERE i.id = $1
    `;
    
    const invoiceResult = await pool.query(invoiceQuery, [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      );
    }
    
    const invoice = invoiceResult.rows[0];
    
    if (invoice.tenant_id !== tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - You can only pay for your own invoices',
        },
        { status: 403 }
      );
    }
    
    // Verify amount doesn't exceed balance
    if (parseFloat(amount) > parseFloat(invoice.balance_due || invoice.total_amount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment amount exceeds invoice balance',
        },
        { status: 400 }
      );
    }
    
    // Get tenant's room assignment
    const tenantData = await getTenantCompleteData(userId);
    
    // TODO: Integrate with actual payment gateway (Stripe, PayPal, etc.)
    // For now, create a pending payment record
    // In production, this would:
    // 1. Process payment through gateway
    // 2. Wait for webhook confirmation
    // 3. Update payment status
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create payment record
      const paymentQuery = `
        INSERT INTO payments (
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
        RETURNING *
      `;
      
      const paymentResult = await client.query(paymentQuery, [
        tenant.id,
        tenantData?.room_id || null,
        amount,
        paymentMethod || 'online',
        invoice.due_date || new Date().toISOString().split('T')[0],
        referenceNumber || null,
        notes || `Online payment for invoice ${invoice.invoice_number}`,
      ]);
      
      const payment = paymentResult.rows[0];
      
      // Allocate payment to invoice (if payment allocation system exists)
      if (parseFloat(amount) > 0) {
        try {
          const allocationQuery = `
            INSERT INTO payment_allocations (
              payment_id,
              invoice_id,
              allocated_amount
            )
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
          `;
          
          await client.query(allocationQuery, [
            payment.id,
            invoiceId,
            amount,
          ]);
          
          // Update invoice amount_paid
          const updateInvoiceQuery = `
            UPDATE invoices
            SET 
              amount_paid = amount_paid + $1,
              invoice_status = CASE
                WHEN (amount_paid + $1) >= total_amount THEN 'paid'
                WHEN (amount_paid + $1) > 0 THEN 'partial'
                ELSE invoice_status
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `;
          
          await client.query(updateInvoiceQuery, [amount, invoiceId]);
        } catch (allocationError) {
          console.error('Error allocating payment to invoice:', allocationError);
          // Continue even if allocation fails
        }
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        data: {
          paymentId: payment.id,
          invoiceId: invoiceId,
          amount: parseFloat(payment.amount),
          status: payment.payment_status,
          referenceNumber: payment.reference_number,
          message: 'Payment processed successfully. It will be confirmed once payment is verified.',
        },
        message: 'Payment initiated successfully',
      }, { status: 201 });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
