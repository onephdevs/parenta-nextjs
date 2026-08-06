import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPipelineCardById, getPipelineCardEvents } from '@/lib/api/pipeline';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const card = await getPipelineCardById(id);
    if (!card) {
      return NextResponse.json({ success: false, error: 'Card not found' }, { status: 404 });
    }

    const events = await getPipelineCardEvents(id);
    return NextResponse.json({ success: true, data: { events } });
  } catch (err) {
    console.error('Pipeline card events GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch opportunity history',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
