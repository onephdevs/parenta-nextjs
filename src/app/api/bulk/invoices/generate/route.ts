import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMonthlyInvoicesForAllTenants } from '@/lib/services/bulk-operations-service';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { enqueueJob } from '@/lib/services/job-queue';
import { invalidateDashboardCache } from '@/lib/cache/memory-cache';

/**
 * POST /api/bulk/invoices/generate
 * Body:
 *  - month: string (optional) - Target month in 'YYYY-MM' format
 *  - building_id: string (optional) - Filter by building
 *  - async: boolean (optional) - when true, enqueue job and return jobId (202)
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
    const { month, building_id, async: runAsync } = body;

    if (runAsync === true) {
      const job = await enqueueJob({
        jobType: 'bulk_invoices_generate',
        payload: { month, building_id },
        createdBy: session.user.id || null,
      });
      return NextResponse.json(
        {
          success: true,
          jobId: job.id,
          status: 'queued',
          message: 'Bulk invoice generation queued',
        },
        { status: 202 }
      );
    }

    const result = await generateMonthlyInvoicesForAllTenants(month, building_id);
    invalidateDashboardCache();

    if (result.successful > 0) {
      logActivitySafe({
        actorUserId: session.user.id || null,
        actorRole: 'admin',
        actionType: 'bulk.invoices_generated',
        category: 'system',
        entityType: 'bulk_operation',
        entityLabel: `${result.successful} invoice(s) for ${month || 'next month'}`,
        afterData: {
          successful: result.successful,
          failed: result.failed,
          month: month || null,
          buildingId: building_id || null,
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
          message: `Generated ${result.successful} invoice(s), ${result.failed} failed`,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully generated ${result.successful} invoice(s) for ${month || 'next month'}`,
    });
  } catch (error) {
    console.error('Error generating bulk invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate bulk invoices',
      },
      { status: 500 }
    );
  }
}
