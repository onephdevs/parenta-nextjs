import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMoveOuts } from '@/lib/services/lease-management-service';
import { startMoveOutWithChecklist } from '@/lib/services/moveout-inspection-service';

/**
 * GET /api/lease/moveouts — list move-outs
 * POST /api/lease/moveouts — initiate move-out + seed inspection checklist
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = request.nextUrl.searchParams.get('status') || undefined;
    const moveouts = await getAllMoveOuts(status || undefined);
    return NextResponse.json({ success: true, moveouts });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch move-outs',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tenantId = String(body.tenantId || body.tenant_id || '');
    const roomAssignmentId = String(
      body.roomAssignmentId || body.room_assignment_id || ''
    );
    const moveoutDate = String(body.moveoutDate || body.moveout_date || '');

    if (!tenantId || !roomAssignmentId || !moveoutDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'tenantId, roomAssignmentId, and moveoutDate are required',
        },
        { status: 400 }
      );
    }

    const result = await startMoveOutWithChecklist(
      {
        tenantId,
        roomAssignmentId,
        moveoutDate,
        noticeDate: body.noticeDate || body.notice_date,
        forwardingAddress: body.forwardingAddress || body.forwarding_address,
      },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Move-out initiated with inspection checklist',
    });
  } catch (error) {
    console.error('Error initiating move-out:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to initiate move-out',
      },
      { status: 500 }
    );
  }
}
