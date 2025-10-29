import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return basic tenant dashboard data
    // Note: Full implementation would query tenant data from database
    return NextResponse.json({
      success: true,
      data: {
        message: 'Tenant dashboard data - implementation pending',
        tenant: {
          email: session.user.email,
          name: session.user.name,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
