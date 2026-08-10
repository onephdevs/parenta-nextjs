/**
 * GET /api/maintenance/[id] — single maintenance request with photos (admin)
 * PUT handled by /api/maintenance with body.id
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMaintenanceRequestDetail } from '@/lib/api/maintenance';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const request = await getMaintenanceRequestDetail(id, session.user.id);
    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    console.error('GET /api/maintenance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load maintenance request' },
      { status: 500 }
    );
  }
}
