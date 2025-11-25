'use client';

import React, { useState, useEffect } from 'react';
import { Room, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { X, Save, AlertCircle } from 'lucide-react';

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
    roomStatus: room.roomStatus
  });

  // Reset form when room changes
  useEffect(() => {
    setFormData({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      monthlyRate: parseFloat(room.monthlyRate),
      depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
      roomStatus: room.roomStatus
    });
    setError(null);
  }, [room]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monthlyRate' || name === 'depositAmount'
        ? (value ? parseFloat(value) : undefined) 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Show loading notification
    const loadingId = showNotification({
      type: 'loading',
      title: 'Updating room...',
      message: 'Please wait while we update the room details.'
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

      // Update loading notification to success
      updateNotification(loadingId, {
        type: 'success',
        title: 'Room updated successfully!',
        message: `Room ${formData.roomNumber} has been updated.`
      });

      // Notify parent component of the update
      onUpdate(result.data);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Update loading notification to error
      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to update room',
        message: errorMessage
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFormData({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      monthlyRate: parseFloat(room.monthlyRate),
      depositAmount: room.depositAmount ? parseFloat(room.depositAmount) : undefined,
      roomStatus: room.roomStatus
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Quick Edit Room</h3>
            <p className="text-sm text-gray-900">Update essential room details</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-900 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
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

            {/* Room Type */}
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

            {/* Room Status */}
            <div>
              <label htmlFor="roomStatus" className="block text-sm font-medium text-gray-900 mb-1">
                Status *
              </label>
              <select
                id="roomStatus"
                name="roomStatus"
                required
                value={formData.roomStatus}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="monthlyRate" className="block text-sm font-medium text-gray-900 mb-1">
                  Monthly Rent ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  id="monthlyRate"
                  name="monthlyRate"
                  required
                  min="0"
                  step="0.01"
                  value={formData.monthlyRate || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-900 mb-1">
                  Deposit ({currencySymbol})
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  name="depositAmount"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex space-x-3">
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
      </div>
    </div>
  );
} 