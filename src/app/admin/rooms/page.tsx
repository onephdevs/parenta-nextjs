import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getAllRooms, getRoomStats } from '@/lib/api/rooms';
import { getAllBuildings } from '@/lib/api/buildings';
import RoomsList from '@/components/features/RoomsList';
import Breadcrumb from '@/components/ui/Breadcrumb';

async function getRoomData() {
  try {
    const [rooms, stats, buildings] = await Promise.all([
      getAllRooms(),
      getRoomStats(),
      getAllBuildings()
    ]);
    
    return { rooms, stats, buildings };
  } catch (error) {
    console.error('Error fetching room data:', error);
    return { rooms: [], stats: null, buildings: [] };
  }
}

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not admin
  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin?role=admin');
  }

  const { rooms, stats, buildings } = await getRoomData();

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Rooms' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb 
        items={breadcrumbItems} 
        subtitle="Manage rooms across all properties"
      >
        <Link
          href="/admin/buildings"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Manage Buildings
        </Link>
      </Breadcrumb>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
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
                <dt className="text-sm font-medium text-gray-500">Total Rooms</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats?.total_rooms || 0}</dd>
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
                <dt className="text-sm font-medium text-gray-500">Occupied</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats?.occupied_rooms || 0}</dd>
                <dd className="text-xs text-gray-500">{stats?.occupancy_rate || 0}% occupancy</dd>
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
                <dt className="text-sm font-medium text-gray-500">Vacant</dt>
                <dd className="text-2xl font-semibold text-gray-900">{stats?.vacant_rooms || 0}</dd>
                <dd className="text-xs text-gray-500">Available now</dd>
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
                <dt className="text-sm font-medium text-gray-500">Avg Rent</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  ${stats?.average_rent ? Math.round(stats.average_rent).toLocaleString() : 0}
                </dd>
                <dd className="text-xs text-gray-500">per month</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms List */}
        <RoomsList 
          rooms={rooms} 
          buildings={buildings}
        />
      </main>
    </div>
  );
} 