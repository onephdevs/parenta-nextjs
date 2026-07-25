import Link from 'next/link';
import { getAllTenants, getTenantStats } from '@/lib/api/tenants';
import { getAllBuildings } from '@/lib/api/buildings';
import TenantsList from '@/components/features/TenantsList';
import Pagination from '@/components/ui/Pagination';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Tenant } from '@/types/database';
import { CheckCircle2, Clock, PhilippinePeso, Plus, Users } from 'lucide-react';

export const revalidate = 60;

interface TenantsPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function getTenantsData(page: number) {
  try {
    const [tenantsData, stats, buildingsData] = await Promise.all([
      getAllTenants({ page, limit: 50 }),
      getTenantStats(),
      getAllBuildings({ limit: 100 }),
    ]);

    return {
      tenants: tenantsData.tenants,
      pagination: tenantsData.pagination,
      stats,
      buildings: buildingsData.buildings,
    };
  } catch (error) {
    console.error('Error fetching tenants data:', error);
    return {
      tenants: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      stats: null,
      buildings: [],
    };
  }
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');

  const { tenants, pagination, stats, buildings } = await getTenantsData(page);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Tenants"
        description="Manage your tenant relationships"
        actions={
          <Link href="/admin/tenants/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Tenant</Button>
          </Link>
        }
      />

      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tenants"
            value={stats.total || 0}
            tone="purple"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Active Tenants"
            value={stats.active || 0}
            tone="green"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            title="Pending Tenants"
            value={stats.pending || 0}
            tone="yellow"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Avg. Income"
            value={`₱${stats.averageIncome ? Math.round(stats.averageIncome).toLocaleString() : '0'}`}
            tone="blue"
            icon={<PhilippinePeso className="h-5 w-5" />}
          />
        </div>
      )}

      <TenantsList tenants={tenants as Tenant[]} buildings={buildings} />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
      />
    </div>
  );
}
