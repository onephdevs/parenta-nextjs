import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PaymentMethod } from '@/types/payments';

// Mock payment methods data - in production this would be from database
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm_1',
    tenantId: '1',
    type: { type: 'credit_card', displayName: 'Credit Card', icon: '💳', processingTime: 'Instant' },
    isDefault: true,
    isActive: true,
    gatewayMethodId: 'pm_stripe_123',
    lastFourDigits: '4242',
    expiryMonth: 12,
    expiryYear: 2025,
    brand: 'Visa',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'pm_2',
    tenantId: '1',
    type: { type: 'bank_account', displayName: 'Bank Account', icon: '🏦', processingTime: '1-3 business days' },
    isDefault: false,
    isActive: true,
    gatewayMethodId: 'ba_stripe_456',
    lastFourDigits: '7890',
    bankName: 'Chase Bank',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// GET /api/payment-methods - Get payment methods for a tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Filter payment methods by tenant
    const tenantPaymentMethods = mockPaymentMethods.filter(
      method => method.tenantId === tenantId
    );

    return NextResponse.json({
      success: true,
      data: tenantPaymentMethods,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST /api/payment-methods - Add new payment method
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      tenantId,
      type,
      gatewayMethodId,
      lastFourDigits,
      expiryMonth,
      expiryYear,
      brand,
      bankName,
      isDefault,
    } = body;

    if (!tenantId || !type || !gatewayMethodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newPaymentMethod: PaymentMethod = {
      id: `pm_${Date.now()}`,
      tenantId,
      type,
      isDefault: isDefault || false,
      isActive: true,
      gatewayMethodId,
      lastFourDigits,
      expiryMonth,
      expiryYear,
      brand,
      bankName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If this is set as default, unset other defaults
    if (isDefault) {
      // In production, update database to set all other methods for this tenant to non-default
      console.log(`Setting payment method ${newPaymentMethod.id} as default for tenant ${tenantId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method added successfully',
      data: newPaymentMethod,
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    );
  }
}

// PATCH /api/payment-methods - Update payment method
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paymentMethodId, isDefault, isActive } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // In production, this would update the database
    const updatedMethod = {
      id: paymentMethodId,
      isDefault: isDefault ?? undefined,
      isActive: isActive ?? undefined,
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      message: 'Payment method updated successfully',
      data: updatedMethod,
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { error: 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

// DELETE /api/payment-methods - Delete payment method
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // In production, this would delete from database and also
    // remove the payment method from the payment gateway
    console.log(`Deleting payment method ${paymentMethodId}`);

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
} 