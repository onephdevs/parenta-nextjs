'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Columns3,
  Filter,
  LayoutGrid,
  List,
  ListPlus,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  PipelineBoard,
  PipelineBoardSlug,
  PipelineCard,
  PipelineStage,
} from '@/types/database';
import {
  type CardFieldPair,
  defaultFieldsForBoard,
  formatCardFieldValue,
  loadCardFields,
} from '@/lib/pipeline/cardFields';
import { AddOpportunityModal } from './NewPipelineCardModal';
import { ManageStagesModal } from './ManageStagesModal';
import { ManageCardFieldsMenu } from './ManageCardFieldsMenu';
import {
  PipelineCardFace,
  type PipelineAssigneeOption,
} from './PipelineCardFace';

type PageTab = 'board' | 'stages' | 'bulk';
type ViewMode = 'kanban' | 'list';
type SortKey = 'title' | 'amount' | 'dueAt' | 'updatedAt';

function formatPeso(amount: number | undefined): string {
  if (amount == null || Number.isNaN(amount)) return '₱0';
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

interface TasksBoardProps {
  initialSlug?: PipelineBoardSlug;
}

export function TasksBoard({ initialSlug = 'onboarding' }: TasksBoardProps) {
  const router = useRouter();
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
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>('board');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDesc, setSortDesc] = useState(true);
  const [fieldPair, setFieldPair] = useState<CardFieldPair>(() =>
    defaultFieldsForBoard(initialSlug)
  );
  const [assignees, setAssignees] = useState<PipelineAssigneeOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const boardTitleInputRef = useRef<HTMLInputElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  /** Ignores stale in-flight board fetches when the user switches quickly. */
  const loadSeqRef = useRef(0);
  /** Last slug we intentionally loaded (user click or URL sync). */
  const lastRequestedSlugRef = useRef<PipelineBoardSlug | null>(null);

  const activeBoard = useMemo(
    () => boards.find((b) => b.slug === activeSlug) || null,
    [boards, activeSlug]
  );

  const loadBoard = useCallback(
    async (slug: PipelineBoardSlug) => {
      const seq = ++loadSeqRef.current;
      lastRequestedSlugRef.current = slug;

      // Optimistic UI: clear search/filters and update label/URL immediately so
      // a leftover search term can't hide the new board or look like a failed switch.
      setActiveSlug(slug);
      setSearchQuery('');
      setTagFilter(null);
      setSelectedIds(new Set());
      setFieldPair(loadCardFields(slug));
      setSwitcherOpen(false);
      setCreatingBoard(false);
      setLoading(true);
      setError(null);
      router.replace(`/admin/tasks?board=${encodeURIComponent(slug)}`, {
        scroll: false,
      });

      try {
        const res = await fetch(`/api/pipeline/boards?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (seq !== loadSeqRef.current) return;
        if (!json.success) {
          throw new Error(json.error || 'Failed to load board');
        }
        setBoards(json.data.boards);
        setCards(json.data.cards || []);
      } catch (err) {
        if (seq !== loadSeqRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load board');
      } finally {
        if (seq === loadSeqRef.current) setLoading(false);
      }
    },
    [router]
  );

  // Sync from URL only when it differs from what we already requested (avoids
  // racing a user switch with a stale reload of the previous board).
  useEffect(() => {
    if (lastRequestedSlugRef.current === initialSlug) {
      return;
    }
    void loadBoard(initialSlug);
  }, [initialSlug, loadBoard]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/pipeline/assignees');
        const json = await res.json();
        if (json.success) {
          setAssignees(json.data.assignees || []);
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  useEffect(() => {
    if (editingBoardTitle) boardTitleInputRef.current?.focus();
  }, [editingBoardTitle]);

  useEffect(() => {
    if (activeBoard && !editingBoardTitle) {
      setBoardTitleDraft(activeBoard.name);
    }
  }, [activeBoard, editingBoardTitle]);

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

  useEffect(() => {
    if (!overflowOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (overflowRef.current && target && !overflowRef.current.contains(target)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [overflowOpen]);

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

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = cards.filter((card) => {
      if (
        tagFilter &&
        !card.tags?.some((t) => t.toLowerCase() === tagFilter.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        card.title,
        card.contactEmail,
        card.contactPhone,
        card.contactFirstName,
        card.contactLastName,
        card.source,
        card.buildingName,
        card.roomNumber,
        card.notes,
        ...(card.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortKey === 'amount') {
        cmp = (a.amount || 0) - (b.amount || 0);
      } else if (sortKey === 'dueAt') {
        cmp =
          new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime();
      } else {
        cmp =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDesc ? -cmp : cmp;
    });

    return list;
  }, [cards, tagFilter, searchQuery, sortKey, sortDesc]);

  const cardsByStage = useMemo(() => {
    const map = new Map<string, PipelineCard[]>();
    for (const card of filteredCards) {
      const list = map.get(card.stageId) || [];
      list.push(card);
      map.set(card.stageId, list);
    }
    return map;
  }, [filteredCards]);

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

  async function handleAssign(cardId: string, assignedTo: string | null) {
    const assignee = assignedTo
      ? assignees.find((a) => a.id === assignedTo)
      : null;

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              assignedTo: assignedTo || undefined,
              assignedToName: assignee
                ? `${assignee.firstName} ${assignee.lastName}`.trim()
                : undefined,
              assignedToInitials: assignee?.initials,
            }
          : c
      )
    );

    try {
      const res = await fetch(`/api/pipeline/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', assignedTo }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Assign failed');
      if (json.data?.card) {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, ...json.data.card } : c))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assign failed');
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

  async function handleSyncLeases() {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    setOverflowOpen(false);
    try {
      const res = await fetch('/api/pipeline/sync', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to sync');
      }
      setSyncMessage(
        json.message || 'Pipelines synced from leases, invoices, and maintenance'
      );
      await loadBoard(activeSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync pipelines');
    } finally {
      setSyncing(false);
    }
  }

  function toggleSelect(cardId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredCards.map((c) => c.id)));
  }

  async function handleBulkMove() {
    if (!bulkStageId || selectedIds.size === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const res = await fetch(`/api/pipeline/cards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'move', stageId: bulkStageId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Bulk move failed');
      }
      setSelectedIds(new Set());
      setSyncMessage(`Moved ${ids.length} opportunities`);
      await loadBoard(activeSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk move failed');
      await loadBoard(activeSlug);
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.size} opportunities? This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const res = await fetch(`/api/pipeline/cards/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Bulk delete failed');
      }
      setSelectedIds(new Set());
      setSyncMessage(`Deleted ${ids.length} opportunities`);
      await loadBoard(activeSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
      await loadBoard(activeSlug);
    } finally {
      setBulkBusy(false);
    }
  }

  const showMoney =
    activeSlug === 'onboarding' ||
    activeSlug === 'nurture' ||
    activeSlug === 'payments';

  const opportunityCount = filteredCards.length;
  const sortActive = sortKey !== 'updatedAt' || !sortDesc ? 1 : 0;

  function openAdd() {
    setSelectedCard(null);
    setShowOpportunity(true);
  }

  function openCard(c: PipelineCard) {
    setSelectedCard(c);
    setShowOpportunity(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* 1. Header + tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Opportunities
          </h1>
          <nav className="mt-2 flex gap-4" aria-label="Opportunity views">
            {(
              [
                { id: 'board' as const, label: 'Board' },
                { id: 'stages' as const, label: 'Configure stages' },
                { id: 'bulk' as const, label: 'Bulk Actions' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setPageTab(tab.id);
                  if (tab.id === 'stages') setShowManageStages(true);
                }}
                className={`border-b-2 pb-2 text-sm font-medium transition ${
                  pageTab === tab.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 2. Toolbar row — z-30 so the board dropdown sits above search/filter rows */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex min-w-0 flex-wrap items-center gap-2" ref={switcherRef}>
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
              className="rounded-md border border-blue-300 px-2 py-1 text-lg font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Board title"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSwitcherOpen((o) => !o)}
                className="flex min-w-0 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
                aria-expanded={switcherOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate">{activeBoard?.name || 'Pipeline'}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
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

          <span className="text-sm font-medium text-blue-600">
            {opportunityCount}{' '}
            {opportunityCount === 1 ? 'opportunity' : 'opportunities'}
            {showMoney && activeBoard ? (
              <span className="text-gray-400">
                {' '}
                · {formatPeso(activeBoard.openTotalAmount)}
              </span>
            ) : null}
          </span>

          {switcherOpen && (
            <div
              role="listbox"
              aria-label="Pipeline boards"
              className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  role="option"
                  aria-selected={board.slug === activeSlug}
                  className={`flex w-full flex-col px-4 py-3 text-left hover:bg-gray-50 ${
                    board.slug === activeSlug ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    void loadBoard(board.slug);
                  }}
                >
                  <span className="text-sm font-semibold text-gray-900">
                    {board.name}
                  </span>
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
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleCreateBoard();
                        if (e.key === 'Escape') setCreatingBoard(false);
                      }}
                    />
                    <input
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
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
                        className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5">
            <button
              type="button"
              title="Kanban view"
              aria-pressed={viewMode === 'kanban'}
              onClick={() => {
                setViewMode('kanban');
                setPageTab('board');
              }}
              className={`rounded p-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="List view"
              aria-pressed={viewMode === 'list'}
              onClick={() => {
                setViewMode('list');
                setPageTab('board');
              }}
              className={`rounded p-1.5 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSyncMessage('CSV import is coming soon — use Add opportunity for now.')
            }
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Button>

          <Button type="button" size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add opportunity
          </Button>

          <div className="relative" ref={overflowRef}>
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
              aria-label="More board actions"
              onClick={() => setOverflowOpen((o) => !o)}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {overflowOpen && (
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => void handleSyncLeases()}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync pipelines
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setOverflowOpen(false);
                    setShowManageStages(true);
                    setPageTab('stages');
                  }}
                >
                  <Columns3 className="h-4 w-4" />
                  Edit stages
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Saved views row */}
      <div className="flex flex-wrap items-center gap-2">
        <List className="h-4 w-4 text-gray-400" />
        <button
          type="button"
          onClick={() => setTagFilter(null)}
          className={`rounded-md px-2.5 py-1 text-sm font-medium ${
            !tagFilter
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setTagFilter((prev) => (prev === tag ? null : tag))}
            className={`rounded-md px-2.5 py-1 text-sm font-medium ${
              tagFilter === tag
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tag}
          </button>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Saved filtered lists coming soon"
          onClick={() =>
            setSyncMessage(
              'Saved lists are coming soon — use tag chips and search for now.'
            )
          }
        >
          <ListPlus className="h-3.5 w-3.5" />
          List
        </button>
      </div>

      {/* 4. Filter / search row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() =>
            setSyncMessage(
              'Advanced filters coming soon — use search and tag views above.'
            )
          }
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
        </button>

        <div className="relative">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => {
              const keys: SortKey[] = ['updatedAt', 'title', 'amount', 'dueAt'];
              const idx = keys.indexOf(sortKey);
              const next = keys[(idx + 1) % keys.length];
              setSortKey(next);
              setSortDesc(next === 'updatedAt' || next === 'amount' || next === 'dueAt');
            }}
          >
            Sort
            {sortActive > 0 && (
              <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                1
              </span>
            )}
          </button>
          <span className="sr-only">Current sort: {sortKey}</span>
        </div>

        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Opportunities"
            className="h-9 w-full rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <ManageCardFieldsMenu
          boardSlug={activeSlug}
          fields={fieldPair}
          onChange={setFieldPair}
        />
      </div>

      {syncMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {syncMessage}
          <button
            type="button"
            className="ml-2 text-emerald-700 underline"
            onClick={() => setSyncMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Bulk Actions panel */}
      {pageTab === 'bulk' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Bulk Actions</p>
              <p className="text-xs text-gray-500">
                Select opportunities below, then move or delete them in one step.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-sm font-medium text-blue-700 hover:underline"
                onClick={toggleSelectAllFiltered}
              >
                {selectedIds.size === filteredCards.length && filteredCards.length > 0
                  ? 'Clear selection'
                  : `Select all (${filteredCards.length})`}
              </button>
              <select
                value={bulkStageId}
                onChange={(e) => setBulkStageId(e.target.value)}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm"
              >
                <option value="">Move to stage…</option>
                {activeBoard?.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                isDisabled={!bulkStageId || selectedIds.size === 0 || bulkBusy}
                isLoading={bulkBusy}
                onClick={() => void handleBulkMove()}
              >
                Move ({selectedIds.size})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="danger"
                isDisabled={selectedIds.size === 0 || bulkBusy}
                onClick={() => void handleBulkDelete()}
              >
                Delete ({selectedIds.size})
              </Button>
            </div>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-gray-100">
            {filteredCards.map((card) => (
              <label
                key={card.id}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-50 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(card.id)}
                  onChange={() => toggleSelect(card.id)}
                />
                <span className="font-medium text-gray-900">{card.title}</span>
                <span className="text-xs text-gray-400">{card.stageName}</span>
              </label>
            ))}
            {filteredCards.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                No opportunities match the current filters.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Board / list */}
      {pageTab !== 'bulk' &&
        (loading && !activeBoard ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            Loading pipeline…
          </div>
        ) : viewMode === 'list' ? (
          <div className="min-h-[400px] overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Stage</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">
                    {fieldPair[0] === 'amount' || fieldPair[0] === 'balance'
                      ? 'Value'
                      : 'Field 1'}
                  </th>
                  <th className="px-3 py-2 font-medium">Field 2</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => (
                  <tr
                    key={card.id}
                    className="cursor-pointer border-b border-gray-50 hover:bg-blue-50/40"
                    onClick={() => openCard(card)}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {card.title}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{card.stageName}</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {card.assignedToName || (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {formatCardFieldValue(fieldPair[0], card, {
                        monthlySuffix: showMoney,
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {formatCardFieldValue(fieldPair[1], card, {
                        monthlySuffix: showMoney,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCards.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-gray-400">
                No opportunities match.
              </p>
            )}
          </div>
        ) : (
          <div className="flex min-h-[560px] flex-1 gap-3 overflow-x-auto pb-4">
            {activeBoard?.stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                cards={cardsByStage.get(stage.id) || []}
                isDropTarget={dropStageId === stage.id}
                fieldPair={fieldPair}
                assignees={assignees}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragStart={onDragStart}
                onRenameStage={handleRenameStage}
                onOpenCard={openCard}
                onAssign={handleAssign}
                showMoney={showMoney}
              />
            ))}
          </div>
        ))}

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
          onClose={() => {
            setShowManageStages(false);
            setPageTab('board');
          }}
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
  fieldPair,
  assignees,
  onDragOver,
  onDrop,
  onDragStart,
  onRenameStage,
  onOpenCard,
  onAssign,
  showMoney,
}: {
  stage: PipelineStage;
  cards: PipelineCard[];
  isDropTarget: boolean;
  fieldPair: CardFieldPair;
  assignees: PipelineAssigneeOption[];
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (cardId: string) => void;
  onRenameStage: (stageId: string, name: string) => void;
  onOpenCard: (card: PipelineCard) => void;
  onAssign: (cardId: string, assignedTo: string | null) => void;
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
      className={`flex w-72 shrink-0 flex-col rounded-xl bg-gray-50/80 ${
        isDropTarget ? 'ring-2 ring-blue-300' : ''
      }`}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      <div
        className="rounded-t-xl border-t-[3px] px-3 pb-2 pt-3"
        style={{ borderTopColor: stage.color }}
      >
        <div className="flex items-start gap-2">
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
                className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-sm font-semibold text-gray-800 outline-none focus:ring-1 focus:ring-blue-400"
                aria-label="Rename stage"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="group flex w-full items-center gap-1 text-left"
                title="Click to rename stage"
              >
                <span className="truncate text-sm font-semibold text-gray-800">
                  {stage.name}
                </span>
                <Pencil className="h-3 w-3 shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100" />
              </button>
            )}
            <p className="text-xs text-gray-500">
              {cards.length} {cards.length === 1 ? 'Opportunity' : 'Opportunities'}
              {showMoney ? ` ${formatPeso(total)}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {cards.map((card) => (
          <PipelineCardFace
            key={card.id}
            card={card}
            stage={stage}
            fieldPair={fieldPair}
            showMonthlySuffix={showMoney}
            assignees={assignees}
            onDragStart={onDragStart}
            onOpen={() => onOpenCard(card)}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}
