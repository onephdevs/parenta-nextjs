import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { terminateLeaseContract } from '@/lib/api/leases';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/leases/[id]/terminate
 * Ends the contract on paper. Does not vacate the room.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'caretaker')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { before, after } = await terminateLeaseContract(id, {
      plannedMoveOutDate: String(body.plannedMoveOutDate || body.moveOutDate || ''),
      reason: body.reason != null ? String(body.reason) : null,
    });

    const tenantLabel = `${after.tenantFirstName} ${after.tenantLastName}`.trim();
    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'lease.terminated',
      category: 'leases',
      entityType: 'assignment',
      entityId: after.id,
      entityLabel: `Lease · ${tenantLabel || after.id}`,
      beforeData: {
        endDate: before.endDate,
        plannedMoveOutDate: before.plannedMoveOutDate,
        contractTerminatedAt: before.contractTerminatedAt,
      },
      afterData: {
        endDate: after.endDate,
        plannedMoveOutDate: after.plannedMoveOutDate,
        contractTerminatedAt: after.contractTerminatedAt,
      },
      link: `/admin/leasing/${after.id}`,
      metadata: {
        reason: after.contractTerminatedReason,
        plannedMoveOutDate: after.plannedMoveOutDate,
        tenantId: after.tenantId,
        vacated: false,
        link: `/admin/leasing/${after.id}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: { lease: after },
      message: 'Lease ended on paper. The unit stays occupied until you End Assignment or finalize move-out.',
    });
  } catch (error) {
    console.error('POST /api/leases/[id]/terminate error:', error);
    const message = error instanceof Error ? error.message : 'Failed to terminate lease';
    const status =
      message === 'Lease not found'
        ? 404
        : message.includes('required') || message.includes('Only an occupied')
          ? 400
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
