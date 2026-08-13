import { getAllTenants, getTenantStats } from '@/lib/api/tenants';
import { getAllBuildings } from '@/lib/api/buildings';
import { getTenantListInsights } from '@/lib/services/tenant-list-insights';
import TenantsList from '@/components/features/TenantsList';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Tenant } from '@/types/database';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import { CheckCircle2, Clock, PhilippinePeso, Users } from 'lucide-react';

export const revalidate = 60;

async function getTenantsData() {
  try {
    const [tenantsData, stats, buildingsData] = await Promise.all([
      getAllTenants({ page: 1, limit: 500 }),
      getTenantStats(),
      getAllBuildings({ limit: 100 }),
    ]);

    const tenantIds = tenantsData.tenants.map((t) => t.id);
    const insightsMap = await getTenantListInsights(tenantIds);
    const tenants = tenantsData.tenants.map((t) => ({
      ...t,
      insights: insightsMap[t.id],
    }));

    return {
      tenants,
      stats,
      buildings: buildingsData.buildings,
    };
  } catch (error) {
    console.error('Error fetching tenants data:', error);
    return {
      tenants: [],
      stats: null,
      buildings: [],
    };
  }
}

export default async function TenantsPage() {
  const { tenants, stats, buildings } = await getTenantsData();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tenants"
        description="Manage your tenant relationships"
        actions={<AddTenantButton />}
      />

      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ListSummaryCard
            title="Total Tenants"
            value={stats.total || 0}
            footer="all tenants"
            icon={<Users className="h-8 w-8 text-blue-600" />}
          />
          <ListSummaryCard
            title="Active Tenants"
            value={stats.active || 0}
            footer="currently active"
            icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
          />
          <ListSummaryCard
            title="Pending Tenants"
            value={stats.pending || 0}
            footer="awaiting activation"
            icon={<Clock className="h-8 w-8 text-yellow-600" />}
          />
          <ListSummaryCard
            title="Avg. Income"
            value={`₱${stats.averageIncome ? Math.round(stats.averageIncome).toLocaleString() : '0'}`}
            footer="monthly average"
            icon={<PhilippinePeso className="h-8 w-8 text-blue-600" />}
          />
        </div>
      )}

      <TenantsList tenants={tenants as Tenant[]} buildings={buildings} />
    </div>
  );
}
