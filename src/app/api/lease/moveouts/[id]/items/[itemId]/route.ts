import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getMoveoutRefundWorksheet,
  updateInspectionItem,
} from '@/lib/services/moveout-inspection-service';
import type { InspectionFindingStatus } from '@/lib/constants/moveout-inspection';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PATCH /api/lease/moveouts/[id]/items/[itemId]
 * Update finding status + manual deduction amount for one checklist row.
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

    const { id, itemId } = await params;
    const body = await request.json();

    await updateInspectionItem(itemId, {
      findingStatus: body.findingStatus as InspectionFindingStatus | undefined,
      deductionAmount:
        body.deductionAmount != null
          ? Number(body.deductionAmount)
          : undefined,
      notes: body.notes,
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
            : 'Failed to update inspection item',
      },
      { status: 500 }
    );
  }
}
