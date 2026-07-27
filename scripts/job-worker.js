#!/usr/bin/env node

/**
 * Optional PM2 worker loop for background_jobs.
 * Usage: node scripts/job-worker.js
 * Env: DATABASE_URL, JOB_POLL_MS (default 5000)
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production' });

const POLL_MS = Number(process.env.JOB_POLL_MS) || 5000;

async function tick() {
  // Use compiled Next path isn't available; call process via dynamic tsx import
  const { processPendingJobs } = await import('../src/lib/services/job-queue.ts');
  const result = await processPendingJobs(1);
  if (result.processed > 0) {
    console.log(`[job-worker] processed ${result.processed}:`, result.results);
  }
}

async function main() {
  console.log(`[job-worker] started, poll=${POLL_MS}ms`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error('[job-worker] tick failed:', err);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
