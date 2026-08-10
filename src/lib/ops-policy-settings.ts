import pool from '@/lib/db';

export const LATE_FEES_ENABLED_KEY = 'late_fees_enabled';
export const TENANT_PORTAL_ENABLED_KEY = 'tenant_portal_enabled';

function parseBoolSetting(raw: unknown, defaultValue: boolean): boolean {
  if (raw == null || raw === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  if (['false', '0', 'off', 'no'].includes(v)) return false;
  if (['true', '1', 'on', 'yes'].includes(v)) return true;
  return defaultValue;
}

async function readSetting(key: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [key]
  );
  if (result.rows.length === 0) return null;
  return String(result.rows[0].value ?? '');
}

/**
 * Alfonso: no late-fee penalties by default — use renegotiated due dates instead.
 * Missing key ⇒ disabled.
 */
export async function isLateFeesEnabled(): Promise<boolean> {
  const raw = await readSetting(LATE_FEES_ENABLED_KEY);
  return parseBoolSetting(raw, false);
}

export async function setLateFeesEnabled(enabled: boolean): Promise<boolean> {
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [
      LATE_FEES_ENABLED_KEY,
      enabled ? 'true' : 'false',
      'When false, manual/auto late-fee apply is blocked; use invoice negotiate deadlines',
    ]
  );
  return enabled;
}
