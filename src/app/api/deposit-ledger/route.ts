import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllTenantsWithDeposits,
  createDepositTransaction,
  refundDeposit,
  applyDepositToInvoice,
  adjustDepositBalance
} from '@/lib/api/deposit-ledger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenants = await getAllTenantsWithDeposits();

    return NextResponse.json({
      success: true,
      data: tenants
    });

  } catch (error) {
    console.error('Error getting tenants with deposits:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get tenants with deposits'
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
    const { tenantId, amount, action, invoiceId, description } = body;

    if (!tenantId || !amount || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'deposit':
        result = await createDepositTransaction({
          tenantId,
          amount: parseFloat(amount),
          transactionType: 'deposit',
          description: description || 'Deposit recorded'
        });
        break;

      case 'refund':
        result = await refundDeposit(
          tenantId,
          parseFloat(amount),
          description || 'Deposit refund',
          session.user.id
        );
        break;

      case 'apply':
        if (!invoiceId) {
          return NextResponse.json(
            { error: 'Invoice ID required for deposit application' },
            { status: 400 }
          );
        }
        result = await applyDepositToInvoice(
          tenantId,
          invoiceId,
          parseFloat(amount),
          session.user.id
        );
        break;

      case 'adjust':
        result = await adjustDepositBalance(
          tenantId,
          parseFloat(amount),
          description || 'Manual adjustment',
          session.user.id,
          amount > 0
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing deposit transaction:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process deposit transaction'
      },
      { status: 500 }
    );
  }
}

