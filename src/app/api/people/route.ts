import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPeopleStats, listPeople, type PersonListBadge } from '@/lib/api/people';

function parseBadge(value: string | null): PersonListBadge {
  if (
    value === 'active' ||
    value === 'past' ||
    value === 'prospect' ||
    value === 'all' ||
    value === 'unassigned'
  ) {
    return value;
  }
  // Legacy community filters
  if (value === 'current') return 'active';
  if (value === 'pending' || value === 'member') return 'prospect';
  return 'all';
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const badge = parseBadge(searchParams.get('badge') || searchParams.get('status'));
    const buildingId = searchParams.get('buildingId') || undefined;
    const limit = Number(searchParams.get('limit') || 200);
    const offset = Number(searchParams.get('offset') || 0);

    const [list, stats] = await Promise.all([
      listPeople({ search, badge, buildingId, limit, offset }),
      getPeopleStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        people: list.people,
        total: list.total,
        stats,
      },
    });
  } catch (err) {
    console.error('People list error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load people',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
