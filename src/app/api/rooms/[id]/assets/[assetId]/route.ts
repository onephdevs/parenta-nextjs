import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unassignAsset } from '@/lib/api/assets';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { assetId } = await params;

    const success = await unassignAsset(assetId);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to unassign asset from room' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset unassigned from room successfully'
    });
  } catch (error) {
    console.error('Error unassigning asset from room:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to unassign asset from room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 