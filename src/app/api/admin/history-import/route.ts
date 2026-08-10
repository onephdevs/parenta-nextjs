import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getHistoryImportTemplateCsv,
  runHistoryImport,
  type HistoryImportType,
} from '@/lib/services/history-import-service';

const TYPES: HistoryImportType[] = [
  'payments',
  'expenses',
  'tenants',
  'meter_readings',
];

/**
 * GET /api/admin/history-import?type=payments&template=1
 * Download CSV template for a history import type.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const type = request.nextUrl.searchParams.get(
      'type'
    ) as HistoryImportType | null;
    const wantTemplate = request.nextUrl.searchParams.get('template') === '1';

    if (!type || !TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `type must be one of: ${TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (wantTemplate) {
      const csv = getHistoryImportTemplateCsv(type);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="history-import-${type}-template.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { types: TYPES, type },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/history-import
 * Body: { type, csvText, dryRun?, filename? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const type = body.type as HistoryImportType;
    const csvText = String(body.csvText || '');
    const dryRun = body.dryRun !== false; // default preview

    if (!type || !TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `type must be one of: ${TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }
    if (!csvText.trim()) {
      return NextResponse.json(
        { success: false, error: 'csvText is required' },
        { status: 400 }
      );
    }

    const result = await runHistoryImport(type, csvText, {
      dryRun,
      filename: body.filename ? String(body.filename) : undefined,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: dryRun
        ? 'Preview complete — review errors then commit'
        : 'Import committed',
    });
  } catch (error) {
    console.error('History import failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'History import failed',
      },
      { status: 500 }
    );
  }
}
