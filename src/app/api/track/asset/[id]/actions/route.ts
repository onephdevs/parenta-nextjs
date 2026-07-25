import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAssetById } from '@/lib/api/assets';

/**
 * Public QR-friendly actions for tracked assets.
 * Creates maintenance requests / updates notes without requiring admin session.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    const body = await request.json();
    const action = body.action as string;
    const location = typeof body.location === 'string' ? body.location.trim() : '';

    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const assetName = asset.assetName;
    const buildingId = asset.buildingId || body.buildingId || null;

    if (action === 'report_issue' || action === 'request_maintenance') {
      const title =
        action === 'report_issue'
          ? `Asset issue: ${assetName}`
          : `Maintenance requested: ${assetName}`;
      const description =
        action === 'report_issue'
          ? `Issue reported via asset tracking QR for "${assetName}" (asset id ${assetId}).`
          : `Maintenance requested via asset tracking QR for "${assetName}" (asset id ${assetId}).`;

      const result = await pool.query(
        `INSERT INTO maintenance_requests (
          building_id, title, description, category, priority, status, request_date
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id`,
        [
          buildingId,
          title,
          description,
          'equipment',
          action === 'report_issue' ? 'high' : 'medium',
          'open',
        ]
      );

      return NextResponse.json({
        success: true,
        message:
          action === 'report_issue'
            ? 'Issue reported. Property management has been notified.'
            : 'Maintenance request submitted.',
        data: { maintenanceRequestId: result.rows[0].id },
      });
    }

    if (action === 'update_location') {
      if (!location) {
        return NextResponse.json(
          { success: false, error: 'Location is required' },
          { status: 400 }
        );
      }

      const stamp = new Date().toISOString();
      const noteLine = `[${stamp}] Location updated via QR: ${location}`;
      const existingNotes = asset.notes ? `${asset.notes}\n${noteLine}` : noteLine;

      await pool.query(
        `UPDATE assets
         SET notes = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [existingNotes, assetId]
      );

      return NextResponse.json({
        success: true,
        message: `Location updated to "${location}".`,
        data: { location },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Asset track action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process asset action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
