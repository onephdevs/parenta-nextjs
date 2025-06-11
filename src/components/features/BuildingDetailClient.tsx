'use client';

import { useState } from 'react';
import { Building } from '@/types/database';
import EditBuildingModal from '@/components/features/EditBuildingModal';

interface BuildingDetailClientProps {
  building: Building;
}

export default function BuildingDetailClient({ building }: BuildingDetailClientProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  return (
    <>
      <div className="space-y-4">
        <button
          onClick={handleOpenEditModal}
          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Building
        </button>
        
        <div className="text-sm text-gray-500">
          Update building information, address, amenities, and other details using the full-screen editor.
        </div>
      </div>

      <EditBuildingModal
        building={building}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
      />
    </>
  );
} 