import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First, check if tenant profile exists
    const tenantCheckQuery = `
      SELECT t.id as tenant_id
      FROM users u
      INNER JOIN tenants t ON u.id = t.user_id
      WHERE u.id = $1
    `;

    const tenantCheck = await pool.query(tenantCheckQuery, [session.user.id]);

    if (tenantCheck.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }

    const tenantId = tenantCheck.rows[0].tenant_id;

    // Get tenant's maintenance requests
    const query = `
      SELECT 
        mr.*,
        r.room_number,
        b.name as building_name
      FROM maintenance_requests mr
      LEFT JOIN rooms r ON mr.room_id = r.id
      LEFT JOIN buildings b ON mr.building_id = b.id
      WHERE mr.tenant_id = $1
      ORDER BY mr.created_at DESC
    `;

    const result = await pool.query(query, [tenantId]);

    // Transform database columns to frontend format
    const requests = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      scheduledDate: row.scheduled_date,
      completedDate: row.completed_date,
      notes: row.notes,
      roomNumber: row.room_number,
      buildingName: row.building_name
    }));

    return NextResponse.json({
      success: true,
      data: { 
        requests,
        total: requests.length,
        active: requests.filter((r: any) => r.status !== 'completed' && r.status !== 'cancelled').length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching maintenance requests:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch maintenance requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, category, priority } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get tenant's room information
    const tenantQuery = `
      SELECT 
        t.id as tenant_id, 
        tra.room_id, 
        r.building_id
      FROM users u
      INNER JOIN tenants t ON u.id = t.user_id
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id 
        AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      WHERE u.id = $1
    `;
    
    const tenantResult = await pool.query(tenantQuery, [session.user.id]);

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tenant profile found' },
        { status: 404 }
      );
    }

    const { tenant_id, room_id, building_id } = tenantResult.rows[0];

    // Insert maintenance request (request_date comes from table DEFAULT CURRENT_DATE for admin listing)
    const insertQuery = `
      INSERT INTO maintenance_requests (
        tenant_id,
        room_id,
        building_id,
        title,
        description,
        category,
        priority,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      tenant_id,
      room_id || null,
      building_id || null,
      title,
      description,
      category,
      priority || 'medium',
      'open'
    ];

    const result = await pool.query(insertQuery, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Maintenance request submitted successfully'
    });

  } catch (error) {
    console.error('❌ Error creating maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
