'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Wrench,
} from 'lucide-react';
import {
  formatMaintenanceTicketNumber,
} from '@/lib/constants/maintenance';
import { formatShortDate } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Button,
  EmptyState,
  FilterBar,
  FormField,
  ListSummaryCard,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

const PAGE_SIZE = 20;

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tenant_name?: string;
  room_number?: string;
  request_date: string;
  assigned_to_name?: string;
  attachments?: Array<{ id: string }>;
  attachmentCount?: number;
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

interface PropertyMaintenanceListProps {
  buildingId: string;
  refreshKey?: number;
  onAddRequest?: () => void;
}

function statusLabel(status: string): string {
  const key = (status || '').toLowerCase();
  if (key === 'submitted' || key === 'open') return 'Open';
  if (key === 'in_progress') return 'In Progress';
  if (key === 'completed' || key === 'resolved') return 'Resolved';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status: string): WorkItemTone {
  const key = (status || '').toLowerCase();
  if (key === 'completed' || key === 'resolved') return 'success';
  if (key === 'in_progress') return 'info';
  if (key === 'cancelled' || key === 'closed') return 'neutral';
  return 'warning';
}

function priorityTone(priority: string): WorkItemTone {
  const key = (priority || '').toLowerCase();
  if (key === 'urgent' || key === 'emergency') return 'danger';
  if (key === 'high' || key === 'medium') return 'warning';
  return 'success';
}

export default function PropertyMaintenanceList({
  buildingId,
  refreshKey = 0,
  onAddRequest,
}: PropertyMaintenanceListProps) {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRequests = useCallback(async () => {
    if (!buildingId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/maintenance?buildingId=${encodeURIComponent(buildingId)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load maintenance requests');
      }
      setRequests(json.data?.requests || []);
      setStats(
        json.data?.stats || {
          total: 0,
          open: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          urgent: 0,
          high: 0,
        }
      );
    } catch (err) {
      setRequests([]);
      showNotification({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to load maintenance requests',
      });
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, showNotification]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests, refreshKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter && request.status !== statusFilter) return false;
      if (priorityFilter && request.priority !== priorityFilter) return false;
      if (!term) return true;
      const ticket = formatMaintenanceTicketNumber(request.id).toLowerCase();
      return (
        request.title?.toLowerCase().includes(term) ||
        request.description?.toLowerCase().includes(term) ||
        request.tenant_name?.toLowerCase().includes(term) ||
        request.room_number?.toLowerCase().includes(term) ||
        ticket.includes(term)
      );
    });
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRequests = filteredRequests.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const addButton = onAddRequest ? (
    <Button type="button" leftIcon={<Plus className="h-4 w-4" />} onClick={onAddRequest}>
      Add Request
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
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
        footer={
          <p className="text-sm text-gray-600">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        }
      >
        <FormField label="Search" htmlFor="property-maintenance-search">
          <SearchInput
            id="property-maintenance-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ticket, title, tenant, unit..."
            aria-label="Search maintenance requests"
          />
        </FormField>
        <FormField label="Status" htmlFor="property-maintenance-status">
          <Select
            id="property-maintenance-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Resolved</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>
        <FormField label="Priority" htmlFor="property-maintenance-priority">
          <Select
            id="property-maintenance-priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard
        title="Maintenance requests"
        description="Open a request to update status and add notes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/maintenance?buildingId=${encodeURIComponent(buildingId)}`}>
              <Button variant="outline">View all</Button>
            </Link>
            {addButton}
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner label="Loading requests" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title={requests.length === 0 ? 'No maintenance requests yet' : 'No requests match your filters'}
            description={
              requests.length === 0
                ? 'Get started by adding a request for this property'
                : 'Try a different search or status'
            }
            action={requests.length === 0 ? addButton : undefined}
          />
        ) : (
          <>
            {pageRequests.map((request) => {
              const photoCount = request.attachmentCount || request.attachments?.length || 0;
              const tone = statusTone(request.status);
              const pTone = priorityTone(request.priority);
              return (
                <WorkItemRow
                  key={request.id}
                  href={`/admin/maintenance?buildingId=${encodeURIComponent(buildingId)}`}
                  idLabel={formatMaintenanceTicketNumber(request.id)}
                  title={request.title}
                  subtitle={
                    request.room_number
                      ? `Room ${request.room_number}${request.tenant_name ? ` · ${request.tenant_name}` : ''}`
                      : request.tenant_name || null
                  }
                  badges={[
                    { key: 'status', label: statusLabel(request.status), tone },
                    {
                      key: 'priority',
                      label: request.priority
                        ? request.priority.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        : 'Priority',
                      tone: pTone,
                    },
                    ...(photoCount > 0
                      ? [
                          {
                            key: 'photos',
                            label: `${photoCount} photo${photoCount === 1 ? '' : 's'}`,
                            tone: 'info' as const,
                          },
                        ]
                      : []),
                  ]}
                  date={formatShortDate(request.request_date)}
                  metaLabel={statusLabel(request.status)}
                  metaDetail={request.assigned_to_name || 'Unassigned'}
                  metaTone={
                    tone === 'success' ? 'muted' : tone === 'warning' ? 'warning' : 'default'
                  }
                  dotTone={pTone === 'danger' ? 'danger' : tone}
                />
              );
            })}
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
    </div>
  );
}
