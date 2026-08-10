'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Button,
  Select,
  Textarea,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { MaintenancePhotoGallery } from '@/components/features/MaintenancePhotoGallery';
import { MaintenanceReactionBar } from '@/components/features/maintenance/MaintenanceReactionBar';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import { LightboxImage } from '@/components/ui/ImageLightbox';
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

function updateTypeLabel(type: string) {
  switch (type) {
    case 'feedback':
      return 'Feedback';
    case 'acknowledgement':
      return 'Acknowledged';
    case 'closed':
      return 'Closed';
    case 'reply':
      return 'Reply';
    case 'status_change':
      return 'Status';
    default:
      return 'Update';
  }
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
          <p className={cn('mt-3 whitespace-pre-wrap', theme.body)}>
            {request.description}
          </p>

          {(request.attachments?.length || 0) > 0 && (
            <MaintenancePhotoGallery
              photos={request.attachments || []}
              className="mt-4"
            />
          )}

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
          {request.notes && (
            <div className="mt-3 rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-900">
                <MessageSquare className="mr-1 inline h-4 w-4" />
                <span className="font-medium">Notes:</span> {request.notes}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Conversation
            </p>
            {(request.updates?.length || 0) === 0 ? (
              <p className="rounded-md border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500">
                No updates yet. Office replies and your comments will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {request.updates!.map((u) => (
                  <div
                    key={u.id}
                    className={cn(
                      'rounded-md border px-3 py-2',
                      u.authorRole === 'tenant'
                        ? 'border-emerald-100 bg-emerald-50/40'
                        : 'border-gray-100 bg-gray-50'
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                      <span>
                        {u.authorName || u.authorRole} · {updateTypeLabel(u.updateType)}
                      </span>
                      <span>{formatDate(u.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                      {u.body}
                    </p>
                    {u.rating != null && (
                      <p className="mt-1 text-xs text-amber-700">
                        Rating: {u.rating}/5
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
                        u.reactions || {
                          like: 0,
                          heart: 0,
                          myReaction: null,
                        }
                      }
                      disabled={isPreview || reactionBusyId === u.id}
                      onToggle={(id, reaction) => void toggleReaction(id, reaction)}
                    />
                  </div>
                ))}
              </div>
            )}

            {!isClosed && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
                <FormField label="Write a reply" htmlFor="reply-body">
                  <Textarea
                    id="reply-body"
                    rows={3}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Comment or reply to the office…"
                    disabled={isPreview}
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    isDisabled={actionBusy || isPreview || !replyDraft.trim()}
                    onClick={() => void runTenantAction('reply')}
                  >
                    Send reply
                  </Button>
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
                      <Textarea
                        id="close-note"
                        rows={2}
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder="Optional note when closing…"
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
