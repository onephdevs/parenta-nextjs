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
  MaintenanceDiscussionHeader,
  MaintenanceDiscussionMessage,
  type DiscussionMessage,
} from '@/components/features/maintenance/MaintenanceDiscussion';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import { formatMaintenanceCategory } from '@/lib/constants/maintenance';

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
  attachments?: MaintenancePhoto[];
  updates?: MaintenanceUpdateItem[];
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
  const [replyDraft, setReplyDraft] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [showClosePanel, setShowClosePanel] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [reactionBusyId, setReactionBusyId] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/maintenance/${requestId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Request not found');
      }
      setRequest(data.data as MaintenanceRequestDetail);
    } catch (error) {
      setRequest(null);
      showNotification({
        type: 'error',
        title: 'Unable to load',
        message: error instanceof Error ? error.message : 'Request not found',
      });
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

  const runTenantAction = async (
    action: 'acknowledge' | 'feedback' | 'close' | 'reply'
  ) => {
    if (!requestId) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/tenant/maintenance/${requestId}`, {
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
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed');
      }
      showNotification({
        type: 'success',
        title:
          action === 'close'
            ? 'Request closed'
            : action === 'acknowledge'
              ? 'Service acknowledged'
              : action === 'reply'
                ? 'Reply sent'
                : 'Feedback sent',
        message: data.message || 'Update saved',
      });
      setReplyDraft('');
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
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
          <Link
            href="/tenant/maintenance"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to requests
          </Link>
          <div className={theme.cardPad}>
            <p className={theme.muted}>This maintenance request was not found.</p>
          </div>
        </main>
      </div>
    );
  }

  const isClosed = ['closed', 'cancelled'].includes(
    String(request.status).toLowerCase()
  );

  const discussionMessages: DiscussionMessage[] = [
    {
      id: `seed-${request.id}`,
      authorName: 'You',
      authorRole: 'tenant',
      body: [request.title, request.description].filter(Boolean).join('\n\n'),
      createdAt: request.createdAt,
      photos: (request.attachments || []).map((a) => ({
        url: a.url,
        fileName: a.fileName,
      })),
      isSeed: true,
    },
    ...(request.updates || []).map((u) => ({
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
    })),
  ];

  return (
    <div className={theme.page}>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <Link
          href="/tenant/maintenance"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </Link>

        <div className={cn(theme.formPanel, 'overflow-hidden p-4 sm:p-6')}>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={cn('text-2xl font-semibold', theme.shellHeader)}>
              {request.title}
            </h1>
            <MaintenanceStatusBadge status={request.status} />
            <MaintenancePriorityBadge priority={request.priority} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div>
              <span className="font-medium">Category:</span>{' '}
              {formatMaintenanceCategory(request.category)}
            </div>
            <div>
              <span className="font-medium">Created:</span>{' '}
              {formatDate(request.createdAt)}
            </div>
            <div>
              <span className="font-medium">Last updated:</span>{' '}
              {formatDate(request.updatedAt)}
            </div>
          </div>

          {(request.roomNumber || request.buildingName) && (
            <p className={cn('mt-2 text-sm', theme.muted)}>
              {[request.buildingName, request.roomNumber && `Room ${request.roomNumber}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          {request.scheduledDate && (
            <div className="mt-2 text-sm text-blue-600">
              <Calendar className="mr-1 inline h-4 w-4" />
              <span className="font-medium">Scheduled:</span>{' '}
              {formatDate(request.scheduledDate)}
            </div>
          )}
          {request.completedDate && (
            <div className="mt-2 text-sm text-green-600">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />
              <span className="font-medium">Completed:</span>{' '}
              {formatDate(request.completedDate)}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="px-4 pt-4">
              <MaintenanceDiscussionHeader
                title="Discussion"
                status={request.status}
              />
            </div>

            <div className="px-4 py-3">
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
              <div className="space-y-3 px-4 pb-4">
                <MaintenanceDiscussionComposer
                  value={replyDraft}
                  onChange={setReplyDraft}
                  disabled={isPreview}
                  saving={actionBusy}
                  placeholder="Add a comment"
                  onSend={() => void runTenantAction('reply')}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isDisabled={actionBusy || isPreview}
                    onClick={() => void runTenantAction('acknowledge')}
                  >
                    Acknowledge service
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    isDisabled={actionBusy || isPreview}
                    onClick={() => setShowClosePanel((v) => !v)}
                  >
                    Close request…
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
                    <FormField label="Rating" htmlFor="close-rating">
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
        </div>
      </main>
    </div>
  );
}
