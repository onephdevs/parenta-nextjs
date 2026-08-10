/**
 * GET/PATCH /api/utility-unit-groups/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  getUtilityUnitGroup,
  updateUtilityUnitGroup,
} from '@/lib/api/utility-unit-groups';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireRole(['admin']);
    if (error) return error;

    const { id } = await params;
    const data = await getUtilityUnitGroup(id);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/utility-unit-groups/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load unit group' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireRole(['admin']);
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const data = await updateUtilityUnitGroup(id, {
      name: body.name,
      utilityType: body.utilityType,
      description: body.description,
      isActive: body.isActive,
      roomIds: Array.isArray(body.roomIds) ? body.roomIds.map(String) : undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('PATCH /api/utility-unit-groups/[id] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update unit group',
      },
      { status: 500 }
    );
  }
}
