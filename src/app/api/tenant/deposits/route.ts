import { NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { createDepositTransaction } from '@/lib/api/deposit-ledger';
import pool from '@/lib/db';

/**
 * GET /api/tenant/deposits
 * Get deposit balance and history for logged-in tenant
 */
export async function GET() {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { tenant } = access;
    
    // Check if deposit_ledger table exists, if not return empty data
    let balance = 0;
    let advanceBalance = 0;
    let advanceCollected = 0;
    let advanceApplied = 0;
    let advanceRemaining = 0;
    let advanceAppliedPeriod: string | null = null;
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

      const advanceResult = await pool.query(
        `SELECT
           COALESCE(SUM(amount) FILTER (WHERE status IN ('available', 'applied')), 0) AS collected,
           COALESCE(SUM(amount) FILTER (WHERE status = 'available'), 0) AS remaining,
           COALESCE(SUM(amount) FILTER (WHERE status = 'applied'), 0) AS applied
         FROM tenant_credits
         WHERE tenant_id = $1`,
        [tenant.id]
      );
      advanceCollected = parseFloat(advanceResult.rows[0]?.collected || 0);
      advanceRemaining = parseFloat(advanceResult.rows[0]?.remaining || 0);
      advanceApplied = parseFloat(advanceResult.rows[0]?.applied || 0);
      advanceBalance = advanceRemaining;

      if (advanceCollected <= 0) {
        const paidAdvance = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS collected
           FROM payments
           WHERE tenant_id = $1
             AND payment_status = 'paid'
             AND payment_type ILIKE '%advance%'`,
          [tenant.id]
        );
        advanceCollected = parseFloat(paidAdvance.rows[0]?.collected || 0);
      }

      if (advanceApplied > 0) {
        const appliedInvoice = await pool.query(
          `SELECT i.billing_period_start, i.due_date
           FROM tenant_credits tc
           JOIN invoices i ON i.id = tc.applied_to_invoice_id
           WHERE tc.tenant_id = $1
             AND tc.status = 'applied'
             AND tc.applied_to_invoice_id IS NOT NULL
           ORDER BY COALESCE(i.billing_period_start, i.due_date) DESC
           LIMIT 1`,
          [tenant.id]
        );
        const periodDate =
          appliedInvoice.rows[0]?.billing_period_start || appliedInvoice.rows[0]?.due_date;
        if (periodDate) {
          advanceAppliedPeriod = new Date(periodDate).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          });
        }
      }
      
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
      advanceBalance = 0;
      advanceCollected = 0;
      advanceApplied = 0;
      advanceRemaining = 0;
      advanceAppliedPeriod = null;
      transactionCount = 0;
      history = [];
    }
    
    return NextResponse.json({
      success: true,
      data: {
        balance,
        advanceBalance,
        advanceCollected,
        advanceApplied,
        advanceRemaining,
        advanceAppliedPeriod,
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
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { tenant } = access;
    
    const body = await request.json();
    const { amount, paymentType, description, paymentMethod, referenceNumber } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }
    
    const paymentTypeValue = (paymentType || 'deposit') as
      | 'deposit'
      | 'advance'
      | 'rent'
      | 'late_fee'
      | 'utility'
      | 'asset_rental'
      | 'other';
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
    
    // Create payment record for deposit, advance, or other types (with Parenta txn id)
    const { createPayment } = await import('@/lib/api/payments');
    const payment = await createPayment({
      tenantId: String(tenant.id),
      amount: parseFloat(amount),
      paymentType: paymentTypeValue,
      paymentMethod: (paymentMethod || 'online') as
        | 'cash'
        | 'cheque'
        | 'check'
        | 'credit_card'
        | 'bank_transfer'
        | 'online'
        | 'gcash'
        | 'other',
      paymentStatus: 'completed',
      paymentDate: new Date(),
      referenceNumber: referenceNumber || undefined,
      notes:
        description ||
        `${
          paymentTypeValue === 'deposit'
            ? 'Deposit'
            : paymentTypeValue === 'advance'
              ? 'Advance'
              : 'Payment'
        } payment`,
    });

    // Link credit to payment if advance payment (update credit with payment_id)
    if (isAdvance && creditId) {
      await pool.query(
        'UPDATE tenant_credits SET payment_id = $1 WHERE id = $2',
        [payment.id, creditId]
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
        paymentId: payment.id,
        parentaTxnId: payment.parentaTxnId,
        transactionId: transactionId,
        creditId: creditId,
        amount: parseFloat(amount),
        paymentType: paymentTypeValue,
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
