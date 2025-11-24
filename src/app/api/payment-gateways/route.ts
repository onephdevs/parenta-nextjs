import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PaymentGateway } from '@/types/payments';

// Mock payment gateway data - in production this would be from database
const mockGateways: PaymentGateway[] = [
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

// GET /api/payment-gateways
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Filter out sensitive information for frontend
    const publicGateways = mockGateways.map(gateway => ({
      ...gateway,
      apiKey: undefined,
      secretKey: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: publicGateways,
    });
  } catch (error) {
    console.error('Error fetching payment gateways:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment gateways' },
      { status: 500 }
    );
  }
}

// POST /api/payment-gateways
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gatewayId, settings, isActive } = body;

    if (!gatewayId) {
      return NextResponse.json(
        { error: 'Gateway ID is required' },
        { status: 400 }
      );
    }

    // In production, this would update the database
    // For now, we'll simulate the update
    const updatedGateway = {
      id: gatewayId,
      settings: settings || {},
      isActive: isActive ?? false,
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      message: 'Payment gateway updated successfully',
      data: updatedGateway,
    });
  } catch (error) {
    console.error('Error updating payment gateway:', error);
    return NextResponse.json(
      { error: 'Failed to update payment gateway' },
      { status: 500 }
    );
  }
} 