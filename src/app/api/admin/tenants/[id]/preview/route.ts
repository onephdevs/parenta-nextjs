import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';
import {
  TENANT_PREVIEW_COOKIE,
  encodePreviewCookie,
  previewCookieOptions,
} from '@/lib/tenant-preview';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/tenants/[id]/preview
 * Start a read-only tenant portal preview for this tenant.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const result = await pool.query(
      `SELECT id, user_id, first_name, last_name, email
       FROM tenants
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenant = result.rows[0];
    if (!tenant.user_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No portal account',
          details:
            'This tenant has no linked login account yet, so there is no portal view to preview.',
        },
        { status: 400 }
      );
    }

    const label = `${tenant.first_name} ${tenant.last_name}`.trim() || tenant.email;
    const token = encodePreviewCookie({
      tenantId: tenant.id,
      tenantUserId: tenant.user_id,
      adminUserId: session!.user.id,
      tenantLabel: label,
    });

    logActivitySafe({
      actorUserId: session!.user.id,
      actorRole: 'admin',
      actionType: 'tenant.preview_started',
      category: 'tenants',
      entityType: 'tenant',
      entityId: tenant.id,
      entityLabel: label,
      afterData: { preview: true },
      link: `/admin/tenants/${tenant.id}`,
      metadata: { link: `/tenant` },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantLabel: label,
        portalUrl: '/tenant',
        returnUrl: `/admin/tenants/${tenant.id}`,
      },
      message: 'Tenant portal preview started',
    });

    response.cookies.set(TENANT_PREVIEW_COOKIE, token, previewCookieOptions());
    return response;
  } catch (err) {
    console.error('Start tenant preview error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start preview',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[id]/preview
 * End preview and clear cookie.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;

    logActivitySafe({
      actorUserId: session!.user.id,
      actorRole: 'admin',
      actionType: 'tenant.preview_ended',
      category: 'tenants',
      entityType: 'tenant',
      entityId: id,
      entityLabel: null,
      afterData: { preview: false },
      link: `/admin/tenants/${id}`,
      metadata: { link: `/admin/tenants/${id}` },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Tenant portal preview ended',
    });
    response.cookies.set(TENANT_PREVIEW_COOKIE, '', previewCookieOptions(0));
    return response;
  } catch (err) {
    console.error('End tenant preview error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to end preview',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
