'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  LayoutGrid,
  MessageSquare,
  Plus,
  X,
} from 'lucide-react';
import type { PipelineBoard, PipelineCard } from '@/types/database';
import {
  formatInquiryTicketNumber,
  inquiryContactName,
  inquiryPropertyLabel,
  isLandingInquiry,
} from '@/lib/inquiries';
import { formatPipelineLeadSource } from '@/lib/pipeline/lead-sources';
import { AddOpportunityModal } from '@/components/features/tasks/NewPipelineCardModal';
import { InquiryTicketAssist } from '@/components/features/inquiries/InquiryTicketAssist';
import { InquiryTicketHeader } from '@/components/features/inquiries/InquiryTicketHeader';
import { FormField } from '@/components/forms/FormField';
import { cn, formatShortDate } from '@/lib/utils';
import {
  Button,
  EmptyState,
  FilterBar,
  ListSummaryCard,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  WorkItemHeader,
  WorkItemRow,
} from '@/components/ui';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

const PAGE_SIZE = 20;

type SourceFilter = 'all' | 'website' | 'walk-in';
type SortKey = 'id' | 'name' | 'status' | 'date' | 'assignee';
type SortDir = 'asc' | 'desc';

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
}

interface InquiriesClientProps {
  initialCards: PipelineCard[];
  board: PipelineBoard;
}

function stageTone(card: PipelineCard): WorkItemTone {
  if (card.stageIsWon || card.cardStatus === 'won') return 'success';
  if (card.cardStatus === 'lost' || card.stageSlug === 'lost') return 'neutral';
  if (card.stageSlug === 'new_inquiry') return 'warning';
  return 'info';
}

function sourceTone(card: PipelineCard): WorkItemTone {
  return isLandingInquiry(card) ? 'info' : 'neutral';
}

function SortLabel({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sortKey === column;
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : null;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'inline-flex items-center gap-0.5 uppercase tracking-wide hover:text-gray-800',
        align === 'right' && 'w-full justify-end',
        active ? 'text-gray-800' : 'text-gray-500'
      )}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
    </button>
  );
}

