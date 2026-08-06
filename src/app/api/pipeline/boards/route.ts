import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  createPipelineBoard,
  ensureMaintenanceBoardExists,
  getCardsForBoard,
  getPipelineBoards,
  syncActiveLeasesToPipelineCards,
  syncOpenMaintenanceToPipelineCards,
} from '@/lib/api/pipeline';
import type { PipelineBoardSlug } from '@/types/database';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') as PipelineBoardSlug | null;
    const autoSync = searchParams.get('sync') !== '0';

    await ensureMaintenanceBoardExists();

    // Auto-sync when opening Payments / Maintenance so stages reflect live data
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

    const boards = await getPipelineBoards();

    if (slug) {
      const board = boards.find((b) => b.slug === slug);
      if (!board) {
        return NextResponse.json(
          { success: false, error: 'Board not found' },
          { status: 404 }
        );
      }
      const cards = await getCardsForBoard(slug);
      return NextResponse.json({
        success: true,
        data: { boards, board, cards },
      });
    }

    return NextResponse.json({
      success: true,
      data: { boards },
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
