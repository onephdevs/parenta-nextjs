import pool from '@/lib/db';
import { ensureTenantForLease } from '@/lib/api/tenant-user-link';
import { buildMaintenancePipelineTags, formatMaintenanceCategory } from '@/lib/constants/maintenance';
import { extractInvoiceIdFromNotes } from '@/lib/format-payment-notes';
import { clampPageLimit } from '@/lib/db/query-limits';
import type {
  CreatePipelineCardData,
  PipelineBackgroundCheckStatus,
  PipelineBoard,
  PipelineBoardSlug,
  PipelineCard,
  PipelineCardStatus,
  PipelineLeaseStatus,
  PipelineViewingStatus,
  PipelineStage,
} from '@/types/database';

const pipelineEnsureCache = globalThis as typeof globalThis & {
  __parentaPipelineEnsure?: Map<string, Promise<void>>;
};

function ensureOnce(key: string, run: () => Promise<void>): Promise<void> {
  const cache = (pipelineEnsureCache.__parentaPipelineEnsure ??= new Map());
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = run().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

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
  invoice_id?: string | null;
  maintenance_request_id?: string | null;
  utility_bill_id?: string | null;
  amount: string | number | null;
  source: string | null;
  tags: string[] | null;
  card_status: string;
  due_at: Date | string | null;
  next_action_at: Date | string | null;
  viewing_at: Date | string | null;
  viewing_status?: string | null;
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
  deposit_amount?: string | number | null;
  advance_amount?: string | number | null;
  lease_package_template_id?: string | null;
  move_in_payment_status?: string | null;
  move_in_paid_at?: Date | string | null;
  move_in_payment_method?: string | null;
  move_in_payment_notes?: string | null;
  deposit_parenta_txn_id?: string | null;
  advance_parenta_txn_id?: string | null;
  position: number;
  won_at: Date | string | null;
  lost_at: Date | string | null;
  created_by: string | null;
  assigned_to?: string | null;
  assigned_first_name?: string | null;
  assigned_last_name?: string | null;
  document_count?: string | number | null;
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
    invoiceId: row.invoice_id || undefined,
    maintenanceRequestId: row.maintenance_request_id || undefined,
    utilityBillId: row.utility_bill_id || undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    source: row.source || undefined,
    tags: row.tags || [],
    cardStatus: row.card_status as PipelineCardStatus,
    dueAt: toIso(row.due_at),
    nextActionAt: toIso(row.next_action_at),
    viewingAt: toIso(row.viewing_at),
    viewingStatus: (row.viewing_status as PipelineViewingStatus) || undefined,
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
    depositAmount: row.deposit_amount != null ? Number(row.deposit_amount) : undefined,
    advanceAmount: row.advance_amount != null ? Number(row.advance_amount) : undefined,
    leasePackageTemplateId: row.lease_package_template_id
      ? String(row.lease_package_template_id)
      : undefined,
    moveInPaymentStatus:
      row.move_in_payment_status === 'paid' ? 'paid' : 'unpaid',
    moveInPaidAt: toIso(row.move_in_paid_at),
    moveInPaymentMethod: row.move_in_payment_method || undefined,
    moveInPaymentNotes: row.move_in_payment_notes || undefined,
    depositParentaTxnId: row.deposit_parenta_txn_id || undefined,
    advanceParentaTxnId: row.advance_parenta_txn_id || undefined,
    position: row.position,
    wonAt: toIso(row.won_at),
    lostAt: toIso(row.lost_at),
    createdBy: row.created_by || undefined,
    assignedTo: row.assigned_to || undefined,
    assignedToName: (() => {
      const name = [row.assigned_first_name, row.assigned_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      return name || undefined;
    })(),
    assignedToInitials: (() => {
      const first = row.assigned_first_name?.[0] || '';
      const last = row.assigned_last_name?.[0] || '';
      const initials = `${first}${last}`.toUpperCase();
      return initials || undefined;
    })(),
    documentCount:
      row.document_count != null ? Number(row.document_count) : undefined,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
    stageColor: row.stage_color || undefined,
    stageSlug: row.stage_slug || undefined,
    stageName: row.stage_name || undefined,
    stageIsWon: row.stage_is_won ?? undefined,
    boardSlug: (row.board_slug as PipelineBoardSlug) || undefined,
  };
}

export async function getPipelineBoards(options?: {
  includeInactive?: boolean;
}): Promise<PipelineBoard[]> {
  const boardsResult = await pool.query<DbBoard>(
    options?.includeInactive
      ? `SELECT * FROM pipeline_boards ORDER BY sort_order ASC`
      : `SELECT * FROM pipeline_boards WHERE is_active = true ORDER BY sort_order ASC`
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
      .filter((s) => !s.isWon && !s.isLost && s.slug !== 'paid' && s.slug !== 'refund')
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
  options?: { includeClosed?: boolean; limit?: number }
): Promise<PipelineCard[]> {
  const includeClosed = options?.includeClosed ?? true;
  const limit = clampPageLimit(options?.limit, 200, 500);
  const result = await pool.query<DbCard>(
    `SELECT
       c.*,
       b.name AS building_name,
       r.room_number,
       s.color AS stage_color,
       s.slug AS stage_slug,
       s.name AS stage_name,
       s.is_won AS stage_is_won,
       pb.slug AS board_slug,
       au.first_name AS assigned_first_name,
       au.last_name AS assigned_last_name,
       (
         SELECT COUNT(*)::int
         FROM documents d
         WHERE d.pipeline_card_id = c.id
       ) AS document_count
     FROM pipeline_cards c
     JOIN pipeline_boards pb ON pb.id = c.board_id
     JOIN pipeline_stages s ON s.id = c.stage_id
     LEFT JOIN buildings b ON b.id = c.building_id
     LEFT JOIN rooms r ON r.id = c.room_id
     LEFT JOIN users au ON au.id = c.assigned_to
     WHERE pb.slug = $1
       AND ($2::boolean OR c.card_status = 'open')
     ORDER BY
       CASE WHEN c.card_status = 'open' THEN 0 ELSE 1 END,
       s.sort_order ASC, c.position ASC, c.created_at ASC
     LIMIT $3`,
    [boardSlug, includeClosed, limit]
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
       invoice_id, maintenance_request_id, utility_bill_id,
       amount, source, tags, due_at, next_action_at, viewing_at, notes,
       lost_reason, card_status, lost_at,
       position, created_by
     ) VALUES (
       $1, $2, $3,
       $4, $5, $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, $15,
       $16, $17, $18, $19, $20, $21, $22,
       $23, $24, $25,
       $26, $27
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
      data.invoiceId || null,
      data.maintenanceRequestId || null,
      data.utilityBillId || null,
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
  const createdNote =
    data.boardSlug === 'maintenance'
      ? 'Ticket opened'
      : data.boardSlug === 'payments'
        ? 'Rent invoice follow-up created'
        : data.boardSlug === 'expenses'
          ? data.source === 'Utility bill'
            ? 'Utility bill card created'
            : 'Expense card created'
          : 'Opportunity created';
  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, to_stage_id, to_board_id, note, metadata, created_by
     ) VALUES ($1, 'created', $2, $3, $4, $5::jsonb, $6)`,
    [
      card.id,
      stage.id,
      board.id,
      createdNote,
      JSON.stringify({ boardSlug: data.boardSlug, source: data.source || null }),
      createdBy || null,
    ]
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
    const converted = await convertOnboardingCardToLeaseSigned(cardId, {
      userId: options?.userId,
      note: options?.note,
      targetStageId: stageId,
    });
    return converted.card;
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
       assigned_to = COALESCE(assigned_to, $7),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6`,
    [
      stageId,
      position,
      cardStatus,
      wonAt,
      lostAt,
      cardId,
      !card.assigned_to && options?.userId ? options.userId : null,
    ]
  );

  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note, created_by
     ) VALUES ($1, 'stage_changed', $2, $3, $4, $4, $5, $6)`,
    [cardId, card.stage_id, stageId, card.board_id, options?.note || null, options?.userId || null]
  );

  // Maintenance board drag → keep maintenance_requests.status in sync
  if (card.board_slug === 'maintenance' && card.maintenance_request_id) {
    const requestStatus = maintenanceStageSlugToStatus(stage.slug);
    await pool.query(
      `UPDATE maintenance_requests SET
         status = $1,
         completed_date = CASE
           WHEN $1 = 'completed' THEN COALESCE(completed_date, CURRENT_DATE)
           ELSE NULL
         END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [requestStatus, card.maintenance_request_id]
    );
  }

  const cards = await getCardsForBoard(card.board_slug as PipelineBoardSlug);
  const updated = cards.find((c) => c.id === cardId);
  if (!updated) throw new Error('Failed to reload card');
  return updated;
}

/**
 * Won / Lease signed: create tenant (+ optional login) and room assignment,
 * then mark the card won and link tenant_id / assignment_id.
 */
export interface OnboardingPortalLogin {
  createdNewLogin: boolean;
  portalLoginSkipped: boolean;
  emailSent?: boolean;
  email?: string;
  temporaryPassword?: string;
}

