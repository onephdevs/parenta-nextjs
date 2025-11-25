'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Building } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import DeleteBuildingModal from '@/components/features/DeleteBuildingModal';

interface BuildingCardProps {
  building: Building;
  viewMode: 'grid' | 'list';
}

export default function BuildingCard({ building, viewMode }: BuildingCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showNotification } = useNotifications();

  // Close menu when clicking outside
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

      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error deleting building:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete building. Please try again.',
      });
    }
  };

  const formatAddress = (building: Building) => {
    return `${building.addressLine1}${building.addressLine2 ? `, ${building.addressLine2}` : ''}, ${building.city}, ${building.state} ${building.postalCode}`;
  };

  if (viewMode === 'list') {
    return (
      <>
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-600">
                    <Link href={`/admin/buildings/${building.id}`}>
                      {building.name}
                    </Link>
                  </h3>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                    <div className="relative" ref={menuRef}>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsMenuOpen(!isMenuOpen);
                        }}
                        className="text-gray-400 hover:text-gray-900 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                            <Link
                              href={`/admin/buildings/${building.id}`}
                              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                            >
                              View Details
                            </Link>
                            <button
                              onClick={() => {
                                router.push(`/admin/buildings/${building.id}`);
                                setIsMenuOpen(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                            >
                              Edit Building
                            </button>
                            <Link
                              href={`/admin/buildings/${building.id}/rooms`}
                              className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                            >
                              Manage Rooms
                            </Link>
                            <div className="border-t border-gray-100"></div>
                            <button
                              onClick={() => {
                                setIsDeleteModalOpen(true);
                                setIsMenuOpen(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              Delete Building
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-900">Address</p>
                    <p className="text-sm font-medium text-gray-900">{formatAddress(building)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Total Units</p>
                    <p className="text-sm font-medium text-gray-900">{building.totalUnits} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Type</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{building.buildingType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">Occupancy</p>
                    <p className="text-sm font-medium text-gray-900">
                      {building.occupiedUnits || 0}/{building.totalUnits || 0}
                    </p>
                  </div>
                </div>

                {building.amenities && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-800 bg-gray-100 px-2 py-1 rounded-md">
                      {building.amenities}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DeleteBuildingModal
          building={building}
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={handleDeleteBuilding}
        />
      </>
    );
  }

  // Grid view
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-purple-600">
            <Link href={`/admin/buildings/${building.id}`}>
              {building.name}
            </Link>
          </h3>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="text-gray-400 hover:text-gray-900 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <Link
                    href={`/admin/buildings/${building.id}`}
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => {
                      router.push(`/admin/buildings/${building.id}`);
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                  >
                    Edit Building
                  </button>
                  <Link
                    href={`/admin/buildings/${building.id}/rooms`}
                    className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Manage Rooms
                  </Link>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete Building
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2">
          <p className="text-sm text-gray-900">{formatAddress(building)}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-900">Units</p>
            <p className="text-lg font-semibold text-gray-900">{building.totalUnits || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-900">Occupancy</p>
            <p className="text-lg font-semibold text-gray-900">
              {building.occupiedUnits || 0}/{building.totalUnits || 0}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-900">Type</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{building.buildingType}</p>
        </div>

        {building.amenities && (
          <div className="mt-4">
            <p className="text-sm text-gray-900 mb-2">Amenities</p>
            <div className="text-sm text-gray-900">
              {building.amenities}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
          <Link
            href={`/admin/buildings/${building.id}`}
            className="text-sm font-medium text-purple-600 hover:text-purple-500"
          >
            View Details →
          </Link>
        </div>
      </div>

      <DeleteBuildingModal
        building={building}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteBuilding}
      />
    </div>
  );
} 