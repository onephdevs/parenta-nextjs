import { NextRequest, NextResponse } from 'next/server';
import { getUtilityBillById, updateUtilityBill, deleteUtilityBill } from '../../../../lib/api/utilities';
import { CreateUtilityBillData } from '../../../../types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bill = await getUtilityBillById(id);
    
    if (!bill) {
      return NextResponse.json(
        { error: 'Utility bill not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(bill);
  } catch (error) {
    console.error('Error in GET /api/utilities/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch utility bill' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: Partial<CreateUtilityBillData> = await request.json();
    
    // Convert date strings to Date objects if present
    const updateData: Partial<CreateUtilityBillData> = { ...body };
    if (body.billingPeriodStart) {
      updateData.billingPeriodStart = new Date(body.billingPeriodStart);
    }
    if (body.billingPeriodEnd) {
      updateData.billingPeriodEnd = new Date(body.billingPeriodEnd);
    }
    if (body.dueDate) {
      updateData.dueDate = new Date(body.dueDate);
    }

    const updatedBill = await updateUtilityBill(id, updateData);
    
    return NextResponse.json(updatedBill);
  } catch (error: unknown) {
    console.error('Error in PUT /api/utilities/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update utility bill';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteUtilityBill(id);
    
    return NextResponse.json({ message: 'Utility bill deleted successfully' });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/utilities/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete utility bill';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 