import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  APARTMENT_IMPORT_CSV_TEMPLATE,
  commitApartmentRecordsImport,
  previewApartmentRecordsImport,
} from '@/lib/services/apartment-records-import';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 6 * 1024 * 1024;

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  return new NextResponse(APARTMENT_IMPORT_CSV_TEMPLATE, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="apartment-records-import.csv"',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const form = await request.formData();
    const file = form.get('file');
    const startDate = typeof form.get('startDate') === 'string' ? String(form.get('startDate')) : '';
    const endDate = typeof form.get('endDate') === 'string' ? String(form.get('endDate')) : '';
    const buildingRaw = typeof form.get('buildingId') === 'string' ? String(form.get('buildingId')) : '';
    const buildingId = UUID_RE.test(buildingRaw) ? buildingRaw : null;
    const dryRun = String(form.get('dryRun') || 'true') !== 'false';

    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate) {
      return NextResponse.json(
        { success: false, error: 'A valid billing period is required' },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Choose a spreadsheet or CSV file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'File must be 6 MB or smaller' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await previewApartmentRecordsImport({
      buffer,
      fileName: file.name,
      buildingId,
    });

    if (preview.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No electric or water amounts were found. Use the APRT. RECORDS workbook or the CSV template.',
        },
        { status: 400 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: preview,
        message: `Found ${preview.matched} matching unit${preview.matched === 1 ? '' : 's'}`,
      });
    }

    if (preview.matched === 0) {
      return NextResponse.json(
        { success: false, error: 'None of the units in the file match Balibago or Villasol rooms' },
        { status: 400 }
      );
    }

    const result = await commitApartmentRecordsImport({
      preview,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      data: { ...preview, ...result },
      message: `Imported utilities for ${result.units} unit${result.units === 1 ? '' : 's'}`,
    });
  } catch (err) {
    console.error('POST /api/reports/apartment-records/import error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to import apartment records',
      },
      { status: 400 }
    );
  }
}
