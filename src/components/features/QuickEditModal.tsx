'use client';

import React, { useState, useEffect } from 'react';
import { Room, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

interface QuickEditModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRoom: Room) => void;
}

export default function QuickEditModal({ room, isOpen, onClose, onUpdate }: QuickEditModalProps) {
  const { showNotification, updateNotification } = useNotifications();
  const { currencySymbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CreateRoomData>>({
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    monthlyRate: parseFloat(room.monthlyRate),
    depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
    roomStatus: room.roomStatus,
  });

  useEffect(() => {
    setFormData({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      monthlyRate: parseFloat(room.monthlyRate),
      depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
      roomStatus: room.roomStatus,
    });
    setError(null);
  }, [room]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'monthlyRate' || name === 'depositAmount'
          ? value
            ? parseFloat(value)
            : undefined
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Updating room...',
      message: 'Please wait while we update the room details.',
    });

    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update room');
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Room updated successfully!',
        message: `Room ${formData.roomNumber} has been updated.`,
      });

      onUpdate(result.data);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to update room',
        message: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      monthlyRate: parseFloat(room.monthlyRate),
      depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
      roomStatus: room.roomStatus,
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="Quick Edit Room"
      description="Update essential room details"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            isDisabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" form="quick-edit-room-form" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="quick-edit-room-form" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="space-y-4">
          <FormField label="Room Number" htmlFor="roomNumber" required>
            <Input
              type="text"
              id="roomNumber"
              name="roomNumber"
              required
              value={formData.roomNumber}
              onChange={handleInputChange}
            />
          </FormField>

          <FormField label="Room Type" htmlFor="roomType" required>
            <Select
              id="roomType"
              name="roomType"
              required
              value={formData.roomType}
              onChange={handleInputChange}
            >
              <option value="studio">Studio</option>
              <option value="one_bedroom">1 Bedroom</option>
              <option value="two_bedroom">2 Bedroom</option>
              <option value="three_bedroom">3 Bedroom</option>
              <option value="shared">Shared Room</option>
              <option value="single">Single Room</option>
              <option value="double">Double Room</option>
            </Select>
          </FormField>

          <FormField label="Status" htmlFor="roomStatus" required>
            <Select
              id="roomStatus"
              name="roomStatus"
              required
              value={formData.roomStatus}
              onChange={handleInputChange}
            >
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="reserved">Reserved</option>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={`Monthly Rent (${currencySymbol})`} htmlFor="monthlyRate" required>
              <Input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                required
                min="0"
                step="0.01"
                value={formData.monthlyRate ?? ''}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label={`Deposit (${currencySymbol})`} htmlFor="depositAmount">
              <Input
                type="number"
                id="depositAmount"
                name="depositAmount"
                min="0"
                step="0.01"
                value={formData.depositAmount ?? ''}
                onChange={handleInputChange}
              />
            </FormField>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
