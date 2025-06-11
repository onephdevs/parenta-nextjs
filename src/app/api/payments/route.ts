import { NextResponse } from 'next/server';
import { getPayments, createPayment, PaymentFilters } from '@/lib/api/payments';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Parse filters
    const filters: PaymentFilters = {};
    
    if (searchParams.get('tenantId')) {
      filters.tenantId = searchParams.get('tenantId')!;
    }
    if (searchParams.get('paymentType')) {
      filters.paymentType = searchParams.get('paymentType')!;
    }
    if (searchParams.get('paymentStatus')) {
      filters.paymentStatus = searchParams.get('paymentStatus')!;
    }
    if (searchParams.get('paymentMethod')) {
      filters.paymentMethod = searchParams.get('paymentMethod')!;
    }
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    if (searchParams.get('minAmount')) {
      filters.minAmount = parseFloat(searchParams.get('minAmount')!);
    }
    if (searchParams.get('maxAmount')) {
      filters.maxAmount = parseFloat(searchParams.get('maxAmount')!);
    }
    
    const result = await getPayments(filters, page, limit);
    
    return NextResponse.json({
      success: true,
      data: result.payments,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const paymentData = await request.json();
    
    // Validate required fields
    if (!paymentData.tenantId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tenant ID is required',
          details: 'Please provide a valid tenant ID'
        },
        { status: 400 }
      );
    }
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valid amount is required',
          details: 'Amount must be greater than 0'
        },
        { status: 400 }
      );
    }
    
    if (!paymentData.paymentType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment type is required',
          details: 'Please specify the payment type (rent, deposit, fee, utilities, other)'
        },
        { status: 400 }
      );
    }
    
    if (!paymentData.paymentDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment date is required',
          details: 'Please provide a valid payment date'
        },
        { status: 400 }
      );
    }
    
    // Convert date strings to Date objects
    const createData = {
      ...paymentData,
      paymentDate: new Date(paymentData.paymentDate),
      dueDate: paymentData.dueDate ? new Date(paymentData.dueDate) : undefined,
    };
    
    const payment = await createPayment(createData);
    
    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Create payment error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key violation')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid tenant or room assignment',
            details: 'The specified tenant or room assignment does not exist'
          },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 