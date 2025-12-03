'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/context/NotificationContext';

interface Room {
  id: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
}

interface RoomUtilityBillFormData {
  roomId: string;
  utilityType: 'electricity' | 'water';
  amount: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  providerName: string;
  providerAccountNumber: string;
  usageAmount: string;
  usageUnit: string;
  billStatus: 'pending' | 'paid' | 'overdue' | 'disputed';
  billUrl: string;
  notes: string;
}

interface RoomUtilityBillFormProps {
  initialData?: Partial<RoomUtilityBillFormData>;
  onSubmit?: (data: RoomUtilityBillFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function RoomUtilityBillForm({ initialData, onSubmit, onCancel }: RoomUtilityBillFormProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const [formData, setFormData] = useState<RoomUtilityBillFormData>({
    roomId: initialData?.roomId || '',
    utilityType: initialData?.utilityType || 'electricity',
    amount: initialData?.amount || '',
    billingPeriodStart: initialData?.billingPeriodStart || new Date().toISOString().split('T')[0],
    billingPeriodEnd: initialData?.billingPeriodEnd || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || new Date().toISOString().split('T')[0],
    providerName: initialData?.providerName || '',
    providerAccountNumber: initialData?.providerAccountNumber || '',
    usageAmount: initialData?.usageAmount || '',
    usageUnit: initialData?.usageUnit || '',
    billStatus: initialData?.billStatus || 'pending',
    billUrl: initialData?.billUrl || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RoomUtilityBillFormData, string>>>({});

  // Load rooms on mount
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Map rooms to include building name
            const roomsWithBuilding = (data.data?.rooms || []).map((room: any) => ({
              id: room.id,
              roomNumber: room.roomNumber,
              buildingId: room.buildingId,
              buildingName: room.buildingName || 'Unknown Building',
            }));
            setRooms(roomsWithBuilding);
          }
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load rooms',
        });
      }
    };

    loadRooms();
  }, [showNotification]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RoomUtilityBillFormData, string>> = {};

    if (!formData.roomId) {
      newErrors.roomId = 'Room is required';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.providerName.trim()) {
      newErrors.providerName = 'Provider name is required';
    }

    if (!formData.billingPeriodStart) {
      newErrors.billingPeriodStart = 'Billing period start is required';
    }

    if (!formData.billingPeriodEnd) {
      newErrors.billingPeriodEnd = 'Billing period end is required';
    }

    if (formData.billingPeriodStart && formData.billingPeriodEnd) {
      const start = new Date(formData.billingPeriodStart);
      const end = new Date(formData.billingPeriodEnd);
      if (end <= start) {
        newErrors.billingPeriodEnd = 'End date must be after start date';
      }
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    // Auto-set usage unit based on utility type
    if (formData.utilityType === 'electricity' && !formData.usageUnit) {
      setFormData(prev => ({ ...prev, usageUnit: 'kWh' }));
    } else if (formData.utilityType === 'water' && !formData.usageUnit) {
      setFormData(prev => ({ ...prev, usageUnit: 'gallons' }));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the form errors',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission to API
        const response = await fetch('/api/utility-bills/room', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: formData.roomId,
            utilityType: formData.utilityType,
            amount: parseFloat(formData.amount),
            billingPeriodStart: formData.billingPeriodStart,
            billingPeriodEnd: formData.billingPeriodEnd,
            dueDate: formData.dueDate,
            providerName: formData.providerName,
            providerAccountNumber: formData.providerAccountNumber || undefined,
            usageAmount: formData.usageAmount ? parseFloat(formData.usageAmount) : undefined,
            usageUnit: formData.usageUnit || undefined,
            billStatus: formData.billStatus,
            billUrl: formData.billUrl || undefined,
            notes: formData.notes || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create room utility bill');
        }

        const result = await response.json();
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Room utility bill created successfully',
        });
        router.push('/admin/bills-expenses/utility-bills');
      }
    } catch (error) {
      console.error('Error creating room utility bill:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create room utility bill',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RoomUtilityBillFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  const selectedRoom = rooms.find(r => r.id === formData.roomId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Room Utility Bill</h3>
            <p className="mt-1 text-sm text-gray-900">
              Record electric or water bill for a specific room/apartment.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* Room Selection */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-900">
                  Room/Apartment *
                </label>
                <select
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                    errors.roomId ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.buildingName} - Room {room.roomNumber}
                    </option>
                  ))}
                </select>
                {errors.roomId && (
                  <p className="mt-2 text-sm text-red-600">{errors.roomId}</p>
                )}
              </div>

              {/* Utility Type */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="utilityType" className="block text-sm font-medium text-gray-900">
                  Utility Type *
                </label>
                <select
                  id="utilityType"
                  name="utilityType"
                  value={formData.utilityType}
                  onChange={(e) => {
                    handleInputChange('utilityType', e.target.value);
                    // Auto-set usage unit
                    if (e.target.value === 'electricity') {
                      handleInputChange('usageUnit', 'kWh');
                    } else if (e.target.value === 'water') {
                      handleInputChange('usageUnit', 'gallons');
                    }
                  }}
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                >
                  <option value="electricity">⚡ Electricity</option>
                  <option value="water">💧 Water</option>
                </select>
              </div>

              {/* Amount */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
                  Amount *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-900 text-base">₱</span>
                  </div>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base ${
                      errors.amount ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Usage Amount */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="usageAmount" className="block text-sm font-medium text-gray-900">
                  Usage Amount
                </label>
                <input
                  type="number"
                  id="usageAmount"
                  name="usageAmount"
                  value={formData.usageAmount}
                  onChange={(e) => handleInputChange('usageAmount', e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                />
              </div>

              {/* Usage Unit */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="usageUnit" className="block text-sm font-medium text-gray-900">
                  Usage Unit
                </label>
                <input
                  type="text"
                  id="usageUnit"
                  name="usageUnit"
                  value={formData.usageUnit}
                  onChange={(e) => handleInputChange('usageUnit', e.target.value)}
                  placeholder={formData.utilityType === 'electricity' ? 'kWh' : 'gallons'}
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                />
              </div>

              {/* Billing Period Start */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="billingPeriodStart" className="block text-sm font-medium text-gray-900">
                  Billing Period Start *
                </label>
                <input
                  type="date"
                  id="billingPeriodStart"
                  name="billingPeriodStart"
                  value={formData.billingPeriodStart}
                  onChange={(e) => handleInputChange('billingPeriodStart', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                    errors.billingPeriodStart ? 'border-red-300' : ''
                  }`}
                />
                {errors.billingPeriodStart && (
                  <p className="mt-2 text-sm text-red-600">{errors.billingPeriodStart}</p>
                )}
              </div>

              {/* Billing Period End */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="billingPeriodEnd" className="block text-sm font-medium text-gray-900">
                  Billing Period End *
                </label>
                <input
                  type="date"
                  id="billingPeriodEnd"
                  name="billingPeriodEnd"
                  value={formData.billingPeriodEnd}
                  onChange={(e) => handleInputChange('billingPeriodEnd', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                    errors.billingPeriodEnd ? 'border-red-300' : ''
                  }`}
                />
                {errors.billingPeriodEnd && (
                  <p className="mt-2 text-sm text-red-600">{errors.billingPeriodEnd}</p>
                )}
              </div>

              {/* Due Date */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-900">
                  Due Date *
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                    errors.dueDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-2 text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>

              {/* Provider Name */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="providerName" className="block text-sm font-medium text-gray-900">
                  Provider Name *
                </label>
                <input
                  type="text"
                  id="providerName"
                  name="providerName"
                  value={formData.providerName}
                  onChange={(e) => handleInputChange('providerName', e.target.value)}
                  placeholder="e.g., Meralco, Maynilad"
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base ${
                    errors.providerName ? 'border-red-300' : ''
                  }`}
                />
                {errors.providerName && (
                  <p className="mt-2 text-sm text-red-600">{errors.providerName}</p>
                )}
              </div>

              {/* Provider Account Number */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="providerAccountNumber" className="block text-sm font-medium text-gray-900">
                  Account Number
                </label>
                <input
                  type="text"
                  id="providerAccountNumber"
                  name="providerAccountNumber"
                  value={formData.providerAccountNumber}
                  onChange={(e) => handleInputChange('providerAccountNumber', e.target.value)}
                  placeholder="Provider account number"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                />
              </div>

              {/* Bill Status */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="billStatus" className="block text-sm font-medium text-gray-900">
                  Bill Status
                </label>
                <select
                  id="billStatus"
                  name="billStatus"
                  value={formData.billStatus}
                  onChange={(e) => handleInputChange('billStatus', e.target.value)}
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              {/* Bill URL */}
              <div className="col-span-6 sm:col-span-4">
                <label htmlFor="billUrl" className="block text-sm font-medium text-gray-900">
                  Bill Document URL
                </label>
                <input
                  type="url"
                  id="billUrl"
                  name="billUrl"
                  value={formData.billUrl}
                  onChange={(e) => handleInputChange('billUrl', e.target.value)}
                  placeholder="URL to bill document (optional)"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                />
              </div>

              {/* Notes */}
              <div className="col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this bill"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-white py-3 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Bill'}
        </button>
      </div>
    </form>
  );
}
