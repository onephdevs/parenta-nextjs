import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNotificationHistory } from '@/lib/services/notification-service';

/**
 * GET /api/notifications/history/[tenantId]
 * Get notification history for a specific tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { tenantId } = params;
    
    const history = await getNotificationHistory(tenantId);
    
    return NextResponse.json({
      success: true,
      notifications: history,
      count: history.length,
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notification history',
      },
      { status: 500 }
    );
  }
}

