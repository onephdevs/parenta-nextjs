import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllTenantsWithCredits,
  createTenantCredit,
  adjustTenantCredit
} from '@/lib/api/tenant-credits';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenants = await getAllTenantsWithCredits();

    return NextResponse.json({
      success: true,
      data: tenants
    });

  } catch (error) {
    console.error('Error getting tenants with credits:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get tenants with credits'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tenantId, amount, source, description, action } = body;

    if (!tenantId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let credit;

    if (action === 'adjust') {
      credit = await adjustTenantCredit(
        tenantId,
        parseFloat(amount),
        description || 'Manual adjustment',
        amount > 0
      );
    } else {
      credit = await createTenantCredit({
        tenantId,
        amount: parseFloat(amount),
        source: source || 'manual',
        description
      });
    }

    return NextResponse.json({
      success: true,
      data: credit
    });

  } catch (error) {
    console.error('Error creating tenant credit:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create tenant credit'
      },
      { status: 500 }
    );
  }
}

