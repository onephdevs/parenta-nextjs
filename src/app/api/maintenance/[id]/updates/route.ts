/**
 * GET/POST /api/maintenance/[id]/updates — progress thread (admin/staff)
 * POST also persists request fields (status, priority, assignee, dates, notes)
 * in the same request so forms do not need a separate Save.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getMaintenanceRequestById,
  updateMaintenanceRequest,
} from '@/lib/api/maintenance';
import {
  createMaintenanceUpdate,
  getMaintenanceTenantNotifyUserId,
  listMaintenanceUpdates,
  notifyTenantMaintenanceChange,
} from '@/lib/api/maintenance-updates';
import { ensureMaintenancePipelineCard } from '@/lib/api/pipeline';
import { maintenanceStatusAfterOfficeReply } from '@/lib/constants/maintenance';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function formHas(form: FormData, key: string): boolean {
  return form.has(key);
}

function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const request = await getMaintenanceRequestById(id);
    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    const updates = await listMaintenanceUpdates(id, session.user.id);
    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    console.error('GET /api/maintenance/[id]/updates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load updates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getMaintenanceRequestById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    const form = await request.formData();
    const body = formString(form, 'body');
    const status = formHas(form, 'status') ? formString(form, 'status') : undefined;
    const priority = formHas(form, 'priority') ? formString(form, 'priority') : undefined;
    const assignedTo = formHas(form, 'assignedTo')
      ? formString(form, 'assignedTo') || null
      : undefined;
    const scheduledDate = formHas(form, 'scheduledDate')
      ? formString(form, 'scheduledDate') || null
      : undefined;
    const completedDate = formHas(form, 'completedDate')
      ? formString(form, 'completedDate') || null
      : undefined;
    const notes = formHas(form, 'notes') ? String(form.get('notes') ?? '') : undefined;
    const photoValue = form.get('photo');
    const photo =
      photoValue instanceof File && photoValue.size > 0 ? photoValue : null;

    if (!body && !photo) {
      return NextResponse.json(
        { success: false, error: 'Add a reply or photo before posting' },
        { status: 400 }
      );
    }

    const authorName =
      `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
      session.user.email ||
      'Staff';
    const authorRole = session.user.role === 'staff' ? 'staff' : 'admin';

    const effectiveStatus = maintenanceStatusAfterOfficeReply(
      String(existing.status || 'open'),
      status
    );
    const statusChanged = String(existing.status || '') !== effectiveStatus;

    const resolvedCompletedDate =
      completedDate !== undefined
        ? completedDate
        : effectiveStatus === 'completed' && !existing.completed_date
          ? new Date().toISOString().slice(0, 10)
          : undefined;

    // Persist all request fields in the same action as the conversation post.
    const fieldResult = await updateMaintenanceRequest({
      id,
      status: effectiveStatus,
      ...(priority !== undefined && priority
        ? { priority }
        : {}),
      ...(assignedTo !== undefined ? { assignedTo } : {}),
      ...(scheduledDate !== undefined ? { scheduledDate } : {}),
      ...(resolvedCompletedDate !== undefined
        ? { completedDate: resolvedCompletedDate }
        : {}),
      ...(notes !== undefined ? { notes } : {}),
    });

    const updated =
      fieldResult.ok && 'updated' in fieldResult
        ? fieldResult.updated
        : existing;

    try {
      await ensureMaintenancePipelineCard({
        requestId: id,
        title: String(updated.title || existing.title || 'Maintenance'),
        description:
          updated.description != null
            ? String(updated.description)
            : existing.description != null
              ? String(existing.description)
              : null,
        status: updated.status != null ? String(updated.status) : effectiveStatus,
        priority:
          updated.priority != null ? String(updated.priority) : priority,
        category:
          updated.category != null ? String(updated.category) : undefined,
        tenantId: updated.tenant_id != null ? String(updated.tenant_id) : null,
        roomId: updated.room_id != null ? String(updated.room_id) : null,
        buildingId:
          updated.building_id != null ? String(updated.building_id) : null,
        assignedTo:
          assignedTo !== undefined
            ? assignedTo
            : updated.assigned_to != null
              ? String(updated.assigned_to)
              : null,
      });
    } catch (err) {
      console.error('Pipeline sync after progress update failed:', err);
    }

    const noteParts: string[] = [];
    if (statusChanged) {
      noteParts.push(`Status set to ${effectiveStatus}`);
    }
    if (body) noteParts.push(body);

    const update = await createMaintenanceUpdate({
      requestId: id,
      authorRole,
      authorUserId: session.user.id,
      authorName,
      body: noteParts.join(' — ') || (photo ? 'Photo update' : 'Update'),
      updateType: statusChanged ? 'status_change' : 'progress',
      photo,
    });

    const notify = await getMaintenanceTenantNotifyUserId(id);
    notifyTenantMaintenanceChange({
      actorUserId: session.user.id || null,
      actorRole: authorRole,
      actionType: statusChanged
        ? 'maintenance.status_changed'
        : 'maintenance.progress',
      requestId: id,
      title: notify.title,
      tenantUserId: notify.userId,
      afterData: {
        body: update.body,
        status: effectiveStatus,
        assignedTo:
          assignedTo !== undefined ? assignedTo : existing.assigned_to,
        hasPhoto: Boolean(update.photoUrl),
      },
      summary: update.body,
    });

    const updates = await listMaintenanceUpdates(id, session.user.id);
    return NextResponse.json({
      success: true,
      data: {
        update,
        updates,
        request: {
          status: updated.status,
          priority: updated.priority,
          assignedTo: updated.assigned_to,
          scheduledDate: updated.scheduled_date,
          completedDate: updated.completed_date,
          notes: updated.notes,
        },
      },
      message: 'Update posted',
    });
  } catch (error) {
    console.error('POST /api/maintenance/[id]/updates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post update',
      },
      { status: 500 }
    );
  }
}
