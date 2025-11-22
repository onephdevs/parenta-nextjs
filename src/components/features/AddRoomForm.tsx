'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/context/NotificationContext';

interface AddRoomFormProps {
  buildingId: string;
  building: Building;
}

export default function AddRoomForm({ buildingId, building }: AddRoomFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateRoomData>({
    buildingId,
    roomNumber: '',
    roomType: 'studio',
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
    // Split by comma and clean up
    const amenities = e.target.value.split(',').map(a => a.trim()).filter(a => a.length > 0);
    setFormData(prev => ({ ...prev, amenities }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating room...',
      message: 'Please wait while we create the room.'
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

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Room created successfully!',
        message: `Room ${formData.roomNumber} has been created in ${building.name}.`
      });

      // Redirect to the building details page
      router.push(`/admin/buildings/${buildingId}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create room',
        message: errorMessage
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Add New Room</h3>
        <p className="text-sm text-gray-600 mt-1">
          Create a new room in <span className="font-medium">{building.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              placeholder="e.g., 101, A-1, 2A"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="roomType" className="block text-sm font-medium text-gray-700 mb-1">
              Room Type *
            </label>
            <select
              id="roomType"
              name="roomType"
              required
              value={formData.roomType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="studio">Studio</option>
              <option value="one_bedroom">1 Bedroom</option>
              <option value="two_bedroom">2 Bedroom</option>
              <option value="three_bedroom">3 Bedroom</option>
              <option value="four_bedroom">4+ Bedroom</option>
              <option value="shared">Shared Room</option>
              <option value="single">Single Room</option>
              <option value="double">Double Room</option>
            </select>
          </div>
        </div>

        {/* Room Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="floorNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Floor Number
            </label>
            <input
              type="number"
              id="floorNumber"
              name="floorNumber"
              min="0"
              max="100"
              value={formData.floorNumber || ''}
              onChange={handleInputChange}
              placeholder="e.g., 1, 2, 3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="squareFootage" className="block text-sm font-medium text-gray-700 mb-1">
              Size (sq ft)
            </label>
            <input
              type="number"
              id="squareFootage"
              name="squareFootage"
              min="1"
              step="1"
              value={formData.squareFootage || ''}
              onChange={handleInputChange}
              placeholder="e.g., 600, 800, 1200"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Financial Information */}
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

        {/* Description */}
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
            placeholder="Describe the room's features, layout, or any special characteristics..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Amenities */}
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
            placeholder="e.g., Air Conditioning, Private Bathroom, Balcony, WiFi"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {formData.amenities && formData.amenities.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Room...
              </>
            ) : (
              'Create Room'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 