'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock,
  Save,
  ArrowLeft,
  X,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
  formatMaintenanceCategory,
  formatMaintenanceTicketNumber,
} from '@/lib/constants/maintenance';
import { RouteLoadingFallback, useRouteReady } from '@/components/layout/route-loader';
import {
  AppLoader,
  Avatar,
  Button,
  EmptyState,
  FilterBar,
  Input,
  ListSummaryCard,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  Textarea,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { formatShortDate } from '@/lib/utils';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';
import {
  MaintenanceThreadPanel,
  type MaintenanceThreadHandle,
} from '@/components/features/maintenance/MaintenanceThreadPanel';

const PAGE_SIZE = 20;

interface MaintenanceAttachment {
  id: string;
  fileName?: string;
  url: string;
  mimeType?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_avatar_url?: string | null;
  room_number?: string;
  building_name?: string;
  building_address?: string;
  request_date: string;
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_initials?: string;
  attachments?: MaintenanceAttachment[];
  attachmentCount?: number;
}

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
}

interface MaintenanceStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  urgent: number;
  high: number;
}

export default function AdminMaintenancePage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    urgent: 0,
    high: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [sliderIn, setSliderIn] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [updateData, setUpdateData] = useState({
    status: '',
    priority: '',
    scheduledDate: '',
    completedDate: '',
    notes: '',
    assignedTo: '',
  });
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const threadRef = useRef<MaintenanceThreadHandle>(null);

  const fetchMaintenanceRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/maintenance');
      const data = await response.json();

      if (data.success) {
        setRequests(data.data.requests || []);
        setStats(data.data.stats || {});
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load maintenance requests',
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load maintenance requests',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (
      status === 'authenticated' &&
      (session?.user.role === 'admin' || session?.user.role === 'staff')
    ) {
      fetchMaintenanceRequests();
      void fetch('/api/pipeline/assignees')
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setAssignees(json.data.assignees || []);
          }
        })
        .catch((err) => console.error('Failed to load assignees', err));
    }
  }, [status, session, fetchMaintenanceRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPriority, filterCategory]);

  useEffect(() => {
    if (!showUpdateModal) {
      setSliderIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setSliderIn(true));
    return () => cancelAnimationFrame(frame);
  }, [showUpdateModal]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (filterStatus) {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }
    if (filterPriority) {
      filtered = filtered.filter((r) => r.priority === filterPriority);
    }
    if (filterCategory) {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((r) => {
        const ticket = formatMaintenanceTicketNumber(r.id).toLowerCase();
        return (
          r.title?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          r.tenant_name?.toLowerCase().includes(term) ||
          r.building_name?.toLowerCase().includes(term) ||
          r.room_number?.toLowerCase().includes(term) ||
          ticket.includes(term)
        );
      });
    }
    return filtered;
  }, [requests, filterStatus, filterPriority, filterCategory, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRequests = filteredRequests.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const pageReady = !(status === 'loading' || (isLoading && requests.length === 0));
  const { covering } = useRouteReady(pageReady);

  if (!pageReady) {
    if (covering) return <RouteLoadingFallback className="min-h-[50vh]" />;
    return <AppLoader variant="inline" className="min-h-[50vh]" />;
  }

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    redirect('/auth/signin');
  }

  const toDateInputValue = (value?: string | null) => {
    if (!value) return '';
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  };

  const handleUpdateRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status || '',
      priority: request.priority || '',
      scheduledDate: toDateInputValue(request.scheduled_date),
      completedDate: toDateInputValue(request.completed_date),
      notes: request.notes || '',
      assignedTo: request.assigned_to || '',
    });
    setShowUpdateModal(true);
  };

  const buildPersistFields = () => ({
    status: updateData.status,
    priority: updateData.priority,
    assignedTo: updateData.assignedTo.trim() || null,
    scheduledDate: updateData.scheduledDate || null,
    completedDate: updateData.completedDate || null,
    notes: updateData.notes,
  });

  const applySavedRequest = (saved?: {
    status?: string;
    priority?: string;
    assignedTo?: string | null;
    scheduledDate?: string | null;
    completedDate?: string | null;
    notes?: string | null;
  }) => {
    if (!saved) return;
    setUpdateData((prev) => ({
      ...prev,
      status: saved.status != null ? String(saved.status) : prev.status,
      priority: saved.priority != null ? String(saved.priority) : prev.priority,
      assignedTo: saved.assignedTo != null ? String(saved.assignedTo) : '',
      scheduledDate: toDateInputValue(
        saved.scheduledDate != null
          ? String(saved.scheduledDate)
          : prev.scheduledDate
      ),
      completedDate: toDateInputValue(
        saved.completedDate != null
          ? String(saved.completedDate)
          : prev.completedDate
      ),
      notes: saved.notes != null ? String(saved.notes) : prev.notes,
    }));
    setSelectedRequest((prev) =>
      prev
        ? {
            ...prev,
            status: saved.status != null ? String(saved.status) : prev.status,
            priority:
              saved.priority != null ? String(saved.priority) : prev.priority,
            assigned_to:
              saved.assignedTo != null ? String(saved.assignedTo) : undefined,
            scheduled_date:
              saved.scheduledDate != null
                ? String(saved.scheduledDate)
                : prev.scheduled_date,
            completed_date:
              saved.completedDate != null
                ? String(saved.completedDate)
                : prev.completed_date,
            notes: saved.notes != null ? String(saved.notes) : prev.notes,
          }
        : prev
    );
  };

  const persistFormFields = async () => {
    if (!selectedRequest) return;

    const assignedToValue = updateData.assignedTo?.trim()
      ? updateData.assignedTo.trim()
      : null;

    const response = await fetch('/api/maintenance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedRequest.id,
        status: updateData.status || null,
        priority: updateData.priority || null,
        scheduledDate: updateData.scheduledDate || null,
        completedDate: updateData.completedDate || null,
        notes: updateData.notes ?? '',
        assignedTo: assignedToValue,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update request');
    }

    setSelectedRequest((prev) =>
      prev
        ? {
            ...prev,
            status: updateData.status || prev.status,
            priority: updateData.priority || prev.priority,
            scheduled_date: updateData.scheduledDate || undefined,
            completed_date: updateData.completedDate || undefined,
            notes: updateData.notes,
            assigned_to: assignedToValue || undefined,
            assigned_to_name: assignedToValue
              ? (() => {
                  const user = assignees.find((a) => a.id === assignedToValue);
                  return user
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : prev.assigned_to_name;
                })()
              : undefined,
          }
        : prev
    );
  };

  const submitUpdate = async () => {
    if (!selectedRequest) return;
    setIsSaving(true);
    try {
      const fields = buildPersistFields();
      const threadResult = await threadRef.current?.save(fields);

      if (!threadResult || threadResult.mode === 'fields-only') {
        await persistFormFields();
        showNotification({
          type: 'success',
          title: 'Saved',
          message: 'Maintenance request updated successfully',
        });
      } else {
        applySavedRequest(threadResult.request);
        showNotification({
          type: 'success',
          title: 'Saved',
          message: 'Fields and reply saved — tenant notified.',
        });
      }

      setShowUpdateModal(false);
      await fetchMaintenanceRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update maintenance request',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Maintenance Requests"
        description="Synced with the Maintenance pipeline — Open, In Progress, and Resolved match board stages"
        actions={
          <Link href="/admin/tasks?board=maintenance">
            <Button variant="outline" leftIcon={<LayoutGrid className="h-4 w-4" />}>
              Open pipeline
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Requests"
          value={stats.total}
          footer="all requests"
          icon={<Wrench className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Open"
          value={stats.open}
          footer="awaiting action"
          icon={<AlertCircle className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="In Progress"
          value={stats.inProgress}
          footer="currently working"
          icon={<Clock className="h-8 w-8 text-slate-600" />}
        />
        <ListSummaryCard
          title="Resolved"
          value={stats.completed}
          footer="completed requests"
          icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
        />
      </div>

      <FilterBar
        columns={3}
        className="mb-0"
        collapsible
        activeCount={[filterStatus, filterPriority, filterCategory].filter(Boolean).length}
        search={
          <SearchInput
            id="maintenance-search"
            placeholder="Ticket, title, tenant, building…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search maintenance requests"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        }
      >
        <FormField label="Status" htmlFor="maintenance-status">
          <Select
            id="maintenance-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Resolved</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>

        <FormField label="Priority" htmlFor="maintenance-priority">
          <Select
            id="maintenance-priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </FormField>

        <FormField label="Category" htmlFor="maintenance-category">
          <Select
            id="maintenance-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC</option>
            <option value="appliance">Appliance</option>
            <option value="structural">Structural</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard title="Maintenance requests" description="Open a request to update status and add notes.">
        {filteredRequests.length === 0 ? (
          <EmptyState
            title="No maintenance requests found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            <div>
              {pageRequests.map((request) => {
                const photoCount =
                  request.attachmentCount || request.attachments?.length || 0;
                const location = [
                  request.building_name,
                  request.room_number ? `Room ${request.room_number}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                const statusKey = (request.status || '').toLowerCase();
                const statusLabel =
                  statusKey === 'submitted' || statusKey === 'open'
                    ? 'Open'
                    : statusKey === 'in_progress'
                      ? 'In Progress'
                      : statusKey === 'completed' || statusKey === 'resolved'
                        ? 'Resolved'
                        : statusKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const statusTone: WorkItemTone =
                  statusKey === 'completed' || statusKey === 'resolved'
                    ? 'success'
                    : statusKey === 'in_progress'
                      ? 'info'
                      : statusKey === 'cancelled' || statusKey === 'closed'
                        ? 'neutral'
                        : 'warning';
                const priorityKey = (request.priority || '').toLowerCase();
                const priorityTone: WorkItemTone =
                  priorityKey === 'urgent' || priorityKey === 'emergency'
                    ? 'danger'
                    : priorityKey === 'high' || priorityKey === 'medium'
                      ? 'warning'
                      : 'success';

                return (
                  <WorkItemRow
                    key={request.id}
                    onClick={() => handleUpdateRequest(request)}
                    idLabel={formatMaintenanceTicketNumber(request.id)}
                    title={request.title}
                    subtitle={location || request.tenant_name || null}
                    badges={[
                      { key: 'status', label: statusLabel, tone: statusTone },
                      {
                        key: 'priority',
                        label: request.priority
                          ? request.priority.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                          : 'Priority',
                        tone: priorityTone,
                      },
                      ...(photoCount > 0
                        ? [{ key: 'photos', label: `${photoCount} photo${photoCount === 1 ? '' : 's'}`, tone: 'info' as const }]
                        : []),
                    ]}
                    date={formatShortDate(request.request_date)}
                    metaLabel={statusLabel}
                    metaDetail={request.assigned_to_name || 'Unassigned'}
                    metaTone={statusTone === 'success' ? 'muted' : statusTone === 'warning' ? 'warning' : 'default'}
                    dotTone={priorityTone === 'danger' ? 'danger' : statusTone}
                    trailingIcon={<ChevronRight className="h-4 w-4 text-gray-400" />}
                  />
                );
              })}
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredRequests.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </TableCard>

      {showUpdateModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-300 lg:left-[var(--admin-sidebar-width,16rem)] ${
              sliderIn ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setShowUpdateModal(false)}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-end lg:left-[var(--admin-sidebar-width,16rem)]">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="maintenance-request-slider-title"
              className={`pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-white text-gray-900 shadow-2xl transition-transform duration-300 ease-out lg:w-[min(96%,52rem)] lg:rounded-l-2xl ${
                sliderIn ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex-shrink-0 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      className="mt-0.5 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <Avatar
                      name={selectedRequest.tenant_name || 'Tenant'}
                      src={selectedRequest.tenant_avatar_url}
                      size="md"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-500">
                        {formatMaintenanceTicketNumber(selectedRequest.id)}
                      </p>
                      <h1
                        id="maintenance-request-slider-title"
                        className="mt-0.5 truncate text-lg font-semibold text-gray-900 sm:text-xl"
                      >
                        {selectedRequest.title}
                      </h1>
                      <p className="mt-0.5 truncate text-sm text-gray-500">
                        {selectedRequest.tenant_name || 'No tenant'}
                        {selectedRequest.building_name
                          ? ` · ${selectedRequest.building_name}`
                          : ''}
                        {selectedRequest.room_number
                          ? ` · Room ${selectedRequest.room_number}`
                          : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <MaintenanceStatusBadge
                          status={updateData.status || selectedRequest.status}
                        />
                        <MaintenancePriorityBadge
                          priority={updateData.priority || selectedRequest.priority}
                        />
                        <span className="text-xs text-gray-500">
                          {formatMaintenanceCategory(selectedRequest.category)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-900"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 sm:p-5">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Status" htmlFor="update-status">
                      <Select
                        id="update-status"
                        value={updateData.status}
                        onChange={(e) =>
                          setUpdateData({ ...updateData, status: e.target.value })
                        }
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Resolved</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    </FormField>

                    <FormField label="Priority" htmlFor="update-priority">
                      <Select
                        id="update-priority"
                        value={updateData.priority}
                        onChange={(e) =>
                          setUpdateData({ ...updateData, priority: e.target.value })
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </Select>
                    </FormField>

                    <FormField label="Scheduled Date" htmlFor="update-scheduledDate">
                      <Input
                        type="date"
                        id="update-scheduledDate"
                        value={updateData.scheduledDate}
                        onChange={(e) =>
                          setUpdateData({
                            ...updateData,
                            scheduledDate: e.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField label="Completed Date" htmlFor="update-completedDate">
                      <Input
                        type="date"
                        id="update-completedDate"
                        value={updateData.completedDate}
                        onChange={(e) =>
                          setUpdateData({
                            ...updateData,
                            completedDate: e.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField
                      label="Assigned To"
                      htmlFor="update-assignedTo"
                      className="sm:col-span-2"
                    >
                      <Select
                        id="update-assignedTo"
                        value={updateData.assignedTo}
                        onChange={(e) =>
                          setUpdateData({ ...updateData, assignedTo: e.target.value })
                        }
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((user) => (
                          <option key={user.id} value={user.id}>
                            {`${user.firstName} ${user.lastName}`.trim() || user.initials}
                          </option>
                        ))}
                      </Select>
                      {assignees.length === 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          No admin/staff users available to assign yet.
                        </p>
                      )}
                    </FormField>

                    <FormField
                      label="Internal notes"
                      htmlFor="update-notes"
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id="update-notes"
                        value={updateData.notes}
                        onChange={(e) =>
                          setUpdateData({ ...updateData, notes: e.target.value })
                        }
                        rows={2}
                        placeholder="Office-only notes (not shown as a tenant conversation message)…"
                      />
                    </FormField>
                  </div>
                </div>

                <MaintenanceThreadPanel
                  ref={threadRef}
                  requestId={selectedRequest.id}
                  hideSubmitButton
                  status={updateData.status || selectedRequest.status}
                  title="Discussion"
                  conversationClassName="max-h-[min(50vh,28rem)]"
                  seedMessage={{
                    authorName: selectedRequest.tenant_name || 'Tenant',
                    authorRole: 'tenant',
                    body: [selectedRequest.title, selectedRequest.description]
                      .filter(Boolean)
                      .join('\n\n'),
                    createdAt: selectedRequest.request_date,
                    photos: (selectedRequest.attachments || []).map((a) => ({
                      url: a.url,
                      fileName: a.fileName,
                    })),
                    avatarUrl: selectedRequest.tenant_avatar_url,
                  }}
                  tenantAvatarUrl={selectedRequest.tenant_avatar_url}
                  disabled={['closed', 'cancelled'].includes(
                    String(updateData.status || selectedRequest.status).toLowerCase()
                  )}
                />
              </div>

              <div className="flex flex-shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-5 py-3 sm:px-6">
                <Button variant="outline" onClick={() => setShowUpdateModal(false)}>
                  Cancel
                </Button>
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={submitUpdate}
                  isLoading={isSaving}
                  isDisabled={isSaving}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
