'use client';

import Link from 'next/link';
import { Building } from '@/types/database';

interface BuildingCardProps {
  building: Building;
  viewMode: 'grid' | 'list';
}

export default function BuildingCard({ building, viewMode }: BuildingCardProps) {
  const formatAddress = (building: Building) => {
    return `${building.addressLine1}${building.addressLine2 ? `, ${building.addressLine2}` : ''}, ${building.city}, ${building.state} ${building.postalCode}`;
  };

  if (viewMode === 'list') {
    return (
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
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-sm font-medium text-gray-900">{formatAddress(building)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Units</p>
                  <p className="text-sm font-medium text-gray-900">{building.totalUnits} units</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Year Built</p>
                  <p className="text-sm font-medium text-gray-900">{building.yearBuilt || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{building.buildingType}</p>
                </div>
              </div>

              {building.amenities && building.amenities.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {building.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {amenity}
                      </span>
                    ))}
                    {building.amenities.length > 4 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        +{building.amenities.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        <div className="mt-2">
          <p className="text-sm text-gray-600">{formatAddress(building)}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Units</p>
            <p className="text-lg font-semibold text-gray-900">{building.totalUnits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Year Built</p>
            <p className="text-lg font-semibold text-gray-900">{building.yearBuilt || 'N/A'}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500">Type</p>
          <p className="text-sm font-medium text-gray-900 capitalize">{building.buildingType}</p>
        </div>

        {building.amenities && building.amenities.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Amenities</p>
            <div className="flex flex-wrap gap-1">
              {building.amenities.slice(0, 3).map((amenity) => (
                <span
                  key={amenity}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {amenity}
                </span>
              ))}
              {building.amenities.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                  +{building.amenities.length - 3}
                </span>
              )}
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
    </div>
  );
} 