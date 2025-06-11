import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getAllBuildings } from '@/lib/api/buildings';
import { Building } from '@/types/database';
import BuildingsList from '@/components/features/BuildingsList';
import AddBuildingButton from '@/components/features/AddBuildingButton';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default async function BuildingsPage() {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not admin
  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin?role=admin');
  }

  let buildings: Building[] = [];
  let error: string | null = null;

  try {
    buildings = await getAllBuildings();
  } catch (err) {
    console.error('Error fetching buildings:', err);
    error = 'Failed to load buildings';
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Buildings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb 
        items={breadcrumbItems} 
        subtitle="Manage your property portfolio"
      >
        <AddBuildingButton />
      </Breadcrumb>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">Total Buildings</dt>
                <dd className="text-2xl font-semibold text-gray-900">{buildings.length}</dd>
              </div>
            </div>
          </div>

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
                <dt className="text-sm font-medium text-gray-500">Total Units</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {buildings.reduce((total, building) => total + building.totalUnits, 0)}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">Locations</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {new Set(buildings.map(b => `${b.city}, ${b.state}`)).size}
                </dd>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500">Avg Year Built</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {buildings.length > 0 
                    ? Math.round(buildings.filter(b => b.yearBuilt).reduce((total, building) => total + (building.yearBuilt || 0), 0) / buildings.filter(b => b.yearBuilt).length) || 'N/A'
                    : 'N/A'
                  }
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Buildings</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buildings List */}
        <BuildingsList buildings={buildings} />
      </main>
    </div>
  );
} 