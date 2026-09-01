import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { createPipelineCard, getBoardBySlug } from '@/lib/api/pipeline';
import { parsePipelineCsv } from '@/lib/pipeline/csv-import';
import type { PipelineBoardSlug } from '@/types/database';
import { logActivitySafe } from '@/lib/services/activity-logger';

const MAX_ROWS = 200;

/**
 * POST /api/pipeline/cards/import
 * Body: { boardSlug, csv }
 */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as { boardSlug?: string; csv?: string };
    const boardSlug = String(body.boardSlug || '') as PipelineBoardSlug;
    const csv = String(body.csv || '');

    if (!boardSlug || !csv.trim()) {
      return NextResponse.json(
        { success: false, error: 'boardSlug and csv are required' },
        { status: 400 }
      );
    }

    const board = await getBoardBySlug(boardSlug);
    if (!board) {
      return NextResponse.json({ success: false, error: 'Board not found' }, { status: 404 });
    }

    const parsed = parsePipelineCsv(csv, boardSlug);
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.errors[0]?.message || 'No valid rows to import',
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json(
        { success: false, error: `CSV is limited to ${MAX_ROWS} rows per import` },
        { status: 400 }
      );
    }

    const created: string[] = [];
    const rowErrors = [...parsed.errors];

    for (const row of parsed.rows) {
      try {
        if (row.data.stageSlug) {
          const match = board.stages.find(
            (stage) =>
              stage.slug.toLowerCase() === row.data.stageSlug!.toLowerCase() ||
              stage.name.toLowerCase() === row.data.stageSlug!.toLowerCase()
          );
          row.data.stageSlug = match?.slug;
        }
        const card = await createPipelineCard(row.data, session?.user?.id);
        created.push(card.id);
      } catch (err) {
        rowErrors.push({
          line: row.line,
          message: err instanceof Error ? err.message : 'Failed to create card',
        });
      }
    }

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'pipeline.card_created',
      category: 'leases',
      entityType: 'pipeline_card',
      entityId: board.id,
      entityLabel: `CSV import · ${created.length} cards`,
      metadata: {
        boardSlug,
        imported: created.length,
        failed: rowErrors.length,
        link: `/admin/tasks?board=${boardSlug}`,
      },
      link: `/admin/tasks?board=${boardSlug}`,
    });

    return NextResponse.json({
      success: created.length > 0,
      data: {
        imported: created.length,
        failed: rowErrors.length,
        errors: rowErrors.slice(0, 25),
      },
      message:
        created.length > 0
          ? `Imported ${created.length} card${created.length === 1 ? '' : 's'}`
          : 'No cards were imported',
    });
  } catch (err) {
    console.error('Pipeline CSV import error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to import CSV',
      },
      { status: 500 }
    );
  }
}
