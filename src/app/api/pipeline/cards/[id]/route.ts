import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  deletePipelineCard,
  getPipelineCardById,
  movePipelineCard,
  transferCardToBoard,
  updatePipelineCard,
} from '@/lib/api/pipeline';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function boardLink(boardSlug?: string | null): string {
  return boardSlug ? `/admin/tasks?board=${boardSlug}` : '/admin/tasks';
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
    return NextResponse.json({ success: true, data: { card } });
  } catch (err) {
    console.error('Pipeline card GET error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch card',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as string | undefined;

    if (action === 'move') {
      if (!body.stageId) {
        return NextResponse.json(
          { success: false, error: 'stageId is required' },
          { status: 400 }
        );
      }
      const before = await getPipelineCardById(id);
      const card = await movePipelineCard(id, body.stageId, {
        position: body.position,
        userId: session?.user?.id,
        note: body.note,
      });

      logActivitySafe({
        actorUserId: session?.user?.id || null,
        actorRole: 'admin',
        actionType: 'pipeline.card_moved',
        category: 'leases',
        entityType: 'pipeline_card',
        entityId: card.id,
        entityLabel: card.title,
        metadata: {
          stageId: body.stageId,
          fromStageName: before?.stageName || null,
          stageName: card.stageName || null,
          boardSlug: card.boardSlug || null,
          note: typeof body.note === 'string' ? body.note.trim() || null : null,
          link: boardLink(card.boardSlug),
        },
        link: boardLink(card.boardSlug),
      });

      return NextResponse.json({ success: true, data: { card } });
    }

    if (action === 'move_to_board') {
      if (!body.boardId?.trim()) {
        return NextResponse.json(
          { success: false, error: 'boardId is required' },
          { status: 400 }
        );
      }
      const card = await transferCardToBoard(id, body.boardId.trim(), {
        stageId: body.stageId?.trim() || undefined,
        userId: session?.user?.id,
        note: typeof body.note === 'string' ? body.note.trim() || undefined : undefined,
      });
      logActivitySafe({
        actorUserId: session?.user?.id || null,
        actorRole: 'admin',
        actionType: 'pipeline.moved_to_board',
        category: 'leases',
        entityType: 'pipeline_card',
        entityId: card.id,
        entityLabel: card.title,
        metadata: {
          boardId: body.boardId,
          boardSlug: card.boardSlug,
          boardName: card.boardSlug?.replace(/_/g, ' ') || null,
          stageId: card.stageId,
          stageName: card.stageName,
          link: boardLink(card.boardSlug),
        },
        link: boardLink(card.boardSlug),
      });
      return NextResponse.json({ success: true, data: { card } });
    }

    if (action === 'update' || !action) {
      if (body.contactFirstName !== undefined || body.contactLastName !== undefined) {
        const first =
          body.contactFirstName !== undefined
            ? String(body.contactFirstName || '').trim()
            : undefined;
        const last =
          body.contactLastName !== undefined
            ? String(body.contactLastName || '').trim()
            : undefined;
        if (first !== undefined && !first) {
          return NextResponse.json(
            { success: false, error: 'First name cannot be empty' },
            { status: 400 }
          );
        }
        if (last !== undefined && !last) {
          return NextResponse.json(
            { success: false, error: 'Last name cannot be empty' },
            { status: 400 }
          );
        }
      }

      const { card, changeNotes } = await updatePipelineCard(
        id,
        {
          title: typeof body.title === 'string' ? body.title : undefined,
          contactFirstName:
            body.contactFirstName !== undefined ? body.contactFirstName : undefined,
          contactLastName:
            body.contactLastName !== undefined ? body.contactLastName : undefined,
          contactEmail: body.contactEmail !== undefined ? body.contactEmail : undefined,
          contactPhone: body.contactPhone !== undefined ? body.contactPhone : undefined,
          buildingId: body.buildingId !== undefined ? body.buildingId || null : undefined,
          roomId: body.roomId !== undefined ? body.roomId || null : undefined,
          amount:
            body.amount === undefined
              ? undefined
              : body.amount === null || body.amount === ''
                ? null
                : Number(body.amount),
          source: body.source !== undefined ? body.source : undefined,
          tags: Array.isArray(body.tags) ? body.tags : undefined,
          dueAt: body.dueAt !== undefined ? body.dueAt || null : undefined,
          nextActionAt:
            body.nextActionAt !== undefined ? body.nextActionAt || null : undefined,
          viewingAt: body.viewingAt !== undefined ? body.viewingAt || null : undefined,
          notes: body.notes !== undefined ? body.notes : undefined,
          lostReason: body.lostReason !== undefined ? body.lostReason : undefined,
          markAsLost: body.markAsLost === true,
          backgroundCheckStatus: body.backgroundCheckStatus,
          backgroundCheckNotes:
            body.backgroundCheckNotes !== undefined ? body.backgroundCheckNotes : undefined,
          leaseStatus: body.leaseStatus,
          leaseStartDate: body.leaseStartDate !== undefined ? body.leaseStartDate : undefined,
          leaseEndDate: body.leaseEndDate !== undefined ? body.leaseEndDate : undefined,
          moveInDate: body.moveInDate !== undefined ? body.moveInDate : undefined,
          depositAmount:
            body.depositAmount === undefined
              ? undefined
              : body.depositAmount === null || body.depositAmount === ''
                ? null
                : Number(body.depositAmount),
          advanceAmount:
            body.advanceAmount === undefined
              ? undefined
              : body.advanceAmount === null || body.advanceAmount === ''
                ? null
                : Number(body.advanceAmount),
          moveInPaymentStatus:
            body.moveInPaymentStatus === 'paid' || body.moveInPaymentStatus === 'unpaid'
              ? body.moveInPaymentStatus
              : undefined,
          moveInPaidAt:
            body.moveInPaidAt !== undefined
              ? body.moveInPaidAt === null || body.moveInPaidAt === ''
                ? null
                : String(body.moveInPaidAt)
              : undefined,
          moveInPaymentMethod:
            body.moveInPaymentMethod !== undefined ? body.moveInPaymentMethod : undefined,
          moveInPaymentNotes:
            body.moveInPaymentNotes !== undefined ? body.moveInPaymentNotes : undefined,
          assignedTo:
            body.assignedTo !== undefined
              ? body.assignedTo === null || body.assignedTo === ''
                ? null
                : String(body.assignedTo)
              : undefined,
          markLeaseSigned: body.markLeaseSigned === true,
          generateLease: body.generateLease === true,
        },
        session?.user?.id
      );

      if (changeNotes.length > 0) {
        logActivitySafe({
          actorUserId: session?.user?.id || null,
          actorRole: 'admin',
          actionType: 'pipeline.card_updated',
          category: 'leases',
          entityType: 'pipeline_card',
          entityId: card.id,
          entityLabel: card.title,
          metadata: {
            changes: changeNotes,
            summary: changeNotes.slice(0, 3).join('; '),
            boardSlug: card.boardSlug || null,
            stageName: card.stageName || null,
            link: boardLink(card.boardSlug),
          },
          link: boardLink(card.boardSlug),
        });
      }

      return NextResponse.json({ success: true, data: { card } });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unknown action. Use update, move, or move_to_board',
      },
      { status: 400 }
    );
  } catch (err) {
    console.error('Pipeline card PATCH error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update card',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const card = await deletePipelineCard(id);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'pipeline.card_deleted',
      category: 'leases',
      entityType: 'pipeline_card',
      entityId: card.id,
      entityLabel: card.title,
      metadata: {
        boardSlug: card.boardSlug || null,
        link: boardLink(card.boardSlug),
      },
      link: boardLink(card.boardSlug),
    });

    return NextResponse.json({ success: true, data: { id: card.id } });
  } catch (err) {
    console.error('Pipeline card DELETE error:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete card';
    const status = message === 'Card not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
