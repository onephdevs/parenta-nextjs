'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Button,
  Select,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import {
  MaintenanceDiscussionComposer,
  MaintenanceDiscussionMessage,
  type DiscussionMessage,
} from '@/components/features/maintenance/MaintenanceDiscussion';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import {
  formatMaintenanceCategory,
  formatMaintenanceTicketNumber,
} from '@/lib/constants/maintenance';

interface MaintenancePhoto {
  id: string;
  fileName?: string;
  url: string;
  mimeType?: string;
}

interface MaintenanceUpdateItem {
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

interface MaintenanceRequestDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  roomNumber?: string;
  buildingName?: string;
  tenantAvatarUrl?: string | null;
  attachments?: MaintenancePhoto[];
  updates?: MaintenanceUpdateItem[];
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}

function customerDisplayName(session: {
  user?: { firstName?: string | null; lastName?: string | null };
} | null): string {
  return [session?.user?.firstName, session?.user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

export default function TenantMaintenanceDetailPage() {
  const params = useParams();
  const requestId = String(params?.id || '');
  const { data: session, status } = useSession();
  const { canAccess, isPreview, isLoading: gateLoading } = useTenantPortalGate();
  const { invalidate } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const { showNotification } = useNotifications();

  const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'not_found' | 'unavailable' | null>(
    null
  );
  const [replyDraft, setReplyDraft] = useState('');
  const [replyPhoto, setReplyPhoto] = useState<File | null>(null);
  const [replyPhotoPreview, setReplyPhotoPreview] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [showClosePanel, setShowClosePanel] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [reactionBusyId, setReactionBusyId] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setLoadError(null);
    const maxAttempts = 3;
    let lastMessage = 'Failed to load ticket';

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const res = await fetch(`/api/tenant/maintenance/${requestId}`, {
            credentials: 'include',
            cache: 'no-store',
          });
          let data: {
            success?: boolean;
            error?: string;
            retryable?: boolean;
            data?: MaintenanceRequestDetail;
          } = {};
          try {
            data = await res.json();
          } catch {
            data = {};
          }

          if (res.status === 404) {
            setRequest(null);
            setLoadError('not_found');
            return;
          }

          if (!res.ok || !data.success || !data.data) {
            const retryable =
              Boolean(data.retryable) || res.status === 503 || res.status >= 500;
            lastMessage = data.error || 'Failed to load ticket';
            if (retryable && attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
              continue;
            }
            setLoadError('unavailable');
            showNotification({
              type: 'error',
              title: 'Unable to load',
              message: lastMessage,
            });
            return;
          }

          setRequest(data.data);
          setLoadError(null);
          return;
        } catch (error) {
          lastMessage =
            error instanceof Error ? error.message : 'Failed to load ticket';
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
            continue;
          }
          setLoadError('unavailable');
          showNotification({
            type: 'error',
            title: 'Unable to load',
            message: lastMessage,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [requestId, showNotification]);

  useEffect(() => {
    if (gateLoading || status === 'loading') return;
    if (canAccess) {
      void loadRequest();
      return;
    }
    if (status === 'unauthenticated') {
      router.push('/auth/signin?role=tenant');
    }
  }, [status, session, router, canAccess, gateLoading, loadRequest]);

  const attachReplyPhoto = (file: File) => {
    setReplyPhoto(file);
    setReplyPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearReplyPhoto = () => {
    setReplyPhoto(null);
    setReplyPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (replyPhotoPreview) URL.revokeObjectURL(replyPhotoPreview);
    };
  }, [replyPhotoPreview]);

  const runTenantAction = async (
    action: 'acknowledge' | 'feedback' | 'close' | 'reply'
  ) => {
    if (!requestId) return;
    setActionBusy(true);
    try {
      let res: Response;
      if (action === 'reply') {
        const form = new FormData();
        form.append('action', 'reply');
        if (replyDraft.trim()) form.append('note', replyDraft.trim());
        if (replyPhoto) form.append('photo', replyPhoto);
        res = await fetch(`/api/tenant/maintenance/${requestId}`, {
          method: 'PATCH',
          body: form,
        });
      } else {
        res = await fetch(`/api/tenant/maintenance/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            note: replyDraft.trim() || undefined,
            rating:
              action === 'feedback' || action === 'close'
                ? Number(feedbackRating)
                : undefined,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed');
      }
      showNotification({
        type: 'success',
        title:
          action === 'close'
            ? 'Ticket closed'
            : action === 'acknowledge'
              ? 'Service confirmed'
              : action === 'reply'
                ? 'Reply sent'
                : 'Feedback sent',
        message: data.message || 'Update saved',
      });
      setReplyDraft('');
      clearReplyPhoto();
      setShowClosePanel(false);
      invalidate('maintenance');
      if (Array.isArray(data.data?.updates)) {
        setRequest((prev) =>
          prev
            ? {
                ...prev,
                status: data.data.status || prev.status,
                updates: data.data.updates,
              }
            : prev
        );
      } else {
        await loadRequest();
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const toggleReaction = async (
    updateId: string,
    reaction: 'like' | 'heart'
  ) => {
    if (isPreview) return;
    setReactionBusyId(updateId);
    try {
      const res = await fetch(`/api/maintenance/updates/${updateId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not update reaction');
      }
      const nextReactions = data.data.reactions as {
        like: number;
        heart: number;
        myReaction: 'like' | 'heart' | null;
      };
      setRequest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          updates: (prev.updates || []).map((u) =>
            u.id === updateId ? { ...u, reactions: nextReactions } : u
          ),
        };
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Reaction failed',
        message: error instanceof Error ? error.message : 'Try again',
      });
    } finally {
      setReactionBusyId(null);
    }
  };

  if (status === 'loading' || gateLoading || loading) {
    return <TenantPageSkeleton variant="list" />;
  }

  if (!canAccess) return null;

  if (!request) {
    return (
      <div className={theme.page}>
        <main className={theme.pagePad}>
          <Link
            href="/tenant/maintenance"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            All tickets
          </Link>
          <div className={theme.cardPad}>
            {loadError === 'unavailable' ? (
              <div className="space-y-3">
                <p className={theme.muted}>
                  Couldn&apos;t load this ticket right now. The office may still
                  be saving an update.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void loadRequest()}
                  className={theme.primaryButton}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <p className={theme.muted}>This ticket was not found.</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  const isClosed = ['closed', 'cancelled'].includes(
    String(request.status).toLowerCase()
  );

  const customerName = customerDisplayName(session);

  const discussionMessages: DiscussionMessage[] = [
    {
      id: `seed-${request.id}`,
      authorName: 'You',
      avatarName: customerName || undefined,
      avatarUrl: request.tenantAvatarUrl || undefined,
      authorRole: 'tenant',
      body: request.description || request.title,
      createdAt: request.createdAt,
      photos: (request.attachments || []).map((a) => ({
        url: a.url,
        fileName: a.fileName,
      })),
      isSeed: true,
    },
    ...(request.updates || []).map((u) => ({
      id: u.id,
      authorName: u.authorRole === 'tenant' ? 'You' : u.authorName || u.authorRole,
      avatarName:
        u.authorRole === 'tenant' ? customerName || undefined : u.authorName,
      avatarUrl:
        u.authorRole === 'tenant' ? request.tenantAvatarUrl || undefined : undefined,
      authorRole: u.authorRole,
      body: u.body,
      createdAt: u.createdAt,
      updateType: u.updateType,
      rating: u.rating,
      photoUrl: u.photoUrl,
      photoFileName: u.photoFileName,
      reactions: u.reactions,
    })),
  ];

  const locationLabel = [
    request.buildingName,
    request.roomNumber && `Room ${request.roomNumber}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const openedAt = formatDate(request.createdAt);
  const updatedAt = formatDate(request.updatedAt);
  const showUpdated = Boolean(
    request.updatedAt &&
      request.createdAt &&
      Math.abs(new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime()) >
        60_000
  );
  const metaParts = [
    formatMaintenanceCategory(request.category),
    locationLabel,
    openedAt !== '—' ? `Opened ${openedAt}` : null,
    showUpdated ? `Updated ${updatedAt}` : null,
  ].filter(Boolean);

  return (
    <div className={theme.page}>
      <main className={theme.pagePad}>
        <Link
          href="/tenant/maintenance"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          All tickets
        </Link>

        <div className={cn(theme.formPanel, 'overflow-hidden')}>
          <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-gray-400">
                  {formatMaintenanceTicketNumber(request.id)}
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">
                  {request.title}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MaintenanceStatusBadge status={request.status} />
                <MaintenancePriorityBadge priority={request.priority} />
              </div>
            </div>
            {metaParts.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">{metaParts.join(' · ')}</p>
            )}
            {request.scheduledDate && (
              <p className="mt-2 text-sm text-sky-600">
                <Calendar className="mr-1 inline h-4 w-4" />
                Visit scheduled {formatDate(request.scheduledDate)}
              </p>
            )}
            {request.completedDate && (
              <p className="mt-2 text-sm text-emerald-600">
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                Completed {formatDate(request.completedDate)}
              </p>
            )}
          </div>

          <div className="px-4 py-4 sm:px-5">
            {discussionMessages.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500">
                No messages yet.
              </p>
            ) : (
              <div>
                {discussionMessages.map((message, index) => (
                  <MaintenanceDiscussionMessage
                    key={message.id}
                    message={message}
                    isLast={index === discussionMessages.length - 1}
                    reactionBusy={reactionBusyId === message.id}
                    reactionsDisabled={isPreview}
                    onToggleReaction={(id, reaction) =>
                      void toggleReaction(id, reaction)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {!isClosed && (
            <div className="space-y-3 px-4 pb-4 sm:px-5">
              <MaintenanceDiscussionComposer
                value={replyDraft}
                onChange={setReplyDraft}
                disabled={isPreview}
                saving={actionBusy}
                placeholder="Reply to the office…"
                onSend={() => void runTenantAction('reply')}
                onAttach={attachReplyPhoto}
                onClearPhoto={clearReplyPhoto}
                photoPreview={replyPhotoPreview}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isDisabled={actionBusy || isPreview}
                  onClick={() => void runTenantAction('acknowledge')}
                >
                  Confirm this was fixed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isDisabled={actionBusy || isPreview}
                  onClick={() => setShowClosePanel((v) => !v)}
                >
                  Close ticket…
                </Button>
              </div>
              {showClosePanel && (
                <div className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-3">
                  <FormField label="Closing note (optional)" htmlFor="close-note">
                    <textarea
                      id="close-note"
                      rows={2}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Optional note when closing…"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </FormField>
                  <FormField label="How did we do?" htmlFor="close-rating">
                    <Select
                      id="close-rating"
                      value={feedbackRating}
                      onChange={(e) => setFeedbackRating(e.target.value)}
                    >
                      <option value="5">5 — Excellent</option>
                      <option value="4">4 — Good</option>
                      <option value="3">3 — Okay</option>
                      <option value="2">2 — Poor</option>
                      <option value="1">1 — Very poor</option>
                    </Select>
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      isDisabled={actionBusy || isPreview}
                      onClick={() => void runTenantAction('close')}
                    >
                      Confirm close
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      isDisabled={actionBusy}
                      onClick={() => {
                        setShowClosePanel(false);
                        setReplyDraft('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
