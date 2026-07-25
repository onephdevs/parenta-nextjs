'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building } from '@/types/database';
import AddRoomModal from '@/components/features/AddRoomModal';
import { Button } from '@/components/ui/Button';

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
        <Link href={`/admin/buildings/${building.id}/rooms`}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
              </svg>
            }
          >
            View All Rooms
          </Button>
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
          <p className="mt-1 text-sm text-gray-900">
            Get started by adding your first room to this building.
          </p>
          <div className="mt-4">
            <Button onClick={handleOpenAddRoomModal}>
              Add First Room
            </Button>
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