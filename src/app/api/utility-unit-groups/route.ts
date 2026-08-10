/**
 * GET /api/utility-unit-groups?buildingId=
 * POST /api/utility-unit-groups
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  createUtilityUnitGroup,
  listUtilityUnitGroups,
} from '@/lib/api/utility-unit-groups';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireRole(['admin']);
    if (error) return error;

    const buildingId = new URL(request.url).searchParams.get('buildingId') || undefined;
    const data = await listUtilityUnitGroups(buildingId || undefined);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/utility-unit-groups error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to list unit groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireRole(['admin']);
    if (error) return error;

    const body = await request.json();
    if (!body.buildingId || !body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'buildingId and name are required' },
        { status: 400 }
      );
    }

    const data = await createUtilityUnitGroup({
      buildingId: String(body.buildingId),
      name: String(body.name),
      utilityType: body.utilityType || null,
      description: body.description || null,
      roomIds: Array.isArray(body.roomIds) ? body.roomIds.map(String) : [],
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/utility-unit-groups error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create unit group',
      },
      { status: 500 }
    );
  }
}
