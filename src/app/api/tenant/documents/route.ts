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

    // Get documents related to the tenant, room, or building
    const documents = await db.document.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { roomId: lease.roomId },
          { buildingId: lease.room.buildingId },
          // Include documents that are accessible to all tenants
          { 
            AND: [
              { tenantId: null },
              { roomId: null },
              { category: { in: ['lease', 'legal', 'insurance', 'policy'] } }
            ]
          }
        ]
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    // Format documents with additional details
    const formattedDocuments = documents.map(document => {
      // Determine file type from name or use a default
      const getFileType = (name: string) => {
        const extension = name.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'pdf':
            return 'application/pdf';
          case 'jpg':
          case 'jpeg':
            return 'image/jpeg';
          case 'png':
            return 'image/png';
          case 'doc':
          case 'docx':
            return 'application/msword';
          case 'xls':
          case 'xlsx':
            return 'application/vnd.ms-excel';
          default:
            return 'application/octet-stream';
        }
      };

      // Generate descriptions based on category and name
      const getDescription = (name: string, category: string) => {
        if (category === 'lease') {
          return 'Lease agreement and related documentation';
        } else if (category === 'payment') {
          return 'Payment receipt or invoice';
        } else if (category === 'maintenance') {
          return 'Maintenance request or completion record';
        } else if (category === 'insurance') {
          return 'Insurance policy or claim documentation';
        } else if (category === 'legal') {
          return 'Legal notice or documentation';
        } else {
          return 'Property-related document';
        }
      };

      return {
        id: document.id,
        name: document.name,
        category: document.category,
        uploadedAt: document.uploadedAt.toISOString(),
        size: document.size,
        fileType: getFileType(document.name),
        url: document.url,
        description: getDescription(document.name, document.category)
      };
    });

    const documentsData = {
      totalDocuments: formattedDocuments.length,
      documents: formattedDocuments
    };

    return NextResponse.json({
      success: true,
      data: documentsData
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
} 