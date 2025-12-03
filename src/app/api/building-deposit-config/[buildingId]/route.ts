import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getBuildingDepositConfig,
  calculateRequiredDeposit,
  calculateRequiredAdvance,
  getUtilityDeposit,
  validateDepositAmount,
} from '@/lib/api/building-deposit-config';

interface RouteParams {
  params: Promise<{
    buildingId: string;
  }>;
}

// GET - Get deposit config for a specific building
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { buildingId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const monthlyRate = searchParams.get('monthlyRate');

    // If action is 'calculate', return calculated values
    if (action === 'calculate' && monthlyRate) {
      const rate = parseFloat(monthlyRate);
      const deposit = await calculateRequiredDeposit(buildingId, rate);
      const advance = await calculateRequiredAdvance(buildingId, rate);
      const utility = await getUtilityDeposit(buildingId);

      return NextResponse.json({
        success: true,
        data: {
          requiredDeposit: deposit,
          requiredAdvance: advance,
          utilityDeposit: utility,
        },
      });
    }

    // If action is 'validate', validate deposit amount
    if (action === 'validate' && monthlyRate) {
      const rate = parseFloat(monthlyRate);
      const depositAmount = searchParams.get('depositAmount');
      
      if (!depositAmount) {
        return NextResponse.json(
          { error: 'Deposit amount is required for validation' },
          { status: 400 }
        );
      }

      const validation = await validateDepositAmount(
        buildingId,
        rate,
        parseFloat(depositAmount)
      );

      return NextResponse.json({
        success: true,
        data: validation,
      });
    }

    // Default: return config
    const config = await getBuildingDepositConfig(buildingId);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching building deposit config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch building deposit config',
      },
      { status: 500 }
    );
  }
}

