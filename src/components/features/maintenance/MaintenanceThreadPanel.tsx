'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  MaintenanceDiscussionComposer,
  MaintenanceDiscussionHeader,
  MaintenanceDiscussionMessage,
  type DiscussionMessage,
  type DiscussionPhoto,
} from '@/components/features/maintenance/MaintenanceDiscussion';
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

export interface MaintenanceThreadSeed {
  authorName: string;
  authorRole?: string;
  body: string;
  createdAt: string;
  photos?: DiscussionPhoto[];
  avatarUrl?: string | null;
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
  /** Original request shown as first timeline message */
  seedMessage?: MaintenanceThreadSeed | null;
  /** Tenant profile photo for tenant messages in the thread */
  tenantAvatarUrl?: string | null;
  /** Request status for header badge */
  status?: string | null;
  title?: string;
  /** Override the conversation scroll area (default max-h-80) */
  conversationClassName?: string;
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
    seedMessage,
    tenantAvatarUrl,
    status,
    title = 'Discussion',
    conversationClassName,
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

  const messages: DiscussionMessage[] = useMemo(() => {
    const list: DiscussionMessage[] = [];
    if (seedMessage?.body?.trim()) {
      list.push({
        id: `seed-${requestId}`,
        authorName: seedMessage.authorName || 'Tenant',
        authorRole: seedMessage.authorRole || 'tenant',
        body: seedMessage.body,
        createdAt: seedMessage.createdAt,
        photos: seedMessage.photos,
        avatarUrl: seedMessage.avatarUrl || tenantAvatarUrl,
        isSeed: true,
      });
    }
    for (const u of updates) {
      list.push({
        id: u.id,
        authorName: u.authorName || u.authorRole,
        authorRole: u.authorRole,
        body: u.body,
        createdAt: u.createdAt,
        updateType: u.updateType,
        rating: u.rating,
        photoUrl: u.photoUrl,
        photoFileName: u.photoFileName,
        reactions: u.reactions,
        avatarUrl: u.authorRole === 'tenant' ? tenantAvatarUrl : undefined,
      });
    }
    return list;
  }, [requestId, seedMessage, tenantAvatarUrl, updates]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white',
        className
      )}
    >
      <div className="px-4 pt-4">
        <MaintenanceDiscussionHeader title={title} status={status} />
      </div>

      <div className="px-4 py-3">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="py-6 text-sm text-gray-500">Loading discussion…</p>
        ) : messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
            No messages yet. Add a comment below.
          </p>
        ) : (
          <div className={cn('overflow-y-auto pr-1', conversationClassName || 'max-h-80')}>
            {messages.map((message, index) => (
              <MaintenanceDiscussionMessage
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                reactionBusy={reactionBusyId === message.id}
                onToggleReaction={(id, reaction) =>
                  void toggleReaction(id, reaction)
                }
              />
            ))}
          </div>
        )}
      </div>

      {!disabled && (
        <div className="px-4 pb-4">
          <MaintenanceDiscussionComposer
            value={note}
            onChange={setNote}
            photoPreview={preview}
            saving={saving}
            hideSendButton={hideSubmitButton}
            hint={
              hideSubmitButton
                ? 'Reply is sent with Save Changes — tenant is notified.'
                : undefined
            }
            placeholder="Add a comment"
            onClearPhoto={clearPhoto}
            onAttach={(file) => {
              if (preview) URL.revokeObjectURL(preview);
              setPhoto(file);
              setPreview(URL.createObjectURL(file));
            }}
            onSend={() => {
              if (!fields) {
                setError('Missing form fields');
                return;
              }
              void postWithFields(fields);
            }}
          />
        </div>
      )}
    </div>
  );
});
