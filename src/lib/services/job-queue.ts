/**
 * Postgres-backed background job queue (no Redis).
 * API enqueues → worker/process endpoint runs → in-app notification on complete.
 */

import pool from '@/lib/db';
import { generateMonthlyInvoicesForAllTenants } from '@/lib/services/bulk-operations-service';
import { processNotificationQueue } from '@/lib/services/notification-service';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { invalidateDashboardCache } from '@/lib/cache/memory-cache';

export type JobType =
  | 'bulk_invoices_generate'
  | 'notification_queue_process'
  | 'monthly_invoices_generate'
  | 'late_fees_auto_apply'
  | 'invoices_release_due';

export interface BackgroundJob {
  id: string;
  jobType: JobType | string;
  payload: Record<string, unknown>;
  status: string;
  progress: number;
  result: unknown;
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

function mapJob(row: Record<string, unknown>): BackgroundJob {
  return {
    id: String(row.id),
    jobType: String(row.job_type),
    payload: (row.payload as Record<string, unknown>) || {},
    status: String(row.status),
    progress: Number(row.progress) || 0,
    result: row.result ?? null,
    error: row.error ? String(row.error) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

export async function enqueueJob(params: {
  jobType: JobType | string;
  payload?: Record<string, unknown>;
  createdBy?: string | null;
}): Promise<BackgroundJob> {
  const result = await pool.query(
    `INSERT INTO background_jobs (job_type, payload, created_by, status)
     VALUES ($1, $2::jsonb, $3, 'pending')
     RETURNING *`,
    [
      params.jobType,
      JSON.stringify(params.payload || {}),
      params.createdBy || null,
    ]
  );
  return mapJob(result.rows[0]);
}

export async function getJobById(id: string): Promise<BackgroundJob | null> {
  const result = await pool.query(`SELECT * FROM background_jobs WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return mapJob(result.rows[0]);
}

export async function claimNextPendingJob(): Promise<BackgroundJob | null> {
  const result = await pool.query(
    `UPDATE background_jobs
     SET status = 'running',
         started_at = CURRENT_TIMESTAMP,
         progress = 0
     WHERE id = (
       SELECT id FROM background_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`
  );
  if (result.rows.length === 0) return null;
  return mapJob(result.rows[0]);
}

async function completeJob(id: string, result: unknown): Promise<void> {
  await pool.query(
    `UPDATE background_jobs
     SET status = 'completed',
         progress = 100,
         result = $2::jsonb,
         completed_at = CURRENT_TIMESTAMP,
         error = NULL
     WHERE id = $1`,
    [id, JSON.stringify(result ?? {})]
  );
}

async function failJob(id: string, error: string): Promise<void> {
  await pool.query(
    `UPDATE background_jobs
     SET status = 'failed',
         error = $2,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, error]
  );
}

async function executeJob(job: BackgroundJob): Promise<unknown> {
  switch (job.jobType) {
    case 'bulk_invoices_generate': {
      const month = job.payload.month as string | undefined;
      const buildingId = job.payload.building_id as string | undefined;
      const result = await generateMonthlyInvoicesForAllTenants(month, buildingId);
      invalidateDashboardCache();
      return result;
    }
    case 'monthly_invoices_generate': {
      const { releaseDueInvoices } = await import('@/lib/services/invoice-issue-timing');
      await releaseDueInvoices();
      const { generateMonthlyRentInvoicesForAllTenants } = await import(
        '@/lib/services/monthly-invoice-generator'
      );
      const result = await generateMonthlyRentInvoicesForAllTenants();
      invalidateDashboardCache();
      return result;
    }
    case 'invoices_release_due': {
      const { releaseDueInvoices } = await import('@/lib/services/invoice-issue-timing');
      const result = await releaseDueInvoices();
      invalidateDashboardCache();
      return result;
    }
    case 'notification_queue_process': {
      const limit = Number(job.payload.limit) || 50;
      return processNotificationQueue(limit);
    }
    case 'late_fees_auto_apply': {
      const { applyAutoLateFees } = await import('@/lib/services/late-fee-service');
      const result = await applyAutoLateFees({ dryRun: false });
      invalidateDashboardCache();
      return result;
    }
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}

/**
 * Process up to `maxJobs` pending jobs. Returns summaries.
 */
export async function processPendingJobs(maxJobs = 1): Promise<{
  processed: number;
  results: Array<{ jobId: string; status: string; error?: string }>;
}> {
  const results: Array<{ jobId: string; status: string; error?: string }> = [];

  for (let i = 0; i < maxJobs; i++) {
    const job = await claimNextPendingJob();
    if (!job) break;

    try {
      const result = await executeJob(job);
      await completeJob(job.id, result);

      logActivitySafe({
        actorUserId: job.createdBy || null,
        actorRole: job.createdBy ? 'admin' : 'system',
        actionType: 'job.completed',
        category: 'system',
        entityType: 'background_job',
        entityId: job.id,
        entityLabel: job.jobType,
        afterData: { jobType: job.jobType, result },
        link: '/admin/bulk-operations',
        metadata: { link: '/admin/bulk-operations', jobId: job.id },
      });

      results.push({ jobId: job.id, status: 'completed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await failJob(job.id, message);

      logActivitySafe({
        actorUserId: job.createdBy || null,
        actorRole: job.createdBy ? 'admin' : 'system',
        actionType: 'job.failed',
        category: 'system',
        entityType: 'background_job',
        entityId: job.id,
        entityLabel: job.jobType,
        afterData: { jobType: job.jobType, error: message },
        link: '/admin/bulk-operations',
        metadata: { link: '/admin/bulk-operations', jobId: job.id },
      });

      results.push({ jobId: job.id, status: 'failed', error: message });
    }
  }

  return { processed: results.length, results };
}
