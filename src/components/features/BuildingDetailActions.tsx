'use client';

import { useState } from 'react';
import { Building } from '@/types/database';
import EditBuildingModal from '@/components/features/EditBuildingModal';
import AddRoomModal from '@/components/features/AddRoomModal';

interface BuildingDetailActionsProps {
  buildingId: string;
  building: Building;
}

export default function BuildingDetailActions({ buildingId, building }: BuildingDetailActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleOpenAddRoomModal = () => {
    setIsAddRoomModalOpen(true);
  };

  const handleCloseAddRoomModal = () => {
    setIsAddRoomModalOpen(false);
  };

  return (
    <>
      <div className="flex space-x-3">
        <button 
          onClick={handleOpenEditModal}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Building
        </button>
        <button
          onClick={handleOpenAddRoomModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Room
        </button>
      </div>

      <EditBuildingModal
        building={building}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
      />

      <AddRoomModal
        buildingId={buildingId}
        building={building}
        isOpen={isAddRoomModalOpen}
        onClose={handleCloseAddRoomModal}
      />
    </>
  );
} 