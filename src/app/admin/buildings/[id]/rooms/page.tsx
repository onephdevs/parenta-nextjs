import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { getBuildingById } from '@/lib/api/buildings';
import { getRoomsByBuildingId } from '@/lib/api/rooms';
import { getAllBuildings } from '@/lib/api/buildings';
import RoomsList from '@/components/features/RoomsList';

interface BuildingRoomsPageProps {
  params: Promise<{ id: string }>;
}

async function getBuildingRoomsData(buildingId: string) {
  try {
    const [building, rooms, buildingsData] = await Promise.all([
      getBuildingById(buildingId),
      getRoomsByBuildingId(buildingId),
      getAllBuildings({ limit: 1000 }) // Get all buildings for navigation
    ]);
    
    return { building, rooms, allBuildings: buildingsData.buildings };
  } catch (error) {
    console.error('Error fetching building rooms data:', error);
    return { building: null, rooms: [], allBuildings: [] };
  }
}

export default async function BuildingRoomsPage({ params }: BuildingRoomsPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  // Redirect if not authenticated or not admin
  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { building, rooms, allBuildings } = await getBuildingRoomsData(id);

  if (!building) {
    notFound();
  }

  // Calculate building-specific stats
  const buildingStats = {
    total_rooms: rooms.length,
    vacant_rooms: rooms.filter(r => r.roomStatus === 'vacant').length,
    occupied_rooms: rooms.filter(r => r.roomStatus === 'occupied').length,
    maintenance_rooms: rooms.filter(r => r.roomStatus === 'maintenance').length,
    reserved_rooms: rooms.filter(r => r.roomStatus === 'reserved').length,
    occupancy_rate: rooms.length > 0 ? 
      Math.round((rooms.filter(r => r.roomStatus === 'occupied').length / rooms.length) * 100) : 0,
    average_rent: rooms.length > 0 ? 
      rooms.reduce((sum, room) => sum + parseFloat(room.monthlyRate), 0) / rooms.length : 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 py-3 border-b border-gray-200">
            <Link 
              href="/admin" 
              className="text-sm text-gray-900 hover:text-gray-900 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href="/admin/properties" 
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              Buildings
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href={`/admin/buildings/${building.id}`} 
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              {building.name}
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-gray-900 font-medium">Rooms</span>
          </div>
          
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link 
                href={`/admin/buildings/${building.id}`}
                className="mr-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to Building"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Rooms in {building.name}</h1>
                <p className="text-sm text-gray-900 mt-1">
                  {building.addressLine1}, {building.city}, {building.state} {building.zipCode}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/admin/rooms"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
                </svg>
                All Rooms
              </Link>
              <Link
                href={`/admin/buildings/${building.id}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Building Details
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Building Stats for Rooms */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-900">Total Rooms</dt>
                <dd className="text-2xl font-semibold text-gray-900">{buildingStats.total_rooms}</dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-900">Occupied</dt>
                <dd className="text-2xl font-semibold text-gray-900">{buildingStats.occupied_rooms}</dd>
                <dd className="text-xs text-gray-900">{buildingStats.occupancy_rate}% occupancy</dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-900">Vacant</dt>
                <dd className="text-2xl font-semibold text-gray-900">{buildingStats.vacant_rooms}</dd>
                <dd className="text-xs text-gray-900">Available now</dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-900">Avg Rent</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  ${buildingStats.average_rent ? Math.round(buildingStats.average_rent).toLocaleString() : 0}
                </dd>
                <dd className="text-xs text-gray-900">per month</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms List - filtered to this building */}
        <RoomsList 
          rooms={rooms} 
          buildings={allBuildings}
        />
      </main>
    </div>
  );
} 