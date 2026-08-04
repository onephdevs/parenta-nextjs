import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  getCardsForBoard,
  getPipelineBoards,
  updatePipelineBoard,
} from '@/lib/api/pipeline';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const body = await request.json();

    if (body.name === undefined && body.description === undefined) {
      return NextResponse.json(
        { success: false, error: 'Provide name and/or description' },
        { status: 400 }
      );
    }

    const board = await updatePipelineBoard(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description:
        body.description === undefined
          ? undefined
          : body.description === null
            ? null
            : String(body.description),
    });

    return NextResponse.json({ success: true, data: { board } });
  } catch (err) {
    console.error('Pipeline board PATCH error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update board',
      },
      { status: 500 }
    );
  }
}

/** Keep GET ?slug= working via boards/route — this is id-based helpers if needed */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const boards = await getPipelineBoards();
    const board = boards.find((b) => b.id === id);
    if (!board) {
      return NextResponse.json({ success: false, error: 'Board not found' }, { status: 404 });
    }
    const cards = await getCardsForBoard(board.slug);
    return NextResponse.json({ success: true, data: { board, cards } });
  } catch (err) {
    console.error('Pipeline board GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch board',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
