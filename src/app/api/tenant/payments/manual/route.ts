import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { createDepositTransaction } from '@/lib/api/deposit-ledger';
import pool from '@/lib/db';

/**
 * POST /api/tenant/payments/manual
 * Record manual payment entry for logged-in tenant
 * Allows tenants to enter payment amounts without requiring an invoice
 */
export async function POST(request: Request) {
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
    const { amount, paymentType, paymentMethod, referenceNumber, notes } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }
    
    if (!paymentType) {
      return NextResponse.json(
        { success: false, error: 'Payment type is required' },
        { status: 400 }
      );
    }
    
    // Validate payment type
    const validPaymentTypes = ['rent', 'deposit', 'downpayment', 'late_fee', 'utility', 'asset_rental', 'other'];
    if (!validPaymentTypes.includes(paymentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment type' },
        { status: 400 }
      );
    }
    
    // Get tenant's current room assignment (if any)
    const assignmentQuery = `
      SELECT tra.id as assignment_id, tra.room_id
      FROM tenant_room_assignments tra
      WHERE tra.tenant_id = $1
        AND tra.assignment_status = 'active'
      ORDER BY tra.start_date DESC
      LIMIT 1
    `;
    
    const assignmentResult = await pool.query(assignmentQuery, [tenant.id]);
    const assignment = assignmentResult.rows[0];
    
    let transactionId: string | undefined;
    
    // For deposit payments, also create deposit ledger transaction
    if (paymentType === 'deposit') {
      try {
        const transaction = await createDepositTransaction({
          tenantId: tenant.id,
          amount: parseFloat(amount),
          transactionType: 'deposit',
          description: notes || 'Deposit payment',
          referenceNumber: referenceNumber || undefined,
        });
        transactionId = transaction.id;
      } catch (error) {
        console.warn('Could not create deposit ledger transaction:', error);
        // Continue with payment record creation even if deposit ledger fails
      }
    }
    
    // Create payment record
    const paymentQuery = `
      INSERT INTO payments (
        tenant_id,
        room_id,
        assignment_id,
        amount,
        payment_type,
        payment_method,
        payment_date,
        due_date,
        payment_status,
        reference_number,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE, $7, $8, $9)
      RETURNING id, payment_type, amount, payment_date
    `;
    
    const paymentResult = await pool.query(paymentQuery, [
      tenant.id,
      assignment?.room_id || null,
      assignment?.assignment_id || null,
      amount,
      paymentType,
      paymentMethod || 'online',
      'paid',
      referenceNumber || null,
      notes || null,
    ]);
    
    const payment = paymentResult.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        transactionId: transactionId,
        amount: parseFloat(payment.amount),
        paymentType: payment.payment_type,
        paymentDate: payment.payment_date,
      },
      message: 'Payment recorded successfully',
    });
    
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
