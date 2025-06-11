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

    // Get tenant information and current lease
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

    const lease = await db.lease.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'active'
      },
      select: {
        roomId: true
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
      }
    });

    const activeRequests = maintenanceRequests.filter(
      r => r.status === 'pending' || r.status === 'in_progress' || r.status === 'scheduled'
    ).length;

    const formattedRequests = maintenanceRequests.map(request => ({
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      scheduledDate: request.scheduledDate?.toISOString(),
      completedDate: request.completedDate?.toISOString(),
      notes: request.notes
    }));

    const maintenanceData = {
      activeRequests,
      requests: formattedRequests
    };

    return NextResponse.json({
      success: true,
      data: maintenanceData
    });

  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, category, priority } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get tenant information and current lease
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

    const lease = await db.lease.findFirst({
      where: {
        tenantId: tenant.id,
        status: 'active'
      },
      select: {
        roomId: true,
        room: {
          select: {
            buildingId: true
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

    // Create the maintenance request
    const maintenanceRequest = await db.maintenanceRequest.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'medium',
        status: 'pending',
        tenantId: tenant.id,
        roomId: lease.roomId,
        buildingId: lease.room.buildingId
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: maintenanceRequest.id,
        title: maintenanceRequest.title,
        description: maintenanceRequest.description,
        category: maintenanceRequest.category,
        priority: maintenanceRequest.priority,
        status: maintenanceRequest.status,
        createdAt: maintenanceRequest.createdAt.toISOString(),
        updatedAt: maintenanceRequest.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance request' },
      { status: 500 }
    );
  }
} 