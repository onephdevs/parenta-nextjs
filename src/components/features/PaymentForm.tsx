'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

interface Tenant {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  currentRoomId?: number;
  buildingName?: string;
  roomNumber?: string;
}

interface Room {
  id: number;
  roomNumber: string;
  buildingName: string;
  rentAmount: number;
}

interface PaymentFormData {
  tenantId: string;
  roomId: string;
  amount: string;
  type: string;
  status: string;
  paymentDate: string;
  description: string;
  paymentMethod: string;
  transactionId: string;
}

interface PaymentFormProps {
  initialData?: Partial<PaymentFormData>;
  onSubmit?: (data: PaymentFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function PaymentForm({ initialData, onSubmit, onCancel }: PaymentFormProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    tenantId: initialData?.tenantId || '',
    roomId: initialData?.roomId || '',
    amount: initialData?.amount || '',
    type: initialData?.type || 'rent',
    status: initialData?.status || 'completed',
    paymentDate: initialData?.paymentDate || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    paymentMethod: initialData?.paymentMethod || 'cash',
    transactionId: initialData?.transactionId || '',
  });

  const [errors, setErrors] = useState<Partial<PaymentFormData>>({});

  // Load tenants and rooms on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tenantsRes, roomsRes] = await Promise.all([
          fetch('/api/tenants'),
          fetch('/api/rooms')
        ]);

        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          // Handle both response formats: { success: true, data: [] } or { tenants: [] }
          const tenantsList = tenantsData.data || tenantsData.tenants || [];
          setTenants(tenantsList);
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          // Handle both response formats: { success: true, data: [] } or { rooms: [] }
          const roomsList = roomsData.data || roomsData.rooms || [];
          setRooms(roomsList);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        addNotification('Failed to load tenant and room data', 'error');
      }
    };

    loadData();
  }, [addNotification]);

  // Update selected tenant when tenantId changes
  useEffect(() => {
    if (formData.tenantId) {
      const tenant = tenants.find(t => t.id === parseInt(formData.tenantId));
      setSelectedTenant(tenant || null);
      
      // Auto-select current room if tenant has one
      if (tenant?.currentRoomId && !formData.roomId) {
        setFormData(prev => ({ ...prev, roomId: tenant.currentRoomId!.toString() }));
      }
    } else {
      setSelectedTenant(null);
    }
  }, [formData.tenantId, tenants, formData.roomId]);

  // Auto-fill amount based on room rent
  useEffect(() => {
    if (formData.roomId && formData.type === 'rent') {
      const room = rooms.find(r => r.id === parseInt(formData.roomId));
      if (room && !formData.amount) {
        setFormData(prev => ({ ...prev, amount: room.rentAmount.toString() }));
      }
    }
  }, [formData.roomId, formData.type, rooms, formData.amount]);

  const validateForm = (): boolean => {
    const newErrors: Partial<PaymentFormData> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.roomId) newErrors.roomId = 'Room is required';
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (!formData.type) newErrors.type = 'Payment type is required';
    if (!formData.status) newErrors.status = 'Payment status is required';
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Payment method is required';

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
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: parseInt(formData.tenantId),
            roomId: parseInt(formData.roomId),
            amount: parseFloat(formData.amount),
            type: formData.type,
            status: formData.status,
            paymentDate: formData.paymentDate,
            description: formData.description || null,
            paymentMethod: formData.paymentMethod,
            transactionId: formData.transactionId || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to record payment');
        }

        const result = await response.json();
        addNotification('Payment recorded successfully', 'success');
        router.push(`/admin/financial/payments/${result.payment.id}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to record payment',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
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

  const getFilteredRooms = () => {
    if (!selectedTenant) return rooms;
    
    // Show current room first, then other available rooms
    const currentRoom = rooms.filter(r => r.id === selectedTenant.currentRoomId);
    const otherRooms = rooms.filter(r => r.id !== selectedTenant.currentRoomId);
    
    return [...currentRoom, ...otherRooms];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Information</h3>
            <p className="mt-1 text-sm text-gray-500">
              Record a new payment or update payment details.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* Tenant Selection */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
                  Tenant *
                </label>
                <select
                  id="tenantId"
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={(e) => handleInputChange('tenantId', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.tenantId ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Select a tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName}
                      {tenant.currentRoomId && ` (${tenant.buildingName} ${tenant.roomNumber})`}
                    </option>
                  ))}
                </select>
                {errors.tenantId && (
                  <p className="mt-2 text-sm text-red-600">{errors.tenantId}</p>
                )}
              </div>

              {/* Room Selection */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">
                  Room *
                </label>
                <select
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.roomId ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Select a room</option>
                  {getFilteredRooms().map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.buildingName} {room.roomNumber} (₱{room.rentAmount.toLocaleString()}/month)
                      {selectedTenant?.currentRoomId === room.id && ' - Current Room'}
                    </option>
                  ))}
                </select>
                {errors.roomId && (
                  <p className="mt-2 text-sm text-red-600">{errors.roomId}</p>
                )}
              </div>

              {/* Amount */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-base font-medium">₱</span>
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
                    className={`block w-full pl-9 pr-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 ${
                      errors.amount ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Payment Type */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Payment Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.type ? 'border-red-300' : ''
                  }`}
                >
                  <option value="rent">Rent</option>
                  <option value="deposit">Deposit</option>
                  <option value="fee">Fee</option>
                  <option value="utilities">Utilities</option>
                </select>
                {errors.type && (
                  <p className="mt-2 text-sm text-red-600">{errors.type}</p>
                )}
              </div>

              {/* Payment Status */}
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.status ? 'border-red-300' : ''
                  }`}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
                {errors.status && (
                  <p className="mt-2 text-sm text-red-600">{errors.status}</p>
                )}
              </div>

              {/* Payment Date */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
                  Payment Date *
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.paymentDate ? 'border-red-300' : ''
                  }`}
                />
                {errors.paymentDate && (
                  <p className="mt-2 text-sm text-red-600">{errors.paymentDate}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
                  Payment Method *
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.paymentMethod ? 'border-red-300' : ''
                  }`}
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="online">Online Payment</option>
                </select>
                {errors.paymentMethod && (
                  <p className="mt-2 text-sm text-red-600">{errors.paymentMethod}</p>
                )}
              </div>

              {/* Transaction ID */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700">
                  Transaction ID
                </label>
                <input
                  type="text"
                  id="transactionId"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={(e) => handleInputChange('transactionId', e.target.value)}
                  placeholder="Optional transaction reference"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              {/* Description */}
              <div className="col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional payment description or notes"
                  className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 resize-none"
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
          className="bg-white py-3 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Recording...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
} 