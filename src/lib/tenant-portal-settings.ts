import pool from '@/lib/db';

export {
  TENANT_PORTAL_ENABLED_KEY,
} from '@/lib/ops-policy-settings';

/** Alfonso default: portal off when setting is missing. */
export async function isTenantPortalEnabled(): Promise<boolean> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    ['tenant_portal_enabled']
  );
  if (result.rows.length === 0) return false;
  const raw = String(result.rows[0].value || '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'on';
}

export async function setTenantPortalEnabled(enabled: boolean): Promise<boolean> {
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [
      'tenant_portal_enabled',
      enabled ? 'true' : 'false',
      'When false, tenant portal pages and tenant sign-in are disabled (owner/admin ops only)',
    ]
  );
  return enabled;
}
