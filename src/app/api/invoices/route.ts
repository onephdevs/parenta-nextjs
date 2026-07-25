import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInvoices, createInvoice } from '@/lib/api/invoices';

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
    const status = searchParams.get('status') || '';
    const tenantIdParam = searchParams.get('tenantId');
    const roomIdParam = searchParams.get('roomId');
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Build filters
    const filters: Record<string, unknown> = {};
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (tenantIdParam) filters.tenantId = tenantIdParam;
    if (roomIdParam) filters.roomId = roomIdParam;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await getInvoices(filters, page, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
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
    
    // Validate required fields (roomId kept for UI context; invoices table has no room_id)
    const { tenantId, dueDate, items } = body;
    
    if (!tenantId || !dueDate || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, dueDate, items' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.description || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { error: 'Each item must have description, quantity, and unitPrice' },
          { status: 400 }
        );
      }
      
      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Item quantity and unitPrice must be positive numbers' },
          { status: 400 }
        );
      }
    }

    // Validate date format
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid due date format' },
        { status: 400 }
      );
    }

    // tenantId is a UUID — never parseInt
    const invoiceData = {
      tenantId: String(tenantId),
      dueDate,
      description: body.description || '',
      notes: body.notes || '',
      billingPeriodStart: body.billingPeriodStart || undefined,
      billingPeriodEnd: body.billingPeriodEnd || undefined,
      items: items.map((item: Record<string, unknown>) => ({
        description: item.description,
        quantity: parseFloat(item.quantity as string),
        unitPrice: parseFloat(item.unitPrice as string),
      })),
    };

    const invoice = await createInvoice(invoiceData);
    
    return NextResponse.json({ 
      success: true,
      data: { invoice } 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
} 