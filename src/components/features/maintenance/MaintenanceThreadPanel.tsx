'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { Star, X } from 'lucide-react';
import { FormField } from '@/components/forms/FormField';
import { Textarea } from '@/components/ui/Textarea';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import { MaintenanceReactionBar } from '@/components/features/maintenance/MaintenanceReactionBar';
import { cn } from '@/lib/utils';

export interface MaintenanceThreadUpdate {
  id: string;
  authorRole: string;
  authorName?: string;
  body: string;
  updateType: string;
  rating?: number;
  photoUrl?: string;
  photoFileName?: string;
  createdAt: string;
  reactions?: {
    like: number;
    heart: number;
    myReaction: 'like' | 'heart' | null;
  };
}

export interface MaintenanceThreadPersistFields {
  status?: string;
  priority?: string;
  assignedTo?: string | null;
  scheduledDate?: string | null;
  completedDate?: string | null;
  notes?: string;
}

export interface MaintenanceThreadSaveResult {
  mode: 'posted' | 'fields-only';
  updates?: MaintenanceThreadUpdate[];
  request?: {
    status?: string;
    priority?: string;
    assignedTo?: string | null;
    scheduledDate?: string | null;
    completedDate?: string | null;
    notes?: string | null;
  };
}

export interface MaintenanceThreadHandle {
  /** Save fields + optional reply/photo in one step (posts & notifies when reply present). */
  save: (
    fields: MaintenanceThreadPersistFields
  ) => Promise<MaintenanceThreadSaveResult>;
  hasDraft: () => boolean;
}

interface MaintenanceThreadPanelProps {
  requestId: string;
  /** Optional defaults for board-style standalone Post button */
  fields?: MaintenanceThreadPersistFields;
  disabled?: boolean;
  className?: string;
  /** Hide inner Post update button when parent Save Changes owns submit */
  hideSubmitButton?: boolean;
  onPosted?: (payload: MaintenanceThreadSaveResult) => void;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function updateTypeLabel(type: string) {
  switch (type) {
    case 'status_change':
      return 'Status';
    case 'acknowledgement':
      return 'Acknowledged';
    case 'feedback':
      return 'Feedback';
    case 'closed':
      return 'Closed';
    case 'reply':
      return 'Reply';
    default:
      return 'Update';
  }
}

function appendFields(form: FormData, fields: MaintenanceThreadPersistFields) {
  if (fields.status != null) form.append('status', fields.status);
  if (fields.priority != null) form.append('priority', fields.priority);
  if ('assignedTo' in fields) form.append('assignedTo', fields.assignedTo || '');
  if ('scheduledDate' in fields) {
    form.append('scheduledDate', fields.scheduledDate || '');
  }
  if ('completedDate' in fields) {
    form.append('completedDate', fields.completedDate || '');
  }
  if ('notes' in fields) form.append('notes', fields.notes ?? '');
}

/**
 * Shared conversation thread. Parent can call ref.save(fields) so one Save Changes
 * persists form fields + reply and notifies the tenant when a reply is included.
 */
export const MaintenanceThreadPanel = forwardRef<
  MaintenanceThreadHandle,
  MaintenanceThreadPanelProps
>(function MaintenanceThreadPanel(
  {
    requestId,
    fields,
    disabled,
    className,
    hideSubmitButton = false,
    onPosted,
  },
  ref
) {
  const [updates, setUpdates] = useState<MaintenanceThreadUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reactionBusyId, setReactionBusyId] = useState<string | null>(null);

  const clearPhoto = useCallback(() => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPhoto(null);
  }, []);

  const load = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/maintenance/${encodeURIComponent(requestId)}/updates`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load conversation');
      }
      setUpdates((json.data || []) as MaintenanceThreadUpdate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const toggleReaction = async (
    updateId: string,
    reaction: 'like' | 'heart'
  ) => {
    setReactionBusyId(updateId);
    try {
      const res = await fetch(`/api/maintenance/updates/${updateId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not update reaction');
      }
      const nextReactions = json.data.reactions as {
        like: number;
        heart: number;
        myReaction: 'like' | 'heart' | null;
      };
      setUpdates((prev) =>
        prev.map((u) =>
          u.id === updateId ? { ...u, reactions: nextReactions } : u
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reaction failed');
    } finally {
      setReactionBusyId(null);
    }
  };

