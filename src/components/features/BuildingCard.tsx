'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  Building2,
  Users,
  Home,
  MapPin,
} from 'lucide-react';
import { Building } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import DeleteBuildingModal from '@/components/features/DeleteBuildingModal';
import EditBuildingModal from '@/components/features/EditBuildingModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AmenityBadges } from '@/components/domain/AmenityBadges';
import { BuildingStatusBadge } from '@/components/domain/StatusBadges';
import { formatAddress } from '@/lib/format/address';
import { normalizeAmenities } from '@/lib/format/amenities';
import { cn } from '@/lib/utils';

interface BuildingCardProps {
  building: Building;
  viewMode: 'grid' | 'list';
}

function StatLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
      <span className="text-gray-400">{icon}</span>
      {children}
    </p>
  );
}

function OccupancyValue({
  occupied,
  total,
}: {
  occupied: number;
  total: number;
}) {
  if (total <= 0) {
    return (
      <p className="text-sm font-medium leading-5 text-gray-400 italic">No units yet</p>
    );
  }
  return (
    <p className="text-lg font-semibold leading-5 text-gray-900">
      {occupied}/{total}
    </p>
  );
}

export default function BuildingCard({ building, viewMode }: BuildingCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showNotification } = useNotifications();

  const amenities = normalizeAmenities(building.amenities);
  const address = formatAddress(building);
  const occupied = building.occupiedUnits || 0;
  const totalUnits = building.totalUnits || 0;
  const detailHref = `/admin/buildings/${building.id}`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleDeleteBuilding = async () => {
    try {
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete building');
      }

      showNotification({
        type: 'success',
        title: 'Building deleted',
        message: `${building.name} has been deleted successfully.`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error deleting building:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message:
          error instanceof Error ? error.message : 'Failed to delete building. Please try again.',
      });
    }
  };

  const renderOverflowMenu = () => (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Building actions"
        aria-expanded={isMenuOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-gray-100 bg-white shadow-lg ring-1 ring-black/5">
          <div className="py-1">
            <Link
              href={detailHref}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              View Details
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
            >
              Edit Building
            </button>
            <Link
              href={`/admin/buildings/${building.id}/rooms`}
              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Manage Rooms
            </Link>
            <div className="border-t border-gray-100" />
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
            >
              Delete Building
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const modals = (
    <>
      <DeleteBuildingModal
        building={building}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteBuilding}
      />
      <EditBuildingModal
        building={building}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );

  /** Fixed header block so wrapped name/address don't shift tertiary content unevenly */
  const headerBlock = (
    <div className="min-h-[5.5rem]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-xl font-bold leading-snug text-gray-900">
          <Link
            href={detailHref}
            className="line-clamp-2 break-words hover:text-purple-700"
            title={building.name}
          >
            {building.name}
          </Link>
        </h3>
        <div className="flex flex-shrink-0 items-center gap-2.5 pt-0.5">
          <BuildingStatusBadge isActive={building.isActive !== false} />
          {renderOverflowMenu()}
        </div>
      </div>
      <p
        className="mt-2 flex items-start gap-1.5 text-sm leading-snug text-gray-500"
        title={address}
      >
        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        <span className="line-clamp-2 break-words">{address}</span>
      </p>
    </div>
  );

  /** Units / Occupancy share a fixed value-row height so empty copy never misaligns */
  const statsBlock = (
    <div className="mt-5 grid grid-cols-2 gap-4">
      <div className="min-h-[3.25rem]">
        <StatLabel icon={<Building2 className="h-3.5 w-3.5" />}>Units</StatLabel>
        <p className="mt-1.5 text-lg font-semibold leading-5 text-gray-900">{totalUnits}</p>
      </div>
      <div className="min-h-[3.25rem]">
        <StatLabel icon={<Users className="h-3.5 w-3.5" />}>Occupancy</StatLabel>
        <div className="mt-1.5">
          <OccupancyValue occupied={occupied} total={totalUnits} />
        </div>
      </div>
    </div>
  );

  const typeBlock = (
    <div className="mt-4">
      <StatLabel icon={<Home className="h-3.5 w-3.5" />}>Type</StatLabel>
      <p className="mt-1.5 text-sm font-medium capitalize text-gray-700">
        {building.buildingType || '—'}
      </p>
    </div>
  );

  const amenitiesBlock = (
    <div className="mt-4 min-h-[3.5rem]">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Amenities
      </p>
      <AmenityBadges amenities={amenities} tone="purple" />
    </div>
  );

  if (viewMode === 'list') {
    return (
      <>
        <Card
          padding="none"
          className="border border-gray-100 shadow-sm transition-shadow duration-200 hover:border-purple-100 hover:shadow-md"
        >
          <div className="p-6">
            {headerBlock}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="min-h-[3.25rem]">
                <StatLabel icon={<Building2 className="h-3.5 w-3.5" />}>Units</StatLabel>
                <p className="mt-1.5 text-sm font-semibold text-gray-900">{totalUnits}</p>
              </div>
              <div className="min-h-[3.25rem]">
                <StatLabel icon={<Users className="h-3.5 w-3.5" />}>Occupancy</StatLabel>
                <div className="mt-1.5">
                  <OccupancyValue occupied={occupied} total={totalUnits} />
                </div>
              </div>
              <div>
                <StatLabel icon={<Home className="h-3.5 w-3.5" />}>Type</StatLabel>
                <p className="mt-1.5 text-sm font-medium capitalize text-gray-700">
                  {building.buildingType || '—'}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Amenities
                </p>
                <AmenityBadges amenities={amenities} tone="purple" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Link href={detailHref} className="flex-1 sm:flex-none">
                <Button size="sm" className="w-full sm:w-auto">
                  View Details
                </Button>
              </Link>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 sm:flex-none"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit
              </Button>
            </div>
          </div>
        </Card>
        {modals}
      </>
    );
  }

  return (
    <>
      <Card
        padding="none"
        className={cn(
          'flex h-full flex-col border border-gray-100 shadow-sm',
          'transition-all duration-200 hover:border-purple-100 hover:shadow-md'
        )}
      >
        <div className="flex h-full flex-col p-6">
          {headerBlock}
          {statsBlock}
          {typeBlock}
          {amenitiesBlock}

          {/* Actions stay explicit buttons — matches TenantCard (not whole-card click) */}
          <div className="mt-auto flex gap-3 pt-6">
            <Link href={detailHref} className="flex-1">
              <Button className="w-full" size="sm">
                View Details
              </Button>
            </Link>
            <Button
              className="flex-1"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit
            </Button>
          </div>
        </div>
      </Card>
      {modals}
    </>
  );
}
