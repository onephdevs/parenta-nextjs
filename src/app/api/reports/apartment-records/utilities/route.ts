import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  bulkUpsertApartmentUtilities,
  type ApartmentUtilityUpdate,
} from '@/lib/services/apartment-records-service';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100) / 100;
}

function parseUpdates(body: {
  updates?: unknown;
  roomIds?: unknown;
  electric?: unknown;
  water?: unknown;
}): ApartmentUtilityUpdate[] {
  if (Array.isArray(body.updates)) {
    return body.updates.flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const item = row as { roomId?: unknown; electric?: unknown; water?: unknown };
      if (typeof item.roomId !== 'string' || !UUID_RE.test(item.roomId)) return [];
      return [
        {
          roomId: item.roomId,
          electric: parseAmount(item.electric),
          water: parseAmount(item.water),
        },
      ];
    });
  }

  const roomIds = Array.isArray(body.roomIds)
    ? body.roomIds.filter((id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id))
    : [];
  const electric = parseAmount(body.electric);
  const water = parseAmount(body.water);
  return roomIds.map((roomId) => ({ roomId, electric, water }));
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const startDate = typeof body.startDate === 'string' ? body.startDate : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate : '';
    const billStatus = body.billStatus === 'paid' ? 'paid' : 'pending';
    const updates = parseUpdates(body);

    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'A valid billing period is required' },
        { status: 400 }
      );
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { success: false, error: 'Period end must be on or after start' },
        { status: 400 }
      );
    }
    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Select at least one unit' },
        { status: 400 }
      );
    }

    const result = await bulkUpsertApartmentUtilities({
      startDate,
      endDate,
      billStatus,
      updates,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Saved utilities for ${updates.length} unit${updates.length === 1 ? '' : 's'}`,
    });
  } catch (err) {
    console.error('POST /api/reports/apartment-records/utilities error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save utilities',
      },
      { status: 400 }
    );
  }
}
