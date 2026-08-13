'use client';

import { ReactNode } from 'react';
import {
  ArrowUp,
  Paperclip,
  Star,
  Wrench,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import { MaintenanceReactionBar } from '@/components/features/maintenance/MaintenanceReactionBar';
import { cn } from '@/lib/utils';

export interface DiscussionPhoto {
  url: string;
  fileName?: string;
}

export interface DiscussionMessage {
  id: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
  updateType?: string;
  rating?: number;
  photoUrl?: string;
  photoFileName?: string;
  photos?: DiscussionPhoto[];
  reactions?: {
    like: number;
    heart: number;
    myReaction: 'like' | 'heart' | null;
  };
  /** First message in thread (original request) */
  isSeed?: boolean;
}

function formatAbsolute(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return formatAbsolute(value);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatAbsolute(value);
}

export function discussionStatusLabel(status?: string | null): {
  label: string;
  dotClass: string;
  textClass: string;
} {
  const key = String(status || '').toLowerCase();
  if (key === 'in_progress') {
    return {
      label: 'In progress',
      dotClass: 'bg-sky-500',
      textClass: 'text-sky-700',
    };
  }
  if (key === 'completed' || key === 'closed') {
    return {
      label: 'Resolved',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
    };
  }
  if (key === 'cancelled') {
    return {
      label: 'Cancelled',
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-600',
    };
  }
  return {
    label: 'Awaiting response',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-600',
  };
}

function roleBadge(authorRole: string): { label: string; className: string } | null {
  const role = authorRole.toLowerCase();
  if (role === 'admin' || role === 'staff') {
    return {
      label: role === 'admin' ? 'ADMIN' : 'STAFF',
      className: 'bg-slate-100 text-slate-700',
    };
  }
  if (role === 'system') {
    return { label: 'SYSTEM', className: 'bg-slate-100 text-slate-600' };
  }
  return null;
}

function updateTypeHint(type?: string): string | null {
  switch (type) {
    case 'status_change':
      return 'updated status';
    case 'acknowledgement':
      return 'acknowledged';
    case 'feedback':
      return 'left feedback';
    case 'closed':
      return 'closed the request';
    case 'reply':
      return 'commented';
    default:
      return type ? 'commented' : null;
  }
}

export function MaintenanceDiscussionHeader({
  title = 'Discussion',
  status,
  trailing,
}: {
  title?: string;
  status?: string | null;
  trailing?: ReactNode;
}) {
  const statusMeta = discussionStatusLabel(status);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
          <Wrench className="h-3.5 w-3.5" />
        </div>
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium',
            statusMeta.textClass
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dotClass)} />
          {statusMeta.label}
        </span>
      </div>
      {trailing}
    </div>
  );
}

export function MaintenanceDiscussionMessage({
  message,
  isLast,
  reactionBusy,
  reactionsDisabled,
  onToggleReaction,
}: {
  message: DiscussionMessage;
  isLast?: boolean;
  reactionBusy?: boolean;
  reactionsDisabled?: boolean;
  onToggleReaction?: (
    updateId: string,
    reaction: 'like' | 'heart'
  ) => void;
}) {
  const badge = roleBadge(message.authorRole);
  const action = message.isSeed
    ? 'requested'
    : updateTypeHint(message.updateType) || 'commented';
  const isOffice =
    message.authorRole === 'admin' ||
    message.authorRole === 'staff' ||
    message.authorRole === 'system';

  const photos: DiscussionPhoto[] = [
    ...(message.photos || []),
    ...(message.photoUrl
      ? [{ url: message.photoUrl, fileName: message.photoFileName }]
      : []),
  ];

  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <div
          className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200"
          aria-hidden
        />
      )}
      <div className="relative z-[1] shrink-0">
        {isOffice ? (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full',
              message.authorRole === 'system'
                ? 'bg-slate-200 text-slate-600'
                : 'bg-slate-900 text-white'
            )}
            aria-label={message.authorName}
          >
            <Wrench className="h-3.5 w-3.5" />
          </div>
        ) : (
          <Avatar
            name={message.authorName}
            size="sm"
            className="h-8 w-8 bg-emerald-600 text-[10px]"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-800">{message.authorName}</span>
          {badge && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
                badge.className
              )}
            >
              {badge.label}
            </span>
          )}
          <span>{action}</span>
          <span aria-hidden>•</span>
          <span title={formatAbsolute(message.createdAt)}>
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>

        {message.body && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
            {message.body}
          </p>
        )}

        {message.rating != null && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <Star className="h-3.5 w-3.5 fill-current" />
            {message.rating}/5
          </p>
        )}

        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((photo, idx) => (
              <LightboxImage
                key={`${photo.url}-${idx}`}
                src={photo.url}
                alt={photo.fileName || 'Attachment'}
                title={photo.fileName || 'Attachment'}
                wrapperClassName="block overflow-hidden rounded-lg border border-gray-200"
                className="h-24 w-auto max-w-full object-cover"
              />
            ))}
          </div>
        )}

        {message.reactions && onToggleReaction && !message.isSeed && (
          <MaintenanceReactionBar
            updateId={message.id}
            reactions={message.reactions}
            disabled={reactionsDisabled || reactionBusy}
            onToggle={onToggleReaction}
          />
        )}
      </div>
    </div>
  );
}

export function MaintenanceDiscussionComposer({
  value,
  onChange,
  onSend,
  onAttach,
  onClearPhoto,
  photoPreview,
  disabled,
  saving,
  hideSendButton,
  placeholder = 'Add a comment',
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  onAttach?: (file: File) => void;
  onClearPhoto?: () => void;
  photoPreview?: string | null;
  disabled?: boolean;
  saving?: boolean;
  hideSendButton?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const canSend = Boolean(value.trim() || photoPreview) && !saving && !disabled;

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {photoPreview && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview}
            alt="Attachment preview"
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-gray-200"
          />
          {onClearPhoto && (
            <button
              type="button"
              onClick={onClearPhoto}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2',
          disabled && 'opacity-60'
        )}
      >
        <textarea
          rows={1}
          value={value}
          disabled={disabled || saving}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !hideSendButton && canSend) {
              e.preventDefault();
              onSend?.();
            }
          }}
          placeholder={placeholder}
          className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <div className="flex shrink-0 items-center gap-1 pb-0.5">
          {onAttach && (
            <label
              className={cn(
                'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-800',
                (disabled || saving) && 'pointer-events-none opacity-50'
              )}
              title="Attach photo"
            >
              <Paperclip className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || saving}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onAttach(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          {!hideSendButton && (
            <button
              type="button"
              disabled={!canSend}
              onClick={onSend}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white transition',
                canSend
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'cursor-not-allowed bg-blue-300'
              )}
              aria-label={saving ? 'Sending' : 'Send comment'}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
