import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUtilityBillById, updateUtilityBill, deleteUtilityBill } from '@/lib/api/utilities';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const bill = await getUtilityBillById(id);
    
    if (!bill) {
      return NextResponse.json({ error: 'Utility bill not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error fetching utility bill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch utility bill' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No update data provided' },
        { status: 400 }
      );
    }

    // Validate amount if provided
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      body.amount = amount;
    }

    // Validate utility type if provided
    if (body.utilityType) {
      const validTypes = ['electricity', 'water', 'gas', 'internet', 'cable', 'waste', 'other'];
      if (!validTypes.includes(body.utilityType)) {
        return NextResponse.json(
          { error: 'Invalid utility type' },
          { status: 400 }
        );
      }
    }

    // Validate bill status if provided
    if (body.billStatus) {
      const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
      if (!validStatuses.includes(body.billStatus)) {
        return NextResponse.json(
          { error: 'Invalid bill status' },
          { status: 400 }
        );
      }
    }

    // Validate dates if provided
    if (body.billingPeriodStart) {
      const date = new Date(body.billingPeriodStart);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid billing period start date' },
          { status: 400 }
        );
      }
      body.billingPeriodStart = date;
    }

    if (body.billingPeriodEnd) {
      const date = new Date(body.billingPeriodEnd);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid billing period end date' },
          { status: 400 }
        );
      }
      body.billingPeriodEnd = date;
    }

    if (body.dueDate) {
      const date = new Date(body.dueDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date' },
          { status: 400 }
        );
      }
      body.dueDate = date;
    }

    const bill = await updateUtilityBill(id, body);
    
    return NextResponse.json({
      success: true,
      data: bill,
      message: 'Utility bill updated successfully'
    });
  } catch (error) {
    console.error('Error updating utility bill:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Utility bill not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update utility bill' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    await deleteUtilityBill(id);
    
    return NextResponse.json({
      success: true,
      message: 'Utility bill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting utility bill:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Utility bill not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete utility bill' },
      { status: 500 }
    );
  }
}
