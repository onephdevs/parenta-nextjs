import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { createDepositTransaction } from '@/lib/api/deposit-ledger';
import pool from '@/lib/db';

/**
 * GET /api/tenant/deposits
 * Get deposit balance and history for logged-in tenant
 */
export async function GET() {
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
    
    // Check if deposit_ledger table exists, if not return empty data
    let balance = 0;
    let transactionCount = 0;
    let history: any[] = [];
    
    try {
      // Get deposit balance and history
      const query = `
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN transaction_type = 'deposit' THEN amount
              WHEN transaction_type = 'refund' THEN -amount
              WHEN transaction_type = 'applied' THEN -amount
              WHEN transaction_type = 'adjustment' THEN amount
              ELSE 0
            END
          ), 0) as balance,
          COUNT(*) as transaction_count
        FROM deposit_ledger
        WHERE tenant_id = $1
      `;
      
      const balanceResult = await pool.query(query, [tenant.id]);
      balance = parseFloat(balanceResult.rows[0]?.balance || 0);
      transactionCount = parseInt(balanceResult.rows[0]?.transaction_count || 0);
      
      // Get transaction history (note: deposit_ledger doesn't have reference_number column)
      // Join with payments to get reference_number if payment_id exists
      const historyQuery = `
        SELECT 
          dl.id,
          dl.transaction_type,
          dl.amount,
          dl.description,
          dl.transaction_date,
          dl.created_at,
          dl.payment_id,
          p.reference_number
        FROM deposit_ledger dl
        LEFT JOIN payments p ON dl.payment_id = p.id
        WHERE dl.tenant_id = $1
        ORDER BY dl.transaction_date DESC, dl.created_at DESC
        LIMIT 50
      `;
      
      const historyResult = await pool.query(historyQuery, [tenant.id]);
      
      history = historyResult.rows.map(row => ({
        id: row.id,
        transactionType: row.transaction_type,
        amount: parseFloat(row.amount || 0),
        description: row.description,
        transactionDate: row.transaction_date,
        createdAt: row.created_at,
        paymentId: row.payment_id,
        referenceNumber: row.reference_number || null,
      }));
    } catch (dbError) {
      // If table doesn't exist or query fails, return empty data instead of error
      console.warn('Deposit ledger table may not exist or query failed:', dbError);
      // Return empty data - this is not critical for the page to function
      balance = 0;
      transactionCount = 0;
      history = [];
    }
    
    return NextResponse.json({
      success: true,
      data: {
        balance,
        transactionCount,
        history,
      },
    });
    
  } catch (error) {
    console.error('Error fetching deposit data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deposit data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/deposits
 * Add deposit payment for logged-in tenant
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
    const { amount, paymentType, description, paymentMethod, referenceNumber } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }
    
    const paymentTypeValue = paymentType || 'deposit';
    const isDeposit = paymentTypeValue === 'deposit';
    const isAdvance = paymentTypeValue === 'advance';
    
    let transactionId: string | undefined;
    let creditId: string | undefined;
    
    // For deposit payments, create deposit ledger transaction
    if (isDeposit) {
      const transaction = await createDepositTransaction({
        tenantId: tenant.id,
        amount: parseFloat(amount),
        transactionType: 'deposit',
        description: description || 'Deposit payment',
        referenceNumber: referenceNumber || undefined,
      });
      transactionId = transaction.id;
    }
    
    // For advance payments, create tenant credit (prepaid rent)
    if (isAdvance) {
      const { createTenantCredit } = await import('@/lib/api/tenant-credits');
      const credit = await createTenantCredit({
        tenantId: tenant.id,
        amount: parseFloat(amount),
        source: 'manual',
        description: description || 'Advance payment (prepaid rent)',
      });
      creditId = credit.id;
    }
    
    // Create payment record for deposit, advance, or other types
    // DB payment_type CHECK allows: rent, deposit, late_fee, utility, asset_rental, other (no 'advance')
    const dbPaymentType = paymentTypeValue === 'advance' ? 'other' : paymentTypeValue;
    const paymentQuery = `
      INSERT INTO payments (
        tenant_id,
        amount,
        payment_type,
        payment_method,
        payment_date,
        due_date,
        payment_status,
        reference_number,
        notes
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE, $5, $6, $7)
      RETURNING id, payment_type
    `;
    
    const paymentResult = await pool.query(paymentQuery, [
      tenant.id,
      amount,
      dbPaymentType,
      paymentMethod || 'online',
      'paid',
      referenceNumber || null,
      description || `${paymentTypeValue === 'deposit' ? 'Deposit' : paymentTypeValue === 'advance' ? 'Advance' : 'Payment'} payment`,
    ]);
    
    // Link credit to payment if advance payment (update credit with payment_id)
    if (isAdvance && creditId) {
      await pool.query(
        'UPDATE tenant_credits SET payment_id = $1 WHERE id = $2',
        [paymentResult.rows[0].id, creditId]
      );
    }
    
    // For advance payments, automatically apply to unpaid RENT invoices only (oldest first)
    // Advance cascades forward until exhausted, only applying to rent invoices
    if (isAdvance && creditId) {
      try {
        const { autoApplyAdvanceToUnpaidRentInvoices } = await import('@/lib/services/payment-allocator');
        await autoApplyAdvanceToUnpaidRentInvoices(tenant.id);
      } catch (autoApplyError) {
        console.warn('Could not auto-apply advance to rent invoices:', autoApplyError);
        // Continue - credit is still created and will be applied later
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        paymentId: paymentResult.rows[0].id,
        transactionId: transactionId,
        creditId: creditId,
        amount: parseFloat(amount),
        paymentType: paymentTypeValue, // original type (e.g. 'advance') for display; DB stores 'other'
        transactionDate: new Date().toISOString(),
      },
      message: `${paymentTypeValue === 'deposit' ? 'Deposit' : paymentTypeValue === 'advance' ? 'Advance' : 'Payment'} payment recorded successfully`,
    });
    
  } catch (error) {
    console.error('Error recording deposit payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record deposit payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
