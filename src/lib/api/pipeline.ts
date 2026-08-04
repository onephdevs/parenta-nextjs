import pool from '@/lib/db';
import { createTenantWithUser } from '@/lib/api/tenant-user-link';
import type {
  CreatePipelineCardData,
  PipelineBackgroundCheckStatus,
  PipelineBoard,
  PipelineBoardSlug,
  PipelineCard,
  PipelineCardStatus,
  PipelineLeaseStatus,
  PipelineStage,
} from '@/types/database';

interface DbBoard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface DbStage {
  id: string;
  board_id: string;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  is_terminal: boolean;
  card_count?: string | number;
  total_amount?: string | number | null;
}

interface DbCard {
  id: string;
  board_id: string;
  stage_id: string;
  title: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  building_id: string | null;
  building_name?: string | null;
  room_id: string | null;
  room_number?: string | null;
  tenant_id: string | null;
  assignment_id: string | null;
  expense_id: string | null;
  amount: string | number | null;
  source: string | null;
  tags: string[] | null;
  card_status: string;
  due_at: Date | string | null;
  next_action_at: Date | string | null;
  viewing_at: Date | string | null;
  notes: string | null;
  prior_stage_id: string | null;
  prior_board_id: string | null;
  nurture_reason: string | null;
  lost_reason?: string | null;
  background_check_status?: string | null;
  background_check_notes?: string | null;
  lease_status?: string | null;
  lease_start_date?: Date | string | null;
  lease_end_date?: Date | string | null;
  move_in_date?: Date | string | null;
  position: number;
  won_at: Date | string | null;
  lost_at: Date | string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  stage_color?: string | null;
  stage_slug?: string | null;
  stage_name?: string | null;
  stage_is_won?: boolean | null;
  board_slug?: string | null;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Date-only fields as YYYY-MM-DD for form inputs */
function toIsoDateOnly(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    const yy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  const s = String(value);
  return s.slice(0, 10);
}

function mapStage(row: DbStage): PipelineStage {
  return {
    id: row.id,
    boardId: row.board_id,
    slug: row.slug,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isWon: row.is_won,
    isLost: row.is_lost,
    isTerminal: row.is_terminal,
    cardCount: row.card_count != null ? Number(row.card_count) : undefined,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : undefined,
  };
}

function mapCard(row: DbCard): PipelineCard {
  return {
    id: row.id,
    boardId: row.board_id,
    stageId: row.stage_id,
    title: row.title,
    contactFirstName: row.contact_first_name || undefined,
    contactLastName: row.contact_last_name || undefined,
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
    buildingId: row.building_id || undefined,
    buildingName: row.building_name || undefined,
    roomId: row.room_id || undefined,
    roomNumber: row.room_number || undefined,
    tenantId: row.tenant_id || undefined,
    assignmentId: row.assignment_id || undefined,
    expenseId: row.expense_id || undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    source: row.source || undefined,
    tags: row.tags || [],
    cardStatus: row.card_status as PipelineCardStatus,
    dueAt: toIso(row.due_at),
    nextActionAt: toIso(row.next_action_at),
    viewingAt: toIso(row.viewing_at),
    notes: row.notes || undefined,
    priorStageId: row.prior_stage_id || undefined,
    priorBoardId: row.prior_board_id || undefined,
    nurtureReason: row.nurture_reason || undefined,
    lostReason: row.lost_reason || undefined,
    backgroundCheckStatus: (row.background_check_status as PipelineBackgroundCheckStatus) || 'not_started',
    backgroundCheckNotes: row.background_check_notes || undefined,
    leaseStatus: (row.lease_status as PipelineLeaseStatus) || 'not_started',
    leaseStartDate: toIsoDateOnly(row.lease_start_date),
    leaseEndDate: toIsoDateOnly(row.lease_end_date),
    moveInDate: toIsoDateOnly(row.move_in_date),
    position: row.position,
    wonAt: toIso(row.won_at),
    lostAt: toIso(row.lost_at),
    createdBy: row.created_by || undefined,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
    stageColor: row.stage_color || undefined,
    stageSlug: row.stage_slug || undefined,
    stageName: row.stage_name || undefined,
    stageIsWon: row.stage_is_won ?? undefined,
    boardSlug: (row.board_slug as PipelineBoardSlug) || undefined,
  };
}

export async function getPipelineBoards(): Promise<PipelineBoard[]> {
  const boardsResult = await pool.query<DbBoard>(
    `SELECT * FROM pipeline_boards WHERE is_active = true ORDER BY sort_order ASC`
  );

  if (boardsResult.rows.length === 0) {
    return [];
  }

  const stagesResult = await pool.query<DbStage>(
    `SELECT
       s.*,
       COUNT(c.id) FILTER (WHERE c.card_status = 'open')::int AS card_count,
       COALESCE(SUM(c.amount) FILTER (WHERE c.card_status = 'open'), 0) AS total_amount
     FROM pipeline_stages s
     LEFT JOIN pipeline_cards c ON c.stage_id = s.id AND c.board_id = s.board_id
     WHERE s.board_id = ANY($1::uuid[])
     GROUP BY s.id
     ORDER BY s.sort_order ASC`,
    [boardsResult.rows.map((b) => b.id)]
  );

  return boardsResult.rows.map((board) => {
    const stages = stagesResult.rows
      .filter((s) => s.board_id === board.id)
      .map(mapStage);

    const openCount = stages
      .filter((s) => !s.isLost)
      .reduce((sum, s) => sum + (s.cardCount || 0), 0);
    const openTotalAmount = stages
      .filter((s) => !s.isWon && !s.isLost)
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    return {
      id: board.id,
      slug: board.slug as PipelineBoardSlug,
      name: board.name,
      description: board.description || undefined,
      sortOrder: board.sort_order,
      isActive: board.is_active,
      stages,
      openCount,
      openTotalAmount,
    };
  });
}

export async function getBoardBySlug(slug: PipelineBoardSlug): Promise<PipelineBoard | null> {
  const boards = await getPipelineBoards();
  return boards.find((b) => b.slug === slug) || null;
}

export async function getCardsForBoard(
  boardSlug: PipelineBoardSlug,
  options?: { includeClosed?: boolean }
): Promise<PipelineCard[]> {
  const includeClosed = options?.includeClosed ?? true;
  const result = await pool.query<DbCard>(
    `SELECT
       c.*,
       b.name AS building_name,
       r.room_number,
       s.color AS stage_color,
       s.slug AS stage_slug,
       s.name AS stage_name,
       s.is_won AS stage_is_won,
       pb.slug AS board_slug
     FROM pipeline_cards c
     JOIN pipeline_boards pb ON pb.id = c.board_id
     JOIN pipeline_stages s ON s.id = c.stage_id
     LEFT JOIN buildings b ON b.id = c.building_id
     LEFT JOIN rooms r ON r.id = c.room_id
     WHERE pb.slug = $1
       AND ($2::boolean OR c.card_status = 'open')
     ORDER BY s.sort_order ASC, c.position ASC, c.created_at ASC`,
    [boardSlug, includeClosed]
  );

  return result.rows.map(mapCard);
}

function buildTitle(data: CreatePipelineCardData): string {
  if (data.title?.trim()) return data.title.trim();
  const name = [data.contactFirstName, data.contactLastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return 'Untitled card';
}

/** Stable + dated tags when a viewing is scheduled */
function applyViewingTags(tags: string[] | null | undefined, viewingAt: string | null): string[] {
  const base = (tags || []).filter(
    (t) => t !== 'Viewing scheduled' && !/^Viewing\s/i.test(t)
  );
  if (!viewingAt) return base;

  const d = new Date(viewingAt);
  const when = Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return [...base, 'Viewing scheduled', when ? `Viewing ${when}` : 'Viewing set'].filter(
    (t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i
  );
}

export async function createPipelineCard(
  data: CreatePipelineCardData,
  createdBy?: string | null
): Promise<PipelineCard> {
  const board = await getBoardBySlug(data.boardSlug);
  if (!board) {
    throw new Error(`Unknown board: ${data.boardSlug}`);
  }

  const viewingAt = data.viewingAt || null;
  const stageSlug =
    data.stageSlug ||
    (board.slug === 'onboarding' && viewingAt ? 'viewing_scheduled' : undefined);

  const stage =
    (stageSlug
      ? board.stages.find((s) => s.slug === stageSlug)
      : board.stages[0]) || null;

  if (!stage) {
    throw new Error(`No stages found for board: ${data.boardSlug}`);
  }

  let amount = data.amount ?? null;
  if (amount == null && data.roomId) {
    const roomResult = await pool.query<{ monthly_rate: string }>(
      `SELECT monthly_rate FROM rooms WHERE id = $1`,
      [data.roomId]
    );
    if (roomResult.rows[0]) {
      amount = Number(roomResult.rows[0].monthly_rate);
    }
  }

  const positionResult = await pool.query<{ next_pos: number }>(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
     FROM pipeline_cards WHERE stage_id = $1`,
    [stage.id]
  );

  const title = buildTitle(data);
  const tags = applyViewingTags(data.tags, viewingAt);
  const finalTags =
    data.lostReason || data.stageSlug === 'lost'
      ? [...tags.filter((t) => t.toLowerCase() !== 'lost'), 'Lost']
      : tags;

  const insert = await pool.query<DbCard>(
    `INSERT INTO pipeline_cards (
       board_id, stage_id, title,
       contact_first_name, contact_last_name, contact_email, contact_phone,
       building_id, room_id, tenant_id, assignment_id, expense_id,
       amount, source, tags, due_at, next_action_at, viewing_at, notes,
       lost_reason, card_status, lost_at,
       position, created_by
     ) VALUES (
       $1, $2, $3,
       $4, $5, $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17, $18, $19,
       $20, $21, $22,
       $23, $24
     )
     RETURNING *`,
    [
      board.id,
      stage.id,
      title,
      data.contactFirstName || null,
      data.contactLastName || null,
      data.contactEmail || null,
      data.contactPhone || null,
      data.buildingId || null,
      data.roomId || null,
      data.tenantId || null,
      data.assignmentId || null,
      data.expenseId || null,
      amount,
      data.source || null,
      finalTags,
      data.dueAt || null,
      data.nextActionAt || null,
      viewingAt,
      data.notes || null,
      data.lostReason?.trim() || null,
      stage.isLost || data.stageSlug === 'lost' ? 'lost' : 'open',
      stage.isLost || data.stageSlug === 'lost' ? new Date().toISOString() : null,
      positionResult.rows[0]?.next_pos ?? 0,
      createdBy || null,
    ]
  );

  const card = insert.rows[0];
  await pool.query(
    `INSERT INTO pipeline_card_events (card_id, event_type, to_stage_id, to_board_id, created_by)
     VALUES ($1, 'created', $2, $3, $4)`,
    [card.id, stage.id, board.id, createdBy || null]
  );

  const cards = await getCardsForBoard(data.boardSlug);
  return cards.find((c) => c.id === card.id)!;
}

export async function movePipelineCard(
  cardId: string,
  stageId: string,
  options?: { position?: number; userId?: string | null; note?: string }
): Promise<PipelineCard> {
  const existing = await pool.query<DbCard>(
    `SELECT c.*, pb.slug AS board_slug
     FROM pipeline_cards c
     JOIN pipeline_boards pb ON pb.id = c.board_id
     WHERE c.id = $1`,
    [cardId]
  );

  if (!existing.rows[0]) {
    throw new Error('Card not found');
  }

  const card = existing.rows[0] as DbCard & { board_slug: string };
  const stageResult = await pool.query<DbStage>(
    `SELECT * FROM pipeline_stages WHERE id = $1 AND board_id = $2`,
    [stageId, card.board_id]
  );
  const stage = stageResult.rows[0];
  if (!stage) {
    throw new Error('Stage not found on this board');
  }

  // Onboarding → Lease signed: create tenant + lease assignment first
  if (stage.is_won && card.board_slug === 'onboarding' && !card.tenant_id) {
    return convertOnboardingCardToLeaseSigned(cardId, {
      userId: options?.userId,
      note: options?.note,
      targetStageId: stageId,
    });
  }

  let cardStatus: PipelineCardStatus = 'open';
  let wonAt: string | null = null;
  let lostAt: string | null = null;
  if (stage.is_won) {
    cardStatus = 'won';
    wonAt = new Date().toISOString();
  } else if (stage.is_lost) {
    cardStatus = 'lost';
    lostAt = new Date().toISOString();
  }

  const position =
    options?.position ??
    (
      await pool.query<{ next_pos: number }>(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM pipeline_cards WHERE stage_id = $1 AND id <> $2`,
        [stageId, cardId]
      )
    ).rows[0]?.next_pos ??
    0;

  await pool.query(
    `UPDATE pipeline_cards SET
       stage_id = $1,
       position = $2,
       card_status = $3,
       won_at = COALESCE($4::timestamptz, won_at),
       lost_at = COALESCE($5::timestamptz, lost_at),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [stageId, position, cardStatus, wonAt, lostAt, cardId]
  );

  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note, created_by
     ) VALUES ($1, 'stage_changed', $2, $3, $4, $4, $5, $6)`,
    [cardId, card.stage_id, stageId, card.board_id, options?.note || null, options?.userId || null]
  );

  const cards = await getCardsForBoard(card.board_slug as PipelineBoardSlug);
  const updated = cards.find((c) => c.id === cardId);
  if (!updated) throw new Error('Failed to reload card');
  return updated;
}

/**
 * Won / Lease signed: create tenant (+ optional login) and room assignment,
 * then mark the card won and link tenant_id / assignment_id.
 */
export async function convertOnboardingCardToLeaseSigned(
  cardId: string,
  options?: {
    userId?: string | null;
    note?: string;
    targetStageId?: string;
    leaseStartDate?: string | null;
    leaseEndDate?: string | null;
    moveInDate?: string | null;
  }
): Promise<PipelineCard> {
  const card = await getPipelineCardById(cardId);
  if (!card) throw new Error('Card not found');
  if (card.boardSlug && card.boardSlug !== 'onboarding') {
    throw new Error('Only onboarding cards can be converted to a lease');
  }
  if (card.tenantId && card.assignmentId) {
    // Already converted — just ensure won stage
    const wonStage = await pool.query<{ id: string }>(
      `SELECT id FROM pipeline_stages
       WHERE board_id = $1 AND (slug = 'won' OR is_won = true)
       ORDER BY CASE WHEN slug = 'won' THEN 0 ELSE 1 END
       LIMIT 1`,
      [card.boardId]
    );
    const stageId = options?.targetStageId || wonStage.rows[0]?.id;
    if (stageId && stageId !== card.stageId) {
      await pool.query(
        `UPDATE pipeline_cards SET
           stage_id = $1,
           card_status = 'won',
           lease_status = 'signed',
           won_at = COALESCE(won_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [stageId, cardId]
      );
    }
    return (await getPipelineCardById(cardId))!;
  }

  const firstName = card.contactFirstName?.trim();
  const lastName = card.contactLastName?.trim();
  if (!firstName || !lastName) {
    throw new Error('First and last name are required before generating a lease');
  }
  if (!card.roomId) {
    throw new Error('Select a building and room before generating a lease');
  }

  const roomResult = await pool.query<{
    id: string;
    monthly_rate: string;
    room_status: string;
    building_id: string;
  }>(`SELECT id, monthly_rate, room_status, building_id FROM rooms WHERE id = $1`, [card.roomId]);
  const room = roomResult.rows[0];
  if (!room) throw new Error('Room not found');
  if (room.room_status === 'occupied') {
    throw new Error('Room is already occupied — pick another unit before generating a lease');
  }

  const email = card.contactEmail?.trim().toLowerCase() || '';
  if (!email) {
    throw new Error('Email is required before generating a lease');
  }

  const startDate =
    (options?.leaseStartDate !== undefined
      ? options.leaseStartDate
      : card.leaseStartDate)?.slice(0, 10) || null;
  if (!startDate) {
    throw new Error('Lease start date is required');
  }
  const endDate =
    (options?.leaseEndDate !== undefined
      ? options.leaseEndDate
      : card.leaseEndDate)?.slice(0, 10) || null;
  const moveInDate =
    (options?.moveInDate !== undefined
      ? options.moveInDate
      : card.moveInDate)?.slice(0, 10) || startDate;

  const monthlyRate = card.amount != null ? Number(card.amount) : Number(room.monthly_rate);
  const notes = [
    card.notes,
    card.source ? `Source: ${card.source}` : null,
    'Created from onboarding → Generate lease',
  ]
    .filter(Boolean)
    .join('\n');

  let tenantId = card.tenantId || null;

  if (!tenantId) {
    const existingTenant = await pool.query<{ id: string }>(
      `SELECT id FROM tenants WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    );
    if (existingTenant.rows[0]) {
      tenantId = existingTenant.rows[0].id;
    } else {
      try {
        const created = await createTenantWithUser({
          email,
          sendInvitation: true,
          firstName,
          lastName,
          phone: card.contactPhone || undefined,
          leaseStartDate: startDate,
          leaseEndDate: endDate || undefined,
          notes,
        });
        tenantId = created.tenantId;
      } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
          const byEmail = await pool.query<{ id: string }>(
            `SELECT id FROM tenants WHERE LOWER(email) = $1 LIMIT 1`,
            [email]
          );
          if (byEmail.rows[0]) {
            tenantId = byEmail.rows[0].id;
          } else {
            throw new Error(
              'A user with this email already exists but has no tenant profile. Link or fix the account first.'
            );
          }
        } else {
          throw err;
        }
      }
    }
  }

  const client = await pool.connect();
  let assignmentId: string;
  try {
    await client.query('BEGIN');

    const active = await client.query(
      `SELECT id FROM tenant_room_assignments
       WHERE room_id = $1 AND assignment_status = 'active'
       LIMIT 1`,
      [card.roomId]
    );
    if (active.rows[0]) {
      throw new Error('Room is already occupied');
    }

    const tenantSnap = await client.query(
      `SELECT first_name, last_name, email FROM tenants WHERE id = $1`,
      [tenantId]
    );
    const snap = tenantSnap.rows[0];
    const tenantNameSnapshot = snap
      ? `${snap.first_name || ''} ${snap.last_name || ''}`.trim()
      : `${firstName} ${lastName}`;

    const assignmentResult = await client.query(
      `INSERT INTO tenant_room_assignments
         (tenant_id, room_id, start_date, end_date, monthly_rate, assignment_status,
          notes, tenant_name_snapshot, tenant_email_snapshot)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8)
       RETURNING id`,
      [
        tenantId,
        card.roomId,
        startDate,
        endDate,
        monthlyRate,
        notes,
        tenantNameSnapshot,
        snap?.email || email || null,
      ]
    );
    assignmentId = String(assignmentResult.rows[0].id);

    await client.query(
      `UPDATE tenants
       SET tenant_status = 'active',
           move_in_date = $1,
           lease_start_date = $2,
           lease_end_date = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [moveInDate, startDate, endDate, tenantId]
    );

    await client.query(
      `UPDATE rooms
       SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [card.roomId]
    );

    // Attach opportunity docs to the new tenant
    await client.query(
      `UPDATE documents
       SET tenant_id = COALESCE(tenant_id, $1),
           building_id = COALESCE(building_id, $2),
           room_id = COALESCE(room_id, $3),
           updated_at = CURRENT_TIMESTAMP
       WHERE pipeline_card_id = $4`,
      [tenantId, room.building_id, card.roomId, cardId]
    );

    // Prefer a lease-type opportunity doc as the primary tenant agreement
    await client.query(
      `UPDATE tenants t
       SET tenant_agreement_document_id = d.id,
           updated_at = CURRENT_TIMESTAMP
       FROM (
         SELECT id
         FROM documents
         WHERE pipeline_card_id = $1
           AND (
             LOWER(COALESCE(document_type, '')) IN ('lease', 'tenant_agreement', 'contract')
             OR LOWER(COALESCE(document_name, '')) LIKE '%lease%'
             OR LOWER(COALESCE(document_name, '')) LIKE '%agreement%'
           )
         ORDER BY
           CASE WHEN LOWER(COALESCE(document_type, '')) IN ('lease', 'tenant_agreement') THEN 0 ELSE 1 END,
           created_at DESC
         LIMIT 1
       ) d
       WHERE t.id = $2
         AND t.tenant_agreement_document_id IS NULL`,
      [cardId, tenantId]
    );

    const wonStage = await client.query<{ id: string }>(
      `SELECT id FROM pipeline_stages
       WHERE board_id = $1 AND (id = $2 OR slug = 'won' OR is_won = true)
       ORDER BY CASE
         WHEN id = $2 THEN 0
         WHEN slug = 'won' THEN 1
         ELSE 2
       END
       LIMIT 1`,
      [card.boardId, options?.targetStageId || null]
    );
    const wonStageId = wonStage.rows[0]?.id;
    if (!wonStageId) throw new Error('Lease signed stage not found');

    const position =
      (
        await client.query<{ next_pos: number }>(
          `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
           FROM pipeline_cards WHERE stage_id = $1 AND id <> $2`,
          [wonStageId, cardId]
        )
      ).rows[0]?.next_pos ?? 0;

    await client.query(
      `UPDATE pipeline_cards SET
         tenant_id = $1,
         assignment_id = $2,
         stage_id = $3,
         position = $4,
         card_status = 'won',
         lease_status = 'signed',
         lease_start_date = $5,
         lease_end_date = $6,
         move_in_date = $7,
         background_check_status = CASE
           WHEN background_check_status = 'not_started' THEN 'approved'
           ELSE background_check_status
         END,
         won_at = COALESCE(won_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        tenantId,
        assignmentId,
        wonStageId,
        position,
        startDate,
        endDate,
        moveInDate,
        cardId,
      ]
    );

    await client.query(
      `INSERT INTO pipeline_card_events (
         card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id,
         note, metadata, created_by
       ) VALUES ($1, 'lease_generated', $2, $3, $4, $4, $5, $6::jsonb, $7)`,
      [
        cardId,
        card.stageId,
        wonStageId,
        card.boardId,
        options?.note || 'Lease generated — tenant and lease created',
        JSON.stringify({ tenantId, assignmentId, startDate, endDate, moveInDate }),
        options?.userId || null,
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const updated = await getPipelineCardById(cardId);
  if (!updated) throw new Error('Failed to reload card after lease generation');
  return updated;
}

export async function transferCardToBoard(
  cardId: string,
  targetBoardId: string,
  options?: { stageId?: string; userId?: string | null; note?: string }
): Promise<PipelineCard> {
  const boards = await getPipelineBoards();
  const targetBoard = boards.find((b) => b.id === targetBoardId);
  if (!targetBoard) {
    throw new Error('Target board not found');
  }
  if (!targetBoard.stages.length) {
    throw new Error('Target board has no stages');
  }

  const existing = await pool.query<DbCard>(
    `SELECT * FROM pipeline_cards WHERE id = $1`,
    [cardId]
  );
  const card = existing.rows[0];
  if (!card) throw new Error('Card not found');
  if (card.board_id === targetBoardId) {
    throw new Error('Card is already on this board');
  }

  let targetStage = options?.stageId
    ? targetBoard.stages.find((s) => s.id === options.stageId)
    : undefined;
  if (!targetStage) {
    targetStage =
      targetBoard.stages.find((s) => !s.isWon && !s.isLost) || targetBoard.stages[0];
  }
  if (!targetStage) {
    throw new Error('Target stage not found on that board');
  }

  let cardStatus: PipelineCardStatus = 'open';
  let wonAt: string | null = null;
  let lostAt: string | null = null;
  if (targetStage.isWon) {
    cardStatus = 'won';
    wonAt = new Date().toISOString();
  } else if (targetStage.isLost) {
    cardStatus = 'lost';
    lostAt = new Date().toISOString();
  }

  const position =
    (
      await pool.query<{ next_pos: number }>(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM pipeline_cards WHERE stage_id = $1`,
        [targetStage.id]
      )
    ).rows[0]?.next_pos ?? 0;

  await pool.query(
    `UPDATE pipeline_cards SET
       prior_board_id = board_id,
       prior_stage_id = stage_id,
       board_id = $1,
       stage_id = $2,
       position = $3,
       card_status = $4,
       won_at = CASE WHEN $4 = 'won' THEN COALESCE($5::timestamptz, won_at) ELSE won_at END,
       lost_at = CASE WHEN $4 = 'lost' THEN COALESCE($6::timestamptz, lost_at) ELSE lost_at END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [targetBoard.id, targetStage.id, position, cardStatus, wonAt, lostAt, cardId]
  );

  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note, created_by
     ) VALUES ($1, 'moved_to_board', $2, $3, $4, $5, $6, $7)`,
    [
      cardId,
      card.stage_id,
      targetStage.id,
      card.board_id,
      targetBoard.id,
      options?.note || null,
      options?.userId || null,
    ]
  );

  const cards = await getCardsForBoard(targetBoard.slug);
  const updated = cards.find((c) => c.id === cardId);
  if (!updated) throw new Error('Failed to reload card after board move');
  return updated;
}

export async function transferCardToNurture(
  cardId: string,
  reason: string,
  userId?: string | null
): Promise<PipelineCard> {
  const nurture = await getBoardBySlug('nurture');
  if (!nurture) throw new Error('Nurture board not found');

  const notReady = nurture.stages.find((s) => s.slug === 'not_ready');
  if (!notReady) throw new Error('Nurture stages not seeded');

  const existing = await pool.query<DbCard>(
    `SELECT * FROM pipeline_cards WHERE id = $1`,
    [cardId]
  );
  const card = existing.rows[0];
  if (!card) throw new Error('Card not found');

  await pool.query(
    `UPDATE pipeline_cards SET
       prior_board_id = board_id,
       prior_stage_id = stage_id,
       board_id = $1,
       stage_id = $2,
       nurture_reason = $3,
       card_status = 'open',
       position = 0,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [nurture.id, notReady.id, reason, cardId]
  );

  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note, created_by
     ) VALUES ($1, 'moved_to_nurture', $2, $3, $4, $5, $6, $7)`,
    [cardId, card.stage_id, notReady.id, card.board_id, nurture.id, reason, userId || null]
  );

  const cards = await getCardsForBoard('nurture');
  return cards.find((c) => c.id === cardId)!;
}

export async function resumeCardToOnboarding(
  cardId: string,
  userId?: string | null
): Promise<PipelineCard> {
  const onboarding = await getBoardBySlug('onboarding');
  if (!onboarding) throw new Error('Onboarding board not found');

  const existing = await pool.query<DbCard>(
    `SELECT * FROM pipeline_cards WHERE id = $1`,
    [cardId]
  );
  const card = existing.rows[0];
  if (!card) throw new Error('Card not found');

  // Prefer prior onboarding stage; fall back to viewing_scheduled or new_inquiry
  let targetStage = onboarding.stages.find((s) => s.id === card.prior_stage_id);
  if (!targetStage || targetStage.isTerminal) {
    targetStage =
      onboarding.stages.find((s) => s.slug === 'viewing_scheduled') ||
      onboarding.stages.find((s) => s.slug === 'new_inquiry') ||
      onboarding.stages[0];
  }

  const nurture = await getBoardBySlug('nurture');
  const returned = nurture?.stages.find((s) => s.slug === 'returned');

  await pool.query(
    `UPDATE pipeline_cards SET
       board_id = $1,
       stage_id = $2,
       card_status = 'open',
       position = 0,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [onboarding.id, targetStage.id, cardId]
  );

  if (returned) {
    // mark a synthetic returned event; card already moved
  }

  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, created_by
     ) VALUES ($1, 'resumed_to_onboarding', $2, $3, $4, $5, $6)`,
    [cardId, card.stage_id, targetStage.id, card.board_id, onboarding.id, userId || null]
  );

  const cards = await getCardsForBoard('onboarding');
  return cards.find((c) => c.id === cardId)!;
}

export async function getPipelineCardById(cardId: string): Promise<PipelineCard | null> {
  const result = await pool.query<DbCard & { board_slug: string }>(
    `SELECT
       c.*,
       b.name AS building_name,
       r.room_number,
       s.color AS stage_color,
       s.slug AS stage_slug,
       s.name AS stage_name,
       s.is_won AS stage_is_won,
       pb.slug AS board_slug
     FROM pipeline_cards c
     JOIN pipeline_boards pb ON pb.id = c.board_id
     JOIN pipeline_stages s ON s.id = c.stage_id
     LEFT JOIN buildings b ON b.id = c.building_id
     LEFT JOIN rooms r ON r.id = c.room_id
     WHERE c.id = $1`,
    [cardId]
  );

  if (!result.rows[0]) return null;
  return mapCard(result.rows[0]);
}

export interface UpdatePipelineCardData {
  title?: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  amount?: number | null;
  source?: string | null;
  tags?: string[];
  dueAt?: string | null;
  nextActionAt?: string | null;
  viewingAt?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  markAsLost?: boolean;
  backgroundCheckStatus?: PipelineBackgroundCheckStatus;
  backgroundCheckNotes?: string | null;
  leaseStatus?: PipelineLeaseStatus;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  moveInDate?: string | null;
  markLeaseSigned?: boolean;
  generateLease?: boolean;
}

export async function updatePipelineCard(
  cardId: string,
  data: UpdatePipelineCardData,
  userId?: string | null
): Promise<PipelineCard> {
  const existing = await getPipelineCardById(cardId);
  if (!existing) throw new Error('Card not found');

  const firstName =
    data.contactFirstName !== undefined
      ? data.contactFirstName?.trim() || null
      : existing.contactFirstName || null;
  const lastName =
    data.contactLastName !== undefined
      ? data.contactLastName?.trim() || null
      : existing.contactLastName || null;

  let title = data.title?.trim();
  if (!title && (data.contactFirstName !== undefined || data.contactLastName !== undefined)) {
    title = [firstName, lastName].filter(Boolean).join(' ').trim() || existing.title;
  }
  if (!title) title = existing.title;

  if (data.buildingId !== undefined || data.roomId !== undefined) {
    const buildingId =
      data.buildingId !== undefined ? data.buildingId : existing.buildingId || null;
    const roomId = data.roomId !== undefined ? data.roomId : existing.roomId || null;
    if (Boolean(buildingId) !== Boolean(roomId)) {
      throw new Error('Provide both building and room, or neither');
    }
  }

  let amount =
    data.amount !== undefined ? data.amount : existing.amount ?? null;
  if (data.amount === undefined && data.roomId && data.roomId !== existing.roomId) {
    const roomResult = await pool.query<{ monthly_rate: string }>(
      `SELECT monthly_rate FROM rooms WHERE id = $1`,
      [data.roomId]
    );
    if (roomResult.rows[0]) {
      amount = Number(roomResult.rows[0].monthly_rate);
    }
  }

  const viewingAt =
    data.viewingAt !== undefined ? data.viewingAt : existing.viewingAt || null;

  const baseTags =
    data.tags !== undefined ? data.tags : existing.tags || [];
  let tags =
    data.viewingAt !== undefined || data.tags !== undefined
      ? applyViewingTags(baseTags, viewingAt)
      : existing.tags || [];

  const markAsLost = Boolean(data.markAsLost);
  const lostReason =
    data.lostReason !== undefined
      ? data.lostReason?.trim() || null
      : existing.lostReason || null;

  if (markAsLost) {
    if (!lostReason) {
      throw new Error('Please add remarks explaining why this opportunity is lost');
    }
    tags = [
      ...tags.filter(
        (t) => t !== 'Lost' && !t.toLowerCase().startsWith('lost:')
      ),
      'Lost',
    ];
  }

  const backgroundCheckStatus: PipelineBackgroundCheckStatus =
    data.backgroundCheckStatus !== undefined
      ? data.backgroundCheckStatus
      : existing.backgroundCheckStatus || 'not_started';
  const backgroundCheckNotes =
    data.backgroundCheckNotes !== undefined
      ? data.backgroundCheckNotes?.trim() || null
      : existing.backgroundCheckNotes || null;
  const leaseStatus: PipelineLeaseStatus =
    data.leaseStatus !== undefined
      ? data.leaseStatus
      : existing.leaseStatus || 'not_started';

  const leaseStartDate =
    data.leaseStartDate !== undefined
      ? data.leaseStartDate?.slice(0, 10) || null
      : existing.leaseStartDate || null;
  const leaseEndDate =
    data.leaseEndDate !== undefined
      ? data.leaseEndDate?.slice(0, 10) || null
      : existing.leaseEndDate || null;
  const moveInDate =
    data.moveInDate !== undefined
      ? data.moveInDate?.slice(0, 10) || null
      : existing.moveInDate || null;

  if (data.markLeaseSigned) {
    // Fall through: save fields first, then convert at end
  }

  await pool.query(
    `UPDATE pipeline_cards SET
       title = $1,
       contact_first_name = $2,
       contact_last_name = $3,
       contact_email = $4,
       contact_phone = $5,
       building_id = $6,
       room_id = $7,
       amount = $8,
       source = $9,
       tags = $10,
       due_at = $11,
       next_action_at = $12,
       viewing_at = $13,
       notes = $14,
       lost_reason = $15,
       background_check_status = $16,
       background_check_notes = $17,
       lease_status = $18,
       lease_start_date = $19,
       lease_end_date = $20,
       move_in_date = $21,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $22`,
    [
      title,
      firstName,
      lastName,
      data.contactEmail !== undefined
        ? data.contactEmail?.trim() || null
        : existing.contactEmail || null,
      data.contactPhone !== undefined
        ? data.contactPhone?.trim() || null
        : existing.contactPhone || null,
      data.buildingId !== undefined ? data.buildingId : existing.buildingId || null,
      data.roomId !== undefined ? data.roomId : existing.roomId || null,
      amount,
      data.source !== undefined ? data.source?.trim() || null : existing.source || null,
      tags,
      data.dueAt !== undefined ? data.dueAt : existing.dueAt || null,
      data.nextActionAt !== undefined ? data.nextActionAt : existing.nextActionAt || null,
      viewingAt,
      data.notes !== undefined ? data.notes?.trim() || null : existing.notes || null,
      markAsLost || data.lostReason !== undefined ? lostReason : existing.lostReason || null,
      backgroundCheckStatus,
      backgroundCheckNotes,
      leaseStatus,
      leaseStartDate,
      leaseEndDate,
      moveInDate,
      cardId,
    ]
  );

  await pool.query(
    `INSERT INTO pipeline_card_events (card_id, event_type, from_board_id, to_board_id, note, created_by)
     VALUES ($1, 'updated', $2, $2, $3, $4)`,
    [
      cardId,
      existing.boardId,
      markAsLost ? lostReason : null,
      userId || null,
    ]
  );

  const boardRow = await pool.query<{ slug: string }>(
    `SELECT slug FROM pipeline_boards WHERE id = $1`,
    [existing.boardId]
  );
  const boardSlug = boardRow.rows[0]?.slug;

  // Onboarding: mark as lost → move to Lost stage
  if (markAsLost && boardSlug === 'onboarding') {
    const lostStage = await pool.query<{ id: string }>(
      `SELECT id FROM pipeline_stages
       WHERE board_id = $1 AND (slug = 'lost' OR is_lost = true)
       ORDER BY CASE WHEN slug = 'lost' THEN 0 ELSE 1 END
       LIMIT 1`,
      [existing.boardId]
    );
    if (lostStage.rows[0] && lostStage.rows[0].id !== existing.stageId) {
      await movePipelineCard(cardId, lostStage.rows[0].id, {
        userId,
        note: lostReason || 'Marked as lost',
      });
    } else if (lostStage.rows[0]) {
      await pool.query(
        `UPDATE pipeline_cards SET
           card_status = 'lost',
           lost_at = COALESCE(lost_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [cardId]
      );
    }
  } else if (boardSlug === 'onboarding' && !markAsLost) {
    const boardId = existing.boardId;
    const currentStageId = existing.stageId;
    const currentStage = await pool.query<{
      is_lost: boolean;
      is_won: boolean;
      slug: string;
      sort_order: number;
    }>(`SELECT is_lost, is_won, slug, sort_order FROM pipeline_stages WHERE id = $1`, [
      currentStageId,
    ]);
    const cs = currentStage.rows[0];
    const canAutoAdvance = Boolean(cs && !cs.is_lost && !cs.is_won);

    async function moveToSlug(slug: string, note: string) {
      if (!canAutoAdvance) return;
      const target = await pool.query<{ id: string; sort_order: number }>(
        `SELECT id, sort_order FROM pipeline_stages WHERE board_id = $1 AND slug = $2 LIMIT 1`,
        [boardId, slug]
      );
      if (!target.rows[0] || target.rows[0].id === currentStageId) return;
      // Only advance forward (don't pull back from a later stage)
      if (cs && target.rows[0].sort_order < cs.sort_order) return;
      await movePipelineCard(cardId, target.rows[0].id, { userId, note });
    }

    if (
      leaseStatus === 'generated' ||
      leaseStatus === 'awaiting_signature'
    ) {
      await moveToSlug('awaiting_signature', 'Lease generated / awaiting signature');
    } else if (
      backgroundCheckStatus === 'pending' ||
      backgroundCheckStatus === 'approved' ||
      backgroundCheckStatus === 'failed'
    ) {
      await moveToSlug('background_check', 'Background check updated');
    } else if (viewingAt) {
      await moveToSlug('viewing_scheduled', 'Moved because viewing date was set');
    }
  }

  if (data.markLeaseSigned || data.generateLease) {
    return convertOnboardingCardToLeaseSigned(cardId, {
      userId,
      note: data.generateLease
        ? 'Lease generated from opportunity form'
        : 'Marked Lease signed from opportunity form',
      leaseStartDate,
      leaseEndDate,
      moveInDate,
    });
  }

  const updated = await getPipelineCardById(cardId);
  if (!updated) throw new Error('Failed to reload card');
  return updated;
}

export async function updatePipelineStage(
  stageId: string,
  data: {
    name?: string;
    color?: string;
    sortOrder?: number;
    isWon?: boolean;
    isLost?: boolean;
    isTerminal?: boolean;
  }
): Promise<PipelineStage> {
  const existing = await pool.query<DbStage>(
    `SELECT * FROM pipeline_stages WHERE id = $1`,
    [stageId]
  );
  if (!existing.rows[0]) {
    throw new Error('Stage not found');
  }

  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error('Stage name cannot be empty');
  }

  const result = await pool.query<DbStage>(
    `UPDATE pipeline_stages SET
       name = COALESCE($1, name),
       color = COALESCE($2, color),
       sort_order = COALESCE($3, sort_order),
       is_won = COALESCE($4, is_won),
       is_lost = COALESCE($5, is_lost),
       is_terminal = COALESCE($6, is_terminal),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [
      name || null,
      data.color || null,
      data.sortOrder ?? null,
      data.isWon ?? null,
      data.isLost ?? null,
      data.isTerminal ?? null,
      stageId,
    ]
  );

  return mapStage(result.rows[0]);
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return base || 'board';
}

export async function updatePipelineBoard(
  boardId: string,
  data: { name?: string; description?: string | null }
): Promise<PipelineBoard> {
  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error('Board name cannot be empty');
  }

  const result = await pool.query<DbBoard>(
    `UPDATE pipeline_boards SET
       name = COALESCE($1, name),
       description = CASE WHEN $2::boolean THEN $3 ELSE description END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [
      name || null,
      data.description !== undefined,
      data.description === undefined ? null : data.description,
      boardId,
    ]
  );

  if (!result.rows[0]) throw new Error('Board not found');

  const boards = await getPipelineBoards();
  const board = boards.find((b) => b.id === boardId);
  if (!board) throw new Error('Board not found after update');
  return board;
}

export async function createPipelineBoard(data: {
  name: string;
  description?: string;
  stages?: Array<{ name: string; color?: string }>;
}): Promise<PipelineBoard> {
  const name = data.name.trim();
  if (!name) throw new Error('Board name is required');

  let slug = slugify(name);
  const existing = await pool.query<{ slug: string }>(
    `SELECT slug FROM pipeline_boards WHERE slug LIKE $1`,
    [`${slug}%`]
  );
  const taken = new Set(existing.rows.map((r) => r.slug));
  if (taken.has(slug)) {
    let i = 2;
    while (taken.has(`${slug}_${i}`)) i += 1;
    slug = `${slug}_${i}`;
  }

  const sortResult = await pool.query<{ next: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pipeline_boards`
  );

  const boardResult = await pool.query<DbBoard>(
    `INSERT INTO pipeline_boards (slug, name, description, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [slug, name, data.description?.trim() || null, sortResult.rows[0]?.next ?? 1]
  );

  const board = boardResult.rows[0];
  const defaultStages =
    data.stages && data.stages.length > 0
      ? data.stages
      : [
          { name: 'New', color: '#7c3aed' },
          { name: 'In progress', color: '#3b82f6' },
          { name: 'Done', color: '#22c55e' },
        ];

  for (let i = 0; i < defaultStages.length; i++) {
    const stage = defaultStages[i];
    const stageSlug = slugify(stage.name) || `stage_${i + 1}`;
    await pool.query(
      `INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
       VALUES ($1, $2, $3, $4, $5, $6, false, $6)`,
      [
        board.id,
        `${stageSlug}_${i + 1}`,
        stage.name.trim(),
        stage.color || STAGE_COLORS[i % STAGE_COLORS.length],
        i + 1,
        i === defaultStages.length - 1,
      ]
    );
  }

  const boards = await getPipelineBoards();
  const created = boards.find((b) => b.id === board.id);
  if (!created) throw new Error('Failed to load created board');
  return created;
}

const STAGE_COLORS = [
  '#7c3aed',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#f59e0b',
  '#14b8a6',
  '#22c55e',
  '#ef4444',
  '#94a3b8',
];

export async function createPipelineStage(data: {
  boardId: string;
  name: string;
  color?: string;
  isWon?: boolean;
  isLost?: boolean;
}): Promise<PipelineStage> {
  const name = data.name.trim();
  if (!name) throw new Error('Stage name is required');

  const board = await pool.query(`SELECT id FROM pipeline_boards WHERE id = $1`, [data.boardId]);
  if (!board.rows[0]) throw new Error('Board not found');

  const sortResult = await pool.query<{ next: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM pipeline_stages WHERE board_id = $1`,
    [data.boardId]
  );
  const sortOrder = sortResult.rows[0]?.next ?? 1;
  const stageSlug = `${slugify(name)}_${sortOrder}`;
  const color = data.color || STAGE_COLORS[(sortOrder - 1) % STAGE_COLORS.length];
  const isWon = Boolean(data.isWon);
  const isLost = Boolean(data.isLost);

  const result = await pool.query<DbStage>(
    `INSERT INTO pipeline_stages (
       board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.boardId, stageSlug, name, color, sortOrder, isWon, isLost, isWon || isLost]
  );

  return mapStage(result.rows[0]);
}

export async function deletePipelineStage(
  stageId: string,
  options?: { moveCardsToStageId?: string }
): Promise<void> {
  const existing = await pool.query<DbStage>(
    `SELECT * FROM pipeline_stages WHERE id = $1`,
    [stageId]
  );
  const stage = existing.rows[0];
  if (!stage) throw new Error('Stage not found');

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM pipeline_cards WHERE stage_id = $1`,
    [stageId]
  );
  const cardCount = Number(countResult.rows[0]?.count || 0);

  if (cardCount > 0) {
    if (!options?.moveCardsToStageId) {
      throw new Error(
        `Stage has ${cardCount} card(s). Move them to another stage before deleting.`
      );
    }
    const target = await pool.query<DbStage>(
      `SELECT * FROM pipeline_stages WHERE id = $1 AND board_id = $2`,
      [options.moveCardsToStageId, stage.board_id]
    );
    if (!target.rows[0]) {
      throw new Error('Target stage not found on this board');
    }
    await pool.query(`UPDATE pipeline_cards SET stage_id = $1, updated_at = CURRENT_TIMESTAMP WHERE stage_id = $2`, [
      options.moveCardsToStageId,
      stageId,
    ]);
  }

  const remaining = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM pipeline_stages WHERE board_id = $1 AND id <> $2`,
    [stage.board_id, stageId]
  );
  if (Number(remaining.rows[0]?.count || 0) < 1) {
    throw new Error('A board must keep at least one stage');
  }

  await pool.query(`DELETE FROM pipeline_stages WHERE id = $1`, [stageId]);
}

export async function reorderPipelineStages(
  boardId: string,
  stageIds: string[]
): Promise<PipelineStage[]> {
  if (stageIds.length === 0) throw new Error('stageIds required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < stageIds.length; i++) {
      const result = await client.query(
        `UPDATE pipeline_stages SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND board_id = $3`,
        [i + 1, stageIds[i], boardId]
      );
      if (result.rowCount === 0) {
        throw new Error('Invalid stage for this board');
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const boards = await getPipelineBoards();
  const board = boards.find((b) => b.id === boardId);
  return board?.stages || [];
}
