import pool from '@/lib/db';

const NEARBY_REFRESH_DAYS_KEY = 'nearby_refresh_days';
const DEFAULT_NEARBY_REFRESH_DAYS = 7;

async function readSetting(key: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [key]
  );
  if (result.rows.length === 0) return null;
  return String(result.rows[0].value ?? '');
}

export async function getNearbyRefreshDays(): Promise<number> {
  const raw = await readSetting(NEARBY_REFRESH_DAYS_KEY);
  if (raw == null || raw === '') return DEFAULT_NEARBY_REFRESH_DAYS;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_NEARBY_REFRESH_DAYS;
  return Math.min(n, 90);
}

export function isSnapshotStale(fetchedAt: Date, refreshDays: number): boolean {
  const ageMs = Date.now() - fetchedAt.getTime();
  return ageMs > refreshDays * 24 * 60 * 60_000;
}
