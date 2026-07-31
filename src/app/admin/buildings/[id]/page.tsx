import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getBuildingWithRoomStats } from '@/lib/api/buildings';
import { Building } from '@/types/database';
import BuildingDetailActions from '@/components/features/BuildingDetailActions';
import BuildingDetailWithImages from '@/components/features/BuildingDetailWithImages';
import BuildingDetailClient from '@/components/features/BuildingDetailClient';
import RoomActionsClient from '@/components/features/RoomActionsClient';
import { getBuildingDepositConfig } from '@/lib/api/building-deposit-config';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface BuildingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildingDetailPage({ params }: BuildingDetailPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  // Redirect if not authenticated or not admin
  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  let buildingWithStats: (Building & { roomStats: any }) | null = null;
  let error: string | null = null;
  let depositConfig = null;

  try {
    buildingWithStats = await getBuildingWithRoomStats(id);
    if (!buildingWithStats) {
      notFound();
    }
    // Fetch deposit configuration
    try {
      depositConfig = await getBuildingDepositConfig(id);
    } catch (configError) {
      console.error('Error fetching deposit config:', configError);
      // Continue without deposit config - it's optional
    }
  } catch (err) {
    console.error('Error fetching building:', err);
    error = 'Failed to load building details';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!buildingWithStats) {
    return notFound();
  }

  const building = buildingWithStats;
  const roomStats = buildingWithStats.roomStats;

  const formatAddress = (building: Building) => {
    return `${building.addressLine1}${building.addressLine2 ? `, ${building.addressLine2}` : ''}, ${building.city}, ${building.state} ${building.postalCode}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
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
              href="/admin/buildings" 
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              Buildings
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-gray-900 font-medium">{building.name}</span>
          </div>
          
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/admin/buildings"
                className="mr-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to Buildings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{building.name}</h1>
                <p className="text-sm text-gray-900 mt-1">
                  {formatAddress(building)}
                </p>
              </div>
            </div>
            <BuildingDetailActions buildingId={building.id} building={building} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Building Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Building Details with Images */}
            <BuildingDetailWithImages building={building} />

            {/* Rooms/Units Section */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Rooms & Units</h3>
                </div>
                
                <RoomActionsClient 
                  building={building} 
                  totalRooms={roomStats.totalRooms}
                  roomStatsContent={
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{roomStats.totalRooms}</div>
                          <div className="text-sm text-gray-900">Total Rooms</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{roomStats.occupiedRooms}</div>
                          <div className="text-sm text-gray-900">Occupied Rooms</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-semibold text-green-700">{roomStats.vacantRooms}</div>
                          <div className="text-xs text-green-600">Vacant</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-lg font-semibold text-yellow-700">{roomStats.maintenanceRooms}</div>
                          <div className="text-xs text-yellow-600">Maintenance</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-semibold text-blue-700">{roomStats.reservedRooms}</div>
                          <div className="text-xs text-blue-600">Reserved</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Link
                          href={`/admin/buildings/${building.id}/rooms`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                          Manage All Rooms
                        </Link>
                      </div>
                    </>
                  }
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">Occupancy Rate</span>
                    <span className="text-sm font-medium text-gray-900">
                      {roomStats.occupancyRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">Available Units</span>
                    <span className="text-sm font-medium text-gray-900">
                      {roomStats.vacantRooms}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">Created</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(building.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900">Last Updated</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(building.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {roomStats.totalRooms > 0 && (
                    <>
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">Average Rent</span>
                          <span className="text-sm font-medium text-gray-900">
                            ${roomStats.averageRent.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-900">Rent Range</span>
                          <span className="text-sm font-medium text-gray-900">
                            ${roomStats.minRent} - ${roomStats.maxRent}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Deposit & Advance Rules */}
            {depositConfig ? (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Deposit & Advance Rules
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Deposit:</span>
                      <span className="text-gray-900 font-medium">
                        {depositConfig.depositType === 'months' 
                          ? `${depositConfig.depositMonths} month${depositConfig.depositMonths !== 1 ? 's' : ''}`
                          : depositConfig.depositType === 'fixed'
                          ? formatCurrency(depositConfig.depositAmount || 0)
                          : `${depositConfig.depositPercentage || 0}%`}
                        {depositConfig.depositType === 'months' && roomStats.averageRent > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({formatCurrency(roomStats.averageRent * depositConfig.depositMonths)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Advance:</span>
                      <span className="text-gray-900 font-medium">
                        {depositConfig.advanceType === 'months' 
                          ? `${depositConfig.advanceMonths} month${depositConfig.advanceMonths !== 1 ? 's' : ''}`
                          : depositConfig.advanceType === 'fixed'
                          ? formatCurrency(depositConfig.advanceAmount || 0)
                          : `${depositConfig.advancePercentage || 0}%`}
                        {depositConfig.advanceType === 'months' && roomStats.averageRent > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({formatCurrency(roomStats.averageRent * depositConfig.advanceMonths)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Utility Deposit:</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(depositConfig.utilityDepositAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Minimum Deposit:</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(depositConfig.minimumDepositAmount)}
                      </span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500">Validity:</span>
                        <span className="text-gray-900 font-medium">
                          {depositConfig.depositValidityDays} day{depositConfig.depositValidityDays !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Non-Refundable After:</span>
                        <span className="text-gray-900 font-medium">
                          {depositConfig.depositRefundableAfterDays} day{depositConfig.depositRefundableAfterDays !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                    Deposit & Advance Rules
                  </h3>
                  <p className="text-sm text-gray-500">
                    No deposit configuration set. Configure via Edit Building.
                  </p>
                </div>
              </div>
            )}

            {/* Edit Building */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Edit Building</h3>
                <p className="text-sm text-gray-900 mb-4">
                  Update building information and settings
                </p>
                <BuildingDetailClient building={building} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 