import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Download endpoint referenced by AdvancedExportManager.
 * Export jobs are still mock/in-memory in /api/export — this route exists so the
 * UI no longer 404s, and returns a clear payload when the job is missing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Stub: advanced export still uses an in-memory mock queue that does not
    // survive across serverless/process boundaries. Return an explicit error
    // instead of a soft 404 HTML page.
    return NextResponse.json(
      {
        success: false,
        error: 'Export file not available',
        details: `No persisted export artifact found for id ${id}. Advanced export is still mock-backed; use /admin/reports export actions for real PDF/Excel downloads.`,
        exportId: id,
      },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download export',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
