/**
 * Persisted cumulative lifetime collection:
 * Previous Total Collection + Current Period = Overall Collection
 */

import pool from '@/lib/db';
import { PAYMENT_IS_REVENUE_UNIT } from '@/lib/sql/revenue-unit-filter';

export type LifetimeScope = 'portfolio' | string; // building UUID or 'portfolio'

export interface LifetimeTotalsRow {
  scopeKey: string;
  buildingId: string | null;
  overallCollection: number;
  asOfDate: string | null;
  lastCommittedPeriodStart: string | null;
  lastCommittedPeriodEnd: string | null;
}

export interface LifetimePreview {
  scopeKey: string;
  buildingId: string | null;
  previousTotal: number;
  currentPeriodCollection: number;
  overallCollection: number;
  periodStart: string;
  periodEnd: string;
  alreadyCommitted: boolean;
  asOfDate: string | null;
}

function scopeKeyFor(buildingId?: string | null): string {
  return buildingId ? String(buildingId) : 'portfolio';
}

function num(v: unknown): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

export async function getLifetimeTotals(
  buildingId?: string | null
): Promise<LifetimeTotalsRow> {
  const scopeKey = scopeKeyFor(buildingId);
  const result = await pool.query(
    `SELECT scope_key, building_id, overall_collection, as_of_date,
            last_committed_period_start, last_committed_period_end
     FROM collection_lifetime_totals
     WHERE scope_key = $1`,
    [scopeKey]
  );

  if (result.rows[0]) {
    const row = result.rows[0];
    return {
      scopeKey: String(row.scope_key),
      buildingId: row.building_id ? String(row.building_id) : null,
      overallCollection: num(row.overall_collection),
      asOfDate: row.as_of_date
        ? String(row.as_of_date).slice(0, 10)
        : null,
      lastCommittedPeriodStart: row.last_committed_period_start
        ? String(row.last_committed_period_start).slice(0, 10)
        : null,
      lastCommittedPeriodEnd: row.last_committed_period_end
        ? String(row.last_committed_period_end).slice(0, 10)
        : null,
    };
  }

  return {
    scopeKey,
    buildingId: buildingId || null,
    overallCollection: 0,
    asOfDate: null,
    lastCommittedPeriodStart: null,
    lastCommittedPeriodEnd: null,
  };
}

/** Sum paid collections in a date range (optionally scoped to building). */
export async function sumPeriodCollection(params: {
  startDate: string;
  endDate: string;
  buildingId?: string | null;
}): Promise<number> {
  const { startDate, endDate, buildingId } = params;
  const buildingFilter = buildingId
    ? `AND EXISTS (
         SELECT 1 FROM tenant_room_assignments tra
         JOIN rooms r ON r.id = tra.room_id
         WHERE tra.tenant_id = p.tenant_id
           AND r.building_id = $3
       )`
    : '';
  const values: unknown[] = buildingId
    ? [startDate, endDate, buildingId]
    : [startDate, endDate];

  const result = await pool.query(
    `
    SELECT COALESCE(SUM(p.amount), 0) AS total
    FROM payments p
    WHERE p.payment_date BETWEEN $1 AND $2
      AND p.payment_status IN ('paid', 'completed', 'confirmed')
      AND ${PAYMENT_IS_REVENUE_UNIT}
      ${buildingFilter}
    `,
    values
  );
  return num(result.rows[0]?.total);
}

/**
 * Preview lifetime math without writing:
 * Previous (persisted) + Current period = Overall
 */
export async function previewLifetimeCollection(params: {
  startDate: string;
  endDate: string;
  buildingId?: string | null;
}): Promise<LifetimePreview> {
  const scopeKey = scopeKeyFor(params.buildingId);
  const totals = await getLifetimeTotals(params.buildingId);
  const currentPeriodCollection = await sumPeriodCollection(params);

  const commitCheck = await pool.query(
    `SELECT 1 FROM collection_lifetime_period_commits
     WHERE scope_key = $1 AND period_start = $2::date AND period_end = $3::date
     LIMIT 1`,
    [scopeKey, params.startDate, params.endDate]
  );

  const previousTotal = totals.overallCollection;
  return {
    scopeKey,
    buildingId: params.buildingId || null,
    previousTotal,
    currentPeriodCollection,
    overallCollection: num(previousTotal + currentPeriodCollection),
    periodStart: params.startDate,
    periodEnd: params.endDate,
    alreadyCommitted: commitCheck.rows.length > 0,
    asOfDate: totals.asOfDate,
  };
}

/**
 * Persist period into the running lifetime total.
 * Idempotent for the same scope + period dates.
 */
export async function commitLifetimePeriod(params: {
  startDate: string;
  endDate: string;
  buildingId?: string | null;
}): Promise<LifetimePreview> {
  const scopeKey = scopeKeyFor(params.buildingId);
  const buildingId = params.buildingId || null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT previous_total, period_collection, overall_collection
       FROM collection_lifetime_period_commits
       WHERE scope_key = $1 AND period_start = $2::date AND period_end = $3::date`,
      [scopeKey, params.startDate, params.endDate]
    );

    if (existing.rows[0]) {
      await client.query('COMMIT');
      const row = existing.rows[0];
      return {
        scopeKey,
        buildingId,
        previousTotal: num(row.previous_total),
        currentPeriodCollection: num(row.period_collection),
        overallCollection: num(row.overall_collection),
        periodStart: params.startDate,
        periodEnd: params.endDate,
        alreadyCommitted: true,
        asOfDate: params.endDate,
      };
    }

    const totalsResult = await client.query(
      `SELECT overall_collection FROM collection_lifetime_totals WHERE scope_key = $1 FOR UPDATE`,
      [scopeKey]
    );
    const previousTotal = num(totalsResult.rows[0]?.overall_collection);

    const periodCollection = await sumPeriodCollection(params);
    const overallCollection = num(previousTotal + periodCollection);

    await client.query(
      `INSERT INTO collection_lifetime_period_commits (
         scope_key, building_id, period_start, period_end,
         previous_total, period_collection, overall_collection
       ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7)`,
      [
        scopeKey,
        buildingId,
        params.startDate,
        params.endDate,
        previousTotal,
        periodCollection,
        overallCollection,
      ]
    );

    await client.query(
      `INSERT INTO collection_lifetime_totals (
         scope_key, building_id, overall_collection, as_of_date,
         last_committed_period_start, last_committed_period_end, updated_at
       ) VALUES ($1, $2, $3, $4::date, $5::date, $6::date, NOW())
       ON CONFLICT (scope_key) DO UPDATE SET
         overall_collection = EXCLUDED.overall_collection,
         as_of_date = EXCLUDED.as_of_date,
         last_committed_period_start = EXCLUDED.last_committed_period_start,
         last_committed_period_end = EXCLUDED.last_committed_period_end,
         updated_at = NOW()`,
      [
        scopeKey,
        buildingId,
        overallCollection,
        params.endDate,
        params.startDate,
        params.endDate,
      ]
    );

    await client.query('COMMIT');

    return {
      scopeKey,
      buildingId,
      previousTotal,
      currentPeriodCollection: periodCollection,
      overallCollection,
      periodStart: params.startDate,
      periodEnd: params.endDate,
      alreadyCommitted: true,
      asOfDate: params.endDate,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
