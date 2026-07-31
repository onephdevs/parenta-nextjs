import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getExpenseById, updateExpense, deleteExpense } from '@/lib/api/expenses';
import { logActivitySafe } from '@/lib/services/activity-logger';

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
    
    const expense = await getExpenseById(id);
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense' },
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

    // Validate category if provided
    if (body.expenseCategory) {
      const validCategories = ['maintenance', 'utilities', 'supplies', 'services', 'insurance', 'taxes', 'other'];
      if (!validCategories.includes(body.expenseCategory)) {
        return NextResponse.json(
          { error: 'Invalid expense category' },
          { status: 400 }
        );
      }
    }

    // Validate date if provided
    if (body.expenseDate) {
      const date = new Date(body.expenseDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expense date format' },
          { status: 400 }
        );
      }
    }

    const before = await getExpenseById(id);
    const expense = await updateExpense(id, body);

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'expense.updated',
      category: 'expenses',
      entityType: 'expense',
      entityId: id,
      entityLabel: expense.description || before?.description || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: expense as unknown as Record<string, unknown>,
      link: '/admin/financial/expenses',
      metadata: { link: '/admin/financial/expenses' },
    });
    
    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update expense' },
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
    const before = await getExpenseById(id);
    
    await deleteExpense(id);

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'expense.deleted',
      category: 'expenses',
      entityType: 'expense',
      entityId: id,
      entityLabel: before?.description || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: null,
      link: '/admin/financial/expenses',
      metadata: { link: '/admin/financial/expenses' },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}

