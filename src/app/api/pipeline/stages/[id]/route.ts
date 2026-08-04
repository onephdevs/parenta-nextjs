import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { deletePipelineStage, updatePipelineStage } from '@/lib/api/pipeline';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const body = await request.json();

    if (
      body.name === undefined &&
      body.color === undefined &&
      body.sortOrder === undefined &&
      body.isWon === undefined &&
      body.isLost === undefined &&
      body.isTerminal === undefined
    ) {
      return NextResponse.json(
        { success: false, error: 'No updatable fields provided' },
        { status: 400 }
      );
    }

    const stage = await updatePipelineStage(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      color: typeof body.color === 'string' ? body.color : undefined,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
      isWon: typeof body.isWon === 'boolean' ? body.isWon : undefined,
      isLost: typeof body.isLost === 'boolean' ? body.isLost : undefined,
      isTerminal: typeof body.isTerminal === 'boolean' ? body.isTerminal : undefined,
    });

    return NextResponse.json({ success: true, data: { stage } });
  } catch (err) {
    console.error('Pipeline stage PATCH error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update stage',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const moveCardsToStageId = searchParams.get('moveCardsToStageId') || undefined;

    await deletePipelineStage(id, { moveCardsToStageId });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Pipeline stage DELETE error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete stage',
      },
      { status: 500 }
    );
  }
}
