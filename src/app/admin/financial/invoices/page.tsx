import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getInvoices, getInvoiceSummary } from '@/lib/api/invoices';
import { getAllTenants } from '@/lib/api/tenants';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, CheckCircle2, Clock, Eye, FileText, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';
import Pagination from '@/components/ui/Pagination';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  tenant?: string;
}

interface InvoicesPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const page = parseInt(params.page || '1');
  const search = params.search || '';
  const status = params.status || '';
  const tenantId = params.tenant || '';

  // Build filters (tenant IDs are UUIDs — keep as string)
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (tenantId) filters.tenantId = tenantId;
  if (search) filters.search = search;

  // Fetch data with error handling
  let invoicesData, tenants, summary;
  
  try {
    const [invoicesResult, tenantsData, summaryResult] = await Promise.all([
      getInvoices(filters, page, 20),
      getAllTenants({ limit: 1000 }), // Get all tenants for dropdown
      getInvoiceSummary()
    ]);
    
    invoicesData = invoicesResult;
    tenants = Array.isArray(tenantsData.tenants) ? tenantsData.tenants : []; // Ensure tenants is always an array
    summary = summaryResult;
  } catch (error) {
    console.error('Error loading invoices:', error);
    // Return empty data if there's an error
    invoicesData = {
      invoices: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    };
    tenants = [];
    summary = null;
  }

  // Deduplicate tenants by id so option keys are unique (getAllTenants may return duplicates)
  const uniqueTenants = Array.isArray(tenants)
    ? tenants.filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i)
    : [];

  if (!summary) {
    summary = {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      paidInvoices: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      overdueInvoices: 0,
      paidCount: 0,
      sentCount: 0,
      overdueCount: 0,
      draftCount: 0,
      unpaidInvoices: 0,
      unpaidAmount: 0,
    };
  }

  const formatCurrency = (amount: number) => {
    const value = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(invoicesData.total / 20);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Invoice Management"
        description="Create, track, and collect invoices"
        actions={
          <Link href="/admin/financial/invoices/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Create Invoice</Button>
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Paid Invoices"
          value={formatCurrency(summary.paidAmount)}
          footer={`${summary.paidInvoices} invoices`}
          icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Unpaid Invoices"
          value={formatCurrency(summary.unpaidAmount)}
          footer={`${summary.unpaidInvoices} invoices`}
          icon={<Clock className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="Overdue"
          value={formatCurrency(summary.overdueAmount)}
          footer={`${summary.overdueInvoices} invoices`}
          icon={<AlertTriangle className="h-8 w-8 text-red-600" />}
        />
        <ListSummaryCard
          title="Total Invoices"
          value={summary.totalInvoices}
          footer={`${formatCurrency(summary.totalAmount)} total value`}
          icon={<FileText className="h-8 w-8 text-blue-600" />}
        />
      </div>

      <Card className="mb-6">
        <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Search" htmlFor="search">
            <Input
              type="text"
              name="search"
              id="search"
              defaultValue={search}
              placeholder="Invoice #, tenant..."
            />
          </FormField>

          <FormField label="Status" htmlFor="status">
            <Select name="status" id="status" defaultValue={status}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
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
              Apply filters
            </Button>
          </div>
        </form>
      </Card>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {invoicesData.invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="mb-2 text-lg font-medium">No invoices found</p>
            <p className="mb-4 text-sm text-gray-600">Get started by creating a new invoice</p>
            <Link href="/admin/financial/invoices/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Create Invoice</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invoicesData.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        {invoice.description && (
                          <div className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                            {invoice.description}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.tenantName || '—'}
                        </div>
                        {(invoice as { buildingName?: string }).buildingName && (
                          <div className="text-sm text-gray-600">
                            {(invoice as { buildingName?: string }).buildingName}{' '}
                            {(invoice as { roomNumber?: string }).roomNumber || ''}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/admin/financial/invoices/${invoice.id}`}
                          className="inline-flex text-gray-500 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, totalPages)}
              totalItems={invoicesData.total}
              itemsPerPage={20}
            />
          </>
        )}
      </div>
    </div>
  );
}
 