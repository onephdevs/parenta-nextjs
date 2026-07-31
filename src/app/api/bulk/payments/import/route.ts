import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { importPaymentsFromCSV } from '@/lib/services/bulk-operations-service';
import { logActivitySafe } from '@/lib/services/activity-logger';

/**
 * POST /api/bulk/payments/import
 * Import payments from CSV data
 * Body:
 *  - payments: array of payment objects
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { payments } = body;
    
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No payment data provided' },
        { status: 400 }
      );
    }
    
    const userId = (session.user as any)?.id;
    const result = await importPaymentsFromCSV(payments, userId);

    if (result.successful > 0) {
      logActivitySafe({
        actorUserId: userId || null,
        actorRole: 'admin',
        actionType: 'bulk.payments_imported',
        category: 'system',
        entityType: 'bulk_operation',
        entityLabel: `${result.successful} payment(s) imported`,
        afterData: {
          successful: result.successful,
          failed: result.failed,
          total: payments.length,
        },
        link: '/admin/bulk-operations',
        metadata: { link: '/admin/bulk-operations' },
      });
    }
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          partial_success: result.successful > 0,
          ...result,
          message: `Imported ${result.successful} payment(s), ${result.failed} failed`,
        },
        { status: 207 } // Multi-status
      );
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully imported ${result.successful} payment(s)`,
    });
  } catch (error) {
    console.error('Error importing payments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import payments',
      },
      { status: 500 }
    );
  }
}

