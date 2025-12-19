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
    
    // Get deposit balance and history
    const query = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN transaction_type = 'deposit' THEN amount
            WHEN transaction_type = 'refund' THEN -amount
            WHEN transaction_type = 'apply' THEN -amount
            WHEN transaction_type = 'adjust' THEN amount
            ELSE 0
          END
        ), 0) as balance,
        COUNT(*) as transaction_count
      FROM deposit_ledger
      WHERE tenant_id = $1
    `;
    
    const balanceResult = await pool.query(query, [tenant.id]);
    const balance = parseFloat(balanceResult.rows[0].balance || 0);
    
    // Get transaction history
    const historyQuery = `
      SELECT 
        id,
        transaction_type,
        amount,
        description,
        transaction_date,
        created_at,
        reference_number
      FROM deposit_ledger
      WHERE tenant_id = $1
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 50
    `;
    
    const historyResult = await pool.query(historyQuery, [tenant.id]);
    
    const history = historyResult.rows.map(row => ({
      id: row.id,
      transactionType: row.transaction_type,
      amount: parseFloat(row.amount || 0),
      description: row.description,
      transactionDate: row.transaction_date,
      createdAt: row.created_at,
      referenceNumber: row.reference_number,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        balance,
        transactionCount: parseInt(balanceResult.rows[0].transaction_count || 0),
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
    const { amount, description, paymentMethod, referenceNumber } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }
    
    // Create deposit transaction
    const transaction = await createDepositTransaction({
      tenantId: tenant.id,
      amount: parseFloat(amount),
      transactionType: 'deposit',
      description: description || 'Deposit payment',
      referenceNumber: referenceNumber || undefined,
    });
    
    // Also create a payment record for tracking
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
      RETURNING id
    `;
    
    await pool.query(paymentQuery, [
      tenant.id,
      amount,
      'deposit',
      paymentMethod || 'online',
      'paid',
      referenceNumber || null,
      description || 'Deposit payment',
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        transactionDate: transaction.transactionDate,
      },
      message: 'Deposit payment recorded successfully',
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
