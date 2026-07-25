import pool from '@/lib/db';
import { PaymentGateway } from '@/types/payments';

const SETTINGS_KEY = 'payment_gateways';

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'stripe-1',
    name: 'Stripe',
    type: 'stripe',
    isActive: true,
    webhookUrl: 'https://your-domain.com/api/webhooks/stripe',
    settings: {
      currency: 'PHP',
      testMode: true,
      autoCapture: true,
      allowSaveCard: true,
      requireCvv: true,
      enableRecurring: true,
    },
    supportedMethods: [
      { type: 'credit_card', displayName: 'Credit Card', icon: '💳', processingTime: 'Instant', fees: '2.9% + $0.30' },
      { type: 'debit_card', displayName: 'Debit Card', icon: '💳', processingTime: 'Instant', fees: '2.9% + $0.30' },
      { type: 'bank_account', displayName: 'Bank Transfer', icon: '🏦', processingTime: '1-3 business days', fees: '0.8%' },
    ],
    fees: {
      fixedFee: 0.30,
      percentageFee: 2.9,
      internationalFee: 1.5,
      refundFee: 0.00,
    },
  },
  {
    id: 'paypal-1',
    name: 'PayPal',
    type: 'paypal',
    isActive: false,
    webhookUrl: 'https://your-domain.com/api/webhooks/paypal',
    settings: {
      currency: 'PHP',
      testMode: true,
      autoCapture: true,
      allowSaveCard: true,
      requireCvv: false,
      enableRecurring: true,
    },
    supportedMethods: [
      { type: 'digital_wallet', displayName: 'PayPal', icon: '🅿️', processingTime: 'Instant', fees: '2.9% + $0.30' },
      { type: 'credit_card', displayName: 'Credit Card', icon: '💳', processingTime: 'Instant', fees: '2.9% + $0.30' },
    ],
    fees: {
      fixedFee: 0.30,
      percentageFee: 2.9,
      internationalFee: 4.4,
      refundFee: 0.00,
    },
  },
];

export async function getStoredPaymentGateways(): Promise<PaymentGateway[]> {
  const result = await pool.query(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [SETTINGS_KEY]
  );

  if (result.rows.length === 0) {
    await savePaymentGateways(DEFAULT_PAYMENT_GATEWAYS);
    return DEFAULT_PAYMENT_GATEWAYS.map((g) => ({ ...g }));
  }

  try {
    const parsed = JSON.parse(result.rows[0].value) as PaymentGateway[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PAYMENT_GATEWAYS.map((g) => ({ ...g }));
  } catch {
    return DEFAULT_PAYMENT_GATEWAYS.map((g) => ({ ...g }));
  }
}

export async function savePaymentGateways(gateways: PaymentGateway[]): Promise<void> {
  // Never persist secrets in plaintext settings
  const sanitized = gateways.map(({ apiKey: _a, secretKey: _s, ...rest }) => rest);
  await pool.query(
    `INSERT INTO app_settings (key, value, description)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [SETTINGS_KEY, JSON.stringify(sanitized), 'Payment gateway configuration']
  );
}

export async function updatePaymentGateway(
  gatewayId: string,
  patch: { settings?: PaymentGateway['settings']; isActive?: boolean; webhookUrl?: string }
): Promise<PaymentGateway | null> {
  const gateways = await getStoredPaymentGateways();
  const index = gateways.findIndex((g) => g.id === gatewayId);
  if (index === -1) return null;

  gateways[index] = {
    ...gateways[index],
    ...(patch.settings ? { settings: { ...gateways[index].settings, ...patch.settings } } : {}),
    ...(typeof patch.isActive === 'boolean' ? { isActive: patch.isActive } : {}),
    ...(patch.webhookUrl !== undefined ? { webhookUrl: patch.webhookUrl } : {}),
  };

  await savePaymentGateways(gateways);
  return gateways[index];
}
