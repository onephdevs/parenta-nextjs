import { Suspense } from 'react';
import { getAllBuildings } from '@/lib/api/buildings';
import { getRoomsForRoomsPage } from '@/lib/api/properties';
import RoomsMasterDetail from '@/components/features/rooms/RoomsMasterDetail';
import { Alert } from '@/components/ui/Alert';

export const revalidate = 0;

interface RoomsPageProps {
  searchParams: Promise<{ roomId?: string; page?: string }>;
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const params = await searchParams;

  let rooms = null;
  let buildings = null;

  try {
    const [roomsData, buildingsData] = await Promise.all([
      getRoomsForRoomsPage(),
      getAllBuildings({ limit: 200 }),
    ]);
    rooms = roomsData;
    buildings = buildingsData.buildings;
  } catch (err) {
    console.error('Error fetching rooms page data:', err);
  }

  if (rooms === null || buildings === null) {
    return (
      <div className="p-6">
        <Alert variant="danger" title="Error Loading Rooms">
          Failed to load rooms. Please try again.
        </Alert>
      </div>
    );
  }

  const initialRoomId =
    params.roomId && rooms.some((r) => r.id === params.roomId)
      ? params.roomId
      : rooms[0]?.id || null;

  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-gray-500">
          Loading rooms…
        </div>
      }
    >
      <RoomsMasterDetail
        initialRooms={rooms}
        buildings={buildings}
        initialRoomId={initialRoomId}
      />
    </Suspense>
  );
}
