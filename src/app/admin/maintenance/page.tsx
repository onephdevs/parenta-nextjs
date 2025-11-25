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
  X,
  Save
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
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

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }

    // Filter by search term
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      open: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: X }
    };

    const badge = badges[status] || badges.open;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      urgent: { bg: 'bg-red-100', text: 'text-red-800' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      low: { bg: 'bg-green-100', text: 'text-green-800' }
    };

    const badge = badges[priority] || badges.medium;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {priority === 'urgent' && <AlertTriangle className="h-3 w-3" />}
        {priority.toUpperCase()}
      </span>
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
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Maintenance Requests
              </h1>
              <p className="mt-1 text-sm text-gray-900">
                Track and manage property maintenance requests
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="h-8 w-8 text-blue-600" />
                Maintenance Requests
              </h1>
              <p className="mt-2 text-gray-900">
                Manage and track all maintenance requests across properties
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Open</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="hvac">HVAC</option>
              <option value="appliance">Appliance</option>
              <option value="flooring">Flooring</option>
              <option value="structural">Structural</option>
              <option value="pest_control">Pest Control</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
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
                        {getStatusBadge(request.status)}
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
      </main>

      {/* Update Modal */}
      {showUpdateModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Update Maintenance Request</h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-900"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Request Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
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
                </div>

                {/* Update Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Status
                    </label>
                    <select
                      value={updateData.status}
                      onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Priority
                    </label>
                    <select
                      value={updateData.priority}
                      onChange={(e) => setUpdateData({ ...updateData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={updateData.scheduledDate}
                      onChange={(e) => setUpdateData({ ...updateData, scheduledDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Completed Date
                    </label>
                    <input
                      type="date"
                      value={updateData.completedDate}
                      onChange={(e) => setUpdateData({ ...updateData, completedDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Assigned To
                    </label>
                    <input
                      type="text"
                      value={updateData.assignedTo}
                      onChange={(e) => setUpdateData({ ...updateData, assignedTo: e.target.value })}
                      placeholder="Staff member or contractor name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={updateData.notes}
                      onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                      rows={4}
                      placeholder="Add notes about the maintenance work..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="px-4 py-2 text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitUpdate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

