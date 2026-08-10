import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import {
  listAttachmentsForRequests,
  saveMaintenancePhotos,
  MAX_PHOTOS,
} from '@/lib/api/maintenance-attachments';

export async function GET() {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const tenantId = access.tenant.id;

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
    const attachmentMap = await listAttachmentsForRequests(
      result.rows.map((row: { id: string }) => String(row.id))
    );
    const { listMaintenanceUpdatesForRequests } = await import(
      '@/lib/api/maintenance-updates'
    );
    const updatesMap = await listMaintenanceUpdatesForRequests(
      result.rows.map((row: { id: string }) => String(row.id)),
      access.userId
    );

    const requests = result.rows.map((row: Record<string, unknown>) => ({
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
      buildingName: row.building_name,
      attachments: attachmentMap.get(String(row.id)) || [],
      attachmentCount: (attachmentMap.get(String(row.id)) || []).length,
      updates: updatesMap.get(String(row.id)) || [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests,
        total: requests.length,
        active: requests.filter(
          (r) =>
            r.status !== 'completed' &&
            r.status !== 'cancelled' &&
            r.status !== 'closed'
        ).length,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching maintenance requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch maintenance requests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function parseCreateBody(request: Request): Promise<{
  title: string;
  description: string;
  category: string;
  priority: string;
  files: File[];
}> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const title = String(form.get('title') || '').trim();
    const description = String(form.get('description') || '').trim();
    const category = String(form.get('category') || '').trim();
    const priority = String(form.get('priority') || 'medium').trim() || 'medium';

    const files: File[] = [];
    for (const [key, value] of form.entries()) {
      if (
        (key === 'photos' || key === 'photo' || key === 'files' || key.startsWith('photo')) &&
        value instanceof File &&
        value.size > 0
      ) {
        files.push(value);
      }
    }

    return { title, description, category, priority, files: files.slice(0, MAX_PHOTOS) };
  }

  const body = await request.json();
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || '').trim(),
    priority: String(body.priority || 'medium').trim() || 'medium',
    files: [],
  };
}

export async function POST(request: Request) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { title, description, category, priority, files } = await parseCreateBody(request);

    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
      'open',
    ];

    const result = await pool.query(insertQuery, values);
    const created = result.rows[0];

    let attachments: Awaited<ReturnType<typeof saveMaintenancePhotos>> = [];
    let photoWarning: string | null = null;
    if (files.length > 0) {
      try {
        attachments = await saveMaintenancePhotos({
          maintenanceRequestId: String(created.id),
          files,
          tenantId: String(tenant_id),
        });
      } catch (photoErr) {
        console.error('Maintenance photo upload failed:', photoErr);
        photoWarning =
          photoErr instanceof Error
            ? photoErr.message
            : 'Request saved but some photos could not be uploaded';
      }
    }

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
      actorUserId: access.userId || null,
      actorRole: 'tenant',
      actionType: 'maintenance.requested',
      category: 'maintenance',
      entityType: 'maintenance_request',
      entityId: String(created.id),
      entityLabel: title,
      afterData: { ...created, attachmentCount: attachments.length } as Record<
        string,
        unknown
      >,
      link: '/admin/tasks?board=maintenance',
      metadata: {
        link: '/admin/tasks?board=maintenance',
        tenantId: tenant_id,
        attachmentCount: attachments.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...created, attachments },
      message: photoWarning
        ? `Request submitted. ${photoWarning}`
        : 'Maintenance request submitted successfully',
      warning: photoWarning || undefined,
    });
  } catch (error) {
    console.error('❌ Error creating maintenance request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
