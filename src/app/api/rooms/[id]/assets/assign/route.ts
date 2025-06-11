import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { assignAssetToRoom } from '@/lib/api/assets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { id: roomId } = await params;
    const body = await request.json();
    const { assetId, tenantId, notes } = body;
    
    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    const success = await assignAssetToRoom(assetId, roomId, tenantId, notes);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to assign asset to room' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset assigned to room successfully'
    });
  } catch (error) {
    console.error('Error assigning asset to room:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to assign asset to room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 