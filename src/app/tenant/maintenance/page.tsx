'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  X,
  ImagePlus,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Ticket,
  Search,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { FileDropzone } from '@/components/ui/FileDropzone';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { formatRelativeTime } from '@/components/features/maintenance/MaintenanceDiscussion';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData, fetchTenantMaintenance } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_CATEGORY_LABELS,
  formatMaintenanceCategory,
  formatMaintenanceTicketNumber,
  maintenanceTicketQueue,
} from '@/lib/constants/maintenance';

interface TicketUpdate {
  authorRole?: string;
  body?: string;
  createdAt?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount?: number;
  updates?: TicketUpdate[];
}

interface MaintenanceData {
  active: number;
  total: number;
  requests: MaintenanceRequest[];
}

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

type QueueFilter = 'all' | 'open' | 'in_progress' | 'resolved';

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const QUEUE_TABS: { id: QueueFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
];

function mapMaintenance(raw: { requests: unknown[] } | Record<string, unknown>): MaintenanceData {
  const requests = Array.isArray((raw as { requests?: unknown[] }).requests)
    ? ((raw as { requests: MaintenanceRequest[] }).requests)
    : [];
  const active = requests.filter(
    (r) => !['completed', 'cancelled', 'closed'].includes(String(r.status).toLowerCase())
  ).length;
  return {
    active:
      typeof (raw as MaintenanceData).active === 'number'
        ? (raw as MaintenanceData).active
        : active,
    total:
      typeof (raw as MaintenanceData).total === 'number'
        ? (raw as MaintenanceData).total
        : requests.length,
    requests,
  };
}

function matchesQueue(status: string, filter: QueueFilter): boolean {
  if (filter === 'all') return true;
  const queue = maintenanceTicketQueue(status);
  if (filter === 'resolved') return queue === 'resolved' || queue === 'cancelled';
  return queue === filter;
}

function ticketActivityLabel(request: MaintenanceRequest): string {
  const queue = maintenanceTicketQueue(request.status);
  if (queue === 'resolved') return 'Resolved';
  if (queue === 'cancelled') return 'Cancelled';

  const updates = request.updates || [];
  if (updates.length === 0) return 'Waiting for office';

  const last = updates[updates.length - 1];
  const role = String(last?.authorRole || '').toLowerCase();
  if (role === 'tenant') return 'Waiting for office';
  if (queue === 'in_progress') return 'Office is working on it';
  return 'Office replied';
}

function lastMessagePreview(request: MaintenanceRequest): string {
  const updates = request.updates || [];
  for (let i = updates.length - 1; i >= 0; i -= 1) {
    const body = updates[i]?.body?.trim();
    if (body) return body;
  }
  return request.description || '';
}

function queueCount(
  requests: MaintenanceRequest[],
  filter: QueueFilter
): number {
  return requests.filter((r) => matchesQueue(r.status, filter)).length;
}

