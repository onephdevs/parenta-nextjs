import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  createPipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
} from '@/lib/api/pipeline';

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    if (!body.boardId || !body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'boardId and name are required' },
        { status: 400 }
      );
    }

    const stage = await createPipelineStage({
      boardId: body.boardId,
      name: body.name,
      color: body.color,
      isWon: body.isWon,
      isLost: body.isLost,
    });

    return NextResponse.json({ success: true, data: { stage } }, { status: 201 });
  } catch (err) {
    console.error('Pipeline stage create error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create stage',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    if (!body.boardId || !Array.isArray(body.stageIds)) {
      return NextResponse.json(
        { success: false, error: 'boardId and stageIds are required' },
        { status: 400 }
      );
    }

    const stages = await reorderPipelineStages(body.boardId, body.stageIds);
    return NextResponse.json({ success: true, data: { stages } });
  } catch (err) {
    console.error('Pipeline stage reorder error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reorder stages',
      },
      { status: 500 }
    );
  }
}
