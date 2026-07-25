import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInvoiceById, updateInvoice, deleteInvoice } from '@/lib/api/invoices';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidInvoiceId(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!isValidInvoiceId(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const invoice = await getInvoiceById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
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
    
    if (!isValidInvoiceId(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const body = await request.json();
    
    // Build updates object
    const updates: {
      status?: string;
      dueDate?: string;
      description?: string;
      notes?: string;
      paidAmount?: number;
    } = {};
    
    if (body.status !== undefined) updates.status = body.status;
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
    if (body.description !== undefined) updates.description = body.description;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.paidAmount !== undefined) updates.paidAmount = parseFloat(body.paidAmount);

    const invoice = await updateInvoice(id, updates);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
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
    
    if (!isValidInvoiceId(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const deleted = await deleteInvoice(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
