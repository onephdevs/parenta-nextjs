import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  deleteLeasePackageTemplate,
  getLeasePackageTemplate,
  updateLeasePackageTemplate,
  type LeasePackagePenaltyType,
} from '@/lib/api/lease-package-templates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parsePenaltyType(value: unknown): LeasePackagePenaltyType | null {
  if (value === null || value === undefined || value === '' || value === 'none') {
    return null;
  }
  return value === 'flat_fee' || value === 'Flat Fee' ? 'flat_fee' : 'percentage';
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || value === 'none') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const template = await getLeasePackageTemplate(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Lease template not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: template });
  } catch (err) {
    console.error('GET /api/lease-package-templates/[id] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load lease template',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const template = await updateLeasePackageTemplate(id, {
      name: String(body.name || ''),
      termMonths: parseNullableNumber(body.termMonths),
      depositMonths: parseNullableNumber(body.depositMonths),
      advanceMonths: Number(body.advanceMonths ?? 1),
      gracePeriodDays: parseNullableNumber(body.gracePeriodDays),
      penaltyType: parsePenaltyType(body.penaltyType),
      penaltyFee: parseNullableNumber(body.penaltyFee),
      isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Lease template updated',
    });
  } catch (err) {
    console.error('PUT /api/lease-package-templates/[id] error:', err);
    const message = err instanceof Error ? err.message : 'Failed to update lease template';
    const status =
      message === 'Lease template not found'
        ? 404
        : message.includes('required') || message.includes('negative')
          ? 400
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const result = await deleteLeasePackageTemplate(id);
    if (!result.deleted) {
      return NextResponse.json(
        {
          success: false,
          code: 'TEMPLATE_IN_USE',
          error: result.blockedReason || 'Unable to delete lease template',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lease template deleted',
    });
  } catch (err) {
    console.error('DELETE /api/lease-package-templates/[id] error:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete lease template';
    const status = message === 'Lease template not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
