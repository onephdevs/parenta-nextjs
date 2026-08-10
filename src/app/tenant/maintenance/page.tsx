'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ImagePlus,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
  Textarea,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { FileDropzone } from '@/components/ui/FileDropzone';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData, fetchTenantMaintenance } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_CATEGORY_LABELS,
  formatMaintenanceCategory,
} from '@/lib/constants/maintenance';

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
  updates?: unknown[];
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

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
  const [filterStatus, setFilterStatus] = useState('all');
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
              : 'Failed to load maintenance requests',
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
          title: 'Request Submitted',
          message:
            data.message ||
            'Your maintenance request has been submitted successfully!',
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
          title: 'Submission Failed',
          message: data.error || data.details || 'Failed to submit maintenance request',
        });
      }
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to submit request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = MAINTENANCE_CATEGORIES;
  const filteredRequests = (maintenanceData?.requests || []).filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || request.status === filterStatus;
    const matchesPriority =
      filterPriority === 'all' || request.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className={theme.page}>
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <Link
          href="/tenant"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div>
          <h1 className={theme.title}>Maintenance</h1>
          <p className={cn('mt-1', theme.muted)}>
            Browse your requests, then open one to view updates and reply
          </p>
        </div>
        <div className={cn(theme.formPanel, 'overflow-hidden')}>
          <div className="p-4 sm:p-6">
            <PageHeader
              title="Maintenance Requests"
              description="Select a request to view details and conversation"
              actions={
                isPreview ? undefined : (
                  <Button
                    variant="success"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowNewRequestForm(true)}
                    className={theme.primaryButton}
                  >
                    New Request
                  </Button>
                )
              }
            />
            {maintenanceData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                  <StatCard
                    title="Active Requests"
                    value={maintenanceData?.active || 0}
                    icon={<Clock className="h-5 w-5" />}
                  />
                  <StatCard
                    title="In Progress"
                    value={
                      filteredRequests.filter((r) => r.status === 'in_progress')
                        .length
                    }
                    tone="blue"
                    icon={<Wrench className="h-5 w-5" />}
                  />
                  <StatCard
                    title="Completed"
                    value={
                      filteredRequests.filter((r) => r.status === 'completed')
                        .length
                    }
                    tone="green"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                  />
                  <StatCard
                    title="High Priority"
                    value={
                      filteredRequests.filter((r) => r.priority === 'high').length
                    }
                    tone="red"
                    icon={<AlertCircle className="h-5 w-5" />}
                  />
                </div>

                <div className="rounded-lg bg-white shadow">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Your requests ({maintenanceData?.requests?.length || 0})
                      </h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <SearchInput
                          placeholder="Search requests..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          aria-label="Search requests"
                          className="w-56"
                        />
                        <Select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          aria-label="Filter by status"
                        >
                          <option value="all">All Status</option>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="cancelled">Cancelled</option>
                        </Select>
                        <Select
                          value={filterPriority}
                          onChange={(e) => setFilterPriority(e.target.value)}
                          aria-label="Filter by priority"
                        >
                          <option value="all">All Priority</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </Select>
                      </div>
                    </div>

                    {filteredRequests.length > 0 ? (
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                        {filteredRequests.map((request) => {
                          const updateCount = request.updates?.length || 0;
                          return (
                            <li key={request.id}>
                              <Link
                                href={`/tenant/maintenance/${request.id}`}
                                className="flex items-start gap-3 px-4 py-4 transition hover:bg-gray-50"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="truncate text-base font-medium text-gray-900">
                                      {request.title}
                                    </h4>
                                    <MaintenanceStatusBadge status={request.status} />
                                    <MaintenancePriorityBadge
                                      priority={request.priority}
                                    />
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                                    {request.description}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                    <span>
                                      {formatMaintenanceCategory(request.category)}
                                    </span>
                                    <span>Updated {formatDate(request.updatedAt)}</span>
                                    {updateCount > 0 && (
                                      <span className="inline-flex items-center gap-1">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        {updateCount} update
                                        {updateCount === 1 ? '' : 's'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400" />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <EmptyState
                        icon={<Wrench className="h-12 w-12" />}
                        title={
                          searchTerm ||
                          filterStatus !== 'all' ||
                          filterPriority !== 'all'
                            ? 'No matching requests'
                            : 'No maintenance requests yet'
                        }
                        description={
                          searchTerm ||
                          filterStatus !== 'all' ||
                          filterPriority !== 'all'
                            ? 'No maintenance requests found matching your criteria.'
                            : 'Submit a new request if you need assistance.'
                        }
                        action={
                          searchTerm ||
                          filterStatus !== 'all' ||
                          filterPriority !== 'all' ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setSearchTerm('');
                                setFilterStatus('all');
                                setFilterPriority('all');
                              }}
                            >
                              Clear filters
                            </Button>
                          ) : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
                    Submit maintenance request
                  </h3>
                  <p className={cn('mt-1 text-sm', theme.muted)}>
                    Describe the issue and attach photos if helpful.
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
                  <FormField label="Title" htmlFor="title" required>
                    <Input
                      type="text"
                      id="title"
                      required
                      value={newRequest.title}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, title: e.target.value })
                      }
                      placeholder="Brief description of the issue"
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
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                  </FormField>

                  <FormField label="Description" htmlFor="description" required>
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
                      placeholder="Please provide detailed information about the issue, location, and any relevant details"
                    />
                  </FormField>

                  <FormField
                    label="Photos of the issue"
                    htmlFor="maintenance-photos"
                    hint={`Optional — up to ${MAX_PHOTOS} photos so the office can assess what needs fixing.`}
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
                    Submit request
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
