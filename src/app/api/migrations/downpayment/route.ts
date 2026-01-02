import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * POST /api/migrations/downpayment
 * Run migration to add downpayment payment type
 * Admin only
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    console.log('🚀 Running migration: add-downpayment-payment-type');

    // Step 1: Drop existing constraint
    await pool.query('ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check');
    console.log('✅ Step 1: Constraint dropped');

    // Step 2: Add new constraint with downpayment
    await pool.query(`
      ALTER TABLE payments 
      ADD CONSTRAINT payments_payment_type_check 
      CHECK (payment_type IN ('rent', 'deposit', 'downpayment', 'late_fee', 'utility', 'asset_rental', 'other'))
    `);
    console.log('✅ Step 2: New constraint added');

    // Step 3: Add comment
    await pool.query(`
      COMMENT ON COLUMN payments.payment_type IS 'Payment type: rent, deposit, downpayment, late_fee, utility, asset_rental, or other'
    `);
    console.log('✅ Step 3: Comment added');

    // Verify migration
    const result = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'payments_payment_type_check'
    `);

    if (result.rows.length > 0) {
      const constraint = result.rows[0];
      const hasDownpayment = constraint.check_clause.includes('downpayment');

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        data: {
          constraintName: constraint.constraint_name,
          checkClause: constraint.check_clause,
          downpaymentIncluded: hasDownpayment,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Migration completed but constraint not found',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
