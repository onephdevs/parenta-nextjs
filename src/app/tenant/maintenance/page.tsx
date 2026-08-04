'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Wrench, 
  Plus, 
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  MessageSquare,
  X,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { MaintenanceStatusBadge } from '@/components/domain/StatusBadges';
import { Badge, BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData, fetchTenantMaintenance } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

interface MaintenanceRequest {
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
}

interface MaintenanceData {
  active: number;
  total: number;
  requests: MaintenanceRequest[];
}

function mapMaintenance(raw: { requests: unknown[] } | Record<string, unknown>): MaintenanceData {
  const requests = Array.isArray((raw as { requests?: unknown[] }).requests)
    ? ((raw as { requests: MaintenanceRequest[] }).requests)
    : [];
  const active = requests.filter(
    (r) => !['completed', 'cancelled', 'closed'].includes(String(r.status).toLowerCase())
  ).length;
  return {
    active: typeof (raw as MaintenanceData).active === 'number' ? (raw as MaintenanceData).active : active,
    total: typeof (raw as MaintenanceData).total === 'number' ? (raw as MaintenanceData).total : requests.length,
    requests,
  };
}

export default function MaintenancePage() {
  const { data: session, status } = useSession();
  const { canAccess, isPreview, isLoading: gateLoading } = useTenantPortalGate();
  const { load, getCached, isLoading: cacheLoading, invalidate } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(() => {
    const cached = getCached<{ requests: unknown[] }>('maintenance');
    return cached ? mapMaintenance(cached) : null;
  });
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });

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
          message: error instanceof Error ? error.message : 'Failed to load maintenance requests',
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

  if (!canAccess) {
    return null;
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.title || !newRequest.description || !newRequest.category) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tenant/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRequest),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Request Submitted',
          message: 'Your maintenance request has been submitted successfully!'
        });
        setNewRequest({
          title: '',
          description: '',
          category: '',
          priority: 'medium'
        });
        setShowNewRequestForm(false);
        invalidate('maintenance');
        void fetchMaintenanceData(true);
      } else {
        showNotification({
          type: 'error',
          title: 'Submission Failed',
          message: data.error || data.details || 'Failed to submit maintenance request'
        });
      }
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to submit maintenance request'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityTone = (priority: string): BadgeTone => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = (maintenanceData?.requests || []).filter(request => {
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || request.priority === filterPriority;
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const categories = [
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'flooring',
    'painting',
    'locks_security',
    'windows_doors',
    'pest_control',
    'other'
  ];

  return (
    <div className={theme.pagePad}>
      <Link
        href="/tenant"
        className="inline-flex items-center text-sm text-emerald-400 hover:text-emerald-300"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Home
      </Link>
      <div>
        <h1 className={theme.title}>Maintenance</h1>
        <p className={cn('mt-1', theme.muted)}>
          Submit and track maintenance requests
        </p>
      </div>
      <div className={cn(theme.formPanel, 'overflow-hidden')}>
      <div className="p-4 sm:p-6">
      <PageHeader
        title="Maintenance Requests"
        description="Manage your maintenance requests and submit new ones"
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
              {/* Summary Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Clock className="h-6 w-6 text-gray-900" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-900 truncate">Active Requests</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {maintenanceData?.active || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Wrench className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-900 truncate">In Progress</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {filteredRequests.filter(r => r.status === 'in_progress').length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-900 truncate">Completed</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {filteredRequests.filter(r => r.status === 'completed').length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-900 truncate">High Priority</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {filteredRequests.filter(r => r.priority === 'high').length}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Requests List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Your Maintenance Requests ({maintenanceData?.requests?.length || 0} total)
                    </h3>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search requests..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          aria-label="Search requests"
                        />
                      </div>
                      <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        aria-label="Filter by status"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
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
                    <div className="space-y-4">
                      {filteredRequests.map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-medium text-gray-900">{request.title}</h4>
                                <MaintenanceStatusBadge status={request.status} />
                                <Badge tone={getPriorityTone(request.priority)}>
                                  {request.priority} priority
                                </Badge>
                              </div>
                              <p className="text-gray-900 mb-3">{request.description}</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-900">
                                <div>
                                  <span className="font-medium">Category:</span> {request.category.replace('_', ' ')}
                                </div>
                                <div>
                                  <span className="font-medium">Created:</span> {formatDate(request.createdAt)}
                                </div>
                                <div>
                                  <span className="font-medium">Last updated:</span> {formatDate(request.updatedAt)}
                                </div>
                              </div>
                              {request.scheduledDate && (
                                <div className="mt-2 text-sm text-blue-600">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  <span className="font-medium">Scheduled:</span> {formatDate(request.scheduledDate)}
                                </div>
                              )}
                              {request.completedDate && (
                                <div className="mt-2 text-sm text-green-600">
                                  <CheckCircle2 className="h-4 w-4 inline mr-1" />
                                  <span className="font-medium">Completed:</span> {formatDate(request.completedDate)}
                                </div>
                              )}
                              {request.notes && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-900">
                                    <MessageSquare className="h-4 w-4 inline mr-1" />
                                    <span className="font-medium">Notes:</span> {request.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Wrench className="h-12 w-12" />}
                      title={
                        searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                          ? 'No matching requests'
                          : 'No maintenance requests yet'
                      }
                      description={
                        searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                          ? 'No maintenance requests found matching your criteria.'
                          : 'Submit a new request if you need assistance.'
                      }
                      action={
                        searchTerm || filterStatus !== 'all' || filterPriority !== 'all' ? (
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

      {showNewRequestForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" padding="lg">
            <form onSubmit={handleSubmitRequest}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Submit Maintenance Request</h3>
                <IconButton label="Close" onClick={() => setShowNewRequestForm(false)}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              <div className="space-y-4">
                <FormField label="Title" htmlFor="title" required>
                  <Input
                    type="text"
                    id="title"
                    required
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    placeholder="Brief description of the issue"
                  />
                </FormField>

                <FormField label="Category" htmlFor="category" required>
                  <Select
                    id="category"
                    required
                    value={newRequest.category}
                    onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Priority" htmlFor="priority">
                  <Select
                    id="priority"
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
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
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="Please provide detailed information about the issue, location, and any relevant details"
                  />
                </FormField>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewRequestForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className={theme.primaryButton}
                >
                  Submit request
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      </div>
      </div>
    </div>
  );
} 