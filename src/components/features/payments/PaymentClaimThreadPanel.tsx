'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MaintenanceDiscussionComposer,
  MaintenanceDiscussionHeader,
  MaintenanceDiscussionMessage,
  type DiscussionMessage,
  type DiscussionPhoto,
} from '@/components/features/maintenance/MaintenanceDiscussion';
import { cn } from '@/lib/utils';
import type { PaymentClaimDetailRow } from '@/lib/format/payment-claim-display';

export interface PaymentClaimUpdate {
  id: string;
  authorRole: string;
  authorName?: string;
  body: string;
  updateType?: string;
  photoUrl?: string;
  photoFileName?: string;
  createdAt: string;
}

interface PaymentClaimThreadPanelProps {
  paymentId: string;
  variant: 'admin' | 'tenant';
  status?: string | null;
  title?: string;
  disabled?: boolean;
  className?: string;
  conversationClassName?: string;
  /** Drop the card chrome so the thread can sit under existing claim details. */
  flush?: boolean;
  seedMessage?: {
    authorName: string;
    authorRole?: string;
    body?: string;
    details?: PaymentClaimDetailRow[];
    createdAt: string;
    photos?: DiscussionPhoto[];
    avatarUrl?: string | null;
  } | null;
  tenantAvatarUrl?: string | null;
  onPosted?: () => void;
}

export function PaymentClaimThreadPanel({
  paymentId,
  variant,
  status,
  title = 'Conversation',
  disabled,
  className,
  conversationClassName,
  flush = false,
  seedMessage,
  tenantAvatarUrl,
  onPosted,
}: PaymentClaimThreadPanelProps) {
  const [updates, setUpdates] = useState<PaymentClaimUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const endpoint =
    variant === 'tenant'
      ? `/api/tenant/payments/${encodeURIComponent(paymentId)}/updates`
      : `/api/payments/${encodeURIComponent(paymentId)}/updates`;

  const displayStatus =
    status === 'completed' || status === 'paid' ? 'paid' : status;

  const clearPhoto = useCallback(() => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPhoto(null);
  }, []);

  const load = useCallback(async () => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load conversation');
      }
      setUpdates((json.data || []) as PaymentClaimUpdate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, paymentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const post = async () => {
    if (disabled) return;
    if (!note.trim() && !photo) {
      setError('Add a message or photo');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      if (note.trim()) form.append('body', note.trim());
      if (photo) form.append('photo', photo);
      const res = await fetch(endpoint, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send message');
      }
      const nextUpdates = Array.isArray(json.data?.updates)
        ? (json.data.updates as PaymentClaimUpdate[])
        : null;
      if (nextUpdates) setUpdates(nextUpdates);
      else await load();
      setNote('');
      clearPhoto();
      onPosted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSaving(false);
    }
  };

  const messages: DiscussionMessage[] = useMemo(() => {
    const list: DiscussionMessage[] = [];
    if (
      seedMessage?.details?.length ||
      seedMessage?.body?.trim() ||
      (seedMessage?.photos && seedMessage.photos.length > 0)
    ) {
      list.push({
        id: `seed-${paymentId}`,
        authorName: seedMessage.authorName || 'Tenant',
        authorRole: seedMessage.authorRole || 'tenant',
        body: seedMessage.body || '',
        details: seedMessage.details,
        actionLabel: 'submitted this payment',
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
        photoUrl: u.photoUrl,
        photoFileName: u.photoFileName,
        avatarUrl: u.authorRole === 'tenant' ? tenantAvatarUrl : undefined,
      });
    }
    return list;
  }, [paymentId, seedMessage, tenantAvatarUrl, updates]);

  return (
    <div
      className={cn(
        !flush && 'overflow-hidden rounded-xl border border-gray-200 bg-white',
        className
      )}
    >
      <div className={flush ? 'pt-1' : 'px-4 pt-4'}>
        <MaintenanceDiscussionHeader title={title} status={displayStatus} />
      </div>

      <div className={flush ? 'py-3' : 'px-4 py-3'}>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="py-6 text-sm text-gray-500">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
            No messages yet. Ask a question or add a note below.
          </p>
        ) : (
          <div className={cn('overflow-y-auto pr-1', conversationClassName || 'max-h-80')}>
            {messages.map((message, index) => (
              <MaintenanceDiscussionMessage
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {!disabled && (
        <div className={flush ? 'pb-1' : 'px-4 pb-4'}>
          <MaintenanceDiscussionComposer
            value={note}
            onChange={setNote}
            photoPreview={preview}
            saving={saving}
            placeholder={
              variant === 'tenant'
                ? status === 'failed'
                  ? 'Reply to the office…'
                  : 'Ask the office about this payment…'
                : 'Message the tenant…'
            }
            onClearPhoto={clearPhoto}
            onAttach={(file) => {
              if (preview) URL.revokeObjectURL(preview);
              setPhoto(file);
              setPreview(URL.createObjectURL(file));
            }}
            onSend={() => void post()}
          />
        </div>
      )}
    </div>
  );
}
