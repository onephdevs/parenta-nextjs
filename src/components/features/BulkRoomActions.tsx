'use client';

import { useState } from 'react';
import { Room } from '@/types/database';
import { useNotifications } from '@/context/NotificationContext';

interface BulkRoomActionsProps {
  selectedRooms: Room[];
  onSelectionChange: (roomIds: string[]) => void;
  onBulkUpdate: () => void;
}

export default function BulkRoomActions({ selectedRooms, onSelectionChange, onBulkUpdate }: BulkRoomActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const { showNotification, updateNotification } = useNotifications();

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedRooms.length === 0) return;

    setIsUpdating(true);
    
    const loadingId = showNotification({
      type: 'loading',
      title: 'Updating rooms...',
      message: `Updating status for ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'}.`
    });

    try {
      const updatePromises = selectedRooms.map(room =>
        fetch(`/api/rooms/${room.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomStatus: bulkStatus }),
        })
      );

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter(result => !result.ok);

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} room${failedUpdates.length === 1 ? '' : 's'}`);
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Rooms updated successfully!',
        message: `Updated status for ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'} to "${bulkStatus}".`
      });

      // Clear selection and refresh
      onSelectionChange([]);
      setBulkStatus('');
      onBulkUpdate();

    } catch (error) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to update rooms',
        message: error instanceof Error ? error.message : 'An error occurred during the bulk update.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (selectedRooms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-700">
            <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{selectedRooms.length}</span>
            <span className="ml-1">room{selectedRooms.length === 1 ? '' : 's'} selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="bulkStatus" className="text-sm font-medium text-gray-700">
              Update status to:
            </label>
            <select
              id="bulkStatus"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select status...</option>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleBulkStatusUpdate}
            disabled={!bulkStatus || isUpdating}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Update Status
              </>
            )}
          </button>
          
          <button
            onClick={clearSelection}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
} 