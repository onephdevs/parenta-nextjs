import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getExpenses, createExpense } from '@/lib/api/expenses';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const buildingIdParam = searchParams.get('buildingId');
    const roomIdParam = searchParams.get('roomId');
    const vendor = searchParams.get('vendor') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Build filters
    const filters: Record<string, unknown> = {};
    if (search) filters.search = search;
    if (category) filters.category = category;
    if (buildingIdParam) filters.buildingId = buildingIdParam;
    if (roomIdParam) filters.roomId = roomIdParam;
    if (vendor) filters.vendor = vendor;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await getExpenses(filters, page, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { amount, category, description, expenseDate } = body;
    
    if (!amount || !category || !description || !expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, category, description, expenseDate' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate category - must match all options in ExpenseForm dropdown
    const validCategories = [
      'cleaning',
      'maintenance',
      'repair',
      'upgrade',
      'garbage_collection',
      'worker_wages',
      'utilities',
      'supplies',
      'services',
      'insurance',
      'taxes',
      'other'
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate date format
    const expenseDateObj = new Date(expenseDate);
    if (isNaN(expenseDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expense date format' },
        { status: 400 }
      );
    }

    const expenseData = {
      buildingId: body.buildingId ? String(body.buildingId) : undefined,
      roomId: body.roomId ? String(body.roomId) : undefined,
      amount: amountNum,
      category,
      description,
      vendor: body.vendor || '',
      expenseDate,
      receiptUrl: body.receiptUrl || '',
      notes: body.notes || '',
    };

    const expense = await createExpense(expenseData);
    const expenseId = String(expense.id || '');

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'expense.created',
      category: 'expenses',
      entityType: 'expense',
      entityId: expenseId || null,
      entityLabel: description,
      afterData: expense as unknown as Record<string, unknown>,
      link: '/admin/financial/expenses',
      metadata: { link: '/admin/financial/expenses' },
    });
    
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
} 