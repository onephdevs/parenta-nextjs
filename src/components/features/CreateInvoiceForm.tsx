'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/context/NotificationContext';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Room {
  id: string;
  roomNumber: string;
  buildingName: string;
  monthlyRate: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: 'rent' | 'utilities' | 'fees' | 'deposit' | 'other';
}

interface CreateInvoiceFormProps {
  roomId?: string;
  tenantId?: string;
}

export default function CreateInvoiceForm({ roomId, tenantId }: CreateInvoiceFormProps = {}) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantRooms, setTenantRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tenantId: tenantId || '',
    roomId: roomId || '',
    dueDate: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    taxRate: 0.08, // 8% default tax rate
    discountAmount: 0,
    notes: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: '',
      quantity: 1,
      unitPrice: 0,
      itemType: 'rent' as const,
    },
  ]);

  // Fetch tenants on component mount
  useEffect(() => {
    fetchTenants();
  }, []);

  // Fetch tenant rooms when tenantId prop is provided
  useEffect(() => {
    if (tenantId && formData.tenantId) {
      fetchTenantRooms(formData.tenantId);
    }
  }, [tenantId]);

  // Fetch room details if roomId is provided but no tenantId
  useEffect(() => {
    if (roomId && !tenantId) {
      fetchRoomDetails(roomId);
    }
  }, [roomId, tenantId]);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      const result = await response.json();
      if (result.success) {
        setTenants(result.data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchTenantRooms = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      const result = await response.json();
      if (result.success && result.data.currentAssignment) {
        // For now, we'll just use the current assignment
        // In a more complex system, we might show all available rooms for the tenant
        const room: Room = {
          id: result.data.currentAssignment.roomId || '',
          roomNumber: result.data.currentAssignment.roomNumber,
          buildingName: result.data.currentAssignment.buildingName,
          monthlyRate: result.data.currentAssignment.monthlyRate,
        };
        setTenantRooms([room]);
        // Auto-select the room if there's only one
        setFormData(prev => ({ ...prev, roomId: room.id }));
      } else {
        setTenantRooms([]);
        setFormData(prev => ({ ...prev, roomId: '' }));
      }
    } catch (error) {
      console.error('Error fetching tenant rooms:', error);
      setTenantRooms([]);
    }
  };

  const fetchRoomDetails = async (roomId: string) => {
    try {
      // Fetch room details
      const roomResponse = await fetch(`/api/rooms/${roomId}`);
      const roomResult = await roomResponse.json();
      
      if (roomResult.success && roomResult.data) {
        const roomData = roomResult.data;
        
        // Create room object for dropdown
        const room: Room = {
          id: roomData.id,
          roomNumber: roomData.roomNumber,
          buildingName: roomData.buildingName || 'Unknown Building',
          monthlyRate: roomData.monthlyRate || 0,
        };
        
        setTenantRooms([room]);
        
        // If room has a tenant assigned, auto-select the tenant
        if (roomData.currentTenantId) {
          setFormData(prev => ({ 
            ...prev, 
            roomId: room.id,
            tenantId: roomData.currentTenantId 
          }));
          
          // Pre-fill invoice item with rent
          if (room.monthlyRate > 0 && items[0].unitPrice === 0) {
            setItems([{
              description: `Monthly Rent - ${room.roomNumber}`,
              quantity: 1,
              unitPrice: room.monthlyRate,
              itemType: 'rent' as const,
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'taxRate' || name === 'discountAmount' ? parseFloat(value) || 0 : value
    }));

    // Fetch rooms when tenant is selected
    if (name === 'tenantId' && value) {
      fetchTenantRooms(value);
    } else if (name === 'tenantId' && !value) {
      setTenantRooms([]);
      setFormData(prev => ({ ...prev, roomId: '' }));
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      description: '',
      quantity: 1,
      unitPrice: 0,
      itemType: 'other',
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * formData.taxRate;
  const totalAmount = subtotal + taxAmount - formData.discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    if (!formData.tenantId) {
      setError('Please select a tenant');
      setIsSubmitting(false);
      return;
    }

    if (!formData.roomId) {
      setError('Please select a room');
      setIsSubmitting(false);
      return;
    }

    if (!formData.dueDate) {
      setError('Please set a due date');
      setIsSubmitting(false);
      return;
    }

    if (items.some(item => !item.description || item.unitPrice <= 0)) {
      setError('Please fill in all item details with valid prices');
      setIsSubmitting(false);
      return;
    }

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating invoice...',
      message: 'Please wait while we create the invoice.'
    });

    try {
      const invoiceData = {
        tenantId: formData.tenantId,
        roomId: formData.roomId,
        dueDate: formData.dueDate,
        billingPeriodStart: formData.billingPeriodStart || undefined,
        billingPeriodEnd: formData.billingPeriodEnd || undefined,
        subtotal,
        taxAmount,
        discountAmount: formData.discountAmount,
        totalAmount,
        notes: formData.notes,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemType: item.itemType,
        })),
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create invoice');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Invoice created successfully!',
        message: `Invoice ${result.data.invoice.invoiceNumber} has been created.`
      });

      // Redirect to invoice detail page
      setTimeout(() => {
        router.push(`/admin/financial/invoices/${result.data.invoice.id}`);
      }, 1000);

    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create invoice',
        message: err instanceof Error ? err.message : 'An error occurred'
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Create New Invoice</h3>
        <p className="text-sm text-gray-900 mt-1">Generate an invoice for tenant payments</p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Invoice Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-900 mb-1">
                  Tenant *
                </label>
                <select
                  id="tenantId"
                  name="tenantId"
                  required
                  value={formData.tenantId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName} ({tenant.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-900 mb-1">
                  Room *
                </label>
                <select
                  id="roomId"
                  name="roomId"
                  required
                  value={formData.roomId}
                  onChange={handleInputChange}
                  disabled={!formData.tenantId || tenantRooms.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.tenantId 
                      ? 'Select a tenant first' 
                      : tenantRooms.length === 0 
                        ? 'No rooms available' 
                        : 'Select a room'
                    }
                  </option>
                  {tenantRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} - {room.buildingName} ({formatCurrency(room.monthlyRate)}/month)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-900 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  required
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="billingPeriodStart" className="block text-sm font-medium text-gray-900 mb-1">
                  Billing Period Start
                </label>
                <input
                  type="date"
                  id="billingPeriodStart"
                  name="billingPeriodStart"
                  value={formData.billingPeriodStart}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="billingPeriodEnd" className="block text-sm font-medium text-gray-900 mb-1">
                  Billing Period End
                </label>
                <input
                  type="date"
                  id="billingPeriodEnd"
                  name="billingPeriodEnd"
                  value={formData.billingPeriodEnd}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-md">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Item description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Type
                    </label>
                    <select
                      value={item.itemType}
                      onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="rent">Rent</option>
                      <option value="utilities">Utilities</option>
                      <option value="fees">Fees</option>
                      <option value="deposit">Deposit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Calculations</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="taxRate" className="block text-sm font-medium text-gray-900 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  id="taxRate"
                  name="taxRate"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="discountAmount" className="block text-sm font-medium text-gray-900 mb-1">
                  Discount Amount
                </label>
                <input
                  type="number"
                  id="discountAmount"
                  name="discountAmount"
                  min="0"
                  step="0.01"
                  value={formData.discountAmount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="mt-6 bg-gray-50 p-4 rounded-md">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-900">Subtotal:</span>
                  <span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-900">Tax ({(formData.taxRate * 100).toFixed(1)}%):</span>
                  <span className="text-sm font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                {formData.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-900">Discount:</span>
                    <span className="text-sm font-medium text-red-600">-{formatCurrency(formData.discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total:</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Additional notes or payment terms..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 