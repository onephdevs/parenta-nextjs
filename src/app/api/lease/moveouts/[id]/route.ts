import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  finalizeMoveOutSettlement,
  getMoveoutRefundWorksheet,
  saveInspectionSummary,
} from '@/lib/services/moveout-inspection-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lease/moveouts/[id] — inspection checklist + refund worksheet
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const worksheet = await getMoveoutRefundWorksheet(id);
    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: 'Move-out not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: worksheet });
  } catch (error) {
    console.error('Error loading move-out worksheet:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to load move-out',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lease/moveouts/[id] — save inspection summary notes
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    await saveInspectionSummary(id, {
      inspectionNotes: body.inspectionNotes,
      inspectionPassed: body.inspectionPassed,
      inspectionCompletedDate: body.inspectionCompletedDate,
      markInspectionCompleted: Boolean(body.markInspectionCompleted),
    });

    const worksheet = await getMoveoutRefundWorksheet(id);
    return NextResponse.json({ success: true, data: worksheet });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update inspection',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lease/moveouts/[id] — finalize settlement (manual refund amounts)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const actualMoveoutDate = String(
      body.actualMoveoutDate || body.actual_moveout_date || ''
    );
    if (!actualMoveoutDate) {
      return NextResponse.json(
        { success: false, error: 'actualMoveoutDate is required' },
        { status: 400 }
      );
    }

    const result = await finalizeMoveOutSettlement(id, {
      actualMoveoutDate,
      depositReturnAmount: Number(body.depositReturnAmount ?? 0),
      depositDeductionAmount: Number(body.depositDeductionAmount ?? 0),
      deductionReason: body.deductionReason,
      advanceReturnAmount: Number(body.advanceReturnAmount ?? 0),
      utilityDepositReturnAmount: Number(
        body.utilityDepositReturnAmount ?? 0
      ),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    const worksheet = await getMoveoutRefundWorksheet(id);
    return NextResponse.json({
      success: true,
      message: result.message,
      data: worksheet,
    });
  } catch (error) {
    console.error('Error finalizing move-out:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to finalize move-out',
      },
      { status: 500 }
    );
  }
}
