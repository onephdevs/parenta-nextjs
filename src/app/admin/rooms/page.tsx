import Link from 'next/link';
import { getAllRooms, getRoomStats } from '@/lib/api/rooms';
import { getAllBuildings } from '@/lib/api/buildings';
import RoomsList from '@/components/features/RoomsList';
import Pagination from '@/components/ui/Pagination';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Building2, CheckCircle2, DoorOpen, PhilippinePeso } from 'lucide-react';

export const revalidate = 60;

interface RoomsPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function getRoomData(page: number) {
  try {
    const [roomsData, stats, buildingsData] = await Promise.all([
      getAllRooms({ page, limit: 50 }),
      getRoomStats(),
      getAllBuildings({ limit: 100 }),
    ]);

    return {
      rooms: roomsData.rooms,
      pagination: roomsData.pagination,
      stats,
      buildings: buildingsData.buildings,
    };
  } catch (error) {
    console.error('Error fetching room data:', error);
    return {
      rooms: [],
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

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');

  const { rooms, pagination, stats, buildings } = await getRoomData(page);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Rooms"
        description="Manage rooms across all properties"
        actions={
          <Link href="/admin/buildings">
            <Button variant="outline" leftIcon={<Building2 className="h-4 w-4" />}>
              Manage Buildings
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Rooms"
          value={stats?.total_rooms || 0}
          tone="blue"
          icon={<DoorOpen className="h-5 w-5" />}
        />
        <StatCard
          title="Occupied"
          value={stats?.occupied_rooms || 0}
          subtitle={`${stats?.occupancy_rate || 0}% occupancy`}
          tone="green"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Vacant"
          value={stats?.vacant_rooms || 0}
          subtitle="Available now"
          tone="yellow"
          icon={<DoorOpen className="h-5 w-5" />}
        />
        <StatCard
          title="Avg Rent"
          value={`₱${stats?.average_rent ? Math.round(stats.average_rent).toLocaleString() : 0}`}
          subtitle="per month"
          tone="purple"
          icon={<PhilippinePeso className="h-5 w-5" />}
        />
      </div>

      <RoomsList rooms={rooms} buildings={buildings} />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
      />
    </div>
  );
}