export async function convertOnboardingCardToLeaseSigned(
  cardId: string,
  options?: {
    userId?: string | null;
    note?: string;
    targetStageId?: string;
    leaseStartDate?: string | null;
    leaseEndDate?: string | null;
    moveInDate?: string | null;
    /** Pipeline lease status after conversion — generate → prepared (`generated`) */
    leaseStatus?: PipelineLeaseStatus;
  }
): Promise<{ card: PipelineCard; portalLogin?: OnboardingPortalLogin }> {
  const nextLeaseStatus: PipelineLeaseStatus =
    options?.leaseStatus || 'generated';
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
           lease_status = $2,
           won_at = COALESCE(won_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [stageId, nextLeaseStatus, cardId]
      );
    } else {
      await pool.query(
        `UPDATE pipeline_cards SET
           lease_status = $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [nextLeaseStatus, cardId]
      );
    }
    return { card: (await getPipelineCardById(cardId))! };
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
  if (room.room_status === 'reserved') {
    const heldByOther = await pool.query<{ id: string }>(
      `SELECT c.id
       FROM pipeline_cards c
       INNER JOIN pipeline_boards pb ON pb.id = c.board_id AND pb.slug = 'onboarding'
       WHERE c.room_id = $1
         AND c.id <> $2
         AND c.card_status = 'open'
         AND c.move_in_payment_status = 'paid'
       LIMIT 1`,
      [card.roomId, cardId]
    );
    if (heldByOther.rows[0]) {
      throw new Error(
        'Room is reserved by another opportunity with payment confirmed — pick another unit'
      );
    }
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

  if (card.moveInPaymentStatus !== 'paid') {
    throw new Error(
      'Mark deposit and advance as paid under Payment before generating a lease'
    );
  }

  if (!card.leasePackageTemplateId) {
    throw new Error(
      'Select a lease template under Lease before generating a lease'
    );
  }

  const depositPaid =
    card.depositAmount != null && Number(card.depositAmount) >= 0
      ? Number(card.depositAmount)
      : 0;
  const advancePaid =
    card.advanceAmount != null && Number(card.advanceAmount) >= 0
      ? Number(card.advanceAmount)
      : 0;
  if (depositPaid <= 0 && advancePaid <= 0) {
    throw new Error(
      'Enter deposit and/or advance amounts and mark them paid before generating a lease'
    );
  }

  const { getUtilityDeposit } = await import('@/lib/api/building-deposit-config');
  const utilityDepositPaid = await getUtilityDeposit(room.building_id);

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
    card.moveInPaymentMethod
      ? `Move-in payment method: ${card.moveInPaymentMethod}`
      : null,
    card.moveInPaymentNotes ? `Move-in payment notes: ${card.moveInPaymentNotes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // Deposit/advance already confirmed on the opportunity Payment section.

  let tenantId = card.tenantId || null;
  let portalLogin: OnboardingPortalLogin | undefined;

  if (!tenantId) {
    const ensured = await ensureTenantForLease({
      email,
      sendInvitation: true,
      profileCompleted: false,
      firstName,
      lastName,
      phone: card.contactPhone || undefined,
      leaseStartDate: startDate,
      leaseEndDate: endDate || undefined,
      notes,
    });
    tenantId = ensured.tenantId;
    portalLogin = {
      createdNewLogin: ensured.createdNewLogin,
      portalLoginSkipped: ensured.portalLoginSkipped,
      emailSent: ensured.emailSent,
      email,
      temporaryPassword: ensured.temporaryPassword,
    };
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

    const { loadTenantContactSnapshot, markPersonAsCurrentTenant } = await import(
      '@/lib/services/tenant-lifecycle'
    );
    const snap = await loadTenantContactSnapshot(client, tenantId);
    const tenantNameSnapshot =
      snap.tenantNameSnapshot || `${firstName} ${lastName}`.trim() || null;

    const assignmentResult = await client.query(
      `INSERT INTO tenant_room_assignments
         (tenant_id, room_id, start_date, end_date, monthly_rate,
          deposit_paid, advance_paid, utility_deposit_paid, assignment_status,
          notes, tenant_name_snapshot, tenant_email_snapshot,
          tenant_phone_snapshot, tenant_emergency_name_snapshot, tenant_emergency_phone_snapshot,
          billing_cycle_start_day, lease_package_template_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, $11, $12, $13, $14,
         LEAST(GREATEST(EXTRACT(DAY FROM $3::date)::INT, 1), 31), $15)
       RETURNING id`,
      [
        tenantId,
        card.roomId,
        startDate,
        endDate,
        monthlyRate,
        depositPaid > 0 ? depositPaid : null,
        advancePaid > 0 ? advancePaid : null,
        utilityDepositPaid > 0 ? utilityDepositPaid : 0,
        notes,
        tenantNameSnapshot,
        snap.tenantEmailSnapshot || email || null,
        snap.tenantPhoneSnapshot,
        snap.tenantEmergencyNameSnapshot,
        snap.tenantEmergencyPhoneSnapshot,
        card.leasePackageTemplateId || null,
      ]
    );
    assignmentId = String(assignmentResult.rows[0].id);

    await markPersonAsCurrentTenant(client, {
      tenantId,
      moveInDate: moveInDate || startDate,
      leaseEndDate: endDate,
    });

    if (depositPaid > 0) {
      await client.query(
        `UPDATE tenants SET security_deposit = COALESCE($1, security_deposit), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [depositPaid, tenantId]
      );
    }

    await client.query(
      `UPDATE rooms
       SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [card.roomId]
    );

    // Attach opportunity docs to the new tenant (always, including re-link after cleanup)
    await client.query(
      `UPDATE documents
       SET tenant_id = $1,
           building_id = COALESCE(building_id, $2),
           room_id = COALESCE(room_id, $3),
           access_level = CASE
             WHEN access_level IN ('public', 'tenant') THEN access_level
             ELSE 'tenant'
           END,
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
         lease_status = $5,
         lease_start_date = $6,
         lease_end_date = $7,
         move_in_date = $8,
         background_check_status = CASE
           WHEN background_check_status = 'not_started' THEN 'approved'
           ELSE background_check_status
         END,
         won_at = COALESCE(won_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        tenantId,
        assignmentId,
        wonStageId,
        position,
        nextLeaseStatus,
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
        JSON.stringify({
          tenantId,
          assignmentId,
          startDate,
          endDate,
          moveInDate,
          depositPaid,
          advancePaid,
        }),
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

  // Schedule rent invoices; record deposit + apply advance (prepaid rent)
  try {
    const { ensureRentInvoicesForLease } = await import('@/lib/services/invoice-generator');
    await ensureRentInvoicesForLease({
      tenantId: String(tenantId),
      roomId: String(card.roomId),
      leaseStartDate: startDate,
      leaseEndDate: endDate,
      monthlyRent: monthlyRate,
      depositAmount: depositPaid > 0 ? depositPaid : undefined,
      advanceAmount: advancePaid > 0 ? advancePaid : undefined,
    });
  } catch (invoiceError) {
    console.error('Lease created but invoice scheduling failed:', invoiceError);
  }

  // Payment history rows so the tenant portal shows deposit/advance as paid
  try {
    const { createPayment } = await import('@/lib/api/payments');
    const paymentDate = new Date(`${startDate}T00:00:00`);
    if (depositPaid > 0) {
      await createPayment({
        tenantId: String(tenantId),
        roomAssignmentId: assignmentId,
        amount: depositPaid,
        paymentType: 'deposit',
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        paymentDate,
        parentaTxnId: card.depositParentaTxnId || undefined,
        notes: 'Security deposit collected on lease generation',
      });
    }
    if (advancePaid > 0) {
      await createPayment({
        tenantId: String(tenantId),
        roomAssignmentId: assignmentId,
        amount: advancePaid,
        paymentType: 'advance',
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        paymentDate,
        parentaTxnId: card.advanceParentaTxnId || undefined,
        notes: 'Advance rent collected on lease generation',
      });
    }
  } catch (paymentError) {
    console.error('Lease created but deposit/advance payment history failed:', paymentError);
  }

  // Signed lease agreement: link opportunity lease upload, or generate one
  try {
    const buildingNameResult = await pool.query<{ name: string }>(
      `SELECT name FROM buildings WHERE id = $1`,
      [room.building_id]
    );
    const roomNumberResult = await pool.query<{ room_number: string }>(
      `SELECT room_number FROM rooms WHERE id = $1`,
      [card.roomId]
    );
    const { ensureTenantLeaseAgreementDocument } = await import(
      '@/lib/services/lease-agreement-document'
    );
    await ensureTenantLeaseAgreementDocument({
      tenantId: String(tenantId),
      pipelineCardId: cardId,
      buildingId: room.building_id,
      roomId: String(card.roomId),
      tenantName: `${firstName} ${lastName}`.trim(),
      tenantEmail: email,
      tenantPhone: card.contactPhone || null,
      buildingName: buildingNameResult.rows[0]?.name || 'Property',
      roomNumber: roomNumberResult.rows[0]?.room_number || '—',
      monthlyRent: monthlyRate,
      depositPaid,
      advancePaid,
      leaseStartDate: startDate,
      leaseEndDate: endDate,
      moveInDate,
      uploadedBy: options?.userId || null,
    });
  } catch (agreementError) {
    console.error('Lease created but agreement document setup failed:', agreementError);
  }

  // Keep Payments board in sync with the new lease
  try {
    await ensurePaymentFollowUpCard({
      tenantId: String(tenantId),
      assignmentId,
      buildingId: room.building_id,
      roomId: String(card.roomId),
      amount: monthlyRate,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactEmail: email,
      contactPhone: card.contactPhone || undefined,
    });
  } catch (syncError) {
    console.error('Lease created but payments card sync failed:', syncError);
  }

  const updated = await getPipelineCardById(cardId);
  if (!updated) throw new Error('Failed to reload card after lease generation');
  return { card: updated, portalLogin };
}

export interface SyncLeasesResult {
  created: number;
  updated: number;
  skipped: number;
  paymentCardIds: string[];
  stagesMoved: number;
}

export interface SyncMaintenanceResult {
  created: number;
  updated: number;
  skipped: number;
  cardIds: string[];
}

interface LeaseSyncRow {
  tenant_id: string;
  assignment_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  building_id: string;
  room_id: string;
  monthly_rate: string;
  start_date: string;
  end_date: string | null;
}

interface TenantInvoiceFocus {
  id: string;
  due_date: string;
  negotiated_due_date?: string | null;
  balance_due: string | number | null;
  invoice_status: string | null;
  bill_status?: string | null;
  total_amount: string | number | null;
}

type PaymentStageSlug =
  | 'upcoming'
  | 'due'
  | 'reminder_sent'
  | 'overdue'
  | 'pending_verification'
  | 'rejected'
  | 'paid'
  | 'refund'
  | 'escalation';

const PAYMENT_DUE_SOON_DAYS = 7;

function calendarDaysUntil(dueDateIso: string, today = new Date()): number {
  const due = new Date(`${dueDateIso.slice(0, 10)}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Map lease + invoice state → Rent Payment board stage.
 * Preserves manual stages (reminder_sent, escalation, refund) while still unpaid / after paid.
 * pending_verification wins while a tenant GCash claim awaits admin review.
 * rejected keeps the same card/thread after office rejects a screenshot.
 */
export function resolvePaymentStageFromInvoice(input: {
  invoice: TenantInvoiceFocus | null;
  currentStageSlug?: string | null;
  dueSoonDays?: number;
  hasPendingClaim?: boolean;
  hasRejectedClaim?: boolean;
}): PaymentStageSlug {
  const current = input.currentStageSlug || null;
  const dueSoonDays = input.dueSoonDays ?? PAYMENT_DUE_SOON_DAYS;
  const invoice = input.invoice;
  const balance = invoice ? Number(invoice.balance_due || 0) : 0;
  const status = (invoice?.invoice_status || '').toLowerCase();
  const billStatus = String(invoice?.bill_status || '').toUpperCase();

  // Manual refund stays put (e.g. after a paid collection)
  if (current === 'refund') return 'refund';

  // Tenant uploaded a receipt — stay here even for pay-ahead / already-paid invoices
  if (input.hasPendingClaim) return 'pending_verification';
  if (input.hasRejectedClaim) return 'rejected';

  if (
    !invoice ||
    balance <= 0 ||
    status === 'paid' ||
    status === 'cancelled' ||
    status === 'draft' ||
    billStatus === 'PAID'
  ) {
    return 'paid';
  }

  if (current === 'escalation') return 'escalation';

  const effectiveDue = String(
    invoice.negotiated_due_date || invoice.due_date || ''
  ).slice(0, 10);
  const daysUntilDue = calendarDaysUntil(effectiveDue);
  const isOverdue = daysUntilDue < 0 || status === 'overdue';

  if (isOverdue) return 'overdue';
  if (current === 'reminder_sent') return 'reminder_sent';
  if (daysUntilDue <= dueSoonDays) return 'due';
  return 'upcoming';
}

async function getFocusInvoiceForTenant(
  tenantId: string
): Promise<TenantInvoiceFocus | null> {
  const unpaid = await pool.query<TenantInvoiceFocus>(
    `SELECT id,
            due_date::text AS due_date,
            negotiated_due_date::text AS negotiated_due_date,
            balance_due,
            invoice_status,
            bill_status,
            total_amount
     FROM invoices
     WHERE tenant_id = $1
       AND invoice_status IN ('sent', 'partial', 'overdue')
       AND COALESCE(balance_due, 0) > 0
       AND COALESCE(bill_status, 'UNPAID') <> 'PAID'
     ORDER BY COALESCE(negotiated_due_date, due_date) ASC NULLS LAST, created_at ASC
     LIMIT 1`,
    [tenantId]
  );
  if (unpaid.rows[0]) return unpaid.rows[0];

  const latest = await pool.query<TenantInvoiceFocus>(
    `SELECT id,
            due_date::text AS due_date,
            negotiated_due_date::text AS negotiated_due_date,
            balance_due,
            invoice_status,
            bill_status,
            total_amount
     FROM invoices
     WHERE tenant_id = $1
       AND invoice_status IS DISTINCT FROM 'cancelled'
       AND invoice_status IS DISTINCT FROM 'draft'
     ORDER BY COALESCE(negotiated_due_date, due_date) DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [tenantId]
  );
  return latest.rows[0] || null;
}

async function applyPaymentCardStage(
  cardId: string,
  stageSlug: PaymentStageSlug,
  options?: {
    invoiceId?: string | null;
    amount?: number | null;
    dueAt?: string | null;
    note?: string;
  }
): Promise<boolean> {
  const existing = await pool.query<DbCard & { stage_slug: string; board_id: string }>(
    `SELECT c.*, s.slug AS stage_slug
     FROM pipeline_cards c
     JOIN pipeline_stages s ON s.id = c.stage_id
     WHERE c.id = $1`,
    [cardId]
  );
  const card = existing.rows[0];
  if (!card) return false;

  const stageResult = await pool.query<{ id: string }>(
    `SELECT id FROM pipeline_stages
     WHERE board_id = $1 AND slug = $2
     LIMIT 1`,
    [card.board_id, stageSlug]
  );
  const stageId = stageResult.rows[0]?.id;
  if (!stageId) return false;

  const changedStage = card.stage_slug !== stageSlug;
  const nextAmount =
    options?.amount !== undefined ? options.amount : Number(card.amount || 0);
  const nextDueAt =
    options?.dueAt !== undefined ? options.dueAt : toIso(card.due_at) || null;
  const nextInvoiceId =
    options?.invoiceId !== undefined ? options.invoiceId : card.invoice_id || null;

  await pool.query(
    `UPDATE pipeline_cards SET
       stage_id = $1,
       invoice_id = $2,
       amount = $3,
       due_at = $4::timestamptz,
       card_status = 'open',
       won_at = NULL,
       lost_at = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [stageId, nextInvoiceId, nextAmount, nextDueAt, cardId]
  );

  if (changedStage) {
    await pool.query(
      `INSERT INTO pipeline_card_events (
         card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note
       ) VALUES ($1, 'stage_changed', $2, $3, $4, $4, $5)`,
      [
        cardId,
        card.stage_id,
        stageId,
        card.board_id,
        options?.note || 'Auto-synced from lease/invoice',
      ]
    );
  }

  return changedStage;
}

/**
 * Ensure an open Payments-board follow-up card exists for an active lease,
 * with stage driven by the tenant's focus invoice (lease + invoice aware).
 * Dedupes on tenant_id within the payments board (including won/paid cards).
 */
export async function ensurePaymentFollowUpCard(input: {
  tenantId: string;
  assignmentId: string;
  buildingId: string;
  roomId: string;
  amount: number;
  contactFirstName: string;
  contactLastName: string;
  contactEmail?: string;
  contactPhone?: string;
  source?: string;
}): Promise<{ card: PipelineCard; created: boolean; stageMoved: boolean }> {
  await ensureMaintenanceBoardExists();

  const invoice = await getFocusInvoiceForTenant(input.tenantId);
  const openClaim = await pool.query<{
    id: string;
    amount: string;
    payment_status: string;
  }>(
    `SELECT id, amount::text AS amount, payment_status
     FROM payments
     WHERE tenant_id = $1
       AND LOWER(COALESCE(payment_status, '')) IN ('pending', 'failed')
     ORDER BY
       CASE WHEN LOWER(COALESCE(payment_status, '')) = 'pending' THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`,
    [input.tenantId]
  );
  const claimStatus = (openClaim.rows[0]?.payment_status || '').toLowerCase();
  const hasPendingClaim = claimStatus === 'pending';
  const hasRejectedClaim = claimStatus === 'failed';
  const existing = await pool.query<{ id: string; stage_slug: string }>(
    `SELECT c.id, s.slug AS stage_slug
     FROM pipeline_cards c
     INNER JOIN pipeline_boards b ON b.id = c.board_id
     INNER JOIN pipeline_stages s ON s.id = c.stage_id
     WHERE b.slug = 'payments'
       AND c.tenant_id = $1
       AND c.card_status IN ('open', 'won')
     ORDER BY
       CASE WHEN c.card_status = 'open' THEN 0 ELSE 1 END,
       c.updated_at DESC
     LIMIT 1`,
    [input.tenantId]
  );

  const targetStage = resolvePaymentStageFromInvoice({
    invoice,
    currentStageSlug: existing.rows[0]?.stage_slug || null,
    hasPendingClaim,
    hasRejectedClaim,
  });

  const displayAmount = openClaim.rows[0]
    ? Number(openClaim.rows[0].amount)
    : invoice && Number(invoice.balance_due || 0) > 0
      ? Number(invoice.balance_due)
      : invoice
        ? Number(invoice.total_amount || input.amount)
        : input.amount;
  const effectiveDueIso = String(
    invoice?.negotiated_due_date || invoice?.due_date || ''
  ).slice(0, 10);
  const dueAt = effectiveDueIso
    ? `${effectiveDueIso}T12:00:00.000Z`
    : null;

  if (existing.rows[0]) {
    const { card: updated } = await updatePipelineCard(
      existing.rows[0].id,
      {
        assignmentId: input.assignmentId,
        buildingId: input.buildingId,
        roomId: input.roomId,
        amount: displayAmount,
        contactFirstName: input.contactFirstName,
        contactLastName: input.contactLastName,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
        title: `${input.contactFirstName} ${input.contactLastName}`.trim(),
        dueAt,
        source: input.source || 'Lease',
      },
      undefined,
      { historyMode: 'none' }
    );

    // Link invoice + stage (updatePipelineCard does not yet touch invoice_id)
    const stageMoved = await applyPaymentCardStage(existing.rows[0].id, targetStage, {
      invoiceId: invoice?.id || null,
      amount: displayAmount,
      dueAt,
      note: 'Auto-synced from lease/invoice',
    });

    const card = (await getPipelineCardById(existing.rows[0].id)) || updated;
    return { card, created: false, stageMoved };
  }

  const card = await createPipelineCard({
    boardSlug: 'payments',
    stageSlug: targetStage,
    title: `${input.contactFirstName} ${input.contactLastName}`.trim(),
    contactFirstName: input.contactFirstName,
    contactLastName: input.contactLastName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    buildingId: input.buildingId,
    roomId: input.roomId,
    tenantId: input.tenantId,
    assignmentId: input.assignmentId,
    invoiceId: invoice?.id,
    amount: displayAmount,
    dueAt: dueAt || undefined,
    source: input.source || 'Lease',
    tags: ['Active lease'],
    notes: invoice
      ? `Synced from active lease · invoice ${invoice.id.slice(0, 8)}`
      : 'Synced from active lease assignment',
  });

  return { card, created: true, stageMoved: false };
}

/**
 * Sync all active tenant room assignments into pipeline cards:
 * - Payments board: open follow-up card per tenant (create/update + invoice stage)
 * - Onboarding won cards: fill missing building/room/assignment links
 */
export async function syncActiveLeasesToPipelineCards(): Promise<SyncLeasesResult> {
  await ensureMaintenanceBoardExists();

  const leases = await pool.query<LeaseSyncRow>(
    `SELECT
       t.id AS tenant_id,
       tra.id AS assignment_id,
       t.first_name,
       t.last_name,
       t.email,
       t.phone,
       r.building_id,
       tra.room_id,
       tra.monthly_rate::text AS monthly_rate,
       tra.start_date::text AS start_date,
       tra.end_date::text AS end_date
     FROM tenant_room_assignments tra
     INNER JOIN tenants t ON t.id = tra.tenant_id
     INNER JOIN rooms r ON r.id = tra.room_id
     WHERE tra.assignment_status = 'active'
       AND t.is_active = true
       AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
     ORDER BY tra.start_date DESC`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let stagesMoved = 0;
  const paymentCardIds: string[] = [];

  for (const lease of leases.rows) {
    const firstName = (lease.first_name || '').trim() || 'Tenant';
    const lastName = (lease.last_name || '').trim() || 'Lease';
    const amount = Number(lease.monthly_rate) || 0;

    try {
      const result = await ensurePaymentFollowUpCard({
        tenantId: lease.tenant_id,
        assignmentId: lease.assignment_id,
        buildingId: lease.building_id,
        roomId: lease.room_id,
        amount,
        contactFirstName: firstName,
        contactLastName: lastName,
        contactEmail: lease.email || undefined,
        contactPhone: lease.phone || undefined,
        source: 'Lease sync',
      });
      paymentCardIds.push(result.card.id);
      if (result.created) created += 1;
      else updated += 1;
      if (result.stageMoved) stagesMoved += 1;
    } catch (err) {
      console.error('Failed to sync payment card for tenant', lease.tenant_id, err);
      skipped += 1;
      continue;
    }

    // Enrich any onboarding card already linked to this tenant
    await pool.query(
      `UPDATE pipeline_cards c
       SET building_id = COALESCE(c.building_id, $1),
           room_id = COALESCE(c.room_id, $2),
           assignment_id = COALESCE(c.assignment_id, $3),
           amount = COALESCE(c.amount, $4),
           contact_email = COALESCE(c.contact_email, $5),
           contact_phone = COALESCE(c.contact_phone, $6),
           lease_start_date = COALESCE(c.lease_start_date, $7::date),
           lease_end_date = COALESCE(c.lease_end_date, $8::date),
           updated_at = CURRENT_TIMESTAMP
       FROM pipeline_boards b
       WHERE c.board_id = b.id
         AND b.slug = 'onboarding'
         AND c.tenant_id = $9`,
      [
        lease.building_id,
        lease.room_id,
        lease.assignment_id,
        amount,
        lease.email,
        lease.phone,
        lease.start_date,
        lease.end_date,
        lease.tenant_id,
      ]
    );
  }

  return { created, updated, skipped, paymentCardIds, stagesMoved };
}

/** Soft-ensure maintenance board + stages exist (idempotent). */
export async function ensureMaintenanceBoardExists(): Promise<void> {
  return ensureOnce('maintenance-board', ensureMaintenanceBoardExistsOnce);
}

async function ensureMaintenanceBoardExistsOnce(): Promise<void> {
  await pool.query(
    `INSERT INTO pipeline_boards (slug, name, description, sort_order)
     VALUES ('maintenance', 'Maintenance', 'Tenant work orders from portal submissions', 5)
     ON CONFLICT (slug) DO NOTHING`
  );
  await ensurePipelineBoardLabels();

  await pool.query(
    `INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
     SELECT b.id, s.slug, s.name, s.color, s.sort_order, s.is_won, s.is_lost, s.is_terminal
     FROM pipeline_boards b
     JOIN (
       VALUES
         ('maintenance', 'submitted', 'Open', '#7c3aed', 1, false, false, false),
         ('maintenance', 'in_progress', 'In progress', '#3b82f6', 2, false, false, false),
         ('maintenance', 'resolved', 'Resolved', '#22c55e', 3, true, false, true)
     ) AS s(board_slug, slug, name, color, sort_order, is_won, is_lost, is_terminal)
       ON b.slug = s.board_slug
     WHERE NOT EXISTS (
       SELECT 1 FROM pipeline_stages ps
       WHERE ps.board_id = b.id AND ps.slug = s.slug
     )`
  );

  await pool.query(
    `UPDATE pipeline_stages ps
     SET name = 'Open'
     FROM pipeline_boards pb
     WHERE ps.board_id = pb.id
       AND pb.slug = 'maintenance'
       AND ps.slug = 'submitted'
       AND ps.name IS DISTINCT FROM 'Open'`
  );

  // Payments Paid stage must stay open so cards can cycle with the billing period
  await pool.query(
    `UPDATE pipeline_stages ps
     SET is_won = false,
         is_terminal = false,
         updated_at = CURRENT_TIMESTAMP
     FROM pipeline_boards pb
     WHERE ps.board_id = pb.id
       AND pb.slug = 'payments'
       AND ps.slug = 'paid'
       AND (ps.is_won = true OR ps.is_terminal = true)`
  );

  // Rent Payment: Pending verification (GCash claim awaiting admin review)
  await pool.query(
    `INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
     SELECT b.id, 'pending_verification', 'Pending verification', '#f59e0b', 5, false, false, false
     FROM pipeline_boards b
     WHERE b.slug = 'payments'
       AND NOT EXISTS (
         SELECT 1 FROM pipeline_stages ps
         WHERE ps.board_id = b.id AND ps.slug = 'pending_verification'
       )`
  );
  await pool.query(
    `INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
     SELECT b.id, 'rejected', 'Rejected', '#e11d48', 6, false, false, false
     FROM pipeline_boards b
     WHERE b.slug = 'payments'
       AND NOT EXISTS (
         SELECT 1 FROM pipeline_stages ps
         WHERE ps.board_id = b.id AND ps.slug = 'rejected'
       )`
  );
  await pool.query(
    `UPDATE pipeline_stages ps
     SET sort_order = CASE ps.slug
           WHEN 'pending_verification' THEN 5
           WHEN 'rejected' THEN 6
           WHEN 'paid' THEN 7
           WHEN 'refund' THEN 8
           WHEN 'escalation' THEN 9
           ELSE ps.sort_order
         END,
         updated_at = CURRENT_TIMESTAMP
     FROM pipeline_boards pb
     WHERE ps.board_id = pb.id
       AND pb.slug = 'payments'
       AND ps.slug IN ('pending_verification', 'rejected', 'paid', 'refund', 'escalation')`
  );
  await pool.query(
    `UPDATE pipeline_stages ps
     SET name = 'Rejected',
         color = '#e11d48',
         is_won = false,
         is_lost = false,
         is_terminal = false,
         updated_at = CURRENT_TIMESTAMP
     FROM pipeline_boards pb
     WHERE ps.board_id = pb.id
       AND pb.slug = 'payments'
       AND ps.slug = 'rejected'`
  );
  await pool.query(
    `UPDATE pipeline_stages ps
     SET name = 'Pending verification',
         color = '#f59e0b',
         sort_order = 5,
         is_won = false,
         is_lost = false,
         is_terminal = false,
         updated_at = CURRENT_TIMESTAMP
     FROM pipeline_boards pb
     WHERE ps.board_id = pb.id
       AND pb.slug = 'payments'
       AND ps.slug = 'pending_verification'`
  );

  // Columns may be missing if migration not yet applied — add defensively
  await pool.query(
    `ALTER TABLE pipeline_cards
       ADD COLUMN IF NOT EXISTS invoice_id UUID,
       ADD COLUMN IF NOT EXISTS maintenance_request_id UUID,
       ADD COLUMN IF NOT EXISTS utility_bill_id UUID`
  ).catch(() => undefined);

  await pool.query(
    `ALTER TABLE payments
       ADD COLUMN IF NOT EXISTS parenta_txn_id TEXT`
  ).catch(() => undefined);

  await pool.query(
    `ALTER TABLE pipeline_cards
       ADD COLUMN IF NOT EXISTS deposit_parenta_txn_id TEXT,
       ADD COLUMN IF NOT EXISTS advance_parenta_txn_id TEXT`
  ).catch(() => undefined);

  await pool.query(
    `CREATE TABLE IF NOT EXISTS txn_sequences (
       txn_type VARCHAR(8) NOT NULL,
       year_yy SMALLINT NOT NULL,
       last_value INTEGER NOT NULL DEFAULT 0,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (txn_type, year_yy)
     )`
  ).catch(() => undefined);
}

/** Map maintenance_requests.status → pipeline stage slug (shared with reverse sync). */
export function maintenanceStatusToStageSlug(status: string | null | undefined): string {
  switch ((status || 'open').toLowerCase()) {
    case 'in_progress':
      return 'in_progress';
    case 'completed':
    case 'cancelled':
    case 'closed':
    case 'resolved':
      return 'resolved';
    case 'open':
    case 'submitted':
    default:
      return 'submitted';
  }
}

/** Map pipeline stage slug → maintenance_requests.status. */
export function maintenanceStageSlugToStatus(
  stageSlug: string | null | undefined
): 'open' | 'in_progress' | 'completed' {
  switch ((stageSlug || 'submitted').toLowerCase()) {
    case 'in_progress':
      return 'in_progress';
    case 'resolved':
      return 'completed';
    case 'submitted':
    default:
      return 'open';
  }
}

/**
 * Create/update a Maintenance pipeline card from a maintenance_requests row.
 */
export async function ensureMaintenancePipelineCard(input: {
  requestId: string;
  title: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  tenantId?: string | null;
  roomId?: string | null;
  buildingId?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Admin/staff user id — same as board card assignee */
  assignedTo?: string | null;
}): Promise<{ card: PipelineCard; created: boolean }> {
  await ensureMaintenanceBoardExists();

  const stageSlug = maintenanceStatusToStageSlug(input.status);
  const tags = buildMaintenancePipelineTags({
    priority: input.priority,
    category: input.category,
  });

  const existing = await pool.query<{ id: string }>(
    `SELECT c.id
     FROM pipeline_cards c
     INNER JOIN pipeline_boards b ON b.id = c.board_id
     WHERE b.slug = 'maintenance'
       AND c.maintenance_request_id = $1
     ORDER BY c.updated_at DESC
     LIMIT 1`,
    [input.requestId]
  );

  if (existing.rows[0]) {
    // Keep board assignee aligned with the request (or explicit override).
    let resolvedAssignee: string | null | undefined = input.assignedTo;
    if (resolvedAssignee === undefined) {
      const assigneeRow = await pool.query<{ assigned_to: string | null }>(
        `SELECT assigned_to FROM maintenance_requests WHERE id = $1`,
        [input.requestId]
      );
      resolvedAssignee = assigneeRow.rows[0]?.assigned_to || null;
    } else {
      resolvedAssignee = resolvedAssignee || null;
    }

    const board = await getBoardBySlug('maintenance');
    const stage =
      board?.stages.find((s) => s.slug === stageSlug) ||
      (stageSlug === 'resolved' ? board?.stages.find((s) => s.isWon) : undefined);
    if (stage) {
      const cardRow = await pool.query<{ stage_id: string }>(
        `SELECT stage_id FROM pipeline_cards WHERE id = $1`,
        [existing.rows[0].id]
      );
      if (cardRow.rows[0] && cardRow.rows[0].stage_id !== stage.id) {
        await movePipelineCard(existing.rows[0].id, stage.id, {
          note: 'Synced from maintenance request status',
        });
      }
    }

    try {
      await updatePipelineCard(
        existing.rows[0].id,
        {
          title: input.title,
          notes: input.description || null,
          buildingId: input.buildingId || null,
          roomId: input.roomId || null,
          ...(input.contactFirstName !== undefined
            ? { contactFirstName: input.contactFirstName || null }
            : {}),
          ...(input.contactLastName !== undefined
            ? { contactLastName: input.contactLastName || null }
            : {}),
          ...(input.contactEmail !== undefined
            ? { contactEmail: input.contactEmail || null }
            : {}),
          ...(input.contactPhone !== undefined
            ? { contactPhone: input.contactPhone || null }
            : {}),
          tags,
          source: 'Maintenance request',
          assignedTo: resolvedAssignee,
        },
        undefined,
        { historyMode: 'assignee' }
      );
    } catch (err) {
      console.error('Maintenance card field sync failed:', err);
    }

    const card = await getPipelineCardById(existing.rows[0].id);
    if (!card) throw new Error('Failed to reload maintenance card');
    return { card, created: false };
  }

  let firstName = input.contactFirstName || undefined;
  let lastName = input.contactLastName || undefined;
  let email = input.contactEmail || undefined;
  let phone = input.contactPhone || undefined;

  if (input.tenantId && (!firstName || !lastName)) {
    const tenant = await pool.query<{
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
    }>(`SELECT first_name, last_name, email, phone FROM tenants WHERE id = $1`, [
      input.tenantId,
    ]);
    if (tenant.rows[0]) {
      firstName = firstName || tenant.rows[0].first_name;
      lastName = lastName || tenant.rows[0].last_name;
      email = email || tenant.rows[0].email || undefined;
      phone = phone || tenant.rows[0].phone || undefined;
    }
  }

  const card = await createPipelineCard({
    boardSlug: 'maintenance',
    stageSlug,
    title: input.title,
    contactFirstName: firstName,
    contactLastName: lastName,
    contactEmail: email,
    contactPhone: phone,
    buildingId: input.buildingId || undefined,
    roomId: input.roomId || undefined,
    tenantId: input.tenantId || undefined,
    maintenanceRequestId: input.requestId,
    source: 'Tenant portal',
    tags,
    notes: input.description || undefined,
  });

  if (input.assignedTo) {
    const assigned = await updatePipelineCard(card.id, {
      assignedTo: input.assignedTo,
    });
    return { card: assigned.card, created: true };
  }

  return { card, created: true };
}

/** Map utility_bills.bill_status → expenses board stage slug. */
export function utilityBillStatusToStageSlug(status: string | null | undefined): string {
  switch ((status || 'pending').toLowerCase()) {
    case 'paid':
      return 'paid';
    case 'disputed':
      return 'verification';
    case 'overdue':
    case 'pending':
    default:
      return 'bill_received';
  }
}

/** Keep built-in board display names in sync (slugs stay payments / expenses). */
export async function ensurePipelineBoardLabels(): Promise<void> {
  return ensureOnce('pipeline-board-labels', ensurePipelineBoardLabelsOnce);
}

async function ensurePipelineBoardLabelsOnce(): Promise<void> {
  await pool.query(
    `UPDATE pipeline_boards
     SET name = 'Rent Payment',
         description = 'Rent chase and tenant payment verification',
         updated_at = CURRENT_TIMESTAMP
     WHERE slug = 'payments'
       AND (name IS DISTINCT FROM 'Rent Payment'
            OR description IS DISTINCT FROM 'Rent chase and tenant payment verification')`
  );
  await pool.query(
    `UPDATE pipeline_boards
     SET name = 'Building Electricity, Water and Expense',
         description = 'Electricity, water, and other building expense follow-up',
         updated_at = CURRENT_TIMESTAMP
     WHERE slug = 'expenses'
       AND (name IS DISTINCT FROM 'Building Electricity, Water and Expense'
            OR description IS DISTINCT FROM 'Electricity, water, and other building expense follow-up')`
  );
}

/** Soft-ensure expenses board exists (seeded by migrations; idempotent). */
export async function ensureExpensesBoardExists(): Promise<void> {
  return ensureOnce('expenses-board', ensureExpensesBoardExistsOnce);
}

async function ensureExpensesBoardExistsOnce(): Promise<void> {
  await pool.query(
    `INSERT INTO pipeline_boards (slug, name, description, sort_order)
     VALUES (
       'expenses',
       'Building Electricity, Water and Expense',
       'Electricity, water, and other building expense follow-up',
       3
     )
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description`
  );
  await ensurePipelineBoardLabels();

  await pool.query(
    `INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
     SELECT b.id, s.slug, s.name, s.color, s.sort_order, s.is_won, s.is_lost, s.is_terminal
     FROM pipeline_boards b
     JOIN (
       VALUES
         ('expenses', 'bill_received', 'Bill received', '#7c3aed', 1, false, false, false),
         ('expenses', 'verification', 'Verification', '#8b5cf6', 2, false, false, false),
         ('expenses', 'approval_pending', 'Approval pending', '#f59e0b', 3, false, false, false),
         ('expenses', 'approved', 'Approved', '#3b82f6', 4, false, false, false),
         ('expenses', 'payment_scheduled', 'Payment scheduled', '#14b8a6', 5, false, false, false),
         ('expenses', 'paid', 'Paid', '#22c55e', 6, true, false, true),
         ('expenses', 'reconciled', 'Reconciled', '#64748b', 7, true, false, true)
     ) AS s(board_slug, slug, name, color, sort_order, is_won, is_lost, is_terminal)
       ON b.slug = s.board_slug
     WHERE NOT EXISTS (
       SELECT 1 FROM pipeline_stages ps
       WHERE ps.board_id = b.id AND ps.slug = s.slug
     )`
  );

  await pool.query(
    `ALTER TABLE pipeline_cards
       ADD COLUMN IF NOT EXISTS utility_bill_id UUID`
  ).catch(() => undefined);

  await pool.query(
    `ALTER TABLE pipeline_cards
       ADD COLUMN IF NOT EXISTS expense_id UUID`
  ).catch(() => undefined);
}

/**
 * Create/update an Expenses pipeline card from a utility_bills row.
 */
export async function ensureUtilityBillPipelineCard(input: {
  utilityBillId: string;
  utilityType: string;
  amount: number;
  billStatus?: string | null;
  dueDate?: Date | string | null;
  providerName?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  notes?: string | null;
}): Promise<{ card: PipelineCard; created: boolean }> {
  await ensureExpensesBoardExists();

  const stageSlug = utilityBillStatusToStageSlug(input.billStatus);
  const utilityLabel = String(input.utilityType || 'Utility')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const location =
    [input.buildingName, input.roomNumber].filter(Boolean).join(' ') ||
    'Property';
  const title = `${utilityLabel} — ${location}`;
  const provider = (input.providerName || '').trim() || utilityLabel;
  const dueAt = (() => {
    if (input.dueDate == null) return null;
    const d =
      input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}T12:00:00.000Z`;
  })();
  const tags = ['Utility', utilityLabel].filter(
    (t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i
  );

  const existing = await pool.query<{ id: string }>(
    `SELECT c.id
     FROM pipeline_cards c
     INNER JOIN pipeline_boards b ON b.id = c.board_id
     WHERE b.slug = 'expenses'
       AND c.utility_bill_id = $1
     ORDER BY c.updated_at DESC
     LIMIT 1`,
    [input.utilityBillId]
  );

  if (existing.rows[0]) {
    await updatePipelineCard(
      existing.rows[0].id,
      {
        title,
        contactFirstName: provider,
        buildingId: input.buildingId || null,
        roomId: input.roomId || null,
        amount: input.amount,
        dueAt,
        notes: input.notes || null,
        tags,
        source: 'Utility bill',
      },
      undefined,
      { historyMode: 'none' }
    );

    const board = await getBoardBySlug('expenses');
    const stage = board?.stages.find((s) => s.slug === stageSlug);
    if (stage) {
      const cardRow = await pool.query<{ stage_id: string; board_id: string }>(
        `SELECT stage_id, board_id FROM pipeline_cards WHERE id = $1`,
        [existing.rows[0].id]
      );
      if (cardRow.rows[0] && cardRow.rows[0].stage_id !== stage.id) {
        const isPaid = stageSlug === 'paid';
        await pool.query(
          `UPDATE pipeline_cards SET
             stage_id = $1,
             card_status = $2,
             won_at = CASE WHEN $3 THEN COALESCE(won_at, CURRENT_TIMESTAMP) ELSE won_at END,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [stage.id, isPaid ? 'won' : 'open', isPaid, existing.rows[0].id]
        );
        await pool.query(
          `INSERT INTO pipeline_card_events (
             card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note
           ) VALUES ($1, 'stage_changed', $2, $3, $4, $4, $5)`,
          [
            existing.rows[0].id,
            cardRow.rows[0].stage_id,
            stage.id,
            cardRow.rows[0].board_id,
            'Synced from utility bill status',
          ]
        );
      }
    }

    const card = await getPipelineCardById(existing.rows[0].id);
    if (!card) throw new Error('Failed to reload utility bill card');
    return { card, created: false };
  }

  const card = await createPipelineCard({
    boardSlug: 'expenses',
    stageSlug,
    title,
    contactFirstName: provider,
    buildingId: input.buildingId || undefined,
    roomId: input.roomId || undefined,
    utilityBillId: input.utilityBillId,
    amount: input.amount,
    dueAt: dueAt || undefined,
    source: 'Utility bill',
    tags,
    notes: input.notes || undefined,
  });

  return { card, created: true };
}

/** Backfill Expenses board from unpaid / recent utility bills (parent bills only). */
export async function syncPendingUtilityBillsToPipelineCards(): Promise<{
  created: number;
  updated: number;
  skipped: number;
  cardIds: string[];
}> {
  await ensureExpensesBoardExists();

  const result = await pool.query<{
    id: string;
    utility_type: string;
    amount: string;
    bill_status: string;
    due_date: Date | string | null;
    provider_name: string | null;
    building_id: string | null;
    room_id: string | null;
    building_name: string | null;
    room_number: string | null;
    notes: string | null;
  }>(
    `SELECT
       ub.id,
       ub.utility_type,
       ub.amount::text AS amount,
       ub.bill_status,
       ub.due_date,
       ub.provider_name,
       ub.building_id,
       ub.room_id,
       b.name AS building_name,
       r.room_number,
       ub.notes
     FROM utility_bills ub
     LEFT JOIN rooms r ON r.id = ub.room_id
     LEFT JOIN buildings b ON b.id = COALESCE(ub.building_id, r.building_id)
     WHERE ub.parent_bill_id IS NULL
       AND ub.bill_status IN ('pending', 'overdue', 'disputed', 'paid')
     ORDER BY ub.due_date DESC NULLS LAST
     LIMIT 500`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const cardIds: string[] = [];

  for (const row of result.rows) {
    try {
      const synced = await ensureUtilityBillPipelineCard({
        utilityBillId: row.id,
        utilityType: row.utility_type,
        amount: Number(row.amount) || 0,
        billStatus: row.bill_status,
        dueDate: row.due_date,
        providerName: row.provider_name,
        buildingId: row.building_id,
        roomId: row.room_id,
        buildingName: row.building_name,
        roomNumber: row.room_number,
        notes: row.notes,
      });
      cardIds.push(synced.card.id);
      if (synced.created) created += 1;
      else updated += 1;
    } catch (err) {
      console.error('Failed to sync utility bill card', row.id, err);
      skipped += 1;
    }
  }

  return { created, updated, skipped, cardIds };
}

/** Map expenses.expense_status → expenses board stage slug. */
export function expenseStatusToStageSlug(status: string | null | undefined): string {
  switch ((status || 'pending').toLowerCase()) {
    case 'paid':
      return 'paid';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'verification';
    case 'pending':
    default:
      return 'bill_received';
  }
}

/**
 * Create/update an Expenses pipeline card from an expenses row (vendor / building cost).
 */
export async function ensureExpensePipelineCard(input: {
  expenseId: string;
  category: string;
  amount: number;
  expenseStatus?: string | null;
  expenseDate?: Date | string | null;
  vendorName?: string | null;
  description?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  notes?: string | null;
}): Promise<{ card: PipelineCard; created: boolean }> {
  await ensureExpensesBoardExists();

  const stageSlug = expenseStatusToStageSlug(input.expenseStatus);
  const categoryLabel = String(input.category || 'Expense')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const location =
    [input.buildingName, input.roomNumber].filter(Boolean).join(' ') ||
    'Property';
  const title =
    (input.description || '').trim() ||
    `${categoryLabel} — ${location}`;
  const vendor = (input.vendorName || '').trim() || categoryLabel;
  const dueAt = (() => {
    if (input.expenseDate == null) return null;
    const d =
      input.expenseDate instanceof Date
        ? input.expenseDate
        : new Date(input.expenseDate);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}T12:00:00.000Z`;
  })();
  const tags = ['Expense', categoryLabel].filter(
    (t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i
  );

  const existing = await pool.query<{ id: string }>(
    `SELECT c.id
     FROM pipeline_cards c
     INNER JOIN pipeline_boards b ON b.id = c.board_id
     WHERE b.slug = 'expenses'
       AND c.expense_id = $1
     ORDER BY c.updated_at DESC
     LIMIT 1`,
    [input.expenseId]
  );

  if (existing.rows[0]) {
    await updatePipelineCard(
      existing.rows[0].id,
      {
        title,
        contactFirstName: vendor,
        buildingId: input.buildingId || null,
        roomId: input.roomId || null,
        amount: input.amount,
        dueAt,
        notes: input.notes || input.description || null,
        tags,
        source: 'Expense',
      },
      undefined,
      { historyMode: 'none' }
    );

    const board = await getBoardBySlug('expenses');
    const stage = board?.stages.find((s) => s.slug === stageSlug);
    if (stage) {
      const cardRow = await pool.query<{ stage_id: string; board_id: string }>(
        `SELECT stage_id, board_id FROM pipeline_cards WHERE id = $1`,
        [existing.rows[0].id]
      );
      if (cardRow.rows[0] && cardRow.rows[0].stage_id !== stage.id) {
        const isPaid = stageSlug === 'paid';
        await pool.query(
          `UPDATE pipeline_cards SET
             stage_id = $1,
             card_status = $2,
             won_at = CASE WHEN $3 THEN COALESCE(won_at, CURRENT_TIMESTAMP) ELSE won_at END,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [stage.id, isPaid ? 'won' : 'open', isPaid, existing.rows[0].id]
        );
        await pool.query(
          `INSERT INTO pipeline_card_events (
             card_id, event_type, from_stage_id, to_stage_id, from_board_id, to_board_id, note
           ) VALUES ($1, 'stage_changed', $2, $3, $4, $4, $5)`,
          [
            existing.rows[0].id,
            cardRow.rows[0].stage_id,
            stage.id,
            cardRow.rows[0].board_id,
            'Synced from expense status',
          ]
        );
      }
    }

    const card = await getPipelineCardById(existing.rows[0].id);
    if (!card) throw new Error('Failed to reload expense card');
    return { card, created: false };
  }

  const card = await createPipelineCard({
    boardSlug: 'expenses',
    stageSlug,
    title,
    contactFirstName: vendor,
    buildingId: input.buildingId || undefined,
    roomId: input.roomId || undefined,
    expenseId: input.expenseId,
    amount: input.amount,
    dueAt: dueAt || undefined,
    source: 'Expense',
    tags,
    notes: input.notes || input.description || undefined,
  });

  return { card, created: true };
}

/** Backfill Expenses board from recent vendor expenses. */
export async function syncPendingExpensesToPipelineCards(): Promise<{
  created: number;
  updated: number;
  skipped: number;
  cardIds: string[];
}> {
  await ensureExpensesBoardExists();

  const result = await pool.query<{
    id: string;
    category: string;
    amount: string;
    expense_status: string | null;
    expense_date: Date | string | null;
    vendor_name: string | null;
    description: string | null;
    building_id: string | null;
    room_id: string | null;
    building_name: string | null;
    room_number: string | null;
    notes: string | null;
  }>(
    `SELECT
       e.id,
       e.category,
       e.amount::text AS amount,
       e.expense_status,
       e.expense_date,
       e.vendor_name,
       e.description,
       e.building_id,
       e.room_id,
       b.name AS building_name,
       r.room_number,
       e.notes
     FROM expenses e
     LEFT JOIN buildings b ON b.id = e.building_id
     LEFT JOIN rooms r ON r.id = e.room_id
     WHERE COALESCE(e.expense_status, 'pending') IN ('pending', 'approved', 'paid', 'rejected')
     ORDER BY e.expense_date DESC NULLS LAST
     LIMIT 500`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const cardIds: string[] = [];

  for (const row of result.rows) {
    try {
      const synced = await ensureExpensePipelineCard({
        expenseId: row.id,
        category: row.category,
        amount: Number(row.amount),
        expenseStatus: row.expense_status,
        expenseDate: row.expense_date,
        vendorName: row.vendor_name,
        description: row.description,
        buildingId: row.building_id,
        roomId: row.room_id,
        buildingName: row.building_name,
        roomNumber: row.room_number,
        notes: row.notes,
      });
      cardIds.push(synced.card.id);
      if (synced.created) created += 1;
      else updated += 1;
    } catch (err) {
      console.error('Failed to sync expense card', row.id, err);
      skipped += 1;
    }
  }

  return { created, updated, skipped, cardIds };
}

/** Backfill Maintenance board from open/in-progress requests. */
export async function syncOpenMaintenanceToPipelineCards(): Promise<SyncMaintenanceResult> {
  await ensureMaintenanceBoardExists();

  const result = await pool.query<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    category: string | null;
    tenant_id: string | null;
    room_id: string | null;
    building_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  }>(
    `SELECT
       mr.id,
       mr.title,
       mr.description,
       mr.status,
       mr.priority,
       mr.category,
       mr.tenant_id,
       mr.room_id,
       mr.building_id,
       t.first_name,
       t.last_name,
       t.email,
       t.phone
     FROM maintenance_requests mr
     LEFT JOIN tenants t ON t.id = mr.tenant_id
     WHERE mr.status IN ('open', 'in_progress', 'completed')
     ORDER BY mr.created_at DESC
     LIMIT 500`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const cardIds: string[] = [];

  for (const row of result.rows) {
    try {
      const synced = await ensureMaintenancePipelineCard({
        requestId: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        tenantId: row.tenant_id,
        roomId: row.room_id,
        buildingId: row.building_id,
        contactFirstName: row.first_name,
        contactLastName: row.last_name,
        contactEmail: row.email,
        contactPhone: row.phone,
      });
      cardIds.push(synced.card.id);
      if (synced.created) created += 1;
      else updated += 1;
    } catch (err) {
      console.error('Failed to sync maintenance card', row.id, err);
      skipped += 1;
    }
  }

  return { created, updated, skipped, cardIds };
}

/**
 * Refresh a single tenant's Payments card from invoices (e.g. after payment applied).
 */
export async function syncPaymentCardForTenant(tenantId: string): Promise<void> {
  const lease = await pool.query<LeaseSyncRow>(
    `SELECT
       t.id AS tenant_id,
       tra.id AS assignment_id,
       t.first_name,
       t.last_name,
       t.email,
       t.phone,
       r.building_id,
       tra.room_id,
       tra.monthly_rate::text AS monthly_rate,
       tra.start_date::text AS start_date,
       tra.end_date::text AS end_date
     FROM tenant_room_assignments tra
     INNER JOIN tenants t ON t.id = tra.tenant_id
     INNER JOIN rooms r ON r.id = tra.room_id
     WHERE tra.tenant_id = $1
       AND tra.assignment_status = 'active'
       AND t.is_active = true
       AND (tra.end_date IS NULL OR tra.end_date::date >= CURRENT_DATE)
     ORDER BY tra.start_date DESC
     LIMIT 1`,
    [tenantId]
  );

  const row = lease.rows[0];
  if (row) {
    await ensurePaymentFollowUpCard({
      tenantId: row.tenant_id,
      assignmentId: row.assignment_id,
      buildingId: row.building_id,
      roomId: row.room_id,
      amount: Number(row.monthly_rate) || 0,
      contactFirstName: (row.first_name || '').trim() || 'Tenant',
      contactLastName: (row.last_name || '').trim() || 'Lease',
      contactEmail: row.email || undefined,
      contactPhone: row.phone || undefined,
      source: 'Invoice sync',
    });
    return;
  }

  const fallback = await pool.query<{
    tenant_id: string;
    assignment_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    building_id: string | null;
    room_id: string | null;
    amount: string | null;
  }>(
    `SELECT
       t.id AS tenant_id,
       COALESCE(p.assignment_id, tra.id) AS assignment_id,
       t.first_name,
       t.last_name,
       t.email,
       t.phone,
       COALESCE(pr.building_id, r.building_id) AS building_id,
       COALESCE(p.room_id, tra.room_id) AS room_id,
       p.amount::text AS amount
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT id, room_id, assignment_id, amount
       FROM payments
       WHERE tenant_id = t.id
         AND LOWER(COALESCE(payment_status, '')) = 'pending'
       ORDER BY created_at DESC
       LIMIT 1
     ) p ON true
     LEFT JOIN rooms pr ON pr.id = p.room_id
     LEFT JOIN LATERAL (
       SELECT id, room_id
       FROM tenant_room_assignments
       WHERE tenant_id = t.id
       ORDER BY start_date DESC
       LIMIT 1
     ) tra ON true
     LEFT JOIN rooms r ON r.id = tra.room_id
     WHERE t.id = $1
     LIMIT 1`,
    [tenantId]
  );
  const fb = fallback.rows[0];
  if (!fb?.room_id || !fb.building_id || !fb.assignment_id) return;

  await ensurePaymentFollowUpCard({
    tenantId: fb.tenant_id,
    assignmentId: fb.assignment_id,
    buildingId: fb.building_id,
    roomId: fb.room_id,
    amount: Number(fb.amount || 0),
    contactFirstName: (fb.first_name || '').trim() || 'Tenant',
    contactLastName: (fb.last_name || '').trim() || 'Lease',
    contactEmail: fb.email || undefined,
    contactPhone: fb.phone || undefined,
    source: 'Payment claim',
  });
}

/** Move cards for unverified or rejected receipts onto the matching stage. */
export async function syncPendingPaymentClaimsToBoard(): Promise<void> {
  const pending = await pool.query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id
     FROM payments
     WHERE LOWER(COALESCE(payment_status, '')) IN ('pending', 'failed')`
  );
  for (const row of pending.rows) {
    try {
      await syncPaymentCardForTenant(row.tenant_id);
    } catch (err) {
      console.error('Pending-claim board sync failed for tenant', row.tenant_id, err);
    }
  }
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
       pb.slug AS board_slug,
       au.first_name AS assigned_first_name,
       au.last_name AS assigned_last_name,
       (
         SELECT COUNT(*)::int
         FROM documents d
         WHERE d.pipeline_card_id = c.id
       ) AS document_count
     FROM pipeline_cards c
     JOIN pipeline_boards pb ON pb.id = c.board_id
     JOIN pipeline_stages s ON s.id = c.stage_id
     LEFT JOIN buildings b ON b.id = c.building_id
     LEFT JOIN rooms r ON r.id = c.room_id
     LEFT JOIN users au ON au.id = c.assigned_to
     WHERE c.id = $1`,
    [cardId]
  );

  if (!result.rows[0]) return null;
  return mapCard(result.rows[0]);
}

/**
 * Record a touch on a card (document upload, etc.) and auto-claim if unassigned.
 * Always stores created_by so History shows which account made the change.
 */
export async function recordPipelineCardActivity(
  cardId: string,
  options: {
    userId?: string | null;
    eventType?: string;
    note: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const existing = await getPipelineCardById(cardId);
  if (!existing) return;

  const userId = options.userId || null;
  let claimedName: string | null = null;

  if (!existing.assignedTo && userId) {
    await pool.query(
      `UPDATE pipeline_cards
       SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND assigned_to IS NULL`,
      [userId, cardId]
    );
    const nameRow = await pool.query<{ first_name: string; last_name: string }>(
      `SELECT first_name, last_name FROM users WHERE id = $1`,
      [userId]
    );
    claimedName = nameRow.rows[0]
      ? `${nameRow.rows[0].first_name} ${nameRow.rows[0].last_name}`.trim()
      : 'admin';

    await pool.query(
      `INSERT INTO pipeline_card_events (
         card_id, event_type, from_board_id, to_board_id, note, metadata, created_by
       ) VALUES ($1, 'assignee_changed', $2, $2, $3, $4::jsonb, $5)`,
      [
        cardId,
        existing.boardId,
        `Assigned to ${claimedName} (auto)`,
        JSON.stringify({
          changes: [`Assigned to ${claimedName} (auto)`],
          fields: [
            {
              field: 'assignedTo',
              label: 'Assignee',
              from: null,
              to: claimedName,
              summary: `Assigned to ${claimedName} (auto)`,
            },
          ],
        }),
        userId,
      ]
    );
  }

  await pool.query(
    `INSERT INTO pipeline_card_events (
       card_id, event_type, from_board_id, to_board_id, note, metadata, created_by
     ) VALUES ($1, $2, $3, $3, $4, $5::jsonb, $6)`,
    [
      cardId,
      options.eventType || 'updated',
      existing.boardId,
      options.note,
      JSON.stringify(options.metadata || { note: options.note }),
      userId,
    ]
  );
}

export interface PipelineCardEvent {
  id: string;
  cardId: string;
  eventType: string;
  note?: string;
  metadata?: Record<string, unknown>;
  fromStageName?: string;
  toStageName?: string;
  actorName?: string;
  createdAt: string;
  summary: string;
}

function formatHistoryDate(iso?: string | null): string {
  if (!iso) return '(cleared)';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatHistoryMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '(cleared)';
  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function sameInstant(a?: string | null, b?: string | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}

function sameNumber(a?: number | null, b?: number | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function formatTagsList(tags: string[]): string {
  if (!tags.length) return '(none)';
  return tags.join(', ');
}

function normalizeTagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

function diffTagLists(
  previous: string[],
  next: string[]
): { added: string[]; removed: string[] } {
  const prevKeys = new Set(previous.map(normalizeTagKey));
  const nextKeys = new Set(next.map(normalizeTagKey));
  const added = next.filter((t) => !prevKeys.has(normalizeTagKey(t)));
  const removed = previous.filter((t) => !nextKeys.has(normalizeTagKey(t)));
  return { added, removed };
}

/** Structured field-level history for opportunity timeline UI. */
export interface PipelineHistoryFieldChange {
  field: string;
  label: string;
  from: string | string[] | null;
  to: string | string[] | null;
  added?: string[];
  removed?: string[];
  summary: string;
}

function buildTagHistoryChange(
  previous: string[],
  next: string[]
): PipelineHistoryFieldChange | null {
  const { added, removed } = diffTagLists(previous, next);
  if (added.length === 0 && removed.length === 0) return null;

  const parts: string[] = [];
  if (added.length) parts.push(`added ${added.join(', ')}`);
  if (removed.length) parts.push(`removed ${removed.join(', ')}`);

  return {
    field: 'tags',
    label: 'Tags',
    from: [...previous],
    to: [...next],
    added,
    removed,
    summary: `Tags: ${parts.join('; ')} (was ${formatTagsList(previous)} → now ${formatTagsList(next)})`,
  };
}

function buildFieldHistoryChange(input: {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
  /** When true, treat empty as cleared vs set */
  setVerb?: string;
}): PipelineHistoryFieldChange | null {
  const from = input.from?.trim() || null;
  const to = input.to?.trim() || null;
  if (from === to) return null;
  const verb = input.setVerb || 'set to';
  let summary: string;
  if (!from && to) summary = `${input.label} ${verb} ${to}`;
  else if (from && !to) summary = `${input.label} cleared (was ${from})`;
  else summary = `${input.label}: ${from} → ${to}`;
  return {
    field: input.field,
    label: input.label,
    from,
    to,
    summary,
  };
}


export async function getPipelineCardEvents(
  cardId: string,
  limit = 50
): Promise<PipelineCardEvent[]> {
  const card = await getPipelineCardById(cardId);
  const boardSlug = card?.boardSlug;

  const result = await pool.query<{
    id: string;
    card_id: string;
    event_type: string;
    note: string | null;
    metadata: Record<string, unknown> | null;
    from_stage_name: string | null;
    to_stage_name: string | null;
    actor_first_name: string | null;
    actor_last_name: string | null;
    created_at: Date;
  }>(
    `SELECT
       e.id,
       e.card_id,
       e.event_type,
       e.note,
       e.metadata,
       fs.name AS from_stage_name,
       ts.name AS to_stage_name,
       u.first_name AS actor_first_name,
       u.last_name AS actor_last_name,
       e.created_at
     FROM pipeline_card_events e
     LEFT JOIN pipeline_stages fs ON fs.id = e.from_stage_id
     LEFT JOIN pipeline_stages ts ON ts.id = e.to_stage_id
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.card_id = $1
     ORDER BY e.created_at DESC
     LIMIT $2`,
    [cardId, limit]
  );

  const pipelineEvents = result.rows
    .map((row) => {
      const actorName = [row.actor_first_name, row.actor_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const event: PipelineCardEvent = {
        id: row.id,
        cardId: row.card_id,
        eventType: row.event_type,
        note: row.note || undefined,
        metadata: row.metadata || undefined,
        fromStageName: row.from_stage_name || undefined,
        toStageName: row.to_stage_name || undefined,
        actorName: actorName || undefined,
        createdAt: row.created_at.toISOString(),
        summary: summarizePipelineEvent(row, boardSlug),
      };
      return scrubTenantProfileHistory(event, boardSlug);
    })
    .filter((e): e is PipelineCardEvent => Boolean(e));

  const sourceEvents = card
    ? await loadSourceHistoryEvents(card)
    : [];

  const hasSourceCreated = sourceEvents.some((event) =>
    ['created', 'invoice_issued', 'expense_recorded', 'utility_recorded'].includes(
      event.eventType
    )
  );
  const boardEvents = hasSourceCreated
    ? pipelineEvents.filter((event) => event.eventType !== 'created')
    : pipelineEvents;

  const merged = [...boardEvents, ...sourceEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return merged.slice(0, limit);
}

function createdEventLabel(boardSlug?: string): string {
  switch (boardSlug) {
    case 'maintenance':
      return 'Ticket opened';
    case 'payments':
      return 'Invoice follow-up created';
    case 'expenses':
      return 'Card created';
    default:
      return 'Opportunity created';
  }
}

function summarizePipelineEvent(
  row: {
    event_type: string;
    note: string | null;
    metadata: Record<string, unknown> | null;
    from_stage_name: string | null;
    to_stage_name: string | null;
  },
  boardSlug?: string
): string {
  const metaChanges = Array.isArray(row.metadata?.changes)
    ? (row.metadata.changes as unknown[]).filter(
        (c): c is string => typeof c === 'string' && c.trim().length > 0
      )
    : [];

  const note = row.note?.trim();
  const noteIsGeneric =
    !note ||
    note === 'Opportunity updated' ||
    note === 'Opportunity created' ||
    note.toLowerCase() === 'updated';

  if (row.event_type === 'created') {
    if (note && !noteIsGeneric) return note;
    return createdEventLabel(boardSlug);
  }

  if (note && !noteIsGeneric) return note;
  if (metaChanges.length > 0) return metaChanges.join('; ');

  switch (row.event_type) {
    case 'assignee_changed':
      return 'Assignee updated';
    case 'stage_changed':
      if (row.from_stage_name && row.to_stage_name) {
        return `Moved from ${row.from_stage_name} to ${row.to_stage_name}`;
      }
      return 'Stage changed';
    case 'moved_to_board':
      return 'Moved to another board';
    case 'lease_generated':
      return 'Lease generated';
    case 'updated':
      return noteIsGeneric
        ? 'Updated (details not recorded)'
        : note || 'Updated';
    default:
      return row.event_type.replace(/_/g, ' ');
  }
}

const CONTACT_HISTORY_FIELDS = new Set([
  'contactname',
  'contactemail',
  'contactphone',
  'contact',
  'email',
  'phone',
]);

function isContactHistoryField(field?: string): boolean {
  return CONTACT_HISTORY_FIELDS.has(String(field || '').replace(/[_\s-]/g, '').toLowerCase());
}

function isContactOnlyNote(text?: string): boolean {
  const value = String(text || '').trim();
  if (!value) return false;
  return /^(contact (set to|renamed)|email:|phone:|first name|last name)/i.test(value);
}

function scrubTenantProfileHistory(
  event: PipelineCardEvent,
  boardSlug?: string
): PipelineCardEvent | null {
  if (!boardSlug || boardSlug === 'onboarding') return event;
  if (event.eventType === 'lease_generated') return null;

  if (event.eventType !== 'updated' && event.eventType !== 'assignee_changed') {
    return event;
  }

  const fields = Array.isArray(event.metadata?.fields)
    ? (event.metadata!.fields as Array<Record<string, unknown>>)
    : [];
  if (fields.length > 0) {
    const kept = fields.filter((f) => !isContactHistoryField(String(f.field || '')));
    if (kept.length === 0) return null;
    if (kept.length === fields.length) return event;
    return {
      ...event,
      metadata: { ...event.metadata, fields: kept, changes: kept.map((f) => String(f.summary || '')) },
      note: kept.map((f) => String(f.summary || '')).filter(Boolean).join('; ') || event.note,
      summary: kept.map((f) => String(f.summary || '')).filter(Boolean).join('; ') || event.summary,
    };
  }

  if (event.eventType === 'updated' && isContactOnlyNote(event.note || event.summary)) {
    return null;
  }
  return event;
}

function isoFromUnknown(value: unknown): string {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function loadSourceHistoryEvents(card: PipelineCard): Promise<PipelineCardEvent[]> {
  if (card.boardSlug === 'maintenance' && card.maintenanceRequestId) {
    return loadTicketHistoryEvents(card);
  }
  if (card.boardSlug === 'payments') {
    return loadInvoiceHistoryEvents(card);
  }
  if (card.boardSlug === 'expenses') {
    return loadExpenseItemHistoryEvents(card);
  }
  return [];
}

async function loadTicketHistoryEvents(card: PipelineCard): Promise<PipelineCardEvent[]> {
  const requestId = card.maintenanceRequestId;
  if (!requestId) return [];

  const events: PipelineCardEvent[] = [];
  const request = await pool.query<{
    title: string;
    description: string | null;
    category: string | null;
    priority: string | null;
    created_at: Date;
    first_name: string | null;
    last_name: string | null;
  }>(
    `SELECT
       mr.title,
       mr.description,
       mr.category,
       mr.priority,
       mr.created_at,
       t.first_name,
       t.last_name
     FROM maintenance_requests mr
     LEFT JOIN tenants t ON t.id = mr.tenant_id
     WHERE mr.id = $1
     LIMIT 1`,
    [requestId]
  );
  const row = request.rows[0];
  const customer = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();

  if (row) {
    const details = [
      row.category ? formatMaintenanceCategory(row.category) : null,
      row.priority ? `${row.priority} priority` : null,
      row.description?.trim() || null,
    ]
      .filter(Boolean)
      .join(' · ');
    events.push({
      id: `ticket-opened-${requestId}`,
      cardId: card.id,
      eventType: 'created',
      note: details || undefined,
      actorName: customer || 'Customer',
      createdAt: isoFromUnknown(row.created_at),
      summary: 'Ticket opened',
      metadata: { source: 'ticket', title: row.title },
    });
  }

  const { listMaintenanceUpdates } = await import('@/lib/api/maintenance-updates');
  const updates = await listMaintenanceUpdates(requestId);
  for (const update of updates) {
    const role = String(update.authorRole || '').toLowerCase();
    const fromCustomer = role === 'tenant';
    let summary = 'Ticket updated';
    let eventType = 'ticket_update';
    switch (update.updateType) {
      case 'reply':
        summary = fromCustomer ? 'Customer replied' : 'Office replied';
        eventType = 'ticket_reply';
        break;
      case 'progress':
        summary = 'Progress update';
        eventType = 'ticket_progress';
        break;
      case 'status_change':
        summary = 'Ticket status updated';
        eventType = 'ticket_status';
        break;
      case 'acknowledgement':
        summary = 'Customer confirmed the fix';
        eventType = 'ticket_ack';
        break;
      case 'feedback':
        summary = update.rating
          ? `Customer rated ${update.rating}/5`
          : 'Customer left feedback';
        eventType = 'ticket_feedback';
        break;
      case 'closed':
        summary = 'Ticket closed';
        eventType = 'ticket_closed';
        break;
      default:
        break;
    }
    events.push({
      id: `ticket-update-${update.id}`,
      cardId: card.id,
      eventType,
      note: update.body || undefined,
      actorName:
        update.authorName ||
        (fromCustomer ? customer || 'Customer' : 'Office'),
      createdAt: update.createdAt,
      summary,
      metadata: {
        source: 'ticket',
        updateType: update.updateType,
        rating: update.rating ?? null,
      },
    });
  }

  return events;
}

async function resolvePaymentCardInvoiceId(card: PipelineCard): Promise<string | null> {
  if (card.tenantId) {
    const claim = await pool.query<{ notes: string | null }>(
      `SELECT notes
       FROM payments
       WHERE tenant_id = $1
         AND LOWER(COALESCE(payment_status, '')) IN ('pending', 'failed')
       ORDER BY
         CASE WHEN LOWER(COALESCE(payment_status, '')) = 'pending' THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 1`,
      [card.tenantId]
    );
    const fromClaim = extractInvoiceIdFromNotes(claim.rows[0]?.notes);
    if (fromClaim) return fromClaim;
  }
  if (card.invoiceId) return card.invoiceId;
  if (card.tenantId) {
    const focus = await getFocusInvoiceForTenant(card.tenantId);
    if (focus?.id) return focus.id;
  }
  return null;
}

async function loadInvoiceHistoryEvents(card: PipelineCard): Promise<PipelineCardEvent[]> {
  const events: PipelineCardEvent[] = [];
  const tenantId = card.tenantId || null;
  const invoiceId = await resolvePaymentCardInvoiceId(card);

  if (invoiceId) {
    const invoices = await pool.query<{
      id: string;
      invoice_number: string | null;
      issue_date: Date | string | null;
      due_date: Date | string | null;
      invoice_status: string | null;
      total_amount: string | number | null;
      created_at: Date;
    }>(
      `SELECT id, invoice_number, issue_date, due_date, invoice_status, total_amount, created_at
       FROM invoices WHERE id = $1 LIMIT 1`,
      [invoiceId]
    );

    for (const invoice of invoices.rows) {
      const number = invoice.invoice_number || 'Invoice';
      const amount = formatHistoryMoney(
        invoice.total_amount != null ? Number(invoice.total_amount) : null
      );
      const due = invoice.due_date
        ? String(invoice.due_date).slice(0, 10)
        : null;
      events.push({
        id: `invoice-issued-${invoice.id}`,
        cardId: card.id,
        eventType: 'invoice_issued',
        note: [number, amount !== '(cleared)' ? amount : null, due ? `due ${due}` : null]
          .filter(Boolean)
          .join(' · '),
        createdAt: isoFromUnknown(invoice.issue_date || invoice.created_at),
        summary: `Invoice issued${invoice.invoice_number ? ` (${invoice.invoice_number})` : ''}`,
        metadata: { source: 'invoice', invoiceId: invoice.id, status: invoice.invoice_status },
      });
    }
  }

  if (!tenantId) return events;

  const payments = invoiceId
    ? await pool.query<{
        id: string;
        amount: string | number | null;
        payment_status: string | null;
        payment_date: Date | string | null;
        payment_method: string | null;
        created_at: Date;
      }>(
        `SELECT p.id, p.amount, p.payment_status, p.payment_date, p.payment_method, p.created_at
         FROM payments p
         WHERE p.tenant_id = $1
           AND (
             EXISTS (
               SELECT 1 FROM payment_allocations pa
               WHERE pa.payment_id = p.id AND pa.invoice_id = $2
             )
             OR strpos(COALESCE(p.notes, ''), $3) > 0
           )
         ORDER BY p.created_at DESC
         LIMIT 15`,
        [tenantId, invoiceId, `invoice_id=${invoiceId}`]
      )
    : await pool.query<{
        id: string;
        amount: string | number | null;
        payment_status: string | null;
        payment_date: Date | string | null;
        payment_method: string | null;
        created_at: Date;
      }>(
        `SELECT id, amount, payment_status, payment_date, payment_method, created_at
         FROM payments
         WHERE tenant_id = $1
           AND LOWER(COALESCE(payment_status, '')) IN ('pending', 'failed')
         ORDER BY created_at DESC
         LIMIT 5`,
        [tenantId]
      );

  for (const payment of payments.rows) {
    const status = String(payment.payment_status || '').toLowerCase();
    const amount = formatHistoryMoney(
      payment.amount != null ? Number(payment.amount) : null
    );
    const pending = status === 'pending' || status === 'submitted';
    const rejected = status === 'failed';
    events.push({
      id: `payment-${payment.id}`,
      cardId: card.id,
      eventType: pending
        ? 'payment_pending'
        : rejected
          ? 'payment_rejected'
          : 'payment_recorded',
      note: [amount !== '(cleared)' ? amount : null, payment.payment_method]
        .filter(Boolean)
        .join(' · ') || undefined,
      createdAt: isoFromUnknown(payment.payment_date || payment.created_at),
      summary: pending
        ? 'Payment claim submitted'
        : rejected
          ? 'Payment claim rejected'
          : 'Payment recorded',
      metadata: { source: 'payment', status: payment.payment_status },
    });
  }

  return events;
}

async function loadExpenseItemHistoryEvents(
  card: PipelineCard
): Promise<PipelineCardEvent[]> {
  const events: PipelineCardEvent[] = [];

  if (card.expenseId) {
    const result = await pool.query<{
      category: string | null;
      amount: string | number | null;
      expense_status: string | null;
      vendor_name: string | null;
      description: string | null;
      created_at: Date;
      updated_at: Date | null;
    }>(
      `SELECT category, amount, expense_status, vendor_name, description, created_at, updated_at
       FROM expenses WHERE id = $1 LIMIT 1`,
      [card.expenseId]
    );
    const row = result.rows[0];
    if (row) {
      const amount = formatHistoryMoney(row.amount != null ? Number(row.amount) : null);
      events.push({
        id: `expense-recorded-${card.expenseId}`,
        cardId: card.id,
        eventType: 'expense_recorded',
        note: [row.vendor_name, row.category, amount !== '(cleared)' ? amount : null, row.description]
          .filter(Boolean)
          .join(' · ') || undefined,
        createdAt: isoFromUnknown(row.created_at),
        summary: 'Expense recorded',
        metadata: { source: 'expense', status: row.expense_status },
      });
      if (
        row.expense_status &&
        row.updated_at &&
        new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 60_000
      ) {
        events.push({
          id: `expense-status-${card.expenseId}`,
          cardId: card.id,
          eventType: 'expense_status',
          note: String(row.expense_status),
          createdAt: isoFromUnknown(row.updated_at),
          summary: `Expense ${String(row.expense_status).replace(/_/g, ' ')}`,
          metadata: { source: 'expense', status: row.expense_status },
        });
      }
    }
  }

  if (card.utilityBillId) {
    const result = await pool.query<{
      utility_type: string | null;
      amount: string | number | null;
      bill_status: string | null;
      due_date: Date | string | null;
      provider_name: string | null;
      created_at: Date;
      updated_at: Date | null;
    }>(
      `SELECT utility_type, amount, bill_status, due_date, provider_name, created_at, updated_at
       FROM utility_bills WHERE id = $1 LIMIT 1`,
      [card.utilityBillId]
    );
    const row = result.rows[0];
    if (row) {
      const amount = formatHistoryMoney(row.amount != null ? Number(row.amount) : null);
      const due = row.due_date ? String(row.due_date).slice(0, 10) : null;
      events.push({
        id: `utility-recorded-${card.utilityBillId}`,
        cardId: card.id,
        eventType: 'utility_recorded',
        note: [
          row.provider_name,
          row.utility_type,
          amount !== '(cleared)' ? amount : null,
          due ? `due ${due}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
        createdAt: isoFromUnknown(row.created_at),
        summary: 'Utility bill recorded',
        metadata: { source: 'utility_bill', status: row.bill_status },
      });
    }
  }

  return events;
}

/** Release a reserved room when no other open paid onboarding card still holds it. */
async function releaseRoomReservationIfUnused(
  roomId: string,
  exceptCardId?: string | null
): Promise<void> {
  const other = await pool.query<{ id: string }>(
    `SELECT c.id
     FROM pipeline_cards c
     INNER JOIN pipeline_boards pb ON pb.id = c.board_id AND pb.slug = 'onboarding'
     WHERE c.room_id = $1
       AND c.card_status = 'open'
       AND c.move_in_payment_status = 'paid'
       AND ($2::uuid IS NULL OR c.id <> $2::uuid)
     LIMIT 1`,
    [roomId, exceptCardId || null]
  );
  if (other.rows[0]) return;

  await pool.query(
    `UPDATE rooms
     SET room_status = 'vacant', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND room_status = 'reserved'`,
    [roomId]
  );
}

/**
 * When move-in payment is confirmed, hold the unit as reserved so other
 * opportunities cannot pick it. Unpaid / lost / deleted releases the hold.
 */
async function syncRoomReservationForMoveInPayment(input: {
  cardId: string;
  roomId: string | null | undefined;
  previousRoomId?: string | null;
  paymentStatus: 'paid' | 'unpaid';
  releaseHold?: boolean;
}): Promise<void> {
  const previousRoomId = input.previousRoomId || null;
  const nextRoomId = input.roomId || null;

  if (previousRoomId && previousRoomId !== nextRoomId) {
    await releaseRoomReservationIfUnused(previousRoomId, input.cardId);
  }

  if (!nextRoomId) return;

  if (input.releaseHold || input.paymentStatus === 'unpaid') {
    await releaseRoomReservationIfUnused(nextRoomId, input.cardId);
    return;
  }

  // Paid: reserve vacant/reserved units (never overwrite occupied)
  await pool.query(
    `UPDATE rooms
     SET room_status = 'reserved', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND room_status IN ('vacant', 'reserved')`,
    [nextRoomId]
  );
}

export interface UpdatePipelineCardData {
  title?: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  buildingId?: string | null;
  roomId?: string | null;
  assignmentId?: string | null;
  amount?: number | null;
  source?: string | null;
  tags?: string[];
  dueAt?: string | null;
  nextActionAt?: string | null;
  viewingAt?: string | null;
  viewingStatus?: PipelineViewingStatus | null;
  notes?: string | null;
  lostReason?: string | null;
  markAsLost?: boolean;
  backgroundCheckStatus?: PipelineBackgroundCheckStatus;
  backgroundCheckNotes?: string | null;
  leaseStatus?: PipelineLeaseStatus;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  moveInDate?: string | null;
  depositAmount?: number | null;
  advanceAmount?: number | null;
  leasePackageTemplateId?: string | null;
  moveInPaymentStatus?: 'unpaid' | 'paid';
  moveInPaidAt?: string | null;
  moveInPaymentMethod?: string | null;
  moveInPaymentNotes?: string | null;
  markLeaseSigned?: boolean;
  generateLease?: boolean;
  assignedTo?: string | null;
}

export interface UpdatePipelineCardResult {
  card: PipelineCard;
  /** Human-readable field diffs written to pipeline_card_events (empty if no-op). */
  changeNotes: string[];
  portalLogin?: OnboardingPortalLogin;
}

export async function updatePipelineCard(
  cardId: string,
  data: UpdatePipelineCardData,
  userId?: string | null,
  options?: { historyMode?: 'all' | 'assignee' | 'none' }
): Promise<UpdatePipelineCardResult> {
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
    // Building alone is OK (website inquiries pick a property before a specific room).
    // A room always requires its building.
    if (roomId && !buildingId) {
      throw new Error('Select a building for the room');
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

  const depositAmount =
    data.depositAmount !== undefined
      ? data.depositAmount
      : existing.depositAmount ?? null;
  const advanceAmount =
    data.advanceAmount !== undefined
      ? data.advanceAmount
      : existing.advanceAmount ?? null;
  const leasePackageTemplateId =
    data.leasePackageTemplateId !== undefined
      ? data.leasePackageTemplateId
      : existing.leasePackageTemplateId || null;
  const moveInPaymentStatus: 'unpaid' | 'paid' =
    data.moveInPaymentStatus !== undefined
      ? data.moveInPaymentStatus
      : existing.moveInPaymentStatus || 'unpaid';
  const moveInPaymentMethod =
    data.moveInPaymentMethod !== undefined
      ? data.moveInPaymentMethod?.trim() || null
      : existing.moveInPaymentMethod || null;
  const moveInPaymentNotes =
    data.moveInPaymentNotes !== undefined
      ? data.moveInPaymentNotes?.trim() || null
      : existing.moveInPaymentNotes || null;
  const moveInPaidAt =
    moveInPaymentStatus === 'paid'
      ? data.moveInPaidAt !== undefined && data.moveInPaidAt
        ? data.moveInPaidAt
        : existing.moveInPaidAt || new Date().toISOString()
      : null;

  // Allocate Parenta txn IDs when onboarding Payment received is verified
  let depositParentaTxnId: string | null =
    existing.depositParentaTxnId || null;
  let advanceParentaTxnId: string | null =
    existing.advanceParentaTxnId || null;
  if (existing.boardSlug === 'onboarding') {
    if (moveInPaymentStatus === 'unpaid') {
      depositParentaTxnId = null;
      advanceParentaTxnId = null;
    } else if (moveInPaymentStatus === 'paid') {
      const depositNum =
        depositAmount != null && Number(depositAmount) > 0
          ? Number(depositAmount)
          : 0;
      const advanceNum =
        advanceAmount != null && Number(advanceAmount) > 0
          ? Number(advanceAmount)
          : 0;
      try {
        const { allocateParentaTxnId } = await import(
          '@/lib/services/transaction-id-service'
        );
        if (depositNum > 0 && !depositParentaTxnId) {
          depositParentaTxnId = await allocateParentaTxnId('d');
        }
        if (depositNum <= 0) depositParentaTxnId = null;
        if (advanceNum > 0 && !advanceParentaTxnId) {
          advanceParentaTxnId = await allocateParentaTxnId('a');
        }
        if (advanceNum <= 0) advanceParentaTxnId = null;
      } catch (err) {
        console.error(
          'Parenta txn allocate failed for onboarding move-in payment (non-fatal):',
          err
        );
      }
    }
  }

  if (data.markLeaseSigned) {
    // Fall through: save fields first, then convert at end
  }

  const changeNotes: string[] = [];
  const fieldChanges: PipelineHistoryFieldChange[] = [];

  const recordChange = (change: PipelineHistoryFieldChange | null | undefined) => {
    if (!change) return;
    fieldChanges.push(change);
    changeNotes.push(change.summary);
  };

  // Auto-claim: whoever edits an unassigned card becomes the owner.
  // Explicit assign / unassign from the UI still wins via data.assignedTo.
  let effectiveAssignedTo = data.assignedTo;
  if (
    effectiveAssignedTo === undefined &&
    !existing.assignedTo &&
    userId
  ) {
    effectiveAssignedTo = userId;
  }

  const nextAssignedTo =
    effectiveAssignedTo !== undefined
      ? effectiveAssignedTo
      : existing.assignedTo || null;
  if (
    effectiveAssignedTo !== undefined &&
    nextAssignedTo !== (existing.assignedTo || null)
  ) {
    if (!nextAssignedTo) {
      recordChange({
        field: 'assignedTo',
        label: 'Assignee',
        from: existing.assignedToName || existing.assignedTo || null,
        to: null,
        summary: existing.assignedToName
          ? `Unassigned from ${existing.assignedToName}`
          : 'Unassigned admin',
      });
    } else {
      const assigneeRow = await pool.query<{ first_name: string; last_name: string }>(
        `SELECT first_name, last_name FROM users WHERE id = $1`,
        [nextAssignedTo]
      );
      const name = assigneeRow.rows[0]
        ? `${assigneeRow.rows[0].first_name} ${assigneeRow.rows[0].last_name}`.trim()
        : 'admin';
      recordChange({
        field: 'assignedTo',
        label: 'Assignee',
        from: existing.assignedToName || null,
        to: name,
        summary:
          data.assignedTo !== undefined
            ? `Assigned to ${name}`
            : `Assigned to ${name} (auto)`,
      });
    }
  }
  if (data.title !== undefined && data.title.trim() !== existing.title) {
    recordChange(
      buildFieldHistoryChange({
        field: 'title',
        label: 'Title',
        from: existing.title,
        to: data.title.trim(),
      })
    );
  }
  if (data.contactFirstName !== undefined || data.contactLastName !== undefined) {
    const prev = [existing.contactFirstName, existing.contactLastName].filter(Boolean).join(' ');
    const next = [firstName, lastName].filter(Boolean).join(' ');
    if (prev !== next) {
      recordChange({
        field: 'contactName',
        label: 'Contact',
        from: prev || null,
        to: next || null,
        summary: prev
          ? `Contact renamed ${prev} → ${next || '(cleared)'}`
          : `Contact set to ${next || '(cleared)'}`,
      });
    }
  }
  if (data.contactEmail !== undefined) {
    recordChange(
      buildFieldHistoryChange({
        field: 'contactEmail',
        label: 'Email',
        from: existing.contactEmail || null,
        to: data.contactEmail?.trim() || null,
      })
    );
  }
  if (data.contactPhone !== undefined) {
    recordChange(
      buildFieldHistoryChange({
        field: 'contactPhone',
        label: 'Phone',
        from: existing.contactPhone || null,
        to: data.contactPhone?.trim() || null,
      })
    );
  }
  if (data.buildingId !== undefined && data.buildingId !== (existing.buildingId || null)) {
    if (data.buildingId) {
      const b = await pool.query<{ name: string }>(
        `SELECT name FROM buildings WHERE id = $1`,
        [data.buildingId]
      );
      const nextName = b.rows[0]?.name || 'selected';
      recordChange({
        field: 'buildingId',
        label: 'Building',
        from: existing.buildingName || null,
        to: nextName,
        summary: existing.buildingName
          ? `Building ${existing.buildingName} → ${nextName}`
          : `Building set to ${nextName}`,
      });
    } else {
      recordChange({
        field: 'buildingId',
        label: 'Building',
        from: existing.buildingName || null,
        to: null,
        summary: existing.buildingName
          ? `Building cleared (was ${existing.buildingName})`
          : 'Building cleared',
      });
    }
  }
  if (data.roomId !== undefined && data.roomId !== (existing.roomId || null)) {
    if (data.roomId) {
      const r = await pool.query<{ room_number: string }>(
        `SELECT room_number FROM rooms WHERE id = $1`,
        [data.roomId]
      );
      const nextRoom = r.rows[0]?.room_number || 'selected';
      recordChange({
        field: 'roomId',
        label: 'Room',
        from: existing.roomNumber || null,
        to: nextRoom,
        summary: existing.roomNumber
          ? `Room ${existing.roomNumber} → ${nextRoom}`
          : `Room set to ${nextRoom}`,
      });
    } else {
      recordChange({
        field: 'roomId',
        label: 'Room',
        from: existing.roomNumber || null,
        to: null,
        summary: existing.roomNumber
          ? `Room cleared (was ${existing.roomNumber})`
          : 'Room cleared',
      });
    }
  }
  if (data.amount !== undefined && !sameNumber(data.amount, existing.amount ?? null)) {
    recordChange({
      field: 'amount',
      label: 'Amount',
      from: formatHistoryMoney(existing.amount),
      to: formatHistoryMoney(data.amount),
      summary: `Amount ${formatHistoryMoney(existing.amount)} → ${formatHistoryMoney(data.amount)}`,
    });
  } else if (
    data.amount === undefined &&
    data.roomId &&
    data.roomId !== existing.roomId &&
    !sameNumber(amount, existing.amount ?? null)
  ) {
    recordChange({
      field: 'amount',
      label: 'Amount',
      from: formatHistoryMoney(existing.amount),
      to: formatHistoryMoney(amount),
      summary: `Amount ${formatHistoryMoney(existing.amount)} → ${formatHistoryMoney(amount)} (from room rate)`,
    });
  }
  if (data.source !== undefined) {
    recordChange(
      buildFieldHistoryChange({
        field: 'source',
        label: 'Source',
        from: existing.source || null,
        to: data.source?.trim() || null,
      })
    );
  }
  if (data.tags !== undefined) {
    recordChange(buildTagHistoryChange(existing.tags || [], tags));
  } else if (
    data.viewingAt !== undefined &&
    formatTagsList(existing.tags || []) !== formatTagsList(tags)
  ) {
    recordChange(buildTagHistoryChange(existing.tags || [], tags));
  }
  if (data.dueAt !== undefined && !sameInstant(data.dueAt, existing.dueAt || null)) {
    recordChange({
      field: 'dueAt',
      label: 'Due date',
      from: formatHistoryDate(existing.dueAt),
      to: formatHistoryDate(data.dueAt),
      summary: `Due date ${formatHistoryDate(existing.dueAt)} → ${formatHistoryDate(data.dueAt)}`,
    });
  }
  if (
    data.nextActionAt !== undefined &&
    !sameInstant(data.nextActionAt, existing.nextActionAt || null)
  ) {
    recordChange({
      field: 'nextActionAt',
      label: 'Next follow-up',
      from: formatHistoryDate(existing.nextActionAt),
      to: formatHistoryDate(data.nextActionAt),
      summary: `Next follow-up ${formatHistoryDate(existing.nextActionAt)} → ${formatHistoryDate(data.nextActionAt)}`,
    });
  }
  if (data.viewingAt !== undefined && !sameInstant(data.viewingAt, existing.viewingAt || null)) {
    recordChange({
      field: 'viewingAt',
      label: 'Viewing',
      from: formatHistoryDate(existing.viewingAt),
      to: formatHistoryDate(data.viewingAt),
      summary: `Viewing ${formatHistoryDate(existing.viewingAt)} → ${formatHistoryDate(data.viewingAt)}`,
    });
  }
  if (data.notes !== undefined && (data.notes?.trim() || null) !== (existing.notes || null)) {
    const prevNotes = (existing.notes || '').trim();
    const nextNotes = data.notes?.trim() || '';
    const clip = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s);
    if (!nextNotes) {
      recordChange({
        field: 'notes',
        label: 'Follow-up notes',
        from: clip(prevNotes) || null,
        to: null,
        summary: 'Follow-up notes cleared',
      });
    } else if (!prevNotes) {
      recordChange({
        field: 'notes',
        label: 'Follow-up notes',
        from: null,
        to: clip(nextNotes),
        summary: `Follow-up notes added: ${clip(nextNotes)}`,
      });
    } else {
      recordChange({
        field: 'notes',
        label: 'Follow-up notes',
        from: clip(prevNotes),
        to: clip(nextNotes),
        summary: `Follow-up notes: ${clip(prevNotes)} → ${clip(nextNotes)}`,
      });
    }
  }
  if (markAsLost) {
    recordChange({
      field: 'lost',
      label: 'Status',
      from: 'open',
      to: 'lost',
      summary: lostReason ? `Marked lost: ${lostReason}` : 'Marked as lost',
    });
  } else if (
    data.lostReason !== undefined &&
    (data.lostReason?.trim() || null) !== (existing.lostReason || null)
  ) {
    recordChange(
      buildFieldHistoryChange({
        field: 'lostReason',
        label: 'Lost reason',
        from: existing.lostReason || null,
        to: data.lostReason?.trim() || null,
      })
    );
  }
  if (
    data.backgroundCheckStatus !== undefined &&
    data.backgroundCheckStatus !== (existing.backgroundCheckStatus || 'not_started')
  ) {
    const from = (existing.backgroundCheckStatus || 'not_started').replace(/_/g, ' ');
    const to = data.backgroundCheckStatus.replace(/_/g, ' ');
    recordChange({
      field: 'backgroundCheckStatus',
      label: 'Screening',
      from,
      to,
      summary: `Screening ${from} → ${to}`,
    });
  }
  if (
    data.backgroundCheckNotes !== undefined &&
    (data.backgroundCheckNotes?.trim() || null) !== (existing.backgroundCheckNotes || null)
  ) {
    const prev = (existing.backgroundCheckNotes || '').trim();
    const next = (data.backgroundCheckNotes || '').trim();
    const clip = (s: string) => (s.length > 100 ? `${s.slice(0, 97)}…` : s);
    recordChange({
      field: 'backgroundCheckNotes',
      label: 'Screening notes',
      from: prev ? clip(prev) : null,
      to: next ? clip(next) : null,
      summary:
        !prev && next
          ? `Screening notes added: ${clip(next)}`
          : prev && !next
            ? 'Screening notes cleared'
            : `Screening notes: ${clip(prev)} → ${clip(next)}`,
    });
  }
  if (
    data.leaseStatus !== undefined &&
    data.leaseStatus !== (existing.leaseStatus || 'not_started')
  ) {
    const from = (existing.leaseStatus || 'not_started').replace(/_/g, ' ');
    const to = data.leaseStatus.replace(/_/g, ' ');
    recordChange({
      field: 'leaseStatus',
      label: 'Lease status',
      from,
      to,
      summary: `Lease status ${from} → ${to}`,
    });
  }
  if (
    data.leaseStartDate !== undefined &&
    !sameInstant(data.leaseStartDate, existing.leaseStartDate || null)
  ) {
    recordChange({
      field: 'leaseStartDate',
      label: 'Lease start',
      from: formatHistoryDate(existing.leaseStartDate),
      to: formatHistoryDate(data.leaseStartDate),
      summary: `Lease start ${formatHistoryDate(existing.leaseStartDate)} → ${formatHistoryDate(data.leaseStartDate)}`,
    });
  }
  if (
    data.leaseEndDate !== undefined &&
    !sameInstant(data.leaseEndDate, existing.leaseEndDate || null)
  ) {
    recordChange({
      field: 'leaseEndDate',
      label: 'Lease end',
      from: formatHistoryDate(existing.leaseEndDate),
      to: formatHistoryDate(data.leaseEndDate),
      summary: `Lease end ${formatHistoryDate(existing.leaseEndDate)} → ${formatHistoryDate(data.leaseEndDate)}`,
    });
  }
  if (
    data.moveInDate !== undefined &&
    !sameInstant(data.moveInDate, existing.moveInDate || null)
  ) {
    recordChange({
      field: 'moveInDate',
      label: 'Move-in date',
      from: formatHistoryDate(existing.moveInDate),
      to: formatHistoryDate(data.moveInDate),
      summary: `Move-in date ${formatHistoryDate(existing.moveInDate)} → ${formatHistoryDate(data.moveInDate)}`,
    });
  }
  if (
    data.depositAmount !== undefined &&
    !sameNumber(data.depositAmount, existing.depositAmount ?? null)
  ) {
    recordChange({
      field: 'depositAmount',
      label: 'Deposit',
      from: formatHistoryMoney(existing.depositAmount),
      to: formatHistoryMoney(data.depositAmount),
      summary: `Deposit ${formatHistoryMoney(existing.depositAmount)} → ${formatHistoryMoney(data.depositAmount)}`,
    });
  }
  if (
    data.advanceAmount !== undefined &&
    !sameNumber(data.advanceAmount, existing.advanceAmount ?? null)
  ) {
    recordChange({
      field: 'advanceAmount',
      label: 'Advance',
      from: formatHistoryMoney(existing.advanceAmount),
      to: formatHistoryMoney(data.advanceAmount),
      summary: `Advance ${formatHistoryMoney(existing.advanceAmount)} → ${formatHistoryMoney(data.advanceAmount)}`,
    });
  }
  if (
    data.moveInPaymentStatus !== undefined &&
    data.moveInPaymentStatus !== (existing.moveInPaymentStatus || 'unpaid')
  ) {
    const from = existing.moveInPaymentStatus || 'unpaid';
    const to = data.moveInPaymentStatus;
    recordChange({
      field: 'moveInPaymentStatus',
      label: 'Move-in payment',
      from,
      to,
      summary: `Move-in payment ${from} → ${to}`,
    });
  }
  if (
    data.moveInPaymentMethod !== undefined &&
    (data.moveInPaymentMethod?.trim() || null) !== (existing.moveInPaymentMethod || null)
  ) {
    const next = data.moveInPaymentMethod?.trim() || null;
    const prev = existing.moveInPaymentMethod || null;
    recordChange({
      field: 'moveInPaymentMethod',
      label: 'Payment method',
      from: prev ? prev.replace(/_/g, ' ') : null,
      to: next ? next.replace(/_/g, ' ') : null,
      summary: `Payment method ${(prev || '(none)').replace(/_/g, ' ')} → ${(next || '(cleared)').replace(/_/g, ' ')}`,
    });
  }
  if (
    data.moveInPaymentNotes !== undefined &&
    (data.moveInPaymentNotes?.trim() || null) !== (existing.moveInPaymentNotes || null)
  ) {
    const prev = (existing.moveInPaymentNotes || '').trim();
    const next = (data.moveInPaymentNotes || '').trim();
    const clip = (s: string) => (s.length > 100 ? `${s.slice(0, 97)}…` : s);
    recordChange({
      field: 'moveInPaymentNotes',
      label: 'Payment notes',
      from: prev ? clip(prev) : null,
      to: next ? clip(next) : null,
      summary:
        !prev && next
          ? `Payment notes added: ${clip(next)}`
          : prev && !next
            ? 'Payment notes cleared'
            : `Payment notes: ${clip(prev)} → ${clip(next)}`,
    });
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
       viewing_status = $14,
       notes = $15,
       lost_reason = $16,
       background_check_status = $17,
       background_check_notes = $18,
       lease_status = $19,
       lease_start_date = $20,
       lease_end_date = $21,
       move_in_date = $22,
       assignment_id = COALESCE($23, assignment_id),
       deposit_amount = $24,
       advance_amount = $25,
       move_in_payment_status = $26,
       move_in_paid_at = $27,
       move_in_payment_method = $28,
       move_in_payment_notes = $29,
       assigned_to = $30,
       deposit_parenta_txn_id = $31,
       advance_parenta_txn_id = $32,
       lease_package_template_id = $33,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $34`,
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
      data.viewingStatus !== undefined ? data.viewingStatus || null : existing.viewingStatus || null,
      data.notes !== undefined ? data.notes?.trim() || null : existing.notes || null,
      markAsLost || data.lostReason !== undefined ? lostReason : existing.lostReason || null,
      backgroundCheckStatus,
      backgroundCheckNotes,
      leaseStatus,
      leaseStartDate,
      leaseEndDate,
      moveInDate,
      data.assignmentId !== undefined ? data.assignmentId : null,
      depositAmount,
      advanceAmount,
      moveInPaymentStatus,
      moveInPaidAt,
      moveInPaymentMethod,
      moveInPaymentNotes,
      nextAssignedTo,
      depositParentaTxnId,
      advanceParentaTxnId,
      leasePackageTemplateId,
      cardId,
    ]
  );

  const eventType =
    effectiveAssignedTo !== undefined &&
    nextAssignedTo !== (existing.assignedTo || null) &&
    changeNotes.length === 1
      ? 'assignee_changed'
      : 'updated';

  const historyMode = options?.historyMode ?? 'all';
  const fieldsToStore =
    historyMode === 'none'
      ? []
      : historyMode === 'assignee'
        ? fieldChanges.filter((f) => f.field === 'assignedTo')
        : fieldChanges;
  const notesToStore = fieldsToStore.map((f) => f.summary);

  if (notesToStore.length > 0) {
    await pool.query(
      `INSERT INTO pipeline_card_events (
         card_id, event_type, from_board_id, to_board_id, note, metadata, created_by
       ) VALUES ($1, $2, $3, $3, $4, $5::jsonb, $6)`,
      [
        cardId,
        fieldsToStore.length === 1 && fieldsToStore[0].field === 'assignedTo'
          ? 'assignee_changed'
          : eventType,
        existing.boardId,
        notesToStore.join('; '),
        JSON.stringify({ changes: notesToStore, fields: fieldsToStore }),
        userId || null,
      ]
    );
  }

  const boardRow = await pool.query<{ slug: string }>(
    `SELECT slug FROM pipeline_boards WHERE id = $1`,
    [existing.boardId]
  );
  const boardSlug = boardRow.rows[0]?.slug;

  // Keep maintenance request assignee in sync with board card assignee
  if (
    boardSlug === 'maintenance' &&
    effectiveAssignedTo !== undefined &&
    nextAssignedTo !== (existing.assignedTo || null) &&
    existing.maintenanceRequestId
  ) {
    await pool.query(
      `UPDATE maintenance_requests
       SET assigned_to = $1, updated_at = NOW()
       WHERE id = $2`,
      [nextAssignedTo, existing.maintenanceRequestId]
    );
  }

  if (boardSlug === 'onboarding') {
    const nextRoomId =
      data.roomId !== undefined ? data.roomId : existing.roomId || null;
    const paymentChanged =
      data.moveInPaymentStatus !== undefined &&
      data.moveInPaymentStatus !== (existing.moveInPaymentStatus || 'unpaid');
    const roomChanged =
      data.roomId !== undefined && data.roomId !== (existing.roomId || null);

    if (markAsLost || paymentChanged || roomChanged || moveInPaymentStatus === 'paid') {
      await syncRoomReservationForMoveInPayment({
        cardId,
        roomId: nextRoomId,
        previousRoomId: existing.roomId || null,
        paymentStatus: markAsLost ? 'unpaid' : moveInPaymentStatus,
        releaseHold: markAsLost,
      });
    }
  }

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
    } else if (moveInPaymentStatus === 'paid') {
      await moveToSlug('payment', 'Move-in payment confirmed');
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
    const converted = await convertOnboardingCardToLeaseSigned(cardId, {
      userId,
      note: data.generateLease
        ? 'Lease generated from opportunity form'
        : 'Marked Lease signed from opportunity form',
      leaseStartDate,
      leaseEndDate,
      moveInDate,
      leaseStatus: data.generateLease
        ? data.leaseStatus === 'awaiting_signature' ||
          data.leaseStatus === 'signed' ||
          data.leaseStatus === 'generated'
          ? data.leaseStatus
          : 'generated'
        : 'signed',
    });
    return {
      card: converted.card,
      changeNotes: [
        ...changeNotes,
        data.generateLease ? 'Lease generated' : 'Marked lease signed',
      ],
      portalLogin: converted.portalLogin,
    };
  }

  const updated = await getPipelineCardById(cardId);
  if (!updated) throw new Error('Failed to reload card');
  return { card: updated, changeNotes };
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

/**
 * Soft-archive a pipeline board (keeps stages and cards). Use unarchive to restore.
 */
export async function deletePipelineBoard(boardId: string): Promise<void> {
  const result = await pool.query(
    `UPDATE pipeline_boards
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = true
     RETURNING id`,
    [boardId]
  );
  if (!result.rows[0]) throw new Error('Board not found');
}

export async function unarchivePipelineBoard(boardId: string): Promise<PipelineBoard> {
  const result = await pool.query(
    `UPDATE pipeline_boards
     SET is_active = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND is_active = false
     RETURNING id`,
    [boardId]
  );
  if (!result.rows[0]) throw new Error('Archived board not found');

  const boards = await getPipelineBoards({ includeInactive: true });
  const board = boards.find((b) => b.id === boardId);
  if (!board) throw new Error('Board not found after unarchive');
  return board;
}

export async function getArchivedPipelineBoards(): Promise<PipelineBoard[]> {
  const all = await getPipelineBoards({ includeInactive: true });
  return all.filter((b) => !b.isActive);
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

export async function deletePipelineCard(cardId: string): Promise<PipelineCard> {
  const existing = await getPipelineCardById(cardId);
  if (!existing) throw new Error('Card not found');

  if (
    existing.boardSlug === 'onboarding' &&
    existing.roomId &&
    existing.moveInPaymentStatus === 'paid'
  ) {
    await releaseRoomReservationIfUnused(existing.roomId, cardId);
  }

  const result = await pool.query(
    `DELETE FROM pipeline_cards WHERE id = $1 RETURNING id`,
    [cardId]
  );
  if (!result.rows[0]) {
    throw new Error('Card not found');
  }

  return existing;
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

export async function reorderPipelineBoards(
  boardIds: string[]
): Promise<PipelineBoard[]> {
  if (boardIds.length === 0) throw new Error('boardIds required');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const active = await client.query<{ id: string }>(
      `SELECT id FROM pipeline_boards WHERE is_active = true`
    );
    const activeIds = new Set(active.rows.map((r) => r.id));
    if (
      boardIds.length !== activeIds.size ||
      boardIds.some((id) => !activeIds.has(id))
    ) {
      throw new Error('boardIds must include every active board exactly once');
    }

    for (let i = 0; i < boardIds.length; i++) {
      await client.query(
        `UPDATE pipeline_boards SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND is_active = true`,
        [i + 1, boardIds[i]]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getPipelineBoards();
}
