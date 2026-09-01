import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';
import {
  setTenantPortalPassword,
  TenantPortalPasswordError,
} from '@/lib/api/tenant-user-link';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tenants/[id]/password
 * Admin: generate or set a tenant portal password, optionally email it.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Tenant id is required' }, { status: 400 });
    }

    let body: { password?: unknown; sendEmail?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const password =
      typeof body.password === 'string' && body.password.length > 0 ? body.password : undefined;
    const sendEmail = Boolean(body.sendEmail);

    const result = await setTenantPortalPassword({
      tenantId: id,
      password,
      sendEmail,
    });

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'tenant.password_reset',
      category: 'tenants',
      entityType: 'tenant',
      entityId: id,
      entityLabel: result.tenantLabel,
      afterData: {
        createdNewLogin: result.createdNewLogin,
        emailSent: result.emailSent,
      },
      link: `/admin/tenants/${id}`,
      metadata: {
        link: `/admin/tenants/${id}`,
        createdNewLogin: result.createdNewLogin,
        emailSent: result.emailSent,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.createdNewLogin
        ? 'Portal login created'
        : 'Portal password updated',
      data: {
        userId: result.userId,
        createdNewLogin: result.createdNewLogin,
        temporaryPassword: result.temporaryPassword,
        emailSent: result.emailSent,
        emailedTo: result.emailedTo,
      },
    });
  } catch (err) {
    if (err instanceof TenantPortalPasswordError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.status }
      );
    }

    console.error('Tenant portal password error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update portal password',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
