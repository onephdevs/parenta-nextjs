import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Users, Percent, Banknote, DoorOpen } from 'lucide-react';
import ActiveTenantsList from '@/components/features/dashboard/ActiveTenantsList';
import ActivityLogsWidget from '@/components/features/dashboard/ActivityLogsWidget';
import NeedsAttentionWidget from '@/components/features/dashboard/NeedsAttentionWidget';
import DashboardReportsHub from '@/components/features/dashboard/DashboardReportsHub';

export const revalidate = 0;

interface DashboardStats {
  activeTenants: number;
  occupancyRate: number;
  collectedThisMonth: number;
  vacantRooms: number;
  monthLabel: string;
}

async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const { getOccupancyStats } = await import('@/lib/api/buildings');
    const pool = (await import('@/lib/db')).default;

    const tenantStatsQuery = `
      SELECT COUNT(*) FILTER (WHERE tenant_status = 'active')::int AS active_tenants
      FROM tenants
      WHERE is_active = true
    `;

    const collectedQuery = `
      SELECT COALESCE(SUM(amount), 0) AS collected
      FROM payments
      WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        AND payment_status IN ('paid', 'pending')
    `;

    const [occupancyStats, tenantStatsResult, collectedResult] = await Promise.all([
      getOccupancyStats(),
      pool.query(tenantStatsQuery),
      pool.query(collectedQuery),
    ]);

    const monthLabel = new Date().toLocaleDateString('en-PH', { month: 'short' });

    return {
      activeTenants: parseInt(tenantStatsResult.rows[0]?.active_tenants || '0', 10),
      occupancyRate: parseFloat(occupancyStats.occupancy_rate || '0'),
      collectedThisMonth: parseFloat(collectedResult.rows[0]?.collected || '0'),
      vacantRooms: parseInt(occupancyStats.vacant_rooms || '0', 10),
      monthLabel,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const stats = await getDashboardStats();

  const statCards = stats
    ? [
        {
          label: 'Active tenants',
          value: String(stats.activeTenants),
          icon: Users,
          iconWrap: 'bg-purple-50 text-purple-600',
        },
        {
          label: 'Occupancy rate',
          value: `${Math.round(stats.occupancyRate)}%`,
          icon: Percent,
          iconWrap: 'bg-emerald-50 text-emerald-600',
        },
        {
          label: `Collected (${stats.monthLabel})`,
          value: formatPhp(stats.collectedThisMonth),
          icon: Banknote,
          iconWrap: 'bg-blue-50 text-blue-600',
        },
        {
          label: 'Vacant rooms',
          value: String(stats.vacantRooms),
          icon: DoorOpen,
          iconWrap: 'bg-amber-50 text-amber-600',
        },
      ]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="mb-1 text-2xl font-bold text-gray-900 sm:text-3xl">
            Welcome back, {session.user.firstName}
          </h2>
          <p className="text-sm text-gray-600">
            Monitor what needs attention, then generate reports when you need them.
          </p>
        </div>

        {/* Actionable monitoring */}
        <NeedsAttentionWidget />

        {/* Monitoring: tenants + activity */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <ActiveTenantsList />
          </div>
          <div className="flex min-w-0 max-h-[min(40rem,calc(100vh-14rem))] flex-col gap-4 overflow-x-hidden overflow-y-auto lg:col-span-5 lg:sticky lg:top-4 xl:col-span-4">
            <ActivityLogsWidget />
          </div>
        </div>

        {/* On-demand reporting */}
        <DashboardReportsHub />

        {/* Summary metrics */}
        {statCards ? (
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.iconWrap}`}
                  >
                    <card.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-gray-900">{card.value}</p>
                <p className="mt-1 text-sm text-gray-500">{card.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
