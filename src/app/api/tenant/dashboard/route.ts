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
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get current lease information
    const lease = await db.lease.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'active'
      },
      include: {
        room: {
          include: {
            building: {
              select: {
                name: true
              }
            }
          }
        }
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

    // Get payment information
    const payments = await db.payment.findMany({
      where: {
        tenantId: tenant.id
      },
      orderBy: {
        paymentDate: 'desc'
      },
      take: 10
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

    // Get maintenance requests
    const maintenanceRequests = await db.maintenanceRequest.findMany({
      where: {
        roomId: lease.roomId,
        OR: [
          { tenantId: tenant.id },
          { tenantId: null } // Common area requests
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const activeMaintenanceRequests = maintenanceRequests.filter(
      r => r.status === 'pending' || r.status === 'in_progress'
    ).length;

    // Get documents
    const documents = await db.document.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { buildingId: lease.room.buildingId },
          { roomId: lease.roomId }
        ]
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: 10
    });

    // Mock utility data (since we don't have utility readings in the schema)
    const utilities = {
      currentUsage: {
        electricity: 450,
        water: 120,
        gas: 85
      },
      estimatedBill: 185.50
    };

    const dashboardData = {
      tenant: {
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone
      },
      lease: {
        id: lease.id,
        roomId: lease.roomId,
        buildingName: lease.room.building.name,
        roomNumber: lease.room.number,
        monthlyRent: lease.monthlyRent,
        startDate: lease.startDate.toISOString(),
        endDate: lease.endDate.toISOString(),
        status: lease.status,
        securityDeposit: lease.securityDeposit
      },
      payments: {
        totalPaid,
        nextDueDate: nextMonth.toISOString(),
        nextAmount: lease.monthlyRent,
        outstandingBalance,
        recentPayments: payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          paymentDate: payment.paymentDate.toISOString(),
          status: payment.status,
          type: payment.type
        }))
      },
      maintenance: {
        activeRequests: activeMaintenanceRequests,
        recentRequests: maintenanceRequests.map(request => ({
          id: request.id,
          title: request.title,
          status: request.status,
          priority: request.priority,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString()
        }))
      },
      documents: {
        totalDocuments: documents.length,
        recentDocuments: documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          category: doc.category,
          uploadedAt: doc.uploadedAt.toISOString(),
          size: doc.size
        }))
      },
      utilities
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 