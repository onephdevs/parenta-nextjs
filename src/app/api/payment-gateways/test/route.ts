import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStoredPaymentGateways } from '@/lib/payment-gateways';
import pool from '@/lib/db';

/**
 * Simulates a test payment against a configured (test-mode) gateway.
 * Does not charge real money — logs the attempt in app_settings.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const gatewayId = body.gatewayId as string | undefined;
    const amount = Number(body.amount ?? 100);

    const gateways = await getStoredPaymentGateways();
    const gateway = gatewayId
      ? gateways.find((g) => g.id === gatewayId)
      : gateways.find((g) => g.isActive) || gateways[0];

    if (!gateway) {
      return NextResponse.json(
        { success: false, error: 'No payment gateway configured' },
        { status: 400 }
      );
    }

    if (!gateway.settings.testMode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test payments are only allowed when the gateway is in test mode',
        },
        { status: 400 }
      );
    }

    const testResult = {
      id: `test_${Date.now()}`,
      gatewayId: gateway.id,
      gatewayName: gateway.name,
      amount,
      currency: gateway.settings.currency || 'PHP',
      status: 'succeeded',
      mode: 'test',
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
    };

    await pool.query(
      `INSERT INTO app_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [
        `payment_gateway_last_test:${gateway.id}`,
        JSON.stringify(testResult),
        'Last simulated test payment for gateway',
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Test payment of ${amount} ${testResult.currency} simulated successfully via ${gateway.name}`,
      data: testResult,
    });
  } catch (error) {
    console.error('Error creating test payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create test payment' },
      { status: 500 }
    );
  }
}
