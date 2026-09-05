import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
} from '@/lib/api/maintenance';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { requests, stats } = await listMaintenanceRequests({
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      category: searchParams.get('category'),
      buildingId: searchParams.get('buildingId'),
      limit: Number(searchParams.get('limit') || 100),
    });

    return NextResponse.json({
      success: true,
      data: {
        requests,
        stats,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching maintenance requests:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let tenantId: string | undefined;
    let roomId: string | undefined;
    let buildingId: string | undefined;
    let title = '';
    let description = '';
    let category = '';
    let priority = 'medium';
    let scheduledDate: string | undefined;
    let photoFiles: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      tenantId = String(form.get('tenantId') || '').trim() || undefined;
      roomId = String(form.get('roomId') || '').trim() || undefined;
      buildingId = String(form.get('buildingId') || '').trim() || undefined;
      title = String(form.get('title') || '').trim();
      description = String(form.get('description') || '').trim();
      category = String(form.get('category') || '').trim();
      priority = String(form.get('priority') || 'medium').trim() || 'medium';
      scheduledDate = String(form.get('scheduledDate') || '').trim() || undefined;
      photoFiles = form
        .getAll('photos')
        .filter((v): v is File => typeof File !== 'undefined' && v instanceof File && v.size > 0);
    } else {
      const body = await request.json();
      tenantId = body.tenantId;
      roomId = body.roomId;
      buildingId = body.buildingId;
      title = String(body.title || '').trim();
      description = String(body.description || '').trim();
      category = String(body.category || '').trim();
      priority = String(body.priority || 'medium').trim() || 'medium';
      scheduledDate = body.scheduledDate;
    }

    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const created = await createMaintenanceRequest({
      tenantId,
      roomId,
      buildingId,
      title,
      description,
      category,
      priority,
      scheduledDate,
    });

    let attachments: { id: string }[] = [];
    let photoWarning: string | null = null;
    if (photoFiles.length > 0) {
      try {
        const { saveMaintenancePhotos, MAX_PHOTOS } = await import(
          '@/lib/api/maintenance-attachments'
        );
        attachments = await saveMaintenancePhotos({
          maintenanceRequestId: String(created.id),
          files: photoFiles.slice(0, MAX_PHOTOS),
          tenantId: tenantId || null,
        });
      } catch (photoErr) {
        console.error('Admin maintenance photo upload failed:', photoErr);
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
        priority: created.priority != null ? String(created.priority) : priority,
        category: created.category != null ? String(created.category) : category,
        tenantId: created.tenant_id != null ? String(created.tenant_id) : tenantId,
        roomId: created.room_id != null ? String(created.room_id) : roomId,
        buildingId:
          created.building_id != null ? String(created.building_id) : buildingId,
      });
    } catch (pipelineErr) {
      console.error('Maintenance pipeline card sync failed:', pipelineErr);
    }

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
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
        attachmentCount: attachments.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...created, attachments },
      message: photoWarning
        ? `Maintenance request created. ${photoWarning}`
        : 'Maintenance request created successfully',
      warning: photoWarning || undefined,
    });
  } catch (error) {
    console.error('❌ Error creating maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error',
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
      assignedTo,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request ID is required' },
        { status: 400 }
      );
    }

    const result = await updateMaintenanceRequest({
      id,
      status,
      priority,
      scheduledDate,
      completedDate,
      notes,
      assignedTo,
    });

    if (!result.ok && result.reason === 'no_fields') {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    if (!result.ok && result.reason === 'not_found') {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    const { before, updated } = result;
    const statusChanged =
      status !== undefined && String(before.status) !== String(status);
    const actionType =
      status === 'completed'
        ? 'maintenance.completed'
        : statusChanged
          ? 'maintenance.status_changed'
          : 'maintenance.updated';

    try {
      const { ensureMaintenancePipelineCard } = await import('@/lib/api/pipeline');
      await ensureMaintenancePipelineCard({
        requestId: String(updated.id),
        title: String(updated.title || before.title || 'Maintenance'),
        description:
          updated.description != null
            ? String(updated.description)
            : before.description != null
              ? String(before.description)
              : null,
        status: updated.status != null ? String(updated.status) : status,
        priority: updated.priority != null ? String(updated.priority) : priority,
        category: updated.category != null ? String(updated.category) : undefined,
        tenantId: updated.tenant_id != null ? String(updated.tenant_id) : null,
        roomId: updated.room_id != null ? String(updated.room_id) : null,
        buildingId: updated.building_id != null ? String(updated.building_id) : null,
        assignedTo:
          assignedTo !== undefined
            ? assignedTo || null
            : updated.assigned_to != null
              ? String(updated.assigned_to)
              : null,
      });
    } catch (pipelineErr) {
      console.error('Maintenance pipeline card sync failed:', pipelineErr);
    }

    let tenantUserId: string | null = null;
    try {
      const { getMaintenanceTenantNotifyUserId } = await import(
        '@/lib/api/maintenance-updates'
      );
      const notify = await getMaintenanceTenantNotifyUserId(String(id));
      tenantUserId = notify.userId;
    } catch {
      // optional
    }

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType,
      category: 'maintenance',
      entityType: 'maintenance_request',
      entityId: String(id),
      entityLabel: updated.title || before.title || id,
      beforeData: before as Record<string, unknown>,
      afterData: updated as Record<string, unknown>,
      link: tenantUserId ? '/tenant/maintenance' : '/admin/tasks?board=maintenance',
      metadata: {
        link: tenantUserId ? '/tenant/maintenance' : '/admin/tasks?board=maintenance',
      },
      notifyUserIds: tenantUserId ? [tenantUserId] : undefined,
      notifyActor: false,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Maintenance request updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error',
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

    const result = await deleteMaintenanceRequest(id);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    const { before } = result;

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'maintenance.deleted',
      category: 'maintenance',
      entityType: 'maintenance_request',
      entityId: id,
      entityLabel: before.title || id,
      beforeData: before as Record<string, unknown>,
      afterData: null,
      link: '/admin/maintenance',
      metadata: { link: '/admin/maintenance' },
    });

    return NextResponse.json({
      success: true,
      message: 'Maintenance request deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting maintenance request:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete maintenance request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
