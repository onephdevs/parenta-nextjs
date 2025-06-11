import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRoomAssets } from '@/lib/api/rooms';

export async function GET(
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

    const assets = await getRoomAssets(roomId);
    
    return NextResponse.json({
      success: true,
      data: assets
    });

  } catch (error: unknown) {
    console.error('Error fetching room assets:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to fetch room assets' },
      { status: 500 }
    );
  }
} 