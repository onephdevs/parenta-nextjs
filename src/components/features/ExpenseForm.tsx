'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

interface Building {
  id: number;
  name: string;
  address: string;
}

interface Room {
  id: number;
  roomNumber: string;
  buildingName: string;
  buildingId: number;
}

interface ExpenseFormData {
  buildingId: string;
  roomId: string;
  amount: string;
  category: string;
  description: string;
  vendor: string;
  expenseDate: string;
  notes: string;
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseFormData>;
  onSubmit?: (data: ExpenseFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function ExpenseForm({ initialData, onSubmit, onCancel }: ExpenseFormProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  
  const [formData, setFormData] = useState<ExpenseFormData>({
    buildingId: initialData?.buildingId || '',
    roomId: initialData?.roomId || '',
    amount: initialData?.amount || '',
    category: initialData?.category || 'maintenance',
    description: initialData?.description || '',
    vendor: initialData?.vendor || '',
    expenseDate: initialData?.expenseDate || new Date().toISOString().split('T')[0],
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Partial<ExpenseFormData>>({});

  // Load buildings and rooms on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [buildingsRes, roomsRes] = await Promise.all([
          fetch('/api/buildings'),
          fetch('/api/rooms')
        ]);

        if (buildingsRes.ok) {
          const buildingsData = await buildingsRes.json();
          setBuildings(buildingsData.buildings || []);
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          setRooms(roomsData.rooms || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        addNotification('Failed to load building and room data', 'error');
      }
    };

    loadData();
  }, [addNotification]);

  // Filter rooms based on selected building
  useEffect(() => {
    if (formData.buildingId) {
      const buildingRooms = rooms.filter(room => 
        room.buildingId === parseInt(formData.buildingId)
      );
      setFilteredRooms(buildingRooms);
      
      // Clear room selection if it doesn't belong to the selected building
      if (formData.roomId) {
        const selectedRoom = rooms.find(r => r.id === parseInt(formData.roomId));
        if (!selectedRoom || selectedRoom.buildingId !== parseInt(formData.buildingId)) {
          setFormData(prev => ({ ...prev, roomId: '' }));
        }
      }
    } else {
      setFilteredRooms([]);
    }
  }, [formData.buildingId, rooms, formData.roomId]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ExpenseFormData> = {};

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.expenseDate) newErrors.expenseDate = 'Expense date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addNotification('Please fix the form errors', 'error');
      return;
    }

    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default submission to API
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            buildingId: formData.buildingId ? parseInt(formData.buildingId) : null,
            roomId: formData.roomId ? parseInt(formData.roomId) : null,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            vendor: formData.vendor || null,
            expenseDate: formData.expenseDate,
            notes: formData.notes || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to record expense');
        }

        const result = await response.json();
        addNotification('Expense recorded successfully', 'success');
        router.push(`/admin/financial/expenses/${result.expense.id}`);
      }
    } catch (error) {
      console.error('Error recording expense:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to record expense',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
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



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Expense Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              Record a new expense or update expense details.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* Amount */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
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
                    className={`block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm ${
                      errors.amount ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Category */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
                    errors.category ? 'border-red-300' : ''
                  }`}
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="utilities">Utilities</option>
                  <option value="supplies">Supplies</option>
                  <option value="services">Services</option>
                  <option value="insurance">Insurance</option>
                  <option value="taxes">Taxes</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && (
                  <p className="mt-2 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Expense Date */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700">
                  Expense Date *
                </label>
                <input
                  type="date"
                  id="expenseDate"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
                    errors.expenseDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.expenseDate && (
                  <p className="mt-2 text-sm text-red-600">{errors.expenseDate}</p>
                )}
              </div>

              {/* Building Selection */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="buildingId" className="block text-sm font-medium text-gray-700">
                  Building (Optional)
                </label>
                <select
                  id="buildingId"
                  name="buildingId"
                  value={formData.buildingId}
                  onChange={(e) => handleInputChange('buildingId', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                >
                  <option value="">Select a building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Selection */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">
                  Room (Optional)
                </label>
                <select
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value)}
                  disabled={!formData.buildingId}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="">Select a room</option>
                  {filteredRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber}
                    </option>
                  ))}
                </select>
                {!formData.buildingId && (
                  <p className="mt-1 text-sm text-gray-500">Select a building first to choose a room</p>
                )}
              </div>

              {/* Vendor */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
                  Vendor
                </label>
                <input
                  type="text"
                  id="vendor"
                  name="vendor"
                  value={formData.vendor}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  placeholder="Vendor or service provider name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                />
              </div>

              {/* Description */}
              <div className="col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the expense"
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
                    errors.description ? 'border-red-300' : ''
                  }`}
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Notes */}
              <div className="col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes or details about the expense"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {isLoading ? 'Recording...' : 'Record Expense'}
        </button>
      </div>
    </form>
  );
} 