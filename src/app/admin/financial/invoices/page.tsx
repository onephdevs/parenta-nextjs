import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getInvoices, getInvoiceSummary } from '@/lib/api/invoices';
import { getAllTenants } from '@/lib/api/tenants';
import { PageHeader, ListSummaryCard, Button, EmptyState, Pagination, TableCard, WorkItemRow } from '@/components/ui';
import { AlertTriangle, CheckCircle2, Clock, FileText, Plus } from 'lucide-react';
import { InvoicesFilterBar } from '@/components/features/InvoicesFilterBar';
import { formatShortDate } from '@/lib/utils';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

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
  
  if (!session || !['admin','caretaker'].includes(session.user.role)) {
    redirect('/auth/signin');
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
      getAllTenants({ limit: 200 }),
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

  const invoiceStatusTone = (status: string): WorkItemTone => {
    const key = (status || '').toLowerCase();
    if (key === 'paid') return 'success';
    if (key === 'overdue') return 'danger';
    if (key === 'partial' || key === 'pending' || key === 'due') return 'warning';
    if (key === 'issued' || key === 'sent') return 'info';
    return 'neutral';
  };

  const invoiceStatusLabel = (status: string) => {
    const key = (status || '').toLowerCase();
    if (key === 'due') return 'Due';
    if (key === 'overdue') return 'Overdue';
    if (key === 'sent') return 'Sent';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

      <InvoicesFilterBar
        search={search}
        status={status}
        tenantId={tenantId}
        tenants={uniqueTenants}
        shown={invoicesData.invoices.length}
        total={invoicesData.total}
      />

      <TableCard title="Invoices" description="Open an invoice from the View action.">
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
            {invoicesData.invoices.map((invoice) => {
              const statusTone = invoiceStatusTone(invoice.status);
              const statusLabel = invoiceStatusLabel(invoice.status);
              const location = [
                (invoice as { buildingName?: string }).buildingName,
                (invoice as { roomNumber?: string }).roomNumber,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <WorkItemRow
                  key={invoice.id}
                  href={`/admin/financial/invoices/${invoice.id}`}
                  title={invoice.tenantName || invoice.invoiceNumber}
                  subtitle={location || invoice.invoiceNumber}
                  badges={[{ key: 'status', label: statusLabel, tone: statusTone }]}
                  date={formatShortDate(invoice.dueDate)}
                  metaLabel={formatCurrency(invoice.totalAmount)}
                  metaTone={
                    statusTone === 'danger'
                      ? 'danger'
                      : statusTone === 'warning'
                        ? 'warning'
                        : 'default'
                  }
                  dotTone={statusTone}
                />
              );
            })}
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, totalPages)}
              totalItems={invoicesData.total}
              itemsPerPage={20}
            />
          </>
        )}
      </TableCard>
    </div>
  );
}
 