import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * GET /api/tenant/payments-history
 * Fetches payment history for the logged-in tenant
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
    
    // Fetch payment history
    const query = `
      SELECT 
        p.id,
        p.amount,
        p.payment_type,
        p.payment_method,
        p.payment_date,
        p.due_date,
        p.payment_status,
        p.reference_number,
        r.room_number,
        b.name as building_name
      FROM payments p
      LEFT JOIN rooms r ON p.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE p.tenant_id = $1
      ORDER BY p.payment_date DESC, p.due_date DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [tenant.id]);
    
    // Calculate summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN payment_status = 'overdue' THEN amount ELSE 0 END) as total_overdue
      FROM payments
      WHERE tenant_id = $1
    `;
    
    const summaryResult = await pool.query(summaryQuery, [tenant.id]);
    const summary = summaryResult.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        payments: result.rows,
        summary: {
          totalPayments: parseInt(summary.total_payments),
          totalPaid: parseFloat(summary.total_paid || 0),
          totalPending: parseFloat(summary.total_pending || 0),
          totalOverdue: parseFloat(summary.total_overdue || 0),
        },
      },
    });
    
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payment history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

