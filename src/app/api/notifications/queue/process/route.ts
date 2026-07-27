import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processNotificationQueue } from '@/lib/services/notification-service';
import { enqueueJob } from '@/lib/services/job-queue';

/**
 * GET /api/notifications/queue/process
 * Manually trigger queue processing.
 * Query: ?async=1 to enqueue a background job instead of blocking.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const asyncMode = new URL(request.url).searchParams.get('async') === '1';

    if (asyncMode) {
      const job = await enqueueJob({
        jobType: 'notification_queue_process',
        payload: { limit: 50 },
        createdBy: session.user?.id || null,
      });
      return NextResponse.json(
        {
          success: true,
          jobId: job.id,
          status: 'queued',
          message: 'Notification queue processing queued',
        },
        { status: 202 }
      );
    }

    const result = await processNotificationQueue();

    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} notification(s): ${result.sent} sent, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('Error processing notification queue:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process notification queue',
      },
      { status: 500 }
    );
  }
}
