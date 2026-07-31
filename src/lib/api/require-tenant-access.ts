import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import { readPreviewCookie } from '@/lib/tenant-preview';

export interface TenantAccessRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  [key: string]: unknown;
}

export interface TenantAccess {
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
  tenant: TenantAccessRow;
  /** Linked auth user id when available */
  userId: string | null;
  isPreview: boolean;
  error: null;
}

export interface TenantAccessDenied {
  session: null;
  tenant: null;
  userId: null;
  isPreview: false;
  error: NextResponse;
}

/**
 * Resolve the current tenant for /api/tenant/* routes.
 * Allows real tenants, or admins with a valid short-lived preview cookie.
 * Mutations should pass allowMutation: false (default) for preview — preview is read-only.
 */
export async function requireTenantAccess(options?: {
  allowMutation?: boolean;
}): Promise<TenantAccess | TenantAccessDenied> {
  const allowMutation = options?.allowMutation ?? false;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      session: null,
      tenant: null,
      userId: null,
      isPreview: false,
      error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (session.user.role === 'tenant') {
    const tenant = await getTenantByUserId(session.user.id);
    if (!tenant) {
      return {
        session: null,
        tenant: null,
        userId: null,
        isPreview: false,
        error: NextResponse.json(
          { success: false, error: 'No tenant profile found' },
          { status: 404 }
        ),
      };
    }
    return {
      session,
      tenant: tenant as TenantAccessRow,
      userId: session.user.id,
      isPreview: false,
      error: null,
    };
  }

  if (session.user.role === 'admin') {
    const preview = await readPreviewCookie();
    if (!preview || preview.adminUserId !== session.user.id) {
      return {
        session: null,
        tenant: null,
        userId: null,
        isPreview: false,
        error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
      };
    }

    if (allowMutation) {
      return {
        session: null,
        tenant: null,
        userId: null,
        isPreview: false,
        error: NextResponse.json(
          {
            success: false,
            error: 'Preview is read-only',
            details: 'Exit tenant preview to make changes as an admin, or sign in as the tenant.',
          },
          { status: 403 }
        ),
      };
    }

    const result = await pool.query(
      `SELECT t.*, u.email as user_email, u.is_active as user_active
       FROM tenants t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [preview.tenantId]
    );

    if (result.rows.length === 0) {
      return {
        session: null,
        tenant: null,
        userId: null,
        isPreview: false,
        error: NextResponse.json(
          { success: false, error: 'Tenant not found for preview' },
          { status: 404 }
        ),
      };
    }

    const tenant = result.rows[0] as TenantAccessRow;
    return {
      session,
      tenant,
      userId: tenant.user_id,
      isPreview: true,
      error: null,
    };
  }

  return {
    session: null,
    tenant: null,
    userId: null,
    isPreview: false,
    error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
  };
}
