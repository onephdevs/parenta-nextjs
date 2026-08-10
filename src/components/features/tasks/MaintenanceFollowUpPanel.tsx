'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Star, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { MaintenancePhotoGallery } from '@/components/features/MaintenancePhotoGallery';
import { MaintenanceReactionBar } from '@/components/features/maintenance/MaintenanceReactionBar';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import {
  formatMaintenanceCategory,
  formatMaintenancePriority,
  formatMaintenanceStatus,
} from '@/lib/constants/maintenance';

interface MaintenanceAttachment {
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

interface MaintenanceDetail {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  room_number?: string;
  building_name?: string;
  request_date?: string | Date;
  created_at?: string | Date;
  attachments?: MaintenanceAttachment[];
  updates?: MaintenanceUpdateItem[];
}

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
}

interface MaintenanceFollowUpPanelProps {
  cardId: string;
  maintenanceRequestId?: string;
  buildingId?: string;
  roomId?: string;
  onUpdated?: () => void;
}

function formatDate(value?: string | Date | null) {
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
      return 'Progress';
  }
}

export function MaintenanceFollowUpPanel({
  maintenanceRequestId,
  onUpdated,
}: MaintenanceFollowUpPanelProps) {
  const [request, setRequest] = useState<MaintenanceDetail | null>(null);
  const [updates, setUpdates] = useState<MaintenanceUpdateItem[]>([]);
  const [loading, setLoading] = useState(Boolean(maintenanceRequestId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [progressNote, setProgressNote] = useState('');
  const [progressPhoto, setProgressPhoto] = useState<File | null>(null);
  const [progressPreview, setProgressPreview] = useState<string | null>(null);
  const [reactionBusyId, setReactionBusyId] = useState<string | null>(null);

  const clearProgressPhoto = () => {
    if (progressPreview) URL.revokeObjectURL(progressPreview);
    setProgressPhoto(null);
    setProgressPreview(null);
  };

  const load = useCallback(async () => {
    if (!maintenanceRequestId) {
      setRequest(null);
      setUpdates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/maintenance/${encodeURIComponent(maintenanceRequestId)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load maintenance request');
      }
      const data = json.data as MaintenanceDetail;
      setRequest(data);
      setStatus(String(data.status || 'open'));
      setPriority(String(data.priority || 'medium'));
      setAssignedTo(data.assigned_to ? String(data.assigned_to) : '');
      setUpdates((data.updates || []) as MaintenanceUpdateItem[]);
    } catch (err) {
      setRequest(null);
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [maintenanceRequestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch('/api/pipeline/assignees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAssignees(json.data.assignees || []);
      })
      .catch(() => undefined);
  }, []);

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

  useEffect(() => {
    return () => {
      if (progressPreview) URL.revokeObjectURL(progressPreview);
    };
  }, [progressPreview]);

  async function postProgress() {
    if (!maintenanceRequestId) return;
    if (!progressNote.trim() && !progressPhoto) {
      setError('Add a progress note or photo');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      if (progressNote.trim()) form.append('body', progressNote.trim());
      form.append('status', status);
      form.append('priority', priority);
      form.append('assignedTo', assignedTo || '');
      if (progressPhoto) form.append('photo', progressPhoto);

      const res = await fetch(
        `/api/maintenance/${encodeURIComponent(maintenanceRequestId)}/updates`,
        { method: 'POST', body: form }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to post update');
      }
      setProgressNote('');
      clearProgressPhoto();
      if (Array.isArray(json.data?.updates)) {
        setUpdates(json.data.updates);
      } else {
        await load();
      }
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post update');
    } finally {
      setSaving(false);
    }
  }

  if (!maintenanceRequestId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
        No linked maintenance request yet.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading maintenance request…</p>;
  }

  if (!request) {
    return (
      <div className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm text-gray-500">Could not load this maintenance request.</p>
      </div>
    );
  }

  const unitLabel = [request.building_name, request.room_number]
    .filter(Boolean)
    .join(' · ');
  const isClosed =
    request.status === 'closed' ||
    request.status === 'completed' ||
    request.status === 'cancelled';

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 shrink-0 text-gray-500" />
              <p className="truncate text-base font-semibold text-gray-900">
                {request.title || 'Untitled request'}
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {unitLabel || 'Unit not set'}
              {request.tenant_name ? ` · ${request.tenant_name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MaintenanceStatusBadge status={String(request.status || 'open')} />
            <MaintenancePriorityBadge
              priority={String(request.priority || 'medium')}
            />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Category</dt>
            <dd className="font-medium text-gray-900">
              {formatMaintenanceCategory(request.category)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Opened</dt>
            <dd className="font-medium text-gray-900">
              {formatDate(request.request_date || request.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Priority</dt>
            <dd className="font-medium text-gray-900">
              {formatMaintenancePriority(request.priority)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900">
              {formatMaintenanceStatus(request.status)}
            </dd>
          </div>
          {request.tenant_email && (
            <div>
              <dt className="text-xs text-gray-500">Tenant email</dt>
              <dd className="font-medium text-gray-900">{request.tenant_email}</dd>
            </div>
          )}
          {request.tenant_phone && (
            <div>
              <dt className="text-xs text-gray-500">Tenant phone</dt>
              <dd className="font-medium text-gray-900">{request.tenant_phone}</dd>
            </div>
          )}
        </dl>

        {request.description && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {request.description}
            </p>
          </div>
        )}

        <div className="mt-4">
          <MaintenancePhotoGallery
            photos={(request.attachments || []).map((a) => ({
              id: a.id,
              fileName: a.fileName,
              url: a.url,
              mimeType: a.mimeType,
            }))}
            emptyLabel="No photos attached"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Progress & replies</h3>
          <p className="text-xs text-gray-500">
            Tenant is notified for each update you post.
          </p>
        </div>

        {updates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
            No progress updates yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {updates.map((u) => (
              <li
                key={u.id}
                className="rounded-lg border border-gray-200 bg-white px-3 py-3"
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
                      wrapperClassName="block overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                      className="h-28 w-auto max-w-full object-cover"
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
      </section>

      {!isClosed && (
        <section className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Post progress update</h3>
            <p className="text-xs text-gray-500">
              One click saves status, priority, assignee, and your reply for the tenant.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Status" htmlFor="maint-status">
              <Select
                id="maint-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </FormField>
            <FormField label="Priority" htmlFor="maint-priority">
              <Select
                id="maint-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </FormField>
            <FormField label="Assigned To" htmlFor="maint-assigned" className="sm:col-span-2">
              <Select
                id="maint-assigned"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName} ${user.lastName}`.trim() || user.initials}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Update note" htmlFor="maint-progress-note">
            <Textarea
              id="maint-progress-note"
              rows={3}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="e.g. Replaced lock cylinder, tested door…"
            />
          </FormField>

          <div className="flex flex-wrap items-start gap-3">
            <TakePhotoButton
              disabled={saving}
              onCapture={(file) => {
                if (progressPreview) URL.revokeObjectURL(progressPreview);
                setProgressPhoto(file);
                setProgressPreview(URL.createObjectURL(file));
              }}
              title="Take progress photo"
              description="Capture work progress for the tenant."
              fileNamePrefix="maintenance-progress"
            />
            {progressPreview && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={progressPreview}
                  alt="Progress preview"
                  className="h-20 w-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={clearProgressPhoto}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void postProgress()}
              isLoading={saving}
              disabled={saving}
              leftIcon={<MessageSquare className="h-4 w-4" />}
            >
              Post update
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
