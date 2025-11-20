import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateLeaseExpirationAlerts } from '@/lib/services/lease-management-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const alertsGenerated = await generateLeaseExpirationAlerts();
    return NextResponse.json({ success: true, alerts_generated: alertsGenerated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}

