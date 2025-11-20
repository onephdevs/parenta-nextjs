import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queueNotification, processNotificationQueue } from '@/lib/services/notification-service';

/**
 * POST /api/notifications/queue
 * Manually queue a notification
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
    const { recipient_email, notification_type, context, tenant_id } = body;
    
    if (!recipient_email || !notification_type || !context) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const notificationId = await queueNotification(
      recipient_email,
      notification_type,
      context,
      undefined,
      tenant_id
    );
    
    return NextResponse.json({
      success: true,
      notification_id: notificationId,
      message: 'Notification queued successfully',
    });
  } catch (error) {
    console.error('Error queuing notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue notification',
      },
      { status: 500 }
    );
  }
}

