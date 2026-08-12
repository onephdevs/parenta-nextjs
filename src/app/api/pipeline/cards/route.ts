import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  createPipelineCard,
  getBoardBySlug,
  getCardsForBoard,
} from '@/lib/api/pipeline';
import type { CreatePipelineCardData, PipelineBoardSlug } from '@/types/database';
import { logActivitySafe } from '@/lib/services/activity-logger';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const boardSlug = searchParams.get('board') as PipelineBoardSlug | null;

    if (!boardSlug) {
      return NextResponse.json(
        { success: false, error: 'board query param is required' },
        { status: 400 }
      );
    }

    const board = await getBoardBySlug(boardSlug);
    if (!board) {
      return NextResponse.json({ success: false, error: 'Board not found' }, { status: 404 });
    }

    const cards = await getCardsForBoard(boardSlug);
    return NextResponse.json({ success: true, data: { cards } });
  } catch (err) {
    console.error('Pipeline cards GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cards',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as CreatePipelineCardData;

    if (!body.boardSlug) {
      return NextResponse.json(
        { success: false, error: 'boardSlug is required' },
        { status: 400 }
      );
    }

    const board = await getBoardBySlug(body.boardSlug);
    if (!board) {
      return NextResponse.json({ success: false, error: 'Board not found' }, { status: 404 });
    }

    if (body.boardSlug === 'onboarding') {
      const hasBuilding = Boolean(body.buildingId);
      const hasRoom = Boolean(body.roomId);
      // Building alone is OK (website / early inquiry). Room requires building.
      if (hasRoom && !hasBuilding) {
        return NextResponse.json(
          { success: false, error: 'Select a building for the room' },
          { status: 400 }
        );
      }
    }

    const card = await createPipelineCard(body, session?.user?.id);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'pipeline.card_created',
      category: 'leases',
      entityType: 'pipeline_card',
      entityId: card.id,
      entityLabel: card.title,
      metadata: {
        boardSlug: card.boardSlug || body.boardSlug,
        boardName: (card.boardSlug || body.boardSlug || '').replace(/_/g, ' ') || null,
        stageName: card.stageName || null,
        link: card.boardSlug ? `/admin/tasks?board=${card.boardSlug}` : '/admin/tasks',
      },
      link: card.boardSlug ? `/admin/tasks?board=${card.boardSlug}` : '/admin/tasks',
    });

    return NextResponse.json({ success: true, data: { card } }, { status: 201 });
  } catch (err) {
    console.error('Pipeline cards POST error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create card',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
