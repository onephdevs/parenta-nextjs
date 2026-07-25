'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Wrench, 
  Plus, 
  Filter,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Building,
  AlertTriangle,
  Save
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/forms/FormField';
import { MaintenanceStatusBadge } from '@/components/domain/StatusBadges';
import { Badge } from '@/components/ui/Badge';
import SkeletonCard from '@/components/ui/SkeletonCard';
import SkeletonList from '@/components/ui/SkeletonList';

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
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MaintenanceRequest[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    urgent: 0,
    high: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotifications();

  // Update form state
  const [updateData, setUpdateData] = useState({
    status: '',
    priority: '',
    scheduledDate: '',
    completedDate: '',
    notes: '',
    assignedTo: ''
  });

  const fetchMaintenanceRequests = async () => {
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
          message: 'Failed to load maintenance requests'
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load maintenance requests'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term) ||
        r.tenant_name?.toLowerCase().includes(term) ||
        r.building_name?.toLowerCase().includes(term) ||
        r.room_number?.toLowerCase().includes(term)
      );
    }
    setFilteredRequests(filtered);
  };

  useEffect(() => {
    if (status === 'authenticated' && (session?.user.role === 'admin' || session?.user.role === 'staff')) {
      fetchMaintenanceRequests();
    }
  }, [status, session]);

  useEffect(() => {
    applyFilters();
  }, [requests, filterStatus, filterPriority, filterCategory, searchTerm]);

  // Show loading state while checking authentication
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} showHeader={false} lines={2} />
              ))}
            </div>
            <SkeletonList items={5} showAvatar={true} showActions={true} />
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin/staff
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
      assignedTo: request.assigned_to || ''
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
          ...updateData
        })
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Maintenance request updated successfully'
        });
        setShowUpdateModal(false);
        fetchMaintenanceRequests();
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update request'
        });
      }
    } catch (error) {
      console.error('Error updating request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update maintenance request'
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const toneMap: Record<string, 'danger' | 'warning' | 'success' | 'neutral'> = {
      urgent: 'danger',
      high: 'danger',
      medium: 'warning',
      low: 'success',
    };
    return (
      <Badge tone={toneMap[priority] || 'neutral'} className="gap-1">
        {priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
        {priority}
      </Badge>
    );
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Maintenance Requests"
        description="Track and manage property maintenance requests"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Requests"
          value={stats.total}
          tone="default"
          icon={<Wrench className="h-5 w-5" />}
        />
        <StatCard
          title="Open"
          value={stats.open}
          tone="yellow"
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          tone="blue"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          tone="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>

          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="hvac">HVAC</option>
            <option value="appliance">Appliance</option>
            <option value="structural">Structural</option>
            <option value="other">Other</option>
          </Select>
        </div>
      </Card>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-900">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900">No maintenance requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{request.title}</div>
                        <div className="text-sm text-gray-900 line-clamp-1">{request.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.building_name || 'N/A'}</div>
                        <div className="text-sm text-gray-900">{request.room_number || 'No room'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.tenant_name || 'N/A'}</div>
                        <div className="text-sm text-gray-900">{request.tenant_email || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">
                          {request.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(request.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MaintenanceStatusBadge status={request.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(request.request_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleUpdateRequest(request)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <h4 className="font-medium text-gray-900 mb-2">{selectedRequest.title}</h4>
              <p className="text-sm text-gray-900">{selectedRequest.description}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-900">
                <Building className="h-4 w-4" />
                {selectedRequest.building_name} - {selectedRequest.room_number}
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                <User className="h-4 w-4" />
                {selectedRequest.tenant_name}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Status" htmlFor="update-status">
                <Select
                  id="update-status"
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
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
                  style={{ colorScheme: 'light' }}
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
                  style={{ colorScheme: 'light' }}
                />
              </FormField>

              <FormField
                label="Assigned To"
                htmlFor="update-assignedTo"
                className="md:col-span-2"
              >
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

