import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';

export async function GET() {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const tenantId = access.tenant.id;

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
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

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
      FROM tenants t
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id 
        AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      WHERE t.id = $1
    `;
    
    const tenantResult = await pool.query(tenantQuery, [access.tenant.id]);

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
    const created = result.rows[0];

    try {
      const { ensureMaintenancePipelineCard } = await import('@/lib/api/pipeline');
      await ensureMaintenancePipelineCard({
        requestId: String(created.id),
        title: String(created.title || title),
        description: created.description != null ? String(created.description) : description,
        status: created.status != null ? String(created.status) : 'open',
        priority: created.priority != null ? String(created.priority) : priority || 'medium',
        category: created.category != null ? String(created.category) : category,
        tenantId: created.tenant_id != null ? String(created.tenant_id) : String(tenant_id),
        roomId: created.room_id != null ? String(created.room_id) : null,
        buildingId: created.building_id != null ? String(created.building_id) : null,
      });
    } catch (pipelineErr) {
      console.error('Maintenance pipeline card sync failed:', pipelineErr);
    }

    logActivitySafe({
      actorUserId: access.session.user.id || null,
      actorRole: 'tenant',
      actionType: 'maintenance.requested',
      category: 'maintenance',
      entityType: 'maintenance_request',
      entityId: String(created.id),
      entityLabel: title,
      afterData: created as Record<string, unknown>,
      link: '/admin/tasks?board=maintenance',
      metadata: { link: '/admin/tasks?board=maintenance', tenantId: tenant_id },
    });

    return NextResponse.json({
      success: true,
      data: created,
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
