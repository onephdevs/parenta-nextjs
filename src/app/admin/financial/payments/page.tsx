import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getPayments, getPaymentSummary } from '@/lib/api/payments';
import { getAllTenants } from '@/lib/api/tenants';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Plus } from 'lucide-react';
import { PaymentStatusBadge } from '@/components/domain/StatusBadges';
import { Badge } from '@/components/ui/Badge';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  type?: string;
  tenant?: string;
}

interface PaymentsPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const page = parseInt(resolvedSearchParams.page || '1');
  const search = resolvedSearchParams.search || '';
  const status = resolvedSearchParams.status || '';
  const type = resolvedSearchParams.type || '';
  const tenantId = resolvedSearchParams.tenant || '';

  // Build filters for getPayments (tenantId is UUID string; use paymentStatus/paymentType)
  const filters: Parameters<typeof getPayments>[0] = {};
  if (status) filters.paymentStatus = status === 'completed' ? 'paid' : status === 'failed' || status === 'refunded' ? 'cancelled' : status;
  if (type) filters.paymentType = type === 'utilities' ? 'utility' : type === 'fee' ? 'other' : type;
  if (tenantId) filters.tenantId = tenantId;
  if (search) filters.search = search;

  // Fetch data with error handling
  let paymentsData, tenants, summary;
  
  try {
    const [paymentsResult, tenantsData, summaryResult] = await Promise.all([
      getPayments(filters, page, 20),
      getAllTenants({ limit: 1000 }), // Get all tenants for dropdown
      getPaymentSummary()
    ]);
    
    paymentsData = paymentsResult;
    tenants = Array.isArray(tenantsData.tenants) ? tenantsData.tenants : []; // Ensure tenants is always an array
    summary = summaryResult;
  } catch (error) {
    console.error('Error loading payments:', error);
    // Return empty data if there's an error
    paymentsData = {
      payments: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    };
    tenants = [];
    summary = null;
  }

  const uniqueTenants = Array.isArray(tenants)
    ? tenants.filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i)
    : [];

  if (!summary) {
    summary = {
      totalPayments: 0,
      totalAmount: 0,
      completedAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      completedCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      averagePaymentAmount: 0
    };
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTypeClass = (type: string) => {
    switch (type) {
      case 'rent':
        return 'bg-blue-100 text-blue-800';
      case 'deposit':
        return 'bg-purple-100 text-purple-800';
      case 'fee':
        return 'bg-orange-100 text-orange-800';
      case 'utilities':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(paymentsData.total / 20);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payment Management"
        description="Record and track tenant payments"
        actions={
          <Link href="/admin/financial/payments/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Record Payment</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Completed"
          value={formatCurrency(summary.completedAmount)}
          tone="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Pending"
          value={formatCurrency(summary.pendingAmount)}
          tone="yellow"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Overdue"
          value={formatCurrency(summary.overdueAmount)}
          tone="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Total Payments"
          value={summary.totalPayments}
          tone="blue"
          icon={<CreditCard className="h-5 w-5" />}
        />
      </div>

        <Card className="mb-6">
            <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <FormField label="Search" htmlFor="search">
                <Input
                  type="text"
                  name="search"
                  id="search"
                  defaultValue={search}
                  placeholder="Search payments..."
                />
              </FormField>

              <FormField label="Status" htmlFor="status">
                <Select name="status" id="status" defaultValue={status}>
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </Select>
              </FormField>

              <FormField label="Type" htmlFor="type">
                <Select name="type" id="type" defaultValue={type}>
                  <option value="">All Types</option>
                  <option value="rent">Rent</option>
                  <option value="deposit">Deposit</option>
                  <option value="fee">Fee</option>
                  <option value="utilities">Utilities</option>
                </Select>
              </FormField>

              <FormField label="Tenant" htmlFor="tenant">
                <Select name="tenant" id="tenant" defaultValue={tenantId}>
                  <option value="">All Tenants</option>
                  {uniqueTenants.length > 0 ? (
                    uniqueTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No tenants available
                    </option>
                  )}
                </Select>
              </FormField>

              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Filter
                </Button>
              </div>
            </form>
        </Card>

        {/* Payments Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Payments ({paymentsData.total})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-900">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, paymentsData.total)} of {paymentsData.total} payments
            </p>
          </div>

          {paymentsData.payments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-900">Get started by recording a new payment.</p>
              <div className="mt-6">
                <Link
                  href="/admin/financial/payments/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Record Payment
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {paymentsData.payments.map((payment) => (
                <li key={payment.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(payment.amount)}
                            </p>
                            <span className="ml-2">
                              <PaymentStatusBadge status={payment.status} />
                            </span>
                            <span className="ml-2">
                              <Badge tone="purple">{payment.type}</Badge>
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-900">
                            <p>
                              {payment.tenantName} • {payment.buildingName} {payment.roomNumber}
                            </p>
                            <span className="mx-2">•</span>
                            <p>{formatDate(payment.paymentDate)}</p>
                          </div>
                          {payment.description && (
                            <p className="mt-1 text-sm text-gray-900">{payment.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/financial/payments/${payment.id}`}
                          className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}&search=${search}&status=${status}&type=${type}&tenant=${tenantId}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}&search=${search}&status=${status}&type=${type}&tenant=${tenantId}`}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-900">
                  Showing <span className="font-medium">{((page - 1) * 20) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * 20, paymentsData.total)}</span> of{' '}
                  <span className="font-medium">{paymentsData.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {page > 1 && (
                    <Link
                      href={`?page=${page - 1}&search=${search}&status=${status}&type=${type}&tenant=${tenantId}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  )}
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <Link
                        key={pageNum}
                        href={`?page=${pageNum}&search=${search}&status=${status}&type=${type}&tenant=${tenantId}`}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}

                  {page < totalPages && (
                    <Link
                      href={`?page=${page + 1}&search=${search}&status=${status}&type=${type}&tenant=${tenantId}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
    </div>
  );
} 