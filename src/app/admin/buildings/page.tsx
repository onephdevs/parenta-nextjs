import { getAllBuildings } from '@/lib/api/buildings';
import { Building } from '@/types/database';
import BuildingsList from '@/components/features/BuildingsList';
import AddBuildingButton from '@/components/features/AddBuildingButton';
import Pagination from '@/components/ui/Pagination';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Alert } from '@/components/ui/Alert';
import { Building2, Home, MapPin } from 'lucide-react';

export const revalidate = 60;

interface BuildingsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BuildingsPage({ searchParams }: BuildingsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');

  let buildings: Building[] = [];
  let pagination = {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  let error: string | null = null;

  try {
    const buildingsData = await getAllBuildings({ page, limit: 50 });
    buildings = buildingsData.buildings;
    pagination = buildingsData.pagination;
  } catch (err) {
    console.error('Error fetching buildings:', err);
    error = 'Failed to load buildings';
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Buildings"
        description="Manage your property portfolio"
        actions={<AddBuildingButton />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Buildings"
          value={buildings.length}
          tone="purple"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Total Units"
          value={buildings.reduce((total, building) => total + (building.totalUnits || 0), 0)}
          tone="blue"
          icon={<Home className="h-5 w-5" />}
        />
        <StatCard
          title="Locations"
          value={new Set(buildings.map((b) => `${b.city}, ${b.state}`)).size}
          tone="green"
          icon={<MapPin className="h-5 w-5" />}
        />
      </div>

      {error && (
        <Alert variant="danger" title="Error Loading Buildings">
          {error}
        </Alert>
      )}

      <BuildingsList buildings={buildings} />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
      />
    </div>
  );
}
