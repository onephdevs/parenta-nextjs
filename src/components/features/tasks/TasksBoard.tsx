'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Columns3, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  PipelineBoard,
  PipelineBoardSlug,
  PipelineCard,
  PipelineStage,
} from '@/types/database';
import { AddOpportunityModal } from './NewPipelineCardModal';
import { ManageStagesModal } from './ManageStagesModal';

function formatPeso(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '₱0';
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

function initials(card: PipelineCard): string {
  const first = card.contactFirstName?.[0] || card.title?.[0] || '?';
  const last = card.contactLastName?.[0] || '';
  return `${first}${last}`.toUpperCase();
}

function avatarHue(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 42%)`;
}

function formatViewing(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface TasksBoardProps {
  initialSlug?: PipelineBoardSlug;
}

export function TasksBoard({ initialSlug = 'onboarding' }: TasksBoardProps) {
  const [boards, setBoards] = useState<PipelineBoard[]>([]);
  const [activeSlug, setActiveSlug] = useState<PipelineBoardSlug>(initialSlug);
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showOpportunity, setShowOpportunity] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null);
  const [showManageStages, setShowManageStages] = useState(false);
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitleDraft, setBoardTitleDraft] = useState('');
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [creatingBoardLoading, setCreatingBoardLoading] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStageId, setDropStageId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const boardTitleInputRef = useRef<HTMLInputElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  const activeBoard = useMemo(
    () => boards.find((b) => b.slug === activeSlug) || null,
    [boards, activeSlug]
  );

  const loadBoard = useCallback(async (slug: PipelineBoardSlug) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/boards?slug=${slug}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to load board');
      }
      setBoards(json.data.boards);
      setCards(json.data.cards || []);
      setActiveSlug(slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard(initialSlug);
  }, [initialSlug, loadBoard]);

  useEffect(() => {
    if (editingBoardTitle) boardTitleInputRef.current?.focus();
  }, [editingBoardTitle]);

  useEffect(() => {
    if (activeBoard && !editingBoardTitle) {
      setBoardTitleDraft(activeBoard.name);
    }
  }, [activeBoard, editingBoardTitle]);

  // Close pipeline switcher on outside click without a viewport-covering
  // overlay (that overlay blocked sidebar / header navigation).
  useEffect(() => {
    if (!switcherOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (switcherRef.current && target && !switcherRef.current.contains(target)) {
        setSwitcherOpen(false);
        setCreatingBoard(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSwitcherOpen(false);
        setCreatingBoard(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [switcherOpen]);

  async function handleRenameBoard() {
    if (!activeBoard) return;
    const trimmed = boardTitleDraft.trim();
    setEditingBoardTitle(false);
    if (!trimmed || trimmed === activeBoard.name) {
      setBoardTitleDraft(activeBoard.name);
      return;
    }

    setBoards((prev) =>
      prev.map((b) => (b.id === activeBoard.id ? { ...b, name: trimmed } : b))
    );

    try {
      const res = await fetch(`/api/pipeline/boards/${activeBoard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to rename board');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename board');
      await loadBoard(activeSlug);
    }
  }

  async function handleCreateBoard() {
    const name = newBoardName.trim();
    if (!name) return;
    setCreatingBoardLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pipeline/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: newBoardDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create board');
      setCreatingBoard(false);
      setNewBoardName('');
      setNewBoardDescription('');
      setSwitcherOpen(false);
      setTagFilter(null);
      await loadBoard(json.data.board.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setCreatingBoardLoading(false);
    }
  }

  const cardsByStage = useMemo(() => {
    const map = new Map<string, PipelineCard[]>();
    for (const card of cards) {
      if (
        tagFilter &&
        !card.tags?.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      ) {
        continue;
      }
      const list = map.get(card.stageId) || [];
      list.push(card);
      map.set(card.stageId, list);
    }
    return map;
  }, [cards, tagFilter]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      for (const tag of card.tags || []) {
        if (tag.trim()) set.add(tag);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  async function handleMove(cardId: string, stageId: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.stageId === stageId) return;

    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, stageId } : c)));

    try {
      const res = await fetch(`/api/pipeline/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', stageId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Move failed');
      await loadBoard(activeSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed');
      await loadBoard(activeSlug);
    }
  }

  async function handleRenameStage(stageId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    setBoards((prev) =>
      prev.map((board) =>
        board.slug !== activeSlug
          ? board
          : {
              ...board,
              stages: board.stages.map((s) =>
                s.id === stageId ? { ...s, name: trimmed } : s
              ),
            }
      )
    );

    try {
      const res = await fetch(`/api/pipeline/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to rename stage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename stage');
      await loadBoard(activeSlug);
    }
  }

  function onDragStart(cardId: string) {
    setDraggingId(cardId);
  }

  function onDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDropStageId(stageId);
  }

  function onDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    if (draggingId) void handleMove(draggingId, stageId);
    setDraggingId(null);
    setDropStageId(null);
  }

  const showMoney =
    activeSlug === 'onboarding' || activeSlug === 'nurture' || activeSlug === 'payments';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="relative min-w-0" ref={switcherRef}>
          <div className="flex items-center gap-2">
            {editingBoardTitle ? (
              <input
                ref={boardTitleInputRef}
                value={boardTitleDraft}
                onChange={(e) => setBoardTitleDraft(e.target.value)}
                onBlur={() => void handleRenameBoard()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                  if (e.key === 'Escape') {
                    setBoardTitleDraft(activeBoard?.name || '');
                    setEditingBoardTitle(false);
                  }
                }}
                className="w-full max-w-md rounded-md border border-indigo-300 px-2 py-1 text-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 sm:text-3xl"
                aria-label="Board title"
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSwitcherOpen((o) => !o)}
                  className="flex min-w-0 items-center gap-2 text-left"
                  aria-expanded={switcherOpen}
                  aria-haspopup="listbox"
                >
                  <h1 className="truncate text-2xl font-bold text-gray-900 sm:text-3xl">
                    {activeBoard?.name || 'Tasks'} Pipeline
                  </h1>
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" />
                </button>
                {activeBoard && (
                  <button
                    type="button"
                    onClick={() => {
                      setBoardTitleDraft(activeBoard.name);
                      setEditingBoardTitle(true);
                    }}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title="Rename board"
                    aria-label="Rename board"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {activeBoard && !editingBoardTitle && (
            <p className="mt-1 text-sm text-gray-600">
              {activeBoard.openCount ?? 0} open
              {showMoney ? (
                <>
                  {' '}
                  · {formatPeso(activeBoard.openTotalAmount)}{' '}
                  {activeSlug === 'onboarding' || activeSlug === 'nurture'
                    ? 'potential rent'
                    : 'tracked'}
                </>
              ) : null}
            </p>
          )}

          {switcherOpen && (
            <div
              role="listbox"
              aria-label="Pipeline boards"
              className="absolute left-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
                {boards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    role="option"
                    aria-selected={board.slug === activeSlug}
                    className={`flex w-full flex-col px-4 py-3 text-left hover:bg-gray-50 ${
                      board.slug === activeSlug ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => {
                      setSwitcherOpen(false);
                      setCreatingBoard(false);
                      setTagFilter(null);
                      void loadBoard(board.slug);
                    }}
                  >
                    <span className="text-sm font-semibold text-gray-900">{board.name}</span>
                    {board.description && (
                      <span className="text-xs text-gray-500">{board.description}</span>
                    )}
                  </button>
                ))}

                <div className="border-t border-gray-100 p-2">
                  {creatingBoard ? (
                    <div className="space-y-2 p-2">
                      <input
                        autoFocus
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        placeholder="Board name"
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleCreateBoard();
                          if (e.key === 'Escape') setCreatingBoard(false);
                        }}
                      />
                      <input
                        value={newBoardDescription}
                        onChange={(e) => setNewBoardDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          onClick={() => setCreatingBoard(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          disabled={creatingBoardLoading || !newBoardName.trim()}
                          onClick={() => void handleCreateBoard()}
                        >
                          {creatingBoardLoading ? 'Creating…' : 'Create'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                      onClick={() => setCreatingBoard(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Create new board
                    </button>
                  )}
                </div>
              </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowManageStages(true)}
            isDisabled={!activeBoard}
          >
            <Columns3 className="mr-1.5 h-4 w-4" />
            Edit stages
          </Button>
        <Button type="button" onClick={() => {
          setSelectedCard(null);
          setShowOpportunity(true);
        }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add opportunity
        </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Filter tags
          </span>
          <button
            type="button"
            onClick={() => setTagFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              !tagFilter
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter((prev) => (prev === tag ? null : tag))}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                tagFilter === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading && !activeBoard ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          Loading pipeline…
        </div>
      ) : (
        <div className="flex min-h-[560px] flex-1 gap-3 overflow-x-auto pb-4">
          {activeBoard?.stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              cards={cardsByStage.get(stage.id) || []}
              isDropTarget={dropStageId === stage.id}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onRenameStage={handleRenameStage}
              onOpenCard={(c) => {
                setSelectedCard(c);
                setShowOpportunity(true);
              }}
              showMoney={showMoney}
            />
          ))}
        </div>
      )}

      {activeBoard && (
        <AddOpportunityModal
          isOpen={showOpportunity}
          board={activeBoard}
          boards={boards}
          card={selectedCard}
          onClose={() => {
            setShowOpportunity(false);
            setSelectedCard(null);
          }}
          onCreated={() => {
            setShowOpportunity(false);
            setSelectedCard(null);
            void loadBoard(activeSlug);
          }}
          onSaved={() => {
            setShowOpportunity(false);
            setSelectedCard(null);
            void loadBoard(activeSlug);
          }}
          onMoved={(slug) => {
            setShowOpportunity(false);
            setSelectedCard(null);
            void loadBoard(slug);
          }}
        />
      )}

      {activeBoard && (
        <ManageStagesModal
          isOpen={showManageStages}
          board={activeBoard}
          onClose={() => setShowManageStages(false)}
          onSaved={() => void loadBoard(activeSlug)}
        />
      )}
    </div>
  );
}

function StageColumn({
  stage,
  cards,
  isDropTarget,
  onDragOver,
  onDrop,
  onDragStart,
  onRenameStage,
  onOpenCard,
  showMoney,
}: {
  stage: PipelineStage;
  cards: PipelineCard[];
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (cardId: string) => void;
  onRenameStage: (stageId: string, name: string) => void;
  onOpenCard: (card: PipelineCard) => void;
  showMoney: boolean;
}) {
  const total = cards.reduce((sum, c) => sum + (c.amount || 0), 0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stage.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(stage.name);
  }, [stage.name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitRename() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== stage.name) {
      onRenameStage(stage.id, draft);
    } else {
      setDraft(stage.name);
    }
  }

  return (
    <div
      className={`flex w-64 shrink-0 flex-col rounded-xl bg-gray-50/80 ${
        isDropTarget ? 'ring-2 ring-indigo-300' : ''
      }`}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      <div className="flex items-start gap-2 px-3 pb-2 pt-3">
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setDraft(stage.name);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700 outline-none focus:ring-1 focus:ring-indigo-400"
              aria-label="Rename stage"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group flex w-full items-center gap-1 text-left"
              title="Click to rename stage"
            >
              <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                {stage.name}
              </span>
              <Pencil className="h-3 w-3 shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100" />
            </button>
          )}
          <p className="text-xs text-gray-500">
            {cards.length}
            {showMoney ? ` · ${formatPeso(total)}` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {cards.map((card) => (
          <PipelineCardView
            key={card.id}
            card={card}
            stage={stage}
            onDragStart={onDragStart}
            onOpen={() => onOpenCard(card)}
            showMonthlySuffix={showMoney}
          />
        ))}
      </div>
    </div>
  );
}

function PipelineCardView({
  card,
  stage,
  onDragStart,
  onOpen,
  showMonthlySuffix,
}: {
  card: PipelineCard;
  stage: PipelineStage;
  onDragStart: (cardId: string) => void;
  onOpen: () => void;
  showMonthlySuffix: boolean;
}) {
  const unitLabel =
    card.buildingName && card.roomNumber
      ? `${card.buildingName} · ${card.roomNumber}`
      : card.buildingName || card.roomNumber || null;
  const viewing = formatViewing(card.viewingAt);
  const isWon = stage.isWon || card.cardStatus === 'won';
  const draggedRef = useRef(false);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={() => {
        draggedRef.current = true;
        onDragStart(card.id);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          draggedRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (draggedRef.current) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md active:cursor-grabbing ${
        isWon ? 'bg-emerald-50 border-emerald-200' : ''
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: stage.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">{card.title}</p>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: avatarHue(card.id) }}
        >
          {initials(card)}
        </span>
      </div>

      {unitLabel && <p className="mt-1 text-xs text-gray-500">{unitLabel}</p>}
      {card.contactEmail && !unitLabel && (
        <p className="mt-1 truncate text-xs text-gray-500">{card.contactEmail}</p>
      )}
      {card.notes && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{card.notes}</p>
      )}
      {card.lostReason && (
        <p className="mt-1 line-clamp-2 text-xs text-red-600">Lost: {card.lostReason}</p>
      )}

      {card.amount != null && (
        <p className="mt-1 text-sm font-semibold text-emerald-600">
          {formatPeso(card.amount)}
          {showMonthlySuffix ? '/mo' : ''}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {card.source && <Tag label={card.source} />}
        {viewing && <Tag label={viewing} />}
        {card.tags?.map((tag) => (
          <Tag
            key={tag}
            label={tag}
            tone={tag.toLowerCase().includes('await') ? 'warn' : 'default'}
          />
        ))}
        {isWon && card.wonAt && (
          <Tag label={`Signed ${formatViewing(card.wonAt)?.split(',')[0] || ''}`} tone="success" />
        )}
      </div>
    </div>
  );
}

function Tag({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'warn' | 'success';
}) {
  const tones = {
    default: 'bg-gray-100 text-gray-700',
    warn: 'bg-amber-50 text-amber-800',
    success: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}
