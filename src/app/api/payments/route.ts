import { NextResponse } from 'next/server';
import { getPayments, createPayment, PaymentFilters } from '@/lib/api/payments';
import { requireAdminOrCaretaker } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';
import pool from '@/lib/db';
import { invalidateDashboardCache } from '@/lib/cache/memory-cache';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdminOrCaretaker();
    if (error) return error;

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
    const { session, error } = await requireAdminOrCaretaker();
    if (error) return error;

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
          details: 'Please specify the payment type (rent, deposit, advance, late_fee, utility, asset_rental, other)'
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

    const amount = Number(paymentData.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required', details: 'Amount must be a number greater than 0' },
        { status: 400 }
      );
    }

    const paymentDate = new Date(paymentData.paymentDate);
    const dueDate = paymentData.dueDate ? new Date(paymentData.dueDate) : paymentDate;
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment date', details: 'Please provide a valid payment date' },
        { status: 400 }
      );
    }

    const paymentMethod = paymentData.paymentMethod ? String(paymentData.paymentMethod).toLowerCase().replace(/\s+/g, '_') : undefined;
    
    const createData = {
      ...paymentData,
      amount,
      paymentDate,
      dueDate,
      paymentMethod: paymentMethod || paymentData.paymentMethod,
    };

    const shouldAllocate =
      paymentData.autoAllocate !== false && paymentData.paymentType === 'rent';

    const client = await pool.connect();
    let payment;
    let allocationResult;

    try {
      await client.query('BEGIN');
      payment = await createPayment(createData, client);

      if (shouldAllocate) {
        const { allocatePaymentToInvoices } = await import(
          '@/lib/services/payment-allocator'
        );
        allocationResult = await allocatePaymentToInvoices(
          {
            paymentId: payment.id.toString(),
            tenantId: paymentData.tenantId,
            paymentAmount: payment.amount,
            depositAmount: paymentData.depositAmount || 0,
            useDeposit: paymentData.useDeposit !== false,
          },
          client
        );
      }

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    invalidateDashboardCache();
    
    // Create detailed response message
    let detailedMessage = 'Payment recorded successfully';
    const allocationDetails: any = {};
    
    if (allocationResult) {
      allocationDetails.invoicesPaid = allocationResult.allocations?.length || 0;
      allocationDetails.totalAllocated = allocationResult.totalAllocated || 0;
      allocationDetails.creditCreated = allocationResult.creditAmount || 0;
      allocationDetails.invoices = allocationResult.allocations || [];
      
      detailedMessage = allocationResult.message || 'Payment allocated successfully';
    }

    const paymentId = String(payment.id);
    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'payment.recorded',
      category: 'payments',
      entityType: 'payment',
      entityId: paymentId,
      entityLabel: `₱${Number(payment.amount).toLocaleString()} (${paymentData.paymentType})`,
      afterData: payment as unknown as Record<string, unknown>,
      link: paymentData.tenantId ? `/admin/tenants/${paymentData.tenantId}` : '/admin/financial/payments',
      metadata: {
        link: paymentData.tenantId ? `/admin/tenants/${paymentData.tenantId}` : '/admin/financial/payments',
        tenantId: paymentData.tenantId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        payment,
        allocation: allocationResult || null
      },
      message: detailedMessage,
      allocationDetails: allocationDetails.invoicesPaid > 0 ? allocationDetails : null
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
    
    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create payment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create payment',
        details
      },
      { status: 500 }
    );
  }
} 