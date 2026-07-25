'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { UtilityMeterReading, Building, Room } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';

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
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [formData, setFormData] = useState({
    buildingId: reading?.buildingId || '',
    roomId: reading?.roomId || '',
    utilityType: reading?.utilityType || 'electricity',
    meterNumber: reading?.meterNumber || '',
    readingDate: reading?.readingDate
      ? new Date(reading.readingDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    readingValue: reading?.readingValue?.toString() || '',
    notes: reading?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (formData.buildingId) {
      fetchRooms(formData.buildingId);
    } else {
      setRooms([]);
      setFormData((prev) => ({ ...prev, roomId: '' }));
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
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load buildings',
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
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load rooms',
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

    if (formData.readingDate && new Date(formData.readingDate) > new Date()) {
      newErrors.readingDate = 'Reading date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
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
        showNotification({
          type: 'success',
          title: 'Success',
          message: reading
            ? 'Meter reading updated successfully'
            : 'Meter reading created successfully',
        });

        if (onSubmit) {
          onSubmit();
        }
      } else {
        throw new Error(result.error || 'Failed to save meter reading');
      }
    } catch (error) {
      console.error('Error saving meter reading:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save meter reading',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="none" className="max-w-2xl mx-auto shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {reading ? 'Edit Meter Reading' : 'Add New Meter Reading'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
        <FormField label="Building" htmlFor="buildingId" required error={errors.buildingId}>
          <Select
            id="buildingId"
            value={formData.buildingId}
            onChange={(e) => handleInputChange('buildingId', e.target.value)}
            isInvalid={Boolean(errors.buildingId)}
          >
            <option value="">Select a building</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Room (Optional)"
          htmlFor="roomId"
          hint={loadingRooms ? 'Loading rooms...' : undefined}
        >
          <Select
            id="roomId"
            value={formData.roomId}
            onChange={(e) => handleInputChange('roomId', e.target.value)}
            isDisabled={!formData.buildingId || loadingRooms}
          >
            <option value="">Building-wide meter</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                Room {room.roomNumber}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Utility Type" htmlFor="utilityType" required error={errors.utilityType}>
            <Select
              id="utilityType"
              value={formData.utilityType}
              onChange={(e) => handleInputChange('utilityType', e.target.value)}
              isInvalid={Boolean(errors.utilityType)}
            >
              {UTILITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Meter Number (Optional)" htmlFor="meterNumber">
            <Input
              id="meterNumber"
              type="text"
              value={formData.meterNumber}
              onChange={(e) => handleInputChange('meterNumber', e.target.value)}
              placeholder="e.g., MTR-001"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Reading Date" htmlFor="readingDate" required error={errors.readingDate}>
            <Input
              id="readingDate"
              type="date"
              value={formData.readingDate}
              onChange={(e) => handleInputChange('readingDate', e.target.value)}
              min="2000-01-01"
              max={new Date().toISOString().split('T')[0]}
              isInvalid={Boolean(errors.readingDate)}
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="Reading Value" htmlFor="readingValue" required error={errors.readingValue}>
            <Input
              id="readingValue"
              type="number"
              step="0.01"
              min={0}
              value={formData.readingValue}
              onChange={(e) => handleInputChange('readingValue', e.target.value)}
              isInvalid={Boolean(errors.readingValue)}
              placeholder="Enter meter reading"
            />
          </FormField>
        </div>

        <FormField label="Notes (Optional)" htmlFor="notes">
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
            placeholder="Additional notes about this reading..."
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" isLoading={loading}>
            {loading ? 'Saving...' : reading ? 'Update Reading' : 'Add Reading'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
