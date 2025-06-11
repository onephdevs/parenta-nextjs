'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  CreditCard, 
  FileText, 
  Wrench, 
  MessageSquare, 
  Settings,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Bell,
  User,
  Building,
  Zap
} from 'lucide-react';
import { LogoutButton } from '@/components/features/LogoutButton';
import { useNotifications } from '@/context/NotificationContext';

interface TenantData {
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  lease: {
    id: string;
    roomId: string;
    buildingName: string;
    roomNumber: string;
    monthlyRent: number;
    startDate: string;
    endDate: string;
    status: string;
    securityDeposit: number;
  };
  payments: {
    totalPaid: number;
    nextDueDate: string;
    nextAmount: number;
    outstandingBalance: number;
    recentPayments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      status: string;
      type: string;
    }>;
  };
  maintenance: {
    activeRequests: number;
    recentRequests: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  documents: {
    totalDocuments: number;
    recentDocuments: Array<{
      id: string;
      name: string;
      category: string;
      uploadedAt: string;
      size: number;
    }>;
  };
  utilities: {
    currentUsage: {
      electricity: number;
      water: number;
      gas: number;
    };
    estimatedBill: number;
  };
}

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { showNotification } = useNotifications();

  // Redirect if not authenticated or not tenant
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session || session.user.role !== 'tenant') {
    redirect('/auth/signin?role=tenant');
  }

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/dashboard');
      const data = await response.json();

      if (data.success) {
        setTenantData(data.data);
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load dashboard data'
        });
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load dashboard data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Home className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Tenant Portal</h1>
                <p className="text-sm text-gray-500">
                  {tenantData?.lease?.buildingName} - Unit {tenantData?.lease?.roomNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-700">
                Welcome, {session.user.firstName} {session.user.lastName}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Overview Tab */}
          {activeTab === 'overview' && tenantData && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Monthly Rent</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(tenantData.lease.monthlyRent)}
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
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Next Payment</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatDate(tenantData.payments.nextDueDate)}
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
                        <Wrench className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Active Requests</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {tenantData.maintenance.activeRequests}
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
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Documents</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {tenantData.documents.totalDocuments}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Balance Alert */}
              {tenantData.payments.outstandingBalance > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>Outstanding Balance: {formatCurrency(tenantData.payments.outstandingBalance)}</strong>
                        <br />
                        Please make a payment to avoid late fees.
                      </p>
                      <div className="mt-2">
                        <Link
                          href="/tenant/payments"
                          className="text-sm bg-red-100 text-red-800 rounded-md px-2 py-1 hover:bg-red-200"
                        >
                          Make Payment
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                      href="/tenant/payments"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Rent
                    </Link>
                    <Link
                      href="/tenant/maintenance"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Request Maintenance
                    </Link>
                    <Link
                      href="/tenant/documents"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Documents
                    </Link>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity and Lease Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {tenantData.payments.recentPayments.slice(0, 3).map((payment, index) => (
                          <li key={payment.id}>
                            <div className={`relative ${index < 2 ? 'pb-8' : ''}`}>
                              {index < 2 && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                              )}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                    <CheckCircle2 className="h-5 w-5 text-white" />
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Payment of {formatCurrency(payment.amount)} received
                                    </p>
                                  </div>
                                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                    <time>{formatDate(payment.paymentDate)}</time>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Lease Information */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Lease Information</h3>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Property</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {tenantData.lease.buildingName} - Unit {tenantData.lease.roomNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Lease Period</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(tenantData.lease.startDate)} - {formatDate(tenantData.lease.endDate)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Monthly Rent</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(tenantData.lease.monthlyRent)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Security Deposit</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatCurrency(tenantData.lease.securityDeposit)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenantData.lease.status)}`}>
                            {tenantData.lease.status}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && tenantData && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Paid</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(tenantData.payments.totalPaid)}
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
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Next Due</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(tenantData.payments.nextAmount)}
                          </dd>
                          <dd className="text-xs text-gray-500">
                            Due: {formatDate(tenantData.payments.nextDueDate)}
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
                        <AlertCircle className={`h-6 w-6 ${tenantData.payments.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Outstanding</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(tenantData.payments.outstandingBalance)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Make Payment Button */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Make a Payment</h3>
                    <p className="text-sm text-gray-500">
                      Pay your rent securely online
                    </p>
                  </div>
                  <button
                    onClick={() => showNotification({
                      type: 'info',
                      title: 'Payment Portal',
                      message: 'Payment processing integration will be available soon!'
                    })}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </button>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Payment History</h3>
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tenantData.payments.recentPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button className="text-blue-600 hover:text-blue-900">
                                <Download className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && tenantData && (
            <div className="space-y-6">
              {/* New Request Button */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Submit Maintenance Request</h3>
                    <p className="text-sm text-gray-500">
                      Report issues with your unit or request maintenance
                    </p>
                  </div>
                  <Link
                    href="/tenant/maintenance/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    New Request
                  </Link>
                </div>
              </div>

              {/* Active Requests */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Maintenance Requests ({tenantData.maintenance.activeRequests} active)
                  </h3>
                  <div className="space-y-4">
                    {tenantData.maintenance.recentRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">{request.title}</h4>
                            <p className="text-sm text-gray-500">
                              Created: {formatDate(request.createdAt)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Last updated: {formatDate(request.updatedAt)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                              {request.priority} priority
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tenantData.maintenance.recentRequests.length === 0 && (
                      <p className="text-gray-500 text-center py-8">
                        No maintenance requests found. Submit a new request if you need assistance.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && tenantData && (
            <div className="space-y-6">
              {/* Documents List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Your Documents ({tenantData.documents.totalDocuments} total)
                  </h3>
                  <div className="space-y-4">
                    {tenantData.documents.recentDocuments.map((document) => (
                      <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-8 w-8 text-gray-400" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{document.name}</h4>
                              <p className="text-sm text-gray-500">
                                {document.category} • {(document.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <p className="text-sm text-gray-500">
                                Uploaded: {formatDate(document.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                    {tenantData.documents.recentDocuments.length === 0 && (
                      <p className="text-gray-500 text-center py-8">
                        No documents available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && tenantData && (
            <div className="space-y-6">
              {/* Profile Information */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Profile Information</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">First Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenantData.tenant.firstName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenantData.tenant.lastName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenantData.tenant.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenantData.tenant.phone || 'Not provided'}</dd>
                    </div>
                  </dl>
                  <div className="mt-6">
                    <button
                      onClick={() => showNotification({
                        type: 'info',
                        title: 'Profile Update',
                        message: 'Profile editing functionality will be available soon!'
                      })}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Payment Reminders</h4>
                        <p className="text-sm text-gray-500">Get notified before rent is due</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Maintenance Updates</h4>
                        <p className="text-sm text-gray-500">Updates on your maintenance requests</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Property News</h4>
                        <p className="text-sm text-gray-500">Important announcements from property management</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => showNotification({
                        type: 'success',
                        title: 'Settings Saved',
                        message: 'Your notification preferences have been updated.'
                      })}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 