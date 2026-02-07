'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Room, CreateRoomData, Building } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';

interface EditRoomFormProps {
  room: Room & { buildingName?: string };
  onRoomUpdated?: () => void;
  startInEditMode?: boolean;
}

export default function EditRoomForm({ room, onRoomUpdated, startInEditMode = false }: EditRoomFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  
  const [formData, setFormData] = useState<Partial<CreateRoomData>>({
    buildingId: room.buildingId,
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    floorNumber: room.floorNumber,
    squareFootage: room.squareFootage,
    monthlyRate: parseFloat(room.monthlyRate),
    depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
    depositRequired: room.depositRequired || false,
    depositType: room.depositType || 'one_month',
    depositFixedAmount: room.depositFixedAmount,
    depositPercentage: room.depositPercentage,
    description: room.description || '',
    amenities: Array.isArray(room.amenities) ? room.amenities.join(', ') : (room.amenities || '')
  });

  // Convert amenities to string for input (if it's an array, join it)
  const amenitiesString = Array.isArray(room.amenities) 
    ? room.amenities.join(', ') 
    : (room.amenities || '');

  const [amenitiesInput, setAmenitiesInput] = useState(amenitiesString);

  // Fetch buildings when edit mode is activated or when component mounts with startInEditMode
  useEffect(() => {
    if ((isEditing || startInEditMode) && buildings.length === 0) {
      fetchBuildings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, startInEditMode]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const result = await response.json();
      if (result.success) {
        // API returns { success: true, data: { buildings: [...] } }
        const buildingsData = result.data?.buildings || result.data || [];
        if (Array.isArray(buildingsData)) {
          setBuildings(buildingsData);
        } else {
          console.error('Invalid buildings data format:', buildingsData);
          setBuildings([]);
        }
      } else {
        console.error('Failed to fetch buildings:', result.error);
        setBuildings([]);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings([]); // Ensure it's always an array on error
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'squareFootage' || name === 'monthlyRate' || name === 'depositAmount' || name === 'floorNumber'
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
    setSuccess(null);

    // Show loading notification
    const loadingId = showNotification('Updating room...', 'loading');

    try {
      // Convert amenities string to array (split by comma, trim whitespace, filter empty)
      const amenitiesArray = formData.amenities
        ? String(formData.amenities).split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];

      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amenities: amenitiesArray
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update room');
      }

      // Update loading notification to success
      toast.dismiss(loadingId);
      showNotification(`Room ${formData.roomNumber} has been updated successfully!`, 'success');

      setSuccess('Room updated successfully!');
      setIsEditing(false);
      
      // Call onRoomUpdated callback if provided
      if (onRoomUpdated) {
        onRoomUpdated();
      }
      
      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Update loading notification to error
      toast.dismiss(loadingId);
      showNotification(`Failed to update room: ${errorMessage}`, 'error');
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    // Show loading notification
    const loadingId = showNotification('Deleting room...', 'loading');

    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete room');
      }

      // Update loading notification to success
      toast.dismiss(loadingId);
      showNotification(`Room ${room.roomNumber} has been deleted successfully!`, 'success');

      // Redirect to rooms list
      setTimeout(() => {
        router.push('/admin/rooms');
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Update loading notification to error
      toast.dismiss(loadingId);
      showNotification(`Failed to delete room: ${errorMessage}`, 'error');
      
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    // Reset form data to original values
    setFormData({
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floorNumber: room.floorNumber,
      squareFootage: room.squareFootage,
      monthlyRate: parseFloat(room.monthlyRate),
      depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
      description: room.description || '',
      depositRequired: room.depositRequired || false,
      depositType: room.depositType || 'one_month',
      depositFixedAmount: room.depositFixedAmount,
      depositPercentage: room.depositPercentage,
      amenities: room.amenities || ''
    });
    setAmenitiesInput(room.amenities || '');
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? 'Edit Room' : 'Room Actions'}
          </h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Room
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {!isEditing ? (
          // View Mode - Action Buttons
          <div className="space-y-3">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Room Details
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Room
                </>
              )}
            </button>
          </div>
        ) : (
          // Edit Mode - Form
          <form onSubmit={handleSubmit} className="space-y-4 text-gray-900">
            {/* Building Selection */}
            <div>
              <label htmlFor="buildingId" className="block text-sm font-medium text-gray-900 mb-1">
                Building *
              </label>
              <select
                id="buildingId"
                name="buildingId"
                required
                value={formData.buildingId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={!Array.isArray(buildings) || buildings.length === 0}
              >
                <option value="">{Array.isArray(buildings) && buildings.length === 0 ? 'Loading buildings...' : 'Select a building'}</option>
                {Array.isArray(buildings) && buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>

            {/* Room Number */}
            <div>
              <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-900 mb-1">
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

            {/* Room Type & Floor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="roomType" className="block text-sm font-medium text-gray-900 mb-1">
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
                  <option value="shared">Shared Room</option>
                  <option value="single">Single Room</option>
                  <option value="double">Double Room</option>
                </select>
              </div>

              <div>
                <label htmlFor="floorNumber" className="block text-sm font-medium text-gray-900 mb-1">
                  Floor
                </label>
                <input
                  type="number"
                  id="floorNumber"
                  name="floorNumber"
                  min="0"
                  value={formData.floorNumber || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="monthlyRate" className="block text-sm font-medium text-gray-900 mb-1">
                  Monthly Rent (₱) *
                </label>
                <input
                  type="number"
                  id="monthlyRate"
                  name="monthlyRate"
                  required
                  min="0"
                  step="0.01"
                  value={formData.monthlyRate ?? ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-900 mb-1">
                  Deposit (₱)
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  name="depositAmount"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount ?? ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Deposit Configuration */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="depositRequired"
                  name="depositRequired"
                  checked={formData.depositRequired || false}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, depositRequired: e.target.checked }))
                  }
                  disabled={!isEditing}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="depositRequired" className="ml-2 block text-sm font-medium text-gray-900">
                  Require deposit for reservation
                </label>
              </div>

              {formData.depositRequired && (
                <div className="space-y-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Deposit Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="one_month"
                          checked={formData.depositType === 'one_month'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          disabled={!isEditing}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-900">One Month Rent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="percentage"
                          checked={formData.depositType === 'percentage'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          disabled={!isEditing}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-900">Percentage of Rent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="fixed"
                          checked={formData.depositType === 'fixed'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          disabled={!isEditing}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-900">Fixed Amount</span>
                      </label>
                    </div>
                  </div>

                  {formData.depositType === 'percentage' && (
                    <div>
                      <label htmlFor="depositPercentage" className="block text-sm font-medium text-gray-900 mb-1">
                        Deposit Percentage (%)
                      </label>
                      <input
                        type="number"
                        id="depositPercentage"
                        name="depositPercentage"
                        min="0"
                        max="200"
                        step="1"
                        value={formData.depositPercentage ?? ''}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, depositPercentage: e.target.value ? parseFloat(e.target.value) : undefined }))
                        }
                        disabled={!isEditing}
                        placeholder="e.g., 50, 100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-sm text-gray-900">
                        {formData.monthlyRate && formData.depositPercentage
                          ? `Deposit: ₱${((formData.monthlyRate * formData.depositPercentage) / 100).toLocaleString()}`
                          : 'Enter percentage to see calculated amount'}
                      </p>
                    </div>
                  )}

                  {formData.depositType === 'fixed' && (
                    <div>
                      <label htmlFor="depositFixedAmount" className="block text-sm font-medium text-gray-900 mb-1">
                        Fixed Deposit Amount (₱)
                      </label>
                      <input
                        type="number"
                        id="depositFixedAmount"
                        name="depositFixedAmount"
                        min="0"
                        step="1"
                        value={formData.depositFixedAmount ?? ''}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, depositFixedAmount: e.target.value ? parseFloat(e.target.value) : undefined }))
                        }
                        disabled={!isEditing}
                        placeholder="e.g., 5000, 10000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  )}

                  {formData.depositType === 'one_month' && formData.monthlyRate && formData.monthlyRate > 0 && (
                    <div className="text-sm text-gray-900 bg-purple-50 p-3 rounded border border-purple-200">
                      <strong>Deposit Required:</strong> ₱{formData.monthlyRate.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Square Footage */}
            <div>
              <label htmlFor="squareFootage" className="block text-sm font-medium text-gray-900 mb-1">
                Size (sq ft)
              </label>
              <input
                type="number"
                id="squareFootage"
                name="squareFootage"
                min="0"
                value={formData.squareFootage || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
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

            {/* Amenities */}
            <div>
              <label htmlFor="amenities" className="block text-sm font-medium text-gray-900 mb-1">
                Amenities (comma-separated)
              </label>
              <input
                type="text"
                id="amenities"
                value={amenitiesInput}
                onChange={handleAmenitiesChange}
                placeholder="e.g., Air Conditioning, WiFi, Furnished"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 