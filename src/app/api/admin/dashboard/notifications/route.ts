import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * GET /api/admin/dashboard/notifications
 * Get recent notifications for dashboard widget
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get notifications for admin user or system-wide notifications
    const query = `
      SELECT 
        id,
        notification_type,
        title,
        message,
        priority,
        is_read,
        created_at
      FROM notifications
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, [session.user.id]);
    
    // Get unread count
    const unreadQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE (user_id IS NULL OR user_id = $1) AND is_read = false
    `;
    
    const unreadResult = await pool.query(unreadQuery, [session.user.id]);
    const unreadCount = parseInt(unreadResult.rows[0].unread_count || 0);
    
    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.notification_type,
      title: row.title,
      message: row.message,
      priority: row.priority,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
