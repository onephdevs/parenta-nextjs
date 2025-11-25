'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/context/NotificationContext';
import FullScreenModal from '@/components/ui/FullScreenModal';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings?: Building[];
  building?: Building;
  buildingId?: string;
}

export default function AddRoomModal({ isOpen, onClose, buildings, building, buildingId }: AddRoomModalProps) {
  // If a specific building or buildingId is provided, use it as the only option
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
    amenities: [],
    description: ''
  });

  const [amenitiesInput, setAmenitiesInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'squareFootage' || name === 'monthlyRate' || name === 'floorNumber'
        ? (value ? parseFloat(value) : undefined) 
        : value
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmenitiesInput(e.target.value);
    setFormData(prev => ({ ...prev, amenities: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Creating room...',
      message: 'Please wait while we create your room.'
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
        message: `Room ${formData.roomNumber} has been created and you'll be redirected to view it.`
      });

      setFormData({
        buildingId: '',
        roomNumber: '',
        roomType: 'bedroom',
        floorNumber: undefined,
        squareFootage: undefined,
        monthlyRate: 0,
        depositAmount: undefined,
        amenities: [],
        description: ''
      });
      setAmenitiesInput('');
      
      onClose();
      
      setTimeout(() => {
        router.push(`/admin/rooms/${result.data.id}`);
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to create room',
        message: errorMessage
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cancelButton = (
    <button
      type="button"
      onClick={onClose}
      disabled={isSubmitting}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
    >
      Cancel
    </button>
  );

  const createButton = (
    <button
      form="room-form"
      type="submit"
      disabled={isSubmitting}
      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Creating...' : 'Create Room'}
    </button>
  );

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Room"
      primaryButton={createButton}
      secondaryButton={cancelButton}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form id="room-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="buildingId" className="block text-sm font-medium text-gray-700 mb-1">
                  Building *
                </label>
                <select
                  id="buildingId"
                  name="buildingId"
                  required
                  value={formData.buildingId}
                  onChange={handleInputChange}
                  disabled={!!(buildingId || building)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a building</option>
                  {buildingOptions.map(bldg => (
                    <option key={bldg.id} value={bldg.id}>{bldg.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number *
                </label>
                <input
                  type="text"
                  id="roomNumber"
                  name="roomNumber"
                  required
                  value={formData.roomNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Room Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="roomType" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type
                </label>
                <select
                  id="roomType"
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="bedroom">Bedroom</option>
                  <option value="studio">Studio</option>
                  <option value="1br">1 Bedroom</option>
                  <option value="2br">2 Bedroom</option>
                  <option value="3br">3 Bedroom</option>
                  <option value="office">Office</option>
                  <option value="retail">Retail</option>
                  <option value="storage">Storage</option>
                </select>
              </div>

              <div>
                <label htmlFor="floorNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Number
                </label>
                <input
                  type="number"
                  id="floorNumber"
                  name="floorNumber"
                  min="0"
                  max="50"
                  value={formData.floorNumber || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="squareFootage" className="block text-sm font-medium text-gray-700 mb-1">
                  Square Footage
                </label>
                <input
                  type="number"
                  id="squareFootage"
                  name="squareFootage"
                  min="1"
                  max="5000"
                  step="1"
                  value={formData.squareFootage || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
            
            <div>
              <label htmlFor="monthlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rate (₱) *
              </label>
              <input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                required
                min="0"
                step="1"
                value={formData.monthlyRate || ''}
                onChange={handleInputChange}
                placeholder="e.g., 5000, 8000, 12000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">Enter amount in Philippine Pesos</p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="amenities" className="block text-sm font-medium text-gray-700 mb-1">
                Amenities (comma-separated)
              </label>
              <input
                type="text"
                id="amenities"
                name="amenities"
                value={amenitiesInput}
                onChange={handleAmenitiesChange}
                placeholder="Private Bathroom, Balcony, Air Conditioning, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </form>
    </FullScreenModal>
  );
} 