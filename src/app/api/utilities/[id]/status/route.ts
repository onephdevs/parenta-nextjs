import { NextRequest, NextResponse } from 'next/server';
import { updateBillStatus } from '../../../../../lib/api/utilities';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    
    if (!status || !['pending', 'paid', 'overdue', 'disputed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, paid, overdue, disputed' },
        { status: 400 }
      );
    }

    const updatedBill = await updateBillStatus(id, status);
    
    return NextResponse.json(updatedBill);
  } catch (error: unknown) {
    console.error('Error in PUT /api/utilities/[id]/status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update bill status';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 