import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  createPipelineBoard,
  ensureExpensesBoardExists,
  ensureMaintenanceBoardExists,
  getCardsForBoard,
  getPipelineBoards,
  reorderPipelineBoards,
  syncActiveLeasesToPipelineCards,
  syncOpenMaintenanceToPipelineCards,
  syncPendingUtilityBillsToPipelineCards,
} from '@/lib/api/pipeline';
import type { PipelineBoardSlug } from '@/types/database';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') as PipelineBoardSlug | null;
    const autoSync = searchParams.get('sync') === '1';

    await ensureMaintenanceBoardExists();
    await ensureExpensesBoardExists();

    // Opt-in sync only (?sync=1). Never block board loads on lease/maintenance sync —
    // that can take tens of seconds with many active leases.
    if (autoSync && slug === 'payments') {
      try {
        await syncActiveLeasesToPipelineCards();
      } catch (syncErr) {
        console.error('Auto-sync payments pipeline failed:', syncErr);
      }
    }
    if (autoSync && slug === 'maintenance') {
      try {
        await syncOpenMaintenanceToPipelineCards();
      } catch (syncErr) {
        console.error('Auto-sync maintenance pipeline failed:', syncErr);
      }
    }
    if (autoSync && slug === 'expenses') {
      try {
        await syncPendingUtilityBillsToPipelineCards();
      } catch (syncErr) {
        console.error('Auto-sync expenses pipeline failed:', syncErr);
      }
    }

    const includeArchived = searchParams.get('archived') === '1';
    const boards = includeArchived
      ? await getPipelineBoards({ includeInactive: true })
      : await getPipelineBoards();

    if (slug) {
      const matched =
        boards.find((b) => b.slug === slug && b.isActive !== false) ||
        (includeArchived ? boards.find((b) => b.slug === slug) : undefined);
      if (!matched) {
        return NextResponse.json(
          { success: false, error: 'Board not found' },
          { status: 404 }
        );
      }
      const cards = await getCardsForBoard(matched.slug);
      return NextResponse.json({
        success: true,
        data: {
          boards: includeArchived ? boards : boards.filter((b) => b.isActive !== false),
          board: matched,
          cards,
          archivedBoards: includeArchived
            ? boards.filter((b) => !b.isActive)
            : undefined,
        },
      });
    }

    const active = boards.filter((b) => b.isActive !== false);
    const archived = boards.filter((b) => !b.isActive);
    return NextResponse.json({
      success: true,
      data: {
        boards: includeArchived ? boards : active,
        archivedBoards: archived,
      },
    });
  } catch (err) {
    console.error('Pipeline boards API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pipeline boards',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Board name is required' },
        { status: 400 }
      );
    }

    const board = await createPipelineBoard({
      name: body.name,
      description: body.description,
      stages: Array.isArray(body.stages) ? body.stages : undefined,
    });

    return NextResponse.json({ success: true, data: { board } }, { status: 201 });
  } catch (err) {
    console.error('Pipeline board create error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create board',
      },
      { status: 500 }
    );
  }
}

/** Reorder active boards: { boardIds: string[] } */
export async function PUT(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    if (!Array.isArray(body.boardIds) || body.boardIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'boardIds array is required' },
        { status: 400 }
      );
    }

    const boards = await reorderPipelineBoards(body.boardIds);
    return NextResponse.json({ success: true, data: { boards } });
  } catch (err) {
    console.error('Pipeline board reorder error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reorder boards',
      },
      { status: 500 }
    );
  }
}
