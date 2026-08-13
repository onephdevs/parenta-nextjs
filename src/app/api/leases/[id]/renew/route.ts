import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { renewLease } from '@/lib/api/leases';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const options = {
      retainPreviousDetails: Boolean(body.options?.retainPreviousDetails ?? true),
      carryOverDeposit: Boolean(body.options?.carryOverDeposit ?? true),
      waiveAdvance: Boolean(body.options?.waiveAdvance ?? true),
      waivePenalties: Boolean(body.options?.waivePenalties ?? false),
      waiveOutstanding: Boolean(body.options?.waiveOutstanding ?? false),
    };

    const { previous, renewed } = await renewLease(id, {
      roomId: body.roomId ? String(body.roomId) : undefined,
      startDate: String(body.startDate || '').slice(0, 10),
      endDate: String(body.endDate || '').slice(0, 10),
      monthlyRate: Number(body.monthlyRate),
      depositPaid:
        body.depositPaid === undefined || body.depositPaid === null
          ? null
          : Number(body.depositPaid),
      advancePaid:
        body.advancePaid === undefined || body.advancePaid === null
          ? null
          : Number(body.advancePaid),
      templateName: body.templateName ? String(body.templateName) : null,
      leasePackageTemplateId: body.leasePackageTemplateId
        ? String(body.leasePackageTemplateId)
        : null,
      notes: body.notes ? String(body.notes) : null,
      options,
    });

    const tenantLabel = `${renewed.tenantFirstName} ${renewed.tenantLastName}`.trim();
    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      category: 'leases',
      actionType: 'lease.renewed',
      entityType: 'assignment',
      entityId: renewed.id,
      entityLabel: `Lease renewal · ${tenantLabel || renewed.id}`,
      beforeData: {
        leaseId: previous.id,
        endDate: previous.endDate,
        monthlyRate: previous.monthlyRate,
      },
      afterData: {
        leaseId: renewed.id,
        startDate: renewed.startDate,
        endDate: renewed.endDate,
        monthlyRate: renewed.monthlyRate,
        options,
      },
      link: `/admin/tenants/${renewed.tenantId}?tab=lease`,
      metadata: {
        previousLeaseId: previous.id,
        tenantId: renewed.tenantId,
        options,
        link: `/admin/tenants/${renewed.tenantId}?tab=lease`,
      },
    });

    return NextResponse.json({
      success: true,
      data: { previous, renewed },
      message: 'Lease renewed successfully',
    });
  } catch (error) {
    console.error('POST /api/leases/[id]/renew error:', error);
    const message = error instanceof Error ? error.message : 'Failed to renew lease';
    const status =
      message === 'Lease not found'
        ? 404
        : message.includes('required') || message.includes('overlapping')
          ? 400
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
