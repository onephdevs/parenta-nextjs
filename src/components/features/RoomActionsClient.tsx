'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building } from '@/types/database';
import AddRoomModal from '@/components/features/AddRoomModal';

interface RoomActionsClientProps {
  building: Building;
  totalRooms: number;
  roomStatsContent?: React.ReactNode;
}

export default function RoomActionsClient({ building, totalRooms, roomStatsContent }: RoomActionsClientProps) {
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

  const handleOpenAddRoomModal = () => {
    setIsAddRoomModalOpen(true);
  };

  const handleCloseAddRoomModal = () => {
    setIsAddRoomModalOpen(false);
  };

  return (
    <>
      {/* Header Actions */}
      <div className="flex space-x-2">
        <Link
          href={`/admin/buildings/${building.id}/rooms`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
          </svg>
          View All Rooms
        </Link>
      </div>

      {/* Content Area */}
      {totalRooms > 0 ? (
        roomStatsContent
      ) : (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Rooms Yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first room to this building.
          </p>
          <div className="mt-4">
            <button
              onClick={handleOpenAddRoomModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Add First Room
            </button>
          </div>
        </div>
      )}

      <AddRoomModal
        buildingId={building.id}
        building={building}
        isOpen={isAddRoomModalOpen}
        onClose={handleCloseAddRoomModal}
      />
    </>
  );
} 