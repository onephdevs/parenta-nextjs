import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { bulkUpdateTenantStatus } from '@/lib/services/bulk-operations-service';

/**
 * PATCH /api/bulk/tenants/update-status
 * Bulk update tenant statuses
 * Body:
 *  - tenant_ids: string[]
 *  - status: 'active' | 'inactive' | 'terminated'
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { tenant_ids, status } = body;
    
    if (!tenant_ids || !Array.isArray(tenant_ids) || tenant_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tenant IDs provided' },
        { status: 400 }
      );
    }
    
    if (!status || !['active', 'inactive', 'terminated'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    const result = await bulkUpdateTenantStatus(tenant_ids, status);
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Updated ${result.updated} tenant(s) to ${status}`,
    });
  } catch (error) {
    console.error('Error updating tenant statuses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tenant statuses',
      },
      { status: 500 }
    );
  }
}

