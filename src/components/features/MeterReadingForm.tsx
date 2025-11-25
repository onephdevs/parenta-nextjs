'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { UtilityMeterReading, Building, Room } from '@/types/database';

interface MeterReadingFormProps {
  reading?: UtilityMeterReading;
  onSubmit?: () => void;
  onCancel?: () => void;
}

const UTILITY_TYPES = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet' },
  { value: 'cable', label: 'Cable TV' },
  { value: 'waste', label: 'Waste Management' },
  { value: 'other', label: 'Other' },
];

export default function MeterReadingForm({ reading, onSubmit, onCancel }: MeterReadingFormProps) {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [formData, setFormData] = useState({
    buildingId: reading?.buildingId || '',
    roomId: reading?.roomId || '',
    utilityType: reading?.utilityType || 'electricity',
    meterNumber: reading?.meterNumber || '',
    readingDate: reading?.readingDate ? new Date(reading.readingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    readingValue: reading?.readingValue?.toString() || '',
    notes: reading?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load buildings on component mount
  useEffect(() => {
    fetchBuildings();
  }, []);

  // Load rooms when building changes
  useEffect(() => {
    if (formData.buildingId) {
      fetchRooms(formData.buildingId);
    } else {
      setRooms([]);
      setFormData(prev => ({ ...prev, roomId: '' }));
    }
  }, [formData.buildingId]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const result = await response.json();

      if (result.success) {
        setBuildings(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch buildings');
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load buildings'
      });
    }
  };

  const fetchRooms = async (buildingId: string) => {
    try {
      setLoadingRooms(true);
      const response = await fetch(`/api/rooms?buildingId=${buildingId}`);
      const result = await response.json();

      if (result.success) {
        setRooms(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load rooms'
      });
    } finally {
      setLoadingRooms(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.buildingId) {
      newErrors.buildingId = 'Building is required';
    }

    if (!formData.utilityType) {
      newErrors.utilityType = 'Utility type is required';
    }

    if (!formData.readingDate) {
      newErrors.readingDate = 'Reading date is required';
    }

    if (!formData.readingValue) {
      newErrors.readingValue = 'Reading value is required';
    } else if (parseFloat(formData.readingValue) <= 0) {
      newErrors.readingValue = 'Reading value must be positive';
    }

    // Validate date is not in the future
    if (formData.readingDate && new Date(formData.readingDate) > new Date()) {
      newErrors.readingDate = 'Reading date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        buildingId: formData.buildingId,
        roomId: formData.roomId || undefined,
        utilityType: formData.utilityType,
        meterNumber: formData.meterNumber || undefined,
        readingDate: formData.readingDate,
        readingValue: parseFloat(formData.readingValue),
        notes: formData.notes || undefined,
      };

      const url = reading ? `/api/meter-readings/${reading.id}` : '/api/meter-readings';
      const method = reading ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: reading ? 'Meter reading updated successfully' : 'Meter reading created successfully'
        });

        if (onSubmit) {
          onSubmit();
        }
      } else {
        throw new Error(result.error || 'Failed to save meter reading');
      }
    } catch (error) {
      console.error('Error saving meter reading:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save meter reading'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {reading ? 'Edit Meter Reading' : 'Add New Meter Reading'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
        {/* Building Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Building <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.buildingId}
            onChange={(e) => handleInputChange('buildingId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.buildingId ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select a building</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
          {errors.buildingId && (
            <p className="mt-1 text-sm text-red-600">{errors.buildingId}</p>
          )}
        </div>

        {/* Room Selection (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Room (Optional)
          </label>
          <select
            value={formData.roomId}
            onChange={(e) => handleInputChange('roomId', e.target.value)}
            disabled={!formData.buildingId || loadingRooms}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="">Building-wide meter</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Room {room.roomNumber}
              </option>
            ))}
          </select>
          {loadingRooms && (
            <p className="mt-1 text-sm text-gray-900">Loading rooms...</p>
          )}
        </div>

        {/* Utility Type and Meter Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Utility Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.utilityType}
              onChange={(e) => handleInputChange('utilityType', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.utilityType ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {UTILITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.utilityType && (
              <p className="mt-1 text-sm text-red-600">{errors.utilityType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Meter Number (Optional)
            </label>
            <input
              type="text"
              value={formData.meterNumber}
              onChange={(e) => handleInputChange('meterNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., MTR-001"
            />
          </div>
        </div>

        {/* Reading Date and Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Reading Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.readingDate}
              onChange={(e) => handleInputChange('readingDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.readingDate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.readingDate && (
              <p className="mt-1 text-sm text-red-600">{errors.readingDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Reading Value <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.readingValue}
              onChange={(e) => handleInputChange('readingValue', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.readingValue ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter meter reading"
            />
            {errors.readingValue && (
              <p className="mt-1 text-sm text-red-600">{errors.readingValue}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Additional notes about this reading..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              reading ? 'Update Reading' : 'Add Reading'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 