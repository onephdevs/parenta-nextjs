import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getPayments } from '@/lib/api/payments';
import { getPaymentsHubStats, getUpcomingAndDueInvoices } from '@/lib/api/payments-hub';
import { getAllBuildings } from '@/lib/api/buildings';
import PaymentsHub from '@/components/features/PaymentsHub';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Banknote, Plus, Receipt, Wallet } from 'lucide-react';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  buildingId?: string;
}

interface PaymentsPageProps {
  searchParams: Promise<SearchParams>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const search = resolvedSearchParams.search || '';
  const status = resolvedSearchParams.status || '';
  const buildingId = resolvedSearchParams.buildingId || '';

  const upcomingStatus =
    status === 'due' || status === 'overdue' ? status : status === 'paid' ? undefined : 'all';

  let stats = {
    collectedThisMonth: 0,
    outstanding: 0,
    overdueCount: 0,
    penaltiesApplied: 0,
  };
  let upcoming: Awaited<ReturnType<typeof getUpcomingAndDueInvoices>> = [];
  let history: Awaited<ReturnType<typeof getPayments>> = {
    payments: [],
    total: 0,
  };
  let buildings: Array<{ id: string; name: string }> = [];

  try {
    const [statsResult, upcomingResult, historyResult, buildingsResult] = await Promise.all([
      getPaymentsHubStats(),
      status === 'paid'
        ? Promise.resolve([])
        : getUpcomingAndDueInvoices({
            search: search || undefined,
            buildingId: buildingId || undefined,
            status: upcomingStatus,
            limit: 50,
          }),
      status === 'due' || status === 'overdue'
        ? Promise.resolve({ payments: [], total: 0 })
        : getPayments(
            {
              search: search || undefined,
              buildingId: buildingId || undefined,
              paymentStatus: 'completed',
            },
            page,
            20
          ),
      getAllBuildings({ limit: 200 }),
    ]);

    stats = statsResult;
    upcoming = upcomingResult;
    history = historyResult;
    buildings = buildingsResult.buildings.map((b) => ({ id: b.id, name: b.name }));
  } catch (error) {
    console.error('Error loading payments hub:', error);
  }

  const historyTotalPages = Math.max(1, Math.ceil(history.total / 20));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payments"
        description="Track collections, dues, and payment history"
        actions={
          <Link href="/admin/financial/payments/new">
            <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />}>
              Record manual payment
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Collected this month"
          value={formatCurrency(stats.collectedThisMonth)}
          tone="green"
          icon={<Banknote className="h-5 w-5" />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding)}
          tone="yellow"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="Overdue"
          value={stats.overdueCount}
          tone="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Penalties applied"
          value={formatCurrency(stats.penaltiesApplied)}
          tone="default"
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>

      <PaymentsHub
        upcoming={upcoming}
        history={history.payments}
        buildings={buildings}
        searchParams={{
          search: resolvedSearchParams.search,
          status: resolvedSearchParams.status,
          buildingId: resolvedSearchParams.buildingId,
          page: resolvedSearchParams.page,
        }}
        historyTotal={history.total}
        historyPage={page}
        historyTotalPages={historyTotalPages}
      />
    </div>
  );
}
