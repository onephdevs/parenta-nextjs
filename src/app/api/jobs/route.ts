import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { enqueueJob, getJobById, type JobType } from '@/lib/services/job-queue';

/**
 * POST /api/jobs — enqueue a background job
 * Body: { jobType, payload? }
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const jobType = String(body.jobType || '') as JobType;
    const allowed: JobType[] = [
      'bulk_invoices_generate',
      'notification_queue_process',
      'monthly_invoices_generate',
    ];

    if (!allowed.includes(jobType)) {
      return NextResponse.json(
        { success: false, error: `Unsupported jobType. Allowed: ${allowed.join(', ')}` },
        { status: 400 }
      );
    }

    const job = await enqueueJob({
      jobType,
      payload: body.payload || {},
      createdBy: session?.user?.id || null,
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        job,
        message: 'Job queued. Poll GET /api/jobs/[id] or wait for in-app notification.',
      },
      { status: 202 }
    );
  } catch (err) {
    console.error('Enqueue job error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to enqueue job',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs?id=... — job status (also available at /api/jobs/[id])
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id query parameter required' },
        { status: 400 }
      );
    }

    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (err) {
    console.error('Get job error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
