/**
 * PATCH /api/tenant/maintenance/[id]
 * Tenant can acknowledge, leave feedback/rating, or close — not delete.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool, { isTransientDbError } from '@/lib/db';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import {
  createMaintenanceUpdate,
  listMaintenanceUpdates,
} from '@/lib/api/maintenance-updates';
import { ensureMaintenancePipelineCard } from '@/lib/api/pipeline';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { resolveTenantAvatarUrl } from '@/lib/api/user-profile-extras';
import { getImageUrl } from '@/lib/format/image-url';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const result = await pool.query(
      `SELECT mr.*, r.room_number, b.name AS building_name
       FROM maintenance_requests mr
       LEFT JOIN rooms r ON mr.room_id = r.id
       LEFT JOIN buildings b ON mr.building_id = b.id
       WHERE mr.id = $1 AND mr.tenant_id = $2
       LIMIT 1`,
      [id, access.tenant.id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const updates = await listMaintenanceUpdates(id, access.userId);
    const { listAttachmentsForRequests } = await import(
      '@/lib/api/maintenance-attachments'
    );
    const attachmentMap = await listAttachmentsForRequests([id]);
    const attachments = attachmentMap.get(id) || [];
    const row = result.rows[0];
    const rawAvatar = await resolveTenantAvatarUrl({
      profilePictureUrl:
        (access.tenant.profile_picture_url as string | null | undefined) || null,
      userId:
        access.userId ||
        (access.tenant.user_id ? String(access.tenant.user_id) : null),
    });
    const tenantAvatarUrl = rawAvatar ? getImageUrl(rawAvatar) : null;
    return NextResponse.json({
      success: true,
      data: {
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
        tenantAvatarUrl,
        attachments,
        attachmentCount: attachments.length,
        updates,
      },
    });
  } catch (error) {
    const retryable = isTransientDbError(error);
    console.error('GET /api/tenant/maintenance/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: retryable
          ? 'Temporarily unavailable. Please try again.'
          : 'Failed to load request',
        retryable,
      },
      { status: retryable ? 503 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { id } = await params;
    const existing = await pool.query(
      `SELECT * FROM maintenance_requests WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, access.tenant.id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let action = '';
    let note = '';
    let rating: number | null = null;
    let photo: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      action = String(form.get('action') || '').trim();
      note = String(form.get('note') || form.get('feedback') || '').trim();
      const ratingValue = form.get('rating');
      rating =
        ratingValue != null && String(ratingValue) !== ''
          ? Number(ratingValue)
          : null;
      const photoValue = form.get('photo');
      photo =
        photoValue instanceof File && photoValue.size > 0 ? photoValue : null;
    } else {
      const body = await request.json();
      action = String(body.action || '').trim();
      note = String(body.note || body.feedback || '').trim();
      rating =
        body.rating != null && body.rating !== ''
          ? Number(body.rating)
          : null;
    }

    if (!['acknowledge', 'feedback', 'close', 'reply'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'action must be acknowledge, feedback, close, or reply',
        },
        { status: 400 }
      );
    }

    const authorName =
      `${access.tenant.first_name || ''} ${access.tenant.last_name || ''}`.trim() ||
      'Tenant';

    if (action === 'reply') {
      if (!note && !photo) {
        return NextResponse.json(
          { success: false, error: 'Write a reply or attach a photo before sending' },
          { status: 400 }
        );
      }
      await createMaintenanceUpdate({
        requestId: id,
        authorRole: 'tenant',
        authorUserId: access.userId,
        authorName,
        body: note || (photo ? 'Photo attached' : ''),
        updateType: 'reply',
        photo,
      });
      await pool.query(
        `UPDATE maintenance_requests SET updated_at = NOW() WHERE id = $1`,
        [id]
      );
    } else if (action === 'close') {
      await pool.query(
        `UPDATE maintenance_requests
         SET status = 'closed',
             completed_date = COALESCE(completed_date, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
      await createMaintenanceUpdate({
        requestId: id,
        authorRole: 'tenant',
        authorUserId: access.userId,
        authorName,
        body: note || 'Closed by tenant',
        updateType: 'closed',
        rating: rating && rating >= 1 && rating <= 5 ? rating : null,
      });
    } else if (action === 'acknowledge') {
      await createMaintenanceUpdate({
        requestId: id,
        authorRole: 'tenant',
        authorUserId: access.userId,
        authorName,
        body: note || 'Acknowledged service',
        updateType: 'acknowledgement',
      });
    } else {
      if (!note && !(rating && rating >= 1 && rating <= 5)) {
        return NextResponse.json(
          { success: false, error: 'Add feedback or a rating' },
          { status: 400 }
        );
      }
      await createMaintenanceUpdate({
        requestId: id,
        authorRole: 'tenant',
        authorUserId: access.userId,
        authorName,
        body: note || 'Feedback submitted',
        updateType: 'feedback',
        rating: rating && rating >= 1 && rating <= 5 ? rating : null,
      });
    }

    const refreshed = await pool.query(
      `SELECT * FROM maintenance_requests WHERE id = $1 LIMIT 1`,
      [id]
    );
    const row = refreshed.rows[0];
    try {
      await ensureMaintenancePipelineCard({
        requestId: id,
        title: String(row.title || 'Maintenance'),
        description: row.description != null ? String(row.description) : null,
        status: String(row.status || 'closed'),
        priority: row.priority != null ? String(row.priority) : null,
        category: row.category != null ? String(row.category) : null,
        tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
        roomId: row.room_id != null ? String(row.room_id) : null,
        buildingId: row.building_id != null ? String(row.building_id) : null,
      });
    } catch (err) {
      console.error('Pipeline sync after tenant maintenance action failed:', err);
    }

    logActivitySafe({
      actorUserId: access.userId || null,
      actorRole: 'tenant',
      actionType:
        action === 'close'
          ? 'maintenance.closed'
          : action === 'acknowledge'
            ? 'maintenance.acknowledged'
            : action === 'reply'
              ? 'maintenance.reply'
              : 'maintenance.feedback',
      category: 'maintenance',
      entityType: 'maintenance_request',
      entityId: id,
      entityLabel: String(row.title || 'Maintenance'),
      afterData: { action, note: note || null, rating },
      link: '/admin/tasks?board=maintenance',
      metadata: {
        link: '/admin/tasks?board=maintenance',
        summary: note || undefined,
      },
    });

    const updates = await listMaintenanceUpdates(id, access.userId);
    return NextResponse.json({
      success: true,
      data: {
        status: row.status,
        updates,
      },
      message:
        action === 'close'
          ? 'Request closed'
          : action === 'acknowledge'
            ? 'Service acknowledged'
            : action === 'reply'
              ? 'Reply sent'
              : 'Feedback sent',
    });
  } catch (error) {
    console.error('PATCH /api/tenant/maintenance/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update request',
      },
      { status: 500 }
    );
  }
}
