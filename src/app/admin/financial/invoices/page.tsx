import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getInvoices, getInvoiceSummary } from '@/lib/api/invoices';
import { getAllTenants } from '@/lib/api/tenants';
import { PageHeader, ListSummaryCard, Button, EmptyState, FilterBar, SearchInput, Select, Pagination, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { AlertTriangle, CheckCircle2, Clock, Eye, FileText, Plus } from 'lucide-react';
import { FormField } from '@/components/forms/FormField';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';

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

      <form method="GET">
        <FilterBar columns={4}>
          <FormField label="Search" htmlFor="search">
            <SearchInput
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
        </FilterBar>
      </form>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {invoicesData.invoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="Get started by creating a new invoice"
            action={
              <Link href="/admin/financial/invoices/new">
                <Button leftIcon={<Plus className="h-4 w-4" />}>Create Invoice</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesData.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      {invoice.description && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                          {invoice.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.tenantName || '—'}
                      </div>
                      {(invoice as { buildingName?: string }).buildingName && (
                        <div className="text-sm text-gray-600">
                          {(invoice as { buildingName?: string }).buildingName}{' '}
                          {(invoice as { roomNumber?: string }).roomNumber || ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/financial/invoices/${invoice.id}`}
                        className="inline-flex text-gray-500 hover:text-gray-900"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
 