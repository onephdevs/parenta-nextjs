import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * GET /api/admin/dashboard/active-tenants
 * Get active tenants list for dashboard widget
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
        t.id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        r.room_number,
        b.name as building_name,
        b.id as building_id,
        COALESCE(SUM(i.balance_due), 0) as balance,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN i.balance_due ELSE 0 END), 0) as past_due_amount,
        COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN 1 END) as overdue_count,
        MAX(CASE WHEN i.due_date < CURRENT_DATE AND i.invoice_status != 'paid' THEN (CURRENT_DATE - i.due_date) ELSE 0 END) as days_past_due,
        tra.start_date as lease_start,
        tra.end_date as lease_end
      FROM tenants t
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN invoices i ON t.id = i.tenant_id AND i.invoice_status IN ('sent', 'partial', 'overdue')
      WHERE t.tenant_status = 'active' AND t.is_active = true
      GROUP BY t.id, t.first_name, t.last_name, t.email, t.phone, r.room_number, b.name, b.id, tra.start_date, tra.end_date
      ORDER BY overdue_count DESC, past_due_amount DESC, balance DESC
      LIMIT 15
    `;
    
    const result = await pool.query(query);
    
    const tenants = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      buildingId: row.building_id,
      balance: parseFloat(row.balance || 0),
      pastDueAmount: parseFloat(row.past_due_amount || 0),
      overdueCount: parseInt(row.overdue_count || 0),
      daysPastDue: parseInt(row.days_past_due || 0),
      leaseStart: row.lease_start,
      leaseEnd: row.lease_end,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        tenants,
        total: tenants.length,
      },
    });
    
  } catch (error) {
    console.error('Error fetching active tenants:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch active tenants',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
