import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { processPendingJobs } from '@/lib/services/job-queue';

/**
 * POST /api/jobs/process — claim and run pending background jobs.
 * Secure with admin session, or JOB_PROCESS_SECRET header for cron/PM2 worker.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.JOB_PROCESS_SECRET;
    const headerSecret = request.headers.get('x-job-secret');

    if (secret && headerSecret === secret) {
      // cron / worker auth
    } else {
      const { error } = await requireAdmin();
      if (error) return error;
    }

    const body = await request.json().catch(() => ({}));
    const maxJobs = Math.min(Number(body.maxJobs) || 1, 10);

    const result = await processPendingJobs(maxJobs);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Process jobs error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to process jobs',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for simple cron pings with secret
  return POST(request);
}
