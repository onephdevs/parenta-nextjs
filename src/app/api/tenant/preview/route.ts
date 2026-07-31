import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  TENANT_PREVIEW_COOKIE,
  previewCookieOptions,
  readPreviewCookie,
} from '@/lib/tenant-preview';

/**
 * GET /api/tenant/preview — current preview status (admin + cookie).
 * DELETE /api/tenant/preview — exit preview from portal banner.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: true, data: { active: false } });
  }

  if (session.user.role === 'tenant') {
    return NextResponse.json({
      success: true,
      data: { active: false, isTenant: true },
    });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ success: true, data: { active: false } });
  }

  const preview = await readPreviewCookie();
  if (!preview || preview.adminUserId !== session.user.id) {
    return NextResponse.json({ success: true, data: { active: false } });
  }

  return NextResponse.json({
    success: true,
    data: {
      active: true,
      tenantId: preview.tenantId,
      tenantLabel: preview.tenantLabel,
      returnUrl: `/admin/tenants/${preview.tenantId}`,
      expiresAt: preview.exp,
    },
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, message: 'Preview ended' });
  response.cookies.set(TENANT_PREVIEW_COOKIE, '', previewCookieOptions(0));
  return response;
}
