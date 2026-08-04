import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNeedsAttention } from '@/lib/services/needs-attention-service';

/**
 * GET /api/admin/dashboard/needs-attention
 * Payments due, utilities due, new inquiries, open maintenance — for dashboard widget.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await getNeedsAttention();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching needs-attention:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch needs attention data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
