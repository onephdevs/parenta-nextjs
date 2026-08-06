'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
  Wrench,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Building,
  AlertTriangle,
  Save,
  Pencil,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/forms/FormField';
import { MaintenanceStatusBadge } from '@/components/domain/StatusBadges';
import Pagination from '@/components/ui/Pagination';
import AppLoader from '@/components/ui/AppLoader';

const PAGE_SIZE = 20;

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
  room_number?: string;
  building_name?: string;
  building_address?: string;
  request_date: string;
  scheduled_date?: string;
  completed_date?: string;
  notes?: string;
  assigned_to?: string;
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
    }
  }, [status, session, fetchMaintenanceRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPriority, filterCategory]);

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
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          r.tenant_name?.toLowerCase().includes(term) ||
          r.building_name?.toLowerCase().includes(term) ||
          r.room_number?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [requests, filterStatus, filterPriority, filterCategory, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRequests = filteredRequests.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  if (status === 'loading' || (isLoading && requests.length === 0)) {
    return <AppLoader variant="inline" className="min-h-[50vh]" />;
  }

  if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
    redirect('/auth/admin/signin');
  }

  const handleUpdateRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status || '',
      priority: request.priority || '',
      scheduledDate: request.scheduled_date?.split('T')[0] || '',
      completedDate: request.completed_date?.split('T')[0] || '',
      notes: request.notes || '',
      assignedTo: request.assigned_to || '',
    });
    setShowUpdateModal(true);
  };

  const submitUpdate = async () => {
    if (!selectedRequest) return;

    try {
      const response = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRequest.id,
          ...updateData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Maintenance request updated successfully',
        });
        setShowUpdateModal(false);
        fetchMaintenanceRequests();
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update request',
        });
      }
    } catch (error) {
      console.error('Error updating request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update maintenance request',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
          styles[priority] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
        {priority}
      </span>
    );
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
        description="Synced with the Maintenance pipeline — Submitted, In Progress, and Resolved match board stages"
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Requests"
          value={stats.total}
          footer="all requests"
          icon={<Wrench className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Submitted"
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

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Search" htmlFor="maintenance-search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="maintenance-search"
                type="text"
                className="pl-10"
                placeholder="Title, tenant, building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Status" htmlFor="maintenance-status">
            <Select
              id="maintenance-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="open">Submitted</option>
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
        </div>
      </Card>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="mb-2 text-lg font-medium">No maintenance requests found</p>
            <p className="text-sm text-gray-600">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Request
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pageRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        <div className="line-clamp-1 text-sm text-gray-600">
                          {request.description}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.building_name || '—'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {request.room_number ? `Room ${request.room_number}` : 'No room'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{request.tenant_name || '—'}</div>
                        <div className="text-xs text-gray-500">{request.tenant_email || ''}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-900">
                        {request.category?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getPriorityBadge(request.priority)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <MaintenanceStatusBadge status={request.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(request.request_date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleUpdateRequest(request)}
                          className="inline-flex text-gray-500 hover:text-gray-900"
                          title="Update"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      </div>

      <Dialog
        isOpen={showUpdateModal && !!selectedRequest}
        onClose={() => setShowUpdateModal(false)}
        title="Update Maintenance Request"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowUpdateModal(false)}>
              Cancel
            </Button>
            <Button leftIcon={<Save className="h-4 w-4" />} onClick={submitUpdate}>
              Save Changes
            </Button>
          </>
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <Card padding="sm" className="bg-gray-50">
              <h4 className="mb-2 font-medium text-gray-900">{selectedRequest.title}</h4>
              <p className="text-sm text-gray-600">{selectedRequest.description}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <Building className="h-4 w-4" />
                {selectedRequest.building_name} — {selectedRequest.room_number}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                {selectedRequest.tenant_name}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Status" htmlFor="update-status">
                <Select
                  id="update-status"
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                >
                  <option value="open">Submitted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Resolved</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormField>

              <FormField label="Priority" htmlFor="update-priority">
                <Select
                  id="update-priority"
                  value={updateData.priority}
                  onChange={(e) => setUpdateData({ ...updateData, priority: e.target.value })}
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
                    setUpdateData({ ...updateData, scheduledDate: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Completed Date" htmlFor="update-completedDate">
                <Input
                  type="date"
                  id="update-completedDate"
                  value={updateData.completedDate}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, completedDate: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Assigned To" htmlFor="update-assignedTo" className="md:col-span-2">
                <Input
                  type="text"
                  id="update-assignedTo"
                  value={updateData.assignedTo}
                  onChange={(e) => setUpdateData({ ...updateData, assignedTo: e.target.value })}
                  placeholder="Staff member or contractor name"
                />
              </FormField>

              <FormField label="Notes" htmlFor="update-notes" className="md:col-span-2">
                <Textarea
                  id="update-notes"
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  rows={4}
                  placeholder="Add notes about the maintenance work..."
                />
              </FormField>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
