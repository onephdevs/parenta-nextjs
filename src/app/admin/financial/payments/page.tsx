import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getPendingPaymentClaims } from '@/lib/api/payments';
import {
  getPaymentsHubList,
  getPaymentsHubPeriods,
  getPaymentsHubStats,
} from '@/lib/api/payments-hub';
import { getAllBuildings } from '@/lib/api/buildings';
import PaymentsHub from '@/components/features/PaymentsHub';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getTenantPaymentInstructions } from '@/lib/tenant-payment-instructions';
import { isTenantPaymentInstructionsConfigured } from '@/lib/tenant-payment-instructions-shared';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  buildingId?: string;
  dueDate?: string;
  type?: string;
  paymentPeriod?: string;
}

interface PaymentsPageProps {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 10;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseDueDateFilter(
  value?: string
):
  | 'upcoming_month'
  | 'overdue'
  | 'this_week'
  | 'this_month'
  | 'next_30'
  | 'past'
  | 'all'
  | undefined {
  if (
    value === 'upcoming_month' ||
    value === 'overdue' ||
    value === 'this_week' ||
    value === 'this_month' ||
    value === 'next_30' ||
    value === 'past' ||
    value === 'all'
  ) {
    return value;
  }
  return undefined;
}

function parseTypeFilter(
  value?: string
): 'rent' | 'utilities' | 'deposit' | 'penalty' | 'other' | undefined {
  if (
    value === 'rent' ||
    value === 'utilities' ||
    value === 'deposit' ||
    value === 'penalty' ||
    value === 'other'
  ) {
    return value;
  }
  return undefined;
}

function parseStatusFilter(
  value?: string
): 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | undefined {
  if (
    value === 'unpaid' ||
    value === 'partially_paid' ||
    value === 'paid' ||
    value === 'overdue'
  ) {
    return value;
  }
  return undefined;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || !['admin', 'caretaker'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const search = resolvedSearchParams.search || '';
  const status = parseStatusFilter(resolvedSearchParams.status);
  const buildingId = resolvedSearchParams.buildingId || '';
  const dueDate =
    parseDueDateFilter(resolvedSearchParams.dueDate) ?? 'upcoming_month';
  const type = parseTypeFilter(resolvedSearchParams.type);
  const paymentPeriod = resolvedSearchParams.paymentPeriod || '';

  let stats = {
    totalAmountDue: 0,
    totalAmountPaid: 0,
    totalBalance: 0,
    overdueCount: 0,
    unpaidCount: 0,
    partiallyPaidCount: 0,
  };
  let list: Awaited<ReturnType<typeof getPaymentsHubList>> = {
    rows: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
  };
  let pendingClaims: Awaited<ReturnType<typeof getPendingPaymentClaims>> = {
    payments: [],
    total: 0,
  };
  let buildings: Array<{ id: string; name: string }> = [];
  let periods: Awaited<ReturnType<typeof getPaymentsHubPeriods>> = [];

  try {
    const [statsResult, listResult, pendingResult, buildingsResult, periodsResult] =
      await Promise.all([
        getPaymentsHubStats(),
        getPaymentsHubList({
          search: search || undefined,
          buildingId: buildingId || undefined,
          dueDate: dueDate === 'all' ? undefined : dueDate,
          type,
          status,
          paymentPeriod: paymentPeriod || undefined,
          page,
          limit: PAGE_SIZE,
        }),
        getPendingPaymentClaims(),
        getAllBuildings({ limit: 200 }),
        getPaymentsHubPeriods(),
      ]);

    stats = statsResult;
    list = listResult;
    pendingClaims = pendingResult;
    buildings = buildingsResult.buildings.map((b) => ({ id: b.id, name: b.name }));
    periods = periodsResult;
  } catch (error) {
    console.error('Error loading payments hub:', error);
  }

  const totalPages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const pendingCount = pendingClaims.payments.length;
  let payDetailsConfigured = true;
  try {
    payDetailsConfigured = isTenantPaymentInstructionsConfigured(
      await getTenantPaymentInstructions()
    );
  } catch (error) {
    console.error('Error loading tenant pay details:', error);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payments"
        description="Review tenant receipts, confirm collections, and follow up on open invoices."
        actions={
          <Link href="/admin/financial/payments/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Process Payment</Button>
          </Link>
        }
      />

      {!payDetailsConfigured && (
        <Alert variant="warning" title="Tenant Pay now is blocked">
          <p>
            Settings → Tenant pay details has no GCash / bank number. Tenants who tap Pay now
            will be told to contact the office.{' '}
            <Link
              href="/admin/settings?tab=payments"
              className="font-semibold text-amber-900 underline"
            >
              Add tenant pay details
            </Link>
          </p>
        </Alert>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Outstanding"
          value={formatCurrency(stats.totalBalance)}
          footer={`${stats.unpaidCount + stats.partiallyPaidCount} open invoices`}
          icon={<Clock className="h-8 w-8 text-amber-600" />}
        />
        <ListSummaryCard
          title="Collected"
          value={formatCurrency(stats.totalAmountPaid)}
          footer={`${formatCurrency(stats.totalAmountDue)} billed`}
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
        />
        <ListSummaryCard
          title="Overdue"
          value={stats.overdueCount}
          footer="Past due date with a remaining balance"
          icon={<AlertTriangle className="h-8 w-8 text-red-600" />}
        />
        <ListSummaryCard
          title="Pending verification"
          value={pendingCount}
          footer="Receipts waiting for office confirmation"
          icon={<ShieldAlert className="h-8 w-8 text-amber-600" />}
        />
      </div>

      <PaymentsHub
        rows={list.rows}
        pendingClaims={pendingClaims.payments}
        buildings={buildings}
        periods={periods}
        searchParams={{
          search: resolvedSearchParams.search,
          status: resolvedSearchParams.status,
          buildingId: resolvedSearchParams.buildingId,
          dueDate,
          type: resolvedSearchParams.type,
          paymentPeriod: resolvedSearchParams.paymentPeriod,
          page: resolvedSearchParams.page,
        }}
        total={list.total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
