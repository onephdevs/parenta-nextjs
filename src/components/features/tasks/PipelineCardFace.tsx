'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  MessageSquare,
  Phone,
  Tag,
  UserRoundX,
} from 'lucide-react';
import type { PipelineBoardSlug, PipelineCard, PipelineStage } from '@/types/database';
import {
  type CardFieldPair,
  fieldLabel,
  formatCardFieldValue,
} from '@/lib/pipeline/cardFields';

export interface PipelineAssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
}

interface PipelineCardFaceProps {
  card: PipelineCard;
  stage: PipelineStage;
  fieldPair: CardFieldPair;
  boardSlug?: PipelineBoardSlug | null;
  showMonthlySuffix: boolean;
  assignees: PipelineAssigneeOption[];
  onDragStart: (cardId: string) => void;
  onOpen: () => void;
  onAssign: (cardId: string, assignedTo: string | null) => void;
}

function avatarHue(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 42%)`;
}

function ActionIcon({
  label,
  count,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const showBadge = typeof count === 'number' && count > 0;
  return (
    <button
      type="button"
      title={label}
      aria-label={showBadge ? `${label} (${count})` : label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="relative rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
    >
      {children}
      {showBadge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export function PipelineCardFace({
  card,
  stage,
  fieldPair,
  boardSlug,
  showMonthlySuffix,
  assignees,
  onDragStart,
  onOpen,
  onAssign,
}: PipelineCardFaceProps) {
  const isWon = stage.isWon || card.cardStatus === 'won';
  const draggedRef = useRef(false);
  const assignRef = useRef<HTMLDivElement>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const tagCount = card.tags?.length || 0;
  const fileCount = card.documentCount || 0;
  const hasSchedule = Boolean(card.viewingAt || card.dueAt || card.nextActionAt);
  const scheduleCount = hasSchedule ? 1 : 0;
  const hasNotes = Boolean(card.notes?.trim());

  useEffect(() => {
    if (!assignOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (assignRef.current && target && !assignRef.current.contains(target)) {
        setAssignOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAssignOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [assignOpen]);

  function handleCall() {
    onOpen();
  }

  function handleMessage() {
    onOpen();
  }

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
      className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md active:cursor-grabbing ${
        isWon ? 'bg-emerald-50 border-emerald-200' : ''
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: stage.color }}
    >
      {/* Zone 1: Name + assignee */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
          {card.title}
        </p>
        <div className="relative shrink-0" ref={assignRef}>
          <button
            type="button"
            title={
              card.assignedToName
                ? `Assigned to ${card.assignedToName}`
                : 'Unassigned — click to assign'
            }
            aria-label={
              card.assignedToName
                ? `Assigned to ${card.assignedToName}`
                : 'Unassigned — assign owner'
            }
            aria-expanded={assignOpen}
            onClick={(e) => {
              e.stopPropagation();
              setAssignOpen((o) => !o);
            }}
            className={
              card.assignedTo
                ? 'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white'
                : 'flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-blue-400 hover:text-blue-600'
            }
            style={
              card.assignedTo
                ? { backgroundColor: avatarHue(card.assignedTo) }
                : undefined
            }
          >
            {card.assignedTo ? (
              card.assignedToInitials || '?'
            ) : (
              <UserRoundX className="h-3.5 w-3.5" />
            )}
          </button>

          {assignOpen && (
            <div
              role="listbox"
              aria-label="Assign owner"
              className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  onAssign(card.id, null);
                  setAssignOpen(false);
                }}
              >
                <UserRoundX className="h-3.5 w-3.5" />
                Unassigned
              </button>
              {assignees.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={card.assignedTo === user.id}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${
                    card.assignedTo === user.id
                      ? 'bg-blue-50 font-medium text-blue-800'
                      : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onAssign(card.id, user.id);
                    setAssignOpen(false);
                  }}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: avatarHue(user.id) }}
                  >
                    {user.initials}
                  </span>
                  {user.firstName} {user.lastName}
                </button>
              ))}
              {assignees.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-gray-400">No staff users found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone 2: Two configurable key-value fields */}
      <div className="mt-2 space-y-0.5">
        {fieldPair.map((key) => (
          <div key={key} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="shrink-0 text-gray-400">{fieldLabel(key)}</span>
            <span className="truncate text-right font-medium text-gray-800">
              {formatCardFieldValue(key, card, {
                monthlySuffix: showMonthlySuffix,
                boardSlug,
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Zone 3: Icon action row */}
      <div className="mt-2.5 flex items-center gap-0.5 border-t border-gray-100 pt-2">
        <ActionIcon label="Call" onClick={handleCall}>
          <Phone className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon
          label="Message"
          count={hasNotes ? 1 : undefined}
          onClick={handleMessage}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon label="Tags" count={tagCount || undefined} onClick={onOpen}>
          <Tag className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon label="Files" count={fileCount || undefined} onClick={onOpen}>
          <FileText className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon label="Tasks" onClick={onOpen}>
          <CheckSquare className="h-3.5 w-3.5" />
        </ActionIcon>
        <ActionIcon
          label="Schedule"
          count={scheduleCount || undefined}
          onClick={onOpen}
        >
          <Calendar className="h-3.5 w-3.5" />
        </ActionIcon>
      </div>
    </div>
  );
}
