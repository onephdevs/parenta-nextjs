/**
 * POST /api/maintenance/updates/[id]/reactions
 * Toggle like/heart on a progress message (admin, staff, or owning tenant).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import {
  getMaintenanceUpdateById,
  toggleMaintenanceUpdateReaction,
  type MaintenanceReactionType,
} from '@/lib/api/maintenance-updates';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role;
    const { id: updateId } = await params;
    const update = await getMaintenanceUpdateById(updateId);
    if (!update) {
      return NextResponse.json(
        { success: false, error: 'Update not found' },
        { status: 404 }
      );
    }

    const requestId = String(update.maintenance_request_id);
    if (role === 'tenant') {
      const tenant = await getTenantByUserId(session.user.id);
      if (!tenant) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const owned = await pool.query(
        `SELECT id FROM maintenance_requests
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
        [requestId, tenant.id]
      );
      if (owned.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    } else if (role !== 'admin' && role !== 'staff') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reaction = String(body.reaction || '').trim().toLowerCase();
    if (reaction !== 'like' && reaction !== 'heart') {
      return NextResponse.json(
        { success: false, error: 'reaction must be like or heart' },
        { status: 400 }
      );
    }

    const reactions = await toggleMaintenanceUpdateReaction({
      updateId,
      userId: session.user.id,
      reaction: reaction as MaintenanceReactionType,
    });

    return NextResponse.json({
      success: true,
      data: { updateId, reactions },
    });
  } catch (error) {
    console.error('POST /api/maintenance/updates/[id]/reactions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reaction',
      },
      { status: 500 }
    );
  }
}
