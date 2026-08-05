'use client';

import { useState } from 'react';
import { Room } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { CheckCircle, RefreshCw, Trash2, X } from 'lucide-react';

interface BulkRoomActionsProps {
  selectedRooms: Room[];
  onSelectionChange: (roomIds: string[]) => void;
  onBulkUpdate: () => void;
}

export default function BulkRoomActions({ selectedRooms, onSelectionChange, onBulkUpdate }: BulkRoomActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const { showNotification, updateNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedRooms.length === 0) return;

    setIsUpdating(true);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Updating rooms...',
      message: `Updating status for ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'}.`,
    });

    try {
      const updatePromises = selectedRooms.map((room) =>
        fetch(`/api/rooms/${room.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomStatus: bulkStatus }),
        })
      );

      const results = await Promise.all(updatePromises);
      const failedUpdates = results.filter((result) => !result.ok);

      if (failedUpdates.length > 0) {
        throw new Error(`Failed to update ${failedUpdates.length} room${failedUpdates.length === 1 ? '' : 's'}`);
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Rooms updated successfully!',
        message: `Updated status for ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'} to "${bulkStatus}".`,
      });

      onSelectionChange([]);
      setBulkStatus('');
      onBulkUpdate();
    } catch (error) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to update rooms',
        message: error instanceof Error ? error.message : 'An error occurred during the bulk update.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.length === 0) return;

    const occupiedCount = selectedRooms.filter((r) => r.roomStatus === 'occupied').length;
    const occupiedNote =
      occupiedCount > 0
        ? ` ${occupiedCount} selected room${occupiedCount === 1 ? ' is' : 's are'} currently occupied.`
        : '';

    const confirmed = await confirm({
      title: `Delete ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'}?`,
      message: `This will remove the selected room${selectedRooms.length === 1 ? '' : 's'} from the active list.${occupiedNote} This cannot be undone from here.`,
      confirmText: selectedRooms.length === 1 ? 'Delete room' : `Delete ${selectedRooms.length} rooms`,
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeleting(true);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Deleting rooms...',
      message: `Deleting ${selectedRooms.length} room${selectedRooms.length === 1 ? '' : 's'}.`,
    });

    try {
      const response = await fetch('/api/rooms/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomIds: selectedRooms.map((room) => room.id),
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete rooms');
      }

      const count = result.count ?? selectedRooms.length;

      updateNotification(loadingId, {
        type: 'success',
        title: count === 1 ? 'Room deleted' : `${count} rooms deleted`,
        message:
          count === 1
            ? 'The room has been removed.'
            : `${count} rooms have been removed.`,
      });

      onSelectionChange([]);
      setBulkStatus('');
      onBulkUpdate();
    } catch (error) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to delete rooms',
        message: error instanceof Error ? error.message : 'An error occurred during the bulk delete.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (selectedRooms.length === 0) {
    return null;
  }

  const busy = isUpdating || isDeleting;

  return (
    <>
      {dialog}
      <Card padding="sm" className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center text-sm text-gray-900">
              <CheckCircle className="w-5 h-5 text-purple-600 mr-2" aria-hidden="true" />
              <span className="font-medium">{selectedRooms.length}</span>
              <span className="ml-1">room{selectedRooms.length === 1 ? '' : 's'} selected</span>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="bulkStatus" className="text-sm font-medium text-gray-900">
                Update status to:
              </label>
              <Select
                id="bulkStatus"
                size="sm"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-auto min-w-[160px]"
                disabled={busy}
              >
                <option value="">Select status...</option>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkStatusUpdate}
              isDisabled={!bulkStatus || busy}
              isLoading={isUpdating}
              leftIcon={!isUpdating ? <RefreshCw className="h-4 w-4" /> : undefined}
            >
              Update Status
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              isDisabled={busy}
              isLoading={isDeleting}
              leftIcon={!isDeleting ? <Trash2 className="h-4 w-4" /> : undefined}
            >
              {selectedRooms.length === 1 ? 'Delete' : `Delete ${selectedRooms.length}`}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              isDisabled={busy}
              leftIcon={<X className="h-4 w-4" />}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
