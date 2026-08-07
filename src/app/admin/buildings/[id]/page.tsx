import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getBuildingWithRoomStats } from '@/lib/api/buildings';
import { Building } from '@/types/database';
import BuildingDetailActions from '@/components/features/BuildingDetailActions';
import BuildingDetailWithImages from '@/components/features/BuildingDetailWithImages';
import BuildingDetailClient from '@/components/features/BuildingDetailClient';
import RoomActionsClient from '@/components/features/RoomActionsClient';
import { getBuildingDepositConfig } from '@/lib/api/building-deposit-config';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  Alert,
  DescriptionItem,
  DescriptionList,
  DetailSection,
  MetricTile,
  PageHeader,
} from '@/components/ui';

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
      <div className="space-y-6 p-6">
        <Alert variant="danger" title={error}>
          Unable to load this building. Try again or return to the buildings list.
        </Alert>
        <Link
          href="/admin/properties"
          className="inline-flex text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Back to Buildings
        </Link>
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
    <div className="space-y-8 p-6 text-gray-900">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <Link href="/admin" className="inline-flex items-center hover:text-gray-900">
          <Home className="mr-1 h-4 w-4" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <Link href="/admin/properties" className="hover:text-gray-900">
          Buildings
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-gray-900">{building.name}</span>
      </nav>

      <PageHeader
        title={building.name}
        description={formatAddress(building)}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/properties"
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              title="Back to Buildings"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <BuildingDetailActions buildingId={building.id} building={building} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BuildingDetailWithImages building={building} />

          <DetailSection title="Rooms & Units">
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <RoomActionsClient
                building={building}
                totalRooms={roomStats.totalRooms}
                roomStatsContent={
                  <>
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <MetricTile label="Total Rooms" value={roomStats.totalRooms} />
                      <MetricTile label="Occupied Rooms" value={roomStats.occupiedRooms} />
                    </div>

                    <div className="mb-6 grid grid-cols-3 gap-4">
                      <MetricTile
                        label="Vacant"
                        value={roomStats.vacantRooms}
                        tone="green"
                      />
                      <MetricTile
                        label="Maintenance"
                        value={roomStats.maintenanceRooms}
                        tone="yellow"
                      />
                      <MetricTile
                        label="Reserved"
                        value={roomStats.reservedRooms}
                        tone="blue"
                      />
                    </div>

                    <div className="text-center">
                      <Link
                        href={`/admin/buildings/${building.id}/rooms`}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[#111827] px-4 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Manage All Rooms
                      </Link>
                    </div>
                  </>
                }
              />
            </div>
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title="Quick Stats">
            <DescriptionList>
              <DescriptionItem label="Occupancy Rate">
                {roomStats.occupancyRate}%
              </DescriptionItem>
              <DescriptionItem label="Available Units">
                {roomStats.vacantRooms}
              </DescriptionItem>
              <DescriptionItem label="Created">
                {new Date(building.createdAt).toLocaleDateString()}
              </DescriptionItem>
              <DescriptionItem label="Last Updated">
                {new Date(building.updatedAt).toLocaleDateString()}
              </DescriptionItem>
              {roomStats.totalRooms > 0 && (
                <>
                  <DescriptionItem label="Average Rent">
                    ${roomStats.averageRent.toLocaleString()}
                  </DescriptionItem>
                  <DescriptionItem label="Rent Range">
                    ${roomStats.minRent} - ${roomStats.maxRent}
                  </DescriptionItem>
                </>
              )}
            </DescriptionList>
          </DetailSection>

          {depositConfig ? (
            <DetailSection title="Deposit & Advance Rules">
              <DescriptionList>
                <DescriptionItem label="Deposit">
                  {depositConfig.depositType === 'months'
                    ? `${depositConfig.depositMonths} month${depositConfig.depositMonths !== 1 ? 's' : ''}`
                    : depositConfig.depositType === 'fixed'
                      ? formatCurrency(depositConfig.depositAmount || 0)
                      : `${depositConfig.depositPercentage || 0}%`}
                  {depositConfig.depositType === 'months' && roomStats.averageRent > 0 && (
                    <span className="ml-1 text-gray-500">
                      ({formatCurrency(roomStats.averageRent * depositConfig.depositMonths)})
                    </span>
                  )}
                </DescriptionItem>
                <DescriptionItem label="Advance">
                  {depositConfig.advanceType === 'months'
                    ? `${depositConfig.advanceMonths} month${depositConfig.advanceMonths !== 1 ? 's' : ''}`
                    : depositConfig.advanceType === 'fixed'
                      ? formatCurrency(depositConfig.advanceAmount || 0)
                      : `${depositConfig.advancePercentage || 0}%`}
                  {depositConfig.advanceType === 'months' && roomStats.averageRent > 0 && (
                    <span className="ml-1 text-gray-500">
                      ({formatCurrency(roomStats.averageRent * depositConfig.advanceMonths)})
                    </span>
                  )}
                </DescriptionItem>
                <DescriptionItem label="Utility Deposit">
                  {formatCurrency(depositConfig.utilityDepositAmount)}
                </DescriptionItem>
                <DescriptionItem label="Minimum Deposit">
                  {formatCurrency(depositConfig.minimumDepositAmount)}
                </DescriptionItem>
                <DescriptionItem label="Validity">
                  {depositConfig.depositValidityDays} day
                  {depositConfig.depositValidityDays !== 1 ? 's' : ''}
                </DescriptionItem>
                <DescriptionItem label="Non-Refundable After">
                  {depositConfig.depositRefundableAfterDays} day
                  {depositConfig.depositRefundableAfterDays !== 1 ? 's' : ''}
                </DescriptionItem>
              </DescriptionList>
            </DetailSection>
          ) : (
            <DetailSection title="Deposit & Advance Rules">
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <p className="text-sm text-gray-500">
                  No deposit configuration set. Configure via Edit Building.
                </p>
              </div>
            </DetailSection>
          )}

          <DetailSection
            title="Edit Building"
            description="Update building information and settings"
          >
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <BuildingDetailClient building={building} />
            </div>
          </DetailSection>
        </div>
      </div>
    </div>
  );
} 