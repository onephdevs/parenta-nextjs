import pool from '@/lib/db';

export const NEARBY_REFRESH_DAYS_KEY = 'nearby_refresh_days';
export const DEFAULT_NEARBY_REFRESH_DAYS = 7;

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

export async function setNearbyRefreshDays(days: number): Promise<number> {
  const value = Math.min(Math.max(1, Math.round(days)), 90);
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [
      NEARBY_REFRESH_DAYS_KEY,
      String(value),
      'How often to refresh nearby map places from OpenStreetMap (days). Default weekly.',
    ]
  );
  return value;
}

export function isSnapshotStale(fetchedAt: Date, refreshDays: number): boolean {
  const ageMs = Date.now() - fetchedAt.getTime();
  return ageMs > refreshDays * 24 * 60 * 60_000;
}
