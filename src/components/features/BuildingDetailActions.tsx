'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import EditBuildingModal from '@/components/features/EditBuildingModal';
import AddRoomModal from '@/components/features/AddRoomModal';
import DeleteBuildingModal from '@/components/features/DeleteBuildingModal';
import { Button } from '@/components/ui/Button';

interface BuildingDetailActionsProps {
  buildingId: string;
  building: Building;
}

export default function BuildingDetailActions({ buildingId, building }: BuildingDetailActionsProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleDeleteBuilding = async () => {
    try {
      const response = await fetch(`/api/buildings/${buildingId}`, {
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

      // Redirect to buildings list
      router.push('/admin/properties');
    } catch (error) {
      console.error('Error deleting building:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete building. Please try again.',
      });
    }
  };

  return (
    <>
      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={handleOpenEditModal}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        >
          Edit Building
        </Button>
        <Button
          onClick={handleOpenAddRoomModal}
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          Add Room
        </Button>
        <Button
          variant="outline"
          onClick={handleOpenDeleteModal}
          className="border-red-300 text-red-700 hover:bg-red-50 focus-visible:ring-red-500"
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        >
          Delete Building
        </Button>
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

      <DeleteBuildingModal
        building={building}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onDelete={handleDeleteBuilding}
      />
    </>
  );
} 