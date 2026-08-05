import pool from '@/lib/db';
import {
  DEFAULT_TENANT_PAYMENT_INSTRUCTIONS,
  parseTenantPaymentInstructions,
  TENANT_PAYMENT_INSTRUCTIONS_KEY,
  type TenantPaymentInstructions,
} from '@/lib/tenant-payment-instructions-shared';

export {
  DEFAULT_TENANT_PAYMENT_INSTRUCTIONS,
  parseTenantPaymentInstructions,
  TENANT_PAYMENT_INSTRUCTIONS_KEY,
  type TenantPaymentInstructions,
} from '@/lib/tenant-payment-instructions-shared';

export async function getTenantPaymentInstructions(): Promise<TenantPaymentInstructions> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [TENANT_PAYMENT_INSTRUCTIONS_KEY]
  );

  if (result.rows.length === 0) {
    return { ...DEFAULT_TENANT_PAYMENT_INSTRUCTIONS };
  }

  try {
    return parseTenantPaymentInstructions(JSON.parse(result.rows[0].value));
  } catch {
    return { ...DEFAULT_TENANT_PAYMENT_INSTRUCTIONS };
  }
}

export async function saveTenantPaymentInstructions(
  instructions: TenantPaymentInstructions
): Promise<TenantPaymentInstructions> {
  const normalized = parseTenantPaymentInstructions(instructions);
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [
      TENANT_PAYMENT_INSTRUCTIONS_KEY,
      JSON.stringify(normalized),
      'Phone / transfer details shown to tenants for GCash and similar payments',
    ]
  );
  return normalized;
}
