import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  createLeasePackageTemplate,
  listLeasePackageTemplates,
  type LeasePackagePenaltyType,
} from '@/lib/api/lease-package-templates';

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

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const activeOnly = request.nextUrl.searchParams.get('activeOnly') !== 'false';
    const templates = await listLeasePackageTemplates({ activeOnly });
    return NextResponse.json({ success: true, data: templates });
  } catch (err) {
    console.error('GET /api/lease-package-templates error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load lease templates',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const template = await createLeasePackageTemplate({
      name: String(body.name || ''),
      termMonths: parseNullableNumber(body.termMonths),
      depositMonths: parseNullableNumber(body.depositMonths),
      advanceMonths: Number(body.advanceMonths ?? 1),
      gracePeriodDays: parseNullableNumber(body.gracePeriodDays),
      penaltyType: parsePenaltyType(body.penaltyType),
      penaltyFee: parseNullableNumber(body.penaltyFee),
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Lease template created',
    });
  } catch (err) {
    console.error('POST /api/lease-package-templates error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create lease template';
    const status =
      message.includes('required') ||
      message.includes('negative') ||
      message.includes('already exists')
        ? 400
        : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
