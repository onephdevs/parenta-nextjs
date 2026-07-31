'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import FullScreenModal from '@/components/ui/FullScreenModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings?: Building[];
  building?: Building;
  buildingId?: string;
  onRoomAdded?: (roomId?: string) => void;
}

export default function AddRoomModal({
  isOpen,
  onClose,
  buildings,
  building,
  buildingId,
  onRoomAdded,
}: AddRoomModalProps) {
  const buildingOptions = buildings || (building ? [building] : []);
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateRoomData>({
    buildingId: buildingId || building?.id || '',
    roomNumber: '',
    roomType: 'bedroom',
    floorNumber: undefined,
    squareFootage: undefined,
    monthlyRate: 0,
    amenities: '',
    description: '',
  });

  const [amenitiesInput, setAmenitiesInput] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'squareFootage' || name === 'monthlyRate' || name === 'floorNumber'
          ? value
            ? parseFloat(value)
            : undefined
          : value,
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmenitiesInput(e.target.value);
    setFormData((prev) => ({ ...prev, amenities: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Creating room...',
      message: 'Please wait while we create your room.',
    });

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create room');
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Room created successfully!',
        message: `Room ${formData.roomNumber} has been created and you'll be redirected to view it.`,
      });

      setFormData({
        buildingId: buildingId || building?.id || '',
        roomNumber: '',
        roomType: 'bedroom',
        floorNumber: undefined,
        squareFootage: undefined,
        monthlyRate: 0,
        amenities: '',
        description: '',
      });
      setAmenitiesInput('');

      onClose();
      onRoomAdded?.(result.data.id);

      setTimeout(() => {
        router.push(`/admin/rooms?roomId=${result.data.id}`);
        router.refresh();
      }, 400);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to create room',
        message: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Room"
      primaryButton={
        <Button type="submit" form="room-form" isLoading={isSubmitting}>
          Create Room
        </Button>
      }
      secondaryButton={
        <Button type="button" variant="outline" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      }
    >
      {error && <FormErrorBanner message={error} className="mb-6" />}

      <form id="room-form" onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Building" htmlFor="buildingId" required>
                <Select
                  id="buildingId"
                  name="buildingId"
                  required
                  value={formData.buildingId}
                  onChange={handleInputChange}
                  isDisabled={!!(buildingId || building)}
                >
                  <option value="">Select a building</option>
                  {buildingOptions.map((bldg) => (
                    <option key={bldg.id} value={bldg.id}>
                      {bldg.name}
                    </option>
                  ))}
                </Select>
              </FormField>

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
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField label="Room Type" htmlFor="roomType">
                <Select
                  id="roomType"
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleInputChange}
                >
                  <option value="bedroom">Bedroom</option>
                  <option value="studio">Studio</option>
                  <option value="1br">1 Bedroom</option>
                  <option value="2br">2 Bedroom</option>
                  <option value="3br">3 Bedroom</option>
                  <option value="office">Office</option>
                  <option value="retail">Retail</option>
                  <option value="storage">Storage</option>
                </Select>
              </FormField>

              <FormField label="Floor Number" htmlFor="floorNumber">
                <Input
                  type="number"
                  id="floorNumber"
                  name="floorNumber"
                  min={0}
                  max={50}
                  value={formData.floorNumber || ''}
                  onChange={handleInputChange}
                />
              </FormField>

              <FormField label="Square Footage" htmlFor="squareFootage">
                <Input
                  type="number"
                  id="squareFootage"
                  name="squareFootage"
                  min={1}
                  max={5000}
                  step={1}
                  value={formData.squareFootage || ''}
                  onChange={handleInputChange}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>

            <FormField
              label="Monthly Rate (₱)"
              htmlFor="monthlyRate"
              required
              hint="Enter amount in Philippine Pesos"
            >
              <Input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                required
                min={0}
                step={1}
                value={formData.monthlyRate || ''}
                onChange={handleInputChange}
                placeholder="e.g., 5000, 8000, 12000"
              />
            </FormField>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField
              label="Amenities (comma-separated)"
              htmlFor="amenities"
            >
              <Input
                type="text"
                id="amenities"
                name="amenities"
                value={amenitiesInput}
                onChange={handleAmenitiesChange}
                placeholder="Private Bathroom, Balcony, Air Conditioning, etc."
              />
            </FormField>
          </div>
        </div>
      </form>
    </FullScreenModal>
  );
}
