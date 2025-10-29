import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantCompleteData } from '@/lib/api/tenant-user-link';

/**
 * GET /api/tenant/profile
 * Fetches the complete tenant profile for the logged-in user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenantData = await getTenantCompleteData(userId);
    
    if (!tenantData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
          message: 'Your account is not linked to a tenant profile. Please contact the administrator.',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tenantData,
    });
    
  } catch (error) {
    console.error('Error fetching tenant profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tenant profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