export default function InquiriesClient({ initialCards, board }: InquiriesClientProps) {
  const [cards, setCards] = useState(initialCards);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [stageFilter, setStageFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<PipelineCard | null>(null);
  const [sliderIn, setSliderIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullRecord, setFullRecord] = useState(false);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);

  const stages = board.stages || [];

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/pipeline/boards?slug=onboarding&sync=0&_=${Date.now()}`,
      { cache: 'no-store', credentials: 'include' }
    );
    const result = await response.json();
    if (result.success && Array.isArray(result.data?.cards)) {
      setCards(result.data.cards as PipelineCard[]);
    }
  }, []);

  useEffect(() => {
    void fetch('/api/pipeline/assignees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAssignees(json.data.assignees || []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, sourceFilter, stageFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'name' || key === 'id' || key === 'assignee' || key === 'status' ? 'asc' : 'desc');
  };

  useEffect(() => {
    if (!selected) {
      setSliderIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setSliderIn(true));
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  const newCount = cards.filter((card) => card.stageSlug === 'new_inquiry').length;
  const inProgressCount = cards.filter(
    (card) =>
      card.cardStatus === 'open' &&
      !card.stageIsWon &&
      card.stageSlug !== 'new_inquiry' &&
      card.stageSlug !== 'lost'
  ).length;
  const signedCount = cards.filter(
    (card) => card.stageIsWon || card.stageSlug === 'lease_signed'
  ).length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const stageRank = (card: PipelineCard) => {
      if (card.stageSlug === 'new_inquiry') return 0;
      if (card.cardStatus === 'lost' || card.stageSlug === 'lost') return 200;
      if (card.stageIsWon || card.stageSlug === 'lease_signed') return 100;
      const index = stages.findIndex((stage) => stage.id === card.stageId);
      return index < 0 ? 50 : index + 1;
    };
    const direction = sortDir === 'asc' ? 1 : -1;
    const compareText = (left: string, right: string) =>
      left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });

    return cards
      .filter((card) => {
        if (sourceFilter === 'website' && !isLandingInquiry(card)) return false;
        if (sourceFilter === 'walk-in' && isLandingInquiry(card)) return false;
        if (stageFilter && card.stageId !== stageFilter) return false;

        if (!needle) return true;
        const ticket = formatInquiryTicketNumber(card.id).toLowerCase();
        const haystack = [
          ticket,
          inquiryContactName(card),
          card.contactEmail,
          card.contactPhone,
          card.buildingName,
          card.roomNumber,
          card.notes,
          card.title,
          card.source,
          card.stageName,
          ...(card.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'id') {
          cmp = compareText(formatInquiryTicketNumber(a.id), formatInquiryTicketNumber(b.id));
        } else if (sortKey === 'name') {
          cmp = compareText(inquiryContactName(a), inquiryContactName(b));
          if (cmp === 0) cmp = compareText(inquiryPropertyLabel(a), inquiryPropertyLabel(b));
        } else if (sortKey === 'status') {
          cmp = stageRank(a) - stageRank(b);
          if (cmp === 0) {
            cmp = compareText(a.stageName || '', b.stageName || '');
          }
        } else if (sortKey === 'assignee') {
          cmp = compareText(a.assignedToName || 'Unassigned', b.assignedToName || 'Unassigned');
        } else {
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (cmp !== 0) return cmp * direction;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [cards, query, sourceFilter, stageFilter, sortDir, sortKey, stages]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageCards = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openTicket = (card: PipelineCard) => {
    setSelected(card);
  };

  const closeTicket = () => setSelected(null);

  const handleTicketSaved = (updated?: PipelineCard) => {
    if (updated) {
      setCards((prev) => prev.map((card) => (card.id === updated.id ? updated : card)));
      setSelected(updated);
    }
    void refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inquiry Tickets"
        description="Synced with the Onboarding pipeline — website leads, walk-ins, and every stage through lease signed"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/tasks?board=onboarding">
              <Button variant="outline" leftIcon={<LayoutGrid className="h-4 w-4" />}>
                Open pipeline
              </Button>
            </Link>
            <Button type="button" onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add opportunity
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total tickets"
          value={cards.length}
          footer="all onboarding cards"
          icon={<MessageSquare className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="New inquiry"
          value={newCount}
          footer="awaiting action"
          icon={<AlertCircle className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="In progress"
          value={inProgressCount}
          footer="viewing through signature"
          icon={<Clock className="h-8 w-8 text-slate-600" />}
        />
        <ListSummaryCard
          title="Lease signed"
          value={signedCount}
          footer="closed won"
          icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
        />
      </div>

      <FilterBar
        columns={2}
        className="mb-0"
        collapsible
        activeCount={[stageFilter, sourceFilter !== 'all' ? sourceFilter : ''].filter(Boolean).length}
        search={
          <SearchInput
            id="inquiry-search"
            placeholder="Ticket, name, email, property…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search inquiry tickets"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {filtered.length} of {cards.length} tickets
          </p>
        }
      >
        <FormField label="Stage" htmlFor="inquiry-stage">
          <Select
            id="inquiry-stage"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="">All stages</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Source" htmlFor="inquiry-source">
          <Select
            id="inquiry-source"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
          >
            <option value="all">All sources</option>
            <option value="website">Website</option>
            <option value="walk-in">Walk-in / other</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard>
        <WorkItemHeader
          id={
            <SortLabel
              label="ID"
              column="id"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          }
          title={
            <SortLabel
              label="Name"
              column="name"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          }
          status={
            <SortLabel
              label="Status"
              column="status"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              align="right"
            />
          }
          date={
            <SortLabel
              label="Date"
              column="date"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              align="right"
            />
          }
          meta={
            <SortLabel
              label="Assignee"
              column="assignee"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              align="right"
            />
          }
        />
        {filtered.length === 0 ? (
          <EmptyState
            title="No inquiry tickets found"
            description="Try adjusting your search or filters. Landing-page forms and Add opportunity both create tickets here."
          />
        ) : (
          <>
            <div>
              {pageCards.map((card) => {
                const name = inquiryContactName(card);
                const location = inquiryPropertyLabel(card);
                const tone = stageTone(card);
                return (
                  <WorkItemRow
                    key={card.id}
                    onClick={() => openTicket(card)}
                    idLabel={formatInquiryTicketNumber(card.id)}
                    title={name}
                    subtitle={location}
                    badges={[
                      {
                        key: 'stage',
                        label: card.stageName || 'Inquiry',
                        tone,
                      },
                      {
                        key: 'source',
                        label: formatPipelineLeadSource(card.source),
                        tone: sourceTone(card),
                      },
                    ]}
                    date={formatShortDate(card.createdAt)}
                    metaLabel={card.stageName || 'Inquiry'}
                    metaDetail={card.assignedToName || 'Unassigned'}
                    metaTone={
                      tone === 'success' ? 'muted' : tone === 'warning' ? 'warning' : 'default'
                    }
                    dotTone={tone}
                    trailingIcon={<ChevronRight className="h-4 w-4 text-gray-400" />}
                  />
                );
              })}
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </TableCard>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-300 lg:left-[var(--admin-sidebar-width,16rem)] ${
              sliderIn ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeTicket}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-end lg:left-[var(--admin-sidebar-width,16rem)]">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="inquiry-ticket-slider-title"
              className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-white text-gray-900 shadow-2xl transition-transform duration-300 ease-out lg:w-[min(96%,52rem)] lg:rounded-l-2xl ${
                sliderIn ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex-shrink-0 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <button
                      type="button"
                      onClick={closeTicket}
                      className="mt-0.5 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <InquiryTicketHeader card={selected} />
                  </div>
                  <button
                    type="button"
                    onClick={closeTicket}
                    className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <InquiryTicketAssist
                key={selected.id}
                card={selected}
                board={board}
                assignees={assignees}
                onClose={closeTicket}
                onSaved={handleTicketSaved}
                onOpenFullRecord={() => setFullRecord(true)}
              />
            </div>
          </div>
        </div>
      )}

      <AddOpportunityModal
        isOpen={creating}
        board={board}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          void refresh();
        }}
        onSaved={() => {
          setCreating(false);
          void refresh();
        }}
      />

      <AddOpportunityModal
        isOpen={fullRecord && Boolean(selected)}
        board={board}
        card={selected}
        onClose={() => setFullRecord(false)}
        onCreated={() => {
          setFullRecord(false);
          void refresh();
        }}
        onSaved={(updated) => {
          if (updated) {
            setCards((prev) => prev.map((card) => (card.id === updated.id ? updated : card)));
            setSelected(updated);
          }
          setFullRecord(false);
          void refresh();
        }}
      />
    </div>
  );
}
