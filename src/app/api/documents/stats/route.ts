import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDocumentStats } from '@/lib/api/documents';

// Get document statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const stats = await getDocumentStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching document statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch document statistics' 
      },
      { status: 500 }
    );
  }
} 