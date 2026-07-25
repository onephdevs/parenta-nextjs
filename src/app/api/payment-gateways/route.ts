import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStoredPaymentGateways, updatePaymentGateway } from '@/lib/payment-gateways';

// GET /api/payment-gateways
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const gateways = await getStoredPaymentGateways();
    const publicGateways = gateways.map((gateway) => ({
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
    return NextResponse.json({ error: 'Failed to fetch payment gateways' }, { status: 500 });
  }
}

// POST /api/payment-gateways
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await request.json();
    const { gatewayId, settings, isActive, webhookUrl } = body;

    if (!gatewayId) {
      return NextResponse.json({ error: 'Gateway ID is required' }, { status: 400 });
    }

    const updatedGateway = await updatePaymentGateway(gatewayId, {
      settings,
      isActive,
      webhookUrl,
    });

    if (!updatedGateway) {
      return NextResponse.json({ error: 'Payment gateway not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment gateway updated successfully',
      data: {
        ...updatedGateway,
        apiKey: undefined,
        secretKey: undefined,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating payment gateway:', error);
    return NextResponse.json({ error: 'Failed to update payment gateway' }, { status: 500 });
  }
}