export default function MaintenancePage() {
  const { data: session, status } = useSession();
  const { canAccess, isPreview, isLoading: gateLoading } = useTenantPortalGate();
  const { load, getCached, isLoading: cacheLoading, invalidate } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get('highlight') || null;
  const { showNotification } = useNotifications();
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(() => {
    const cached = getCached<{ requests: unknown[] }>('maintenance');
    return cached ? mapMaintenance(cached) : null;
  });
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [requestPanelIn, setRequestPanelIn] = useState(false);
  const [filterQueue, setFilterQueue] = useState<QueueFilter>('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (!highlightId) return;
    router.replace(`/tenant/maintenance/${highlightId}`);
  }, [highlightId, router]);

  useEffect(() => {
    if (!showNewRequestForm) {
      setRequestPanelIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setRequestPanelIn(true));
    return () => cancelAnimationFrame(frame);
  }, [showNewRequestForm]);

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  };

  const addPhotoFiles = (files: File[]) => {
    const next: PendingPhoto[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showNotification({
          type: 'error',
          title: 'Invalid file',
          message: 'Please attach photos only (JPEG, PNG, or WEBP)',
        });
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        showNotification({
          type: 'error',
          title: 'File too large',
          message: `${file.name} must be under 5MB`,
        });
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length === 0) return;
    setPhotos((prev) => {
      const combined = [...prev, ...next].slice(0, MAX_PHOTOS);
      next.forEach((p) => {
        if (!combined.includes(p)) URL.revokeObjectURL(p.preview);
      });
      if (prev.length + next.length > MAX_PHOTOS) {
        showNotification({
          type: 'error',
          title: 'Photo limit',
          message: `You can attach up to ${MAX_PHOTOS} photos`,
        });
      }
      return combined;
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const fetchMaintenanceData = async (force = false) => {
    try {
      const raw = await load('maintenance', fetchTenantMaintenance, { force });
      setMaintenanceData(mapMaintenance(raw));
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      if (!getCached('maintenance')) {
        showNotification({
          type: 'error',
          title: 'Error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to load maintenance tickets',
        });
      }
    }
  };

  useEffect(() => {
    if (gateLoading || status === 'loading') return;
    if (canAccess) {
      void fetchMaintenanceData();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin?role=tenant');
    }
  }, [status, session, router, canAccess, gateLoading]);

  if (status === 'loading' || gateLoading || (!maintenanceData && cacheLoading('maintenance'))) {
    return <TenantPageSkeleton variant="list" />;
  }

  if (!canAccess) return null;

  if (highlightId) {
    return <TenantPageSkeleton variant="list" />;
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRequest.title || !newRequest.description || !newRequest.category) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', newRequest.title);
      form.append('description', newRequest.description);
      form.append('category', newRequest.category);
      form.append('priority', newRequest.priority);
      photos.forEach((p) => form.append('photos', p.file));

      const response = await fetch('/api/tenant/maintenance', {
        method: 'POST',
        body: form,
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: data.warning ? 'warning' : 'success',
          title: 'Ticket opened',
          message:
            data.message ||
            'Your ticket was submitted. The office will reply here.',
        });
        setNewRequest({
          title: '',
          description: '',
          category: '',
          priority: 'medium',
        });
        clearPhotos();
        setShowNewRequestForm(false);
        invalidate('maintenance');
        const createdId = data.data?.id;
        if (createdId) {
          router.push(`/tenant/maintenance/${createdId}`);
        } else {
          void fetchMaintenanceData(true);
        }
      } else {
        showNotification({
          type: 'error',
          title: 'Could not open ticket',
          message: data.error || data.details || 'Failed to submit ticket',
        });
      }
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to submit ticket',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = MAINTENANCE_CATEGORIES;
  const allRequests = maintenanceData?.requests || [];
  const filteredRequests = allRequests.filter((request) => {
    const haystack = `${request.title} ${request.description} ${formatMaintenanceTicketNumber(request.id)}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesQueueFilter = matchesQueue(request.status, filterQueue);
    const matchesPriority =
      filterPriority === 'all' || request.priority === filterPriority;
    return matchesSearch && matchesQueueFilter && matchesPriority;
  });
  const hasActiveFilters =
    Boolean(searchTerm) || filterQueue !== 'all' || filterPriority !== 'all';

  return (
    <div className={theme.page}>
      <div className={theme.pagePad}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={theme.title}>Tickets</h1>
            <p className={cn('mt-1', theme.muted)}>
              You&apos;re the customer. Open a ticket for repairs and the office
              replies here.
            </p>
          </div>
          {!isPreview && (
            <Button
              variant="success"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowNewRequestForm(true)}
              className={theme.primaryButton}
            >
              New ticket
            </Button>
          )}
        </div>

        <nav
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          aria-label="Ticket queues"
        >
          {QUEUE_TABS.map((tab) => {
            const count = queueCount(allRequests, tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterQueue(tab.id)}
                className={theme.tabClass(filterQueue === tab.id)}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className={cn(theme.panel, 'overflow-hidden')}>
          <div className={cn('flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center', theme.divider)}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tickets by subject or number…"
                aria-label="Search tickets"
                className={cn('pl-10', theme.input)}
              />
            </div>
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              aria-label="Filter by priority"
              className={cn('sm:w-40', theme.input)}
            >
              <option value="all">All priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>

          {filteredRequests.length > 0 ? (
            <ul>
              {filteredRequests.map((request, index) => {
                const updateCount = request.updates?.length || 0;
                const preview = lastMessagePreview(request);
                return (
                  <li key={request.id}>
                    <Link
                      href={`/tenant/maintenance/${request.id}`}
                      className={cn(
                        'flex items-start gap-3 px-4 py-4 transition',
                        index > 0 && 'border-t',
                        theme.divider,
                        theme.mode === 'dark'
                          ? 'hover:bg-zinc-800/60'
                          : 'hover:bg-zinc-50'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          theme.mode === 'dark'
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-zinc-100 text-zinc-600'
                        )}
                        aria-hidden
                      >
                        <Ticket className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={cn('font-mono text-xs', theme.subtle)}>
                            {formatMaintenanceTicketNumber(request.id)}
                          </span>
                          <MaintenanceStatusBadge status={request.status} />
                          <MaintenancePriorityBadge priority={request.priority} />
                        </div>
                        <h2 className={cn('mt-1 truncate text-sm font-semibold', theme.listValue)}>
                          {request.title}
                        </h2>
                        {preview && (
                          <p className={cn('mt-0.5 line-clamp-1 text-sm', theme.muted)}>
                            {preview}
                          </p>
                        )}
                        <div className={cn('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', theme.subtle)}>
                          <span>{formatMaintenanceCategory(request.category)}</span>
                          <span>{ticketActivityLabel(request)}</span>
                          <span>
                            {formatRelativeTime(request.updatedAt || request.createdAt)}
                          </span>
                          {updateCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {updateCount}
                            </span>
                          )}
                          {(request.attachmentCount || 0) > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5" />
                              {request.attachmentCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={cn('mt-2 h-5 w-5 shrink-0', theme.subtle)} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-14 text-center">
              <Ticket className={cn('mx-auto h-10 w-10', theme.subtle)} />
              <h3 className={cn('mt-3 text-sm font-semibold', theme.listValue)}>
                {hasActiveFilters ? 'No matching tickets' : 'No tickets yet'}
              </h3>
              <p className={cn('mx-auto mt-1 max-w-sm text-sm', theme.muted)}>
                {hasActiveFilters
                  ? 'Try a different queue, priority, or search.'
                  : 'Open a ticket to report a leak, appliance issue, or anything else that needs fixing.'}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterQueue('all');
                      setFilterPriority('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  !isPreview && (
                    <Button
                      type="button"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setShowNewRequestForm(true)}
                      className={theme.primaryButton}
                    >
                      New ticket
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewRequestForm && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className={cn(
              'absolute inset-0 bg-gray-900/50 transition-opacity duration-300 md:left-64',
              requestPanelIn ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => {
              if (isSubmitting) return;
              clearPhotos();
              setShowNewRequestForm(false);
            }}
            aria-hidden="true"
          />

          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-end md:left-64">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tenant-maintenance-request-title"
              className={cn(
                'pointer-events-auto flex h-full w-full max-w-lg flex-col shadow-2xl transition-transform duration-300 ease-out',
                theme.mode === 'dark'
                  ? 'bg-zinc-950 text-zinc-100'
                  : 'bg-white text-gray-900',
                requestPanelIn ? 'translate-x-0' : 'translate-x-full'
              )}
            >
              <div
                className={cn(
                  'flex flex-shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:px-5',
                  theme.mode === 'dark' ? 'border-zinc-800' : 'border-gray-200'
                )}
              >
                <div className="min-w-0">
                  <h3
                    id="tenant-maintenance-request-title"
                    className={cn('text-lg font-semibold', theme.shellHeader)}
                  >
                    New ticket
                  </h3>
                  <p className={cn('mt-1 text-sm', theme.muted)}>
                    Describe the issue. You can attach photos so the office can assess it.
                  </p>
                </div>
                <IconButton
                  label="Close"
                  onClick={() => {
                    if (isSubmitting) return;
                    clearPhotos();
                    setShowNewRequestForm(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              <form
                onSubmit={handleSubmitRequest}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                  <FormField label="Subject" htmlFor="title" required>
                    <Input
                      type="text"
                      id="title"
                      required
                      value={newRequest.title}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, title: e.target.value })
                      }
                      placeholder="Brief summary, e.g. Leaking kitchen faucet"
                    />
                  </FormField>

                  <FormField label="Category" htmlFor="category" required>
                    <Select
                      id="category"
                      required
                      value={newRequest.category}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, category: e.target.value })
                      }
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {MAINTENANCE_CATEGORY_LABELS[category] || category}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="Priority" htmlFor="priority">
                    <Select
                      id="priority"
                      value={newRequest.priority}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, priority: e.target.value })
                      }
                    >
                      <option value="low">Low — can wait</option>
                      <option value="medium">Medium — soon</option>
                      <option value="high">High — needs attention now</option>
                    </Select>
                  </FormField>

                  <FormField label="Details" htmlFor="description" required>
                    <Textarea
                      id="description"
                      required
                      rows={4}
                      value={newRequest.description}
                      onChange={(e) =>
                        setNewRequest({
                          ...newRequest,
                          description: e.target.value,
                        })
                      }
                      placeholder="What happened, where it is, and anything else the office should know"
                    />
                  </FormField>

                  <FormField
                    label="Photos"
                    htmlFor="maintenance-photos"
                    hint={`Optional — up to ${MAX_PHOTOS} photos so the office can see the issue.`}
                  >
                    <div className="space-y-3">
                      <FileDropzone
                        accept="image/jpeg,image/png,image/webp,image/*"
                        multiple
                        disabled={isSubmitting || photos.length >= MAX_PHOTOS}
                        onFiles={addPhotoFiles}
                        icon={
                          <ImagePlus className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                        }
                        label="Drag photos here, or click to choose from gallery"
                        hint="JPEG, PNG, or WEBP · max 5MB each"
                      />
                      <div className="flex flex-wrap gap-2">
                        <TakePhotoButton
                          disabled={isSubmitting || photos.length >= MAX_PHOTOS}
                          onCapture={(file) => addPhotoFiles([file])}
                          title="Take maintenance photo"
                          description="Allow camera access if prompted, then capture the issue."
                          fileNamePrefix="maintenance"
                        />
                        <label
                          className={cn(
                            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50',
                            (isSubmitting || photos.length >= MAX_PHOTOS) &&
                              'pointer-events-none opacity-50'
                          )}
                        >
                          <Paperclip className="h-4 w-4" />
                          Upload
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            multiple
                            className="hidden"
                            disabled={isSubmitting || photos.length >= MAX_PHOTOS}
                            onChange={(e) => {
                              addPhotoFiles(Array.from(e.target.files || []));
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {photos.length > 0 && (
                        <ul className="grid grid-cols-3 gap-2">
                          {photos.map((photo, index) => (
                            <li key={photo.id} className="relative">
                              <LightboxImage
                                src={photo.preview}
                                alt="Issue preview"
                                title={photo.file.name || 'Issue photo'}
                                gallery={photos.map((p) => ({
                                  src: p.preview,
                                  alt: 'Issue preview',
                                  title: p.file.name || 'Issue photo',
                                }))}
                                galleryIndex={index}
                                wrapperClassName="block w-full overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                                className="h-20 w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(photo.id)}
                                className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white shadow"
                                aria-label="Remove photo"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </FormField>
                </div>

                <div
                  className={cn(
                    'flex flex-shrink-0 items-center justify-end gap-3 border-t px-4 py-4 sm:px-5',
                    theme.mode === 'dark' ? 'border-zinc-800' : 'border-gray-200'
                  )}
                >
                  <Button
                    type="button"
                    variant="outline"
                    isDisabled={isSubmitting}
                    onClick={() => {
                      clearPhotos();
                      setShowNewRequestForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className={theme.primaryButton}
                  >
                    Submit ticket
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