  const postWithFields = useCallback(
    async (
      nextFields: MaintenanceThreadPersistFields
    ): Promise<MaintenanceThreadSaveResult> => {
      if (disabled) {
        throw new Error('This request is closed');
      }

      const hasReply = Boolean(note.trim() || photo);
      if (!hasReply) {
        return { mode: 'fields-only' };
      }

      setSaving(true);
      setError(null);
      try {
        const form = new FormData();
        if (note.trim()) form.append('body', note.trim());
        appendFields(form, nextFields);
        if (photo) form.append('photo', photo);

        const res = await fetch(
          `/api/maintenance/${encodeURIComponent(requestId)}/updates`,
          { method: 'POST', body: form }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to post update');
        }

        const nextUpdates = Array.isArray(json.data?.updates)
          ? (json.data.updates as MaintenanceThreadUpdate[])
          : null;
        if (nextUpdates) {
          setUpdates(nextUpdates);
        } else {
          await load();
        }
        setNote('');
        clearPhoto();

        const result: MaintenanceThreadSaveResult = {
          mode: 'posted',
          updates: nextUpdates || updates,
          request: json.data?.request,
        };
        onPosted?.(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to post update';
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [clearPhoto, disabled, load, note, onPosted, photo, requestId, updates]
  );

  useImperativeHandle(
    ref,
    () => ({
      save: postWithFields,
      hasDraft: () => Boolean(note.trim() || photo),
    }),
    [note, photo, postWithFields]
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Conversation</h3>
        <p className="text-xs text-gray-500">
          {hideSubmitButton
            ? 'Optional reply for the tenant — saved with Save Changes.'
            : 'One Post update saves status, assignee, and your reply (tenant notified).'}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading conversation…</p>
      ) : updates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
          No updates yet. Add a reply below if needed.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {updates.map((u) => (
            <li
              key={u.id}
              className={cn(
                'rounded-lg border px-3 py-2',
                u.authorRole === 'tenant'
                  ? 'border-emerald-100 bg-emerald-50/40'
                  : 'border-gray-200 bg-white'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-700">
                  {u.authorName || u.authorRole} · {updateTypeLabel(u.updateType)}
                </p>
                <p className="text-xs text-gray-500">{formatDate(u.createdAt)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{u.body}</p>
              {u.rating != null && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {u.rating}/5
                </p>
              )}
              {u.photoUrl && (
                <div className="mt-2">
                  <LightboxImage
                    src={u.photoUrl}
                    alt={u.photoFileName || 'Progress photo'}
                    title={u.photoFileName || 'Progress photo'}
                    wrapperClassName="block overflow-hidden rounded-md"
                    className="h-24 w-auto max-w-full object-cover"
                  />
                </div>
              )}
              <MaintenanceReactionBar
                updateId={u.id}
                reactions={
                  u.reactions || { like: 0, heart: 0, myReaction: null }
                }
                disabled={reactionBusyId === u.id}
                onToggle={(id, reaction) => void toggleReaction(id, reaction)}
              />
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <FormField
            label="Reply / progress update"
            htmlFor={`thread-note-${requestId}`}
          >
            <Textarea
              id={`thread-note-${requestId}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Will fix tomorrow · Parts ordered · Work completed…"
            />
          </FormField>
          <div className="flex flex-wrap items-start gap-3">
            <TakePhotoButton
              disabled={saving}
              onCapture={(file) => {
                if (preview) URL.revokeObjectURL(preview);
                setPhoto(file);
                setPreview(URL.createObjectURL(file));
              }}
              title="Attach progress photo"
              description="Optional photo for the tenant."
              fileNamePrefix="maintenance-progress"
            />
            {preview && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Progress preview"
                  className="h-16 w-16 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {!hideSubmitButton && (
              <button
                type="button"
                className="ml-auto inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                disabled={saving || (!note.trim() && !photo)}
                onClick={() => {
                  if (!fields) {
                    setError('Missing form fields');
                    return;
                  }
                  void postWithFields(fields);
                }}
              >
                {saving ? 'Posting…' : 'Post update'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
