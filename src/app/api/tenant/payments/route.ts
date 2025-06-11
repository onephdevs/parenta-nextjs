import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant information
    const tenant = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get current lease information for rent amount
    const lease = await db.lease.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'active'
      },
      select: {
        monthlyRent: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'No active lease found' },
        { status: 404 }
      );
    }

    // Get all payments for the tenant
    const payments = await db.payment.findMany({
      where: {
        tenantId: tenant.id
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    // Calculate payment summary
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingBalance = payments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);

    // Calculate next payment due date (first of next month)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Format payments with additional details
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      paymentDate: payment.paymentDate.toISOString(),
      status: payment.status,
      type: payment.type,
      reference: payment.reference || `PAY-${payment.id.slice(-8).toUpperCase()}`,
      description: payment.description || `${payment.type} payment`
    }));

    const paymentData = {
      totalPaid,
      nextDueDate: nextMonth.toISOString(),
      nextAmount: lease.monthlyRent,
      outstandingBalance,
      recentPayments: formattedPayments
    };

    return NextResponse.json({
      success: true,
      data: paymentData
    });

  } catch (error) {
    console.error('Error fetching payment data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
} 