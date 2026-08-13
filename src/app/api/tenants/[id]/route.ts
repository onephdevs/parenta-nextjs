import { NextResponse } from 'next/server';
import { getTenantById, updateTenant, deleteTenant, deactivateTenant, TenantHistoryProtectedError } from '../../../../lib/api/tenants';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    
    const tenant = await getTenantById(id);
    
    if (!tenant) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tenant not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const tenantData = await request.json();
    const before = await getTenantById(id);
    
    // Validate email format if provided
    if (tenantData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tenantData.email)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid email format',
            details: 'Please provide a valid email address'
          },
          { status: 400 }
        );
      }
    }

    // Convert date strings to Date objects if provided
    if (tenantData.dateOfBirth) {
      tenantData.dateOfBirth = new Date(tenantData.dateOfBirth);
    }
    
    const tenant = await updateTenant(id, tenantData);
    const label =
      `${tenant.firstName || tenant.first_name || before?.firstName || ''} ${tenant.lastName || tenant.last_name || before?.lastName || ''}`.trim() ||
      tenant.email ||
      id;
    const statusChanged =
      tenantData.tenantStatus != null &&
      before &&
      String(before.tenantStatus || before.tenant_status) !== String(tenantData.tenantStatus);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: statusChanged ? 'tenant.status_changed' : 'tenant.updated',
      category: 'tenants',
      entityType: 'tenant',
      entityId: id,
      entityLabel: label,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: tenant as unknown as Record<string, unknown>,
      link: `/admin/tenants/${id}`,
      metadata: { link: `/admin/tenants/${id}` },
    });
    
    return NextResponse.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Tenant not found'
          },
          { status: 404 }
        );
      }
      if (error.message.includes('duplicate key value')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already exists',
            details: 'A tenant with this email address already exists'
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode'); // 'deactivate' soft-ends tenancy
    const before = await getTenantById(id);
    const label = before
      ? `${before.firstName || before.first_name || ''} ${before.lastName || before.last_name || ''}`.trim() ||
        before.email ||
        id
      : id;

    if (mode === 'deactivate') {
      await deactivateTenant(id);
      logActivitySafe({
        actorUserId: session?.user?.id || null,
        actorRole: 'admin',
        actionType: 'tenant.deactivated',
        category: 'tenants',
        entityType: 'tenant',
        entityId: id,
        entityLabel: label,
        beforeData: before as unknown as Record<string, unknown>,
        afterData: { isTenant: false, tenantStatus: 'terminated' },
        link: `/admin/tenants/${id}`,
        metadata: { link: `/admin/tenants/${id}` },
      });
      return NextResponse.json({
        success: true,
        message: 'Person deactivated. Occupancy history retained.',
      });
    }
    
    await deleteTenant(id);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'tenant.deleted',
      category: 'tenants',
      entityType: 'tenant',
      entityId: id,
      entityLabel: label,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: null,
      link: '/admin/tenants',
      metadata: { link: '/admin/tenants' },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Delete tenant error:', error);

    if (error instanceof TenantHistoryProtectedError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete person with occupancy history',
          details: error.message,
          code: 'HISTORY_PROTECTED',
          hint: 'Use ?mode=deactivate to end tenancy without deleting history.',
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete tenant',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 