import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * GET /api/admin/dashboard/activity-logs
 * Get recent activity logs for dashboard widget
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
    
    const query = `
      SELECT 
        al.id,
        al.action,
        al.table_name,
        al.record_id,
        al.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query);
    
    const activityLogs = result.rows.map(row => ({
      id: row.id,
      action: row.action,
      tableName: row.table_name,
      recordId: row.record_id,
      createdAt: row.created_at,
      user: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'System',
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        activityLogs,
        total: activityLogs.length,
      },
    });
    
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activity logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
