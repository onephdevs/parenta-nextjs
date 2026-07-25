import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const buildingId = searchParams.get('buildingId');

    // Build query with optional filters
    let query = `
      SELECT 
        mr.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        r.room_number,
        b.name as building_name,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(', ', b.address_line1, b.address_line2, b.city, b.state, b.postal_code)), ''),
          b.address_line1,
          ''
        ) as building_address
      FROM maintenance_requests mr
      LEFT JOIN tenants t ON mr.tenant_id = t.id
      LEFT JOIN rooms r ON mr.room_id = r.id
      LEFT JOIN buildings b ON b.id = COALESCE(mr.building_id, r.building_id)
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND mr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority && priority !== 'all') {
      query += ` AND mr.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (category && category !== 'all') {
      query += ` AND mr.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (buildingId && buildingId !== 'all') {
      query += ` AND mr.building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE mr.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      mr.request_date DESC
    `;

    const result = await pool.query(query, params);

    // Calculate stats
    const allRequests = result.rows;
    const stats = {
      total: allRequests.length,
      open: allRequests.filter((r: any) => r.status === 'open').length,
      inProgress: allRequests.filter((r: any) => r.status === 'in_progress').length,
      completed: allRequests.filter((r: any) => r.status === 'completed').length,
      cancelled: allRequests.filter((r: any) => r.status === 'cancelled').length,
      urgent: allRequests.filter((r: any) => r.priority === 'urgent').length,
      high: allRequests.filter((r: any) => r.priority === 'high').length
    };

    return NextResponse.json({
      success: true,
      data: {
        requests: result.rows,
        stats
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

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      tenantId, 
      roomId, 
      buildingId, 
      title, 
      description, 
      category, 
      priority,
      scheduledDate 
    } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert maintenance request
    const insertQuery = `
      INSERT INTO maintenance_requests (
        tenant_id,
        room_id,
        building_id,
        title,
        description,
        category,
        priority,
        status,
        scheduled_date,
        request_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const values = [
      tenantId || null,
      roomId || null,
      buildingId || null,
      title,
      description,
      category,
      priority || 'medium',
      'open',
      scheduledDate || null
    ];

    const result = await pool.query(insertQuery, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Maintenance request created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      id, 
      status, 
      priority, 
      scheduledDate, 
      completedDate, 
      notes,
      assignedTo 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request ID is required' },
        { status: 400 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (scheduledDate !== undefined) {
      updates.push(`scheduled_date = $${paramIndex}`);
      params.push(scheduledDate || null);
      paramIndex++;
    }

    if (completedDate !== undefined) {
      updates.push(`completed_date = $${paramIndex}`);
      params.push(completedDate || null);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      params.push(assignedTo || null);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at would be updated, which means no actual changes
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add ID as last parameter
    params.push(id);

    const updateQuery = `
      UPDATE maintenance_requests 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Maintenance request updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request ID is required' },
        { status: 400 }
      );
    }

    const deleteQuery = 'DELETE FROM maintenance_requests WHERE id = $1 RETURNING id';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Maintenance request deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

