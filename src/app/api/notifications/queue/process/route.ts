import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processNotificationQueue } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/queue/process
 * Manually trigger queue processing
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

