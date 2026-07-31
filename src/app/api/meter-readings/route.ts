import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllMeterReadings, createMeterReading } from '@/lib/api/meterReadings';
import { CreateMeterReadingData } from '@/types/database';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      buildingId: searchParams.get('buildingId') || undefined,
      roomId: searchParams.get('roomId') || undefined,
      utilityType: searchParams.get('utilityType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const result = await getAllMeterReadings(filters);
    
    return NextResponse.json({
      success: true,
      data: result.readings,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch meter readings' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['buildingId', 'utilityType', 'readingDate', 'readingValue'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            success: false,
            error: `Missing required field: ${field}` 
          },
          { status: 400 }
        );
      }
    }

    // Validate reading value is positive
    if (body.readingValue <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Reading value must be positive' 
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (isNaN(new Date(body.readingDate).getTime())) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid reading date format' 
        },
        { status: 400 }
      );
    }

    const readingData: CreateMeterReadingData = {
      buildingId: body.buildingId,
      roomId: body.roomId || undefined,
      utilityType: body.utilityType,
      meterNumber: body.meterNumber || undefined,
      readingDate: new Date(body.readingDate),
      readingValue: parseFloat(body.readingValue),
      notes: body.notes || undefined,
    };

    const meterReading = await createMeterReading(readingData);
    const readingId = String(meterReading.id || '');

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'meter_reading.recorded',
      category: 'utilities',
      entityType: 'meter_reading',
      entityId: readingId || null,
      entityLabel: `${body.utilityType} — ${body.readingValue}`,
      afterData: meterReading as unknown as Record<string, unknown>,
      link: '/admin/utilities/readings',
      metadata: { link: '/admin/utilities/readings', buildingId: body.buildingId },
    });
    
    return NextResponse.json({ 
      success: true,
      data: meterReading,
      message: 'Meter reading created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating meter reading:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create meter reading' 
      },
      { status: 500 }
    );
  }
} 