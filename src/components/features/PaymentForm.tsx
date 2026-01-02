'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currentRoomId?: string;
  buildingName?: string;
  roomNumber?: string;
}

interface PaymentFormData {
  tenantId: string;
  amount: string;
  depositAmount: string;
  type: string;
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
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    tenantId: initialData?.tenantId || '',
    amount: initialData?.amount || '',
    depositAmount: initialData?.depositAmount || '0',
    type: initialData?.type || 'rent',
    paymentDate: initialData?.paymentDate || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    paymentMethod: initialData?.paymentMethod || 'cash',
    transactionId: initialData?.transactionId || '',
  });

  const [errors, setErrors] = useState<Partial<PaymentFormData>>({});

  // Load tenants on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const tenantsRes = await fetch('/api/tenants');

        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          // Handle both response formats: { success: true, data: [] } or { tenants: [] }
          const tenantsList = tenantsData.data || tenantsData.tenants || [];
          setTenants(tenantsList);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        addNotification('Failed to load tenant data', 'error');
      }
    };

    loadData();
  }, [addNotification]);

  // Update selected tenant when tenantId changes
  useEffect(() => {
    if (formData.tenantId) {
      const tenant = tenants.find(t => t.id === formData.tenantId);
      setSelectedTenant(tenant || null);
    } else {
      setSelectedTenant(null);
    }
  }, [formData.tenantId, tenants]);

  const validateForm = (): boolean => {
    const newErrors: Partial<PaymentFormData> = {};

    if (!formData.tenantId) newErrors.tenantId = 'Tenant is required';
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    // Validate deposit amount
    const depositAmount = parseFloat(formData.depositAmount) || 0;
    const totalAmount = parseFloat(formData.amount) || 0;
    
    if (depositAmount < 0) {
      newErrors.depositAmount = 'Deposit amount cannot be negative';
    } else if (depositAmount > totalAmount) {
      newErrors.depositAmount = 'Deposit amount cannot exceed total amount';
    }
    
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (!formData.type) newErrors.type = 'Payment type is required';
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
        // Calculate payment and deposit amounts
        const totalAmount = parseFloat(formData.amount);
        const depositAmount = parseFloat(formData.depositAmount) || 0;
        const paymentAmount = totalAmount - depositAmount;
        
        // Try to get tenant's current room assignment (optional)
        let roomAssignmentId: string | undefined;
        if (selectedTenant?.currentRoomId) {
          // If we have currentRoomId, try to fetch the assignment ID
          try {
            const tenantRes = await fetch(`/api/tenants/${formData.tenantId}`);
            if (tenantRes.ok) {
              const tenantData = await tenantRes.json();
              if (tenantData.success && tenantData.data?.currentAssignment?.id) {
                roomAssignmentId = tenantData.data.currentAssignment.id;
              }
            }
          } catch (error) {
            console.warn('Could not fetch room assignment, proceeding without it:', error);
            // Continue without room assignment - it's optional
          }
        }

        // Record payment (will auto-allocate to invoices via backend)
        // roomAssignmentId is optional - payments can be recorded without room assignment
        const paymentPayload: any = {
          tenantId: formData.tenantId, // Keep as string (UUID)
          amount: paymentAmount > 0 ? paymentAmount : totalAmount, // If no deposit, use total amount
          paymentType: formData.type,
          paymentStatus: 'completed', // Always completed since payment is received
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
        };

        // Add optional fields
        if (roomAssignmentId) {
          paymentPayload.roomAssignmentId = roomAssignmentId;
        }
        if (formData.description) {
          paymentPayload.notes = formData.description;
        }
        if (formData.transactionId) {
          paymentPayload.referenceNumber = formData.transactionId;
        }
        if (depositAmount > 0) {
          paymentPayload.depositAmount = depositAmount;
        }

        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to record payment');
        }

        const result = await response.json();
        const paymentId = result.data?.payment?.id || result.payment?.id || result.data?.id;
        
        // If there's a deposit amount, record it separately in deposit ledger
        let depositRecorded = false;
        if (depositAmount > 0) {
          try {
            const depositResponse = await fetch('/api/deposit-ledger', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tenantId: formData.tenantId,
                action: 'deposit', // API expects 'action' not 'transactionType'
                amount: depositAmount,
                description: `Deposit payment - ${formData.description || 'No description'}`,
              }),
            });

            if (depositResponse.ok) {
              depositRecorded = true;
            } else {
              const errorData = await depositResponse.json();
              console.warn('Deposit ledger update failed (non-critical):', errorData);
              // Don't show warning - payment was successful, deposit can be added manually
            }
          } catch (depositError) {
            console.warn('Deposit ledger update error (non-critical):', depositError);
            // Don't throw - payment was successful
          }
        }
        
        // Show single consolidated success notification
        let successMessage = 'Payment recorded successfully';
        if (result.allocationDetails) {
          const { invoicesPaid, totalAllocated } = result.allocationDetails;
          if (invoicesPaid > 0) {
            successMessage = `Payment recorded: ₱${totalAllocated.toLocaleString()} allocated to ${invoicesPaid} invoice(s)`;
          }
        }
        
        if (depositAmount > 0) {
          if (depositRecorded) {
            successMessage += `, ₱${depositAmount.toLocaleString()} added to deposit ledger`;
          } else {
            successMessage += `. Note: Deposit amount (₱${depositAmount.toLocaleString()}) should be added to deposit ledger manually`;
          }
        }
        
        addNotification(successMessage, 'success');
        
        // Navigate to payment detail page if we have an ID, otherwise to payments list
        if (paymentId) {
          router.push(`/admin/financial/payments/${paymentId}`);
        } else {
          router.push('/admin/financial/payments');
        }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Information</h3>
            <p className="mt-1 text-sm text-gray-900">
              Record a new payment or update payment details.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* Tenant Selection */}
              <div className="col-span-6">
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-900">
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
                {selectedTenant && !selectedTenant.currentRoomId && (
                  <p className="mt-2 text-sm text-blue-600">
                    ℹ️ This tenant is not currently assigned to a room. Payment can still be recorded, but it won't be automatically allocated to invoices.
                  </p>
                )}
              </div>

              {/* Total Amount Paid */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
                  Total Amount Paid *
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-900 text-base font-medium">₱</span>
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
                <p className="mt-1 text-xs text-gray-900">
                  Total amount received from tenant
                </p>
              </div>

              {/* Deposit Amount */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-900">
                  Deposit Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-900 text-base font-medium">₱</span>
                  </div>
                  <input
                    type="number"
                    id="depositAmount"
                    name="depositAmount"
                    value={formData.depositAmount}
                    onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className={`block w-full pl-9 pr-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 ${
                      errors.depositAmount ? 'border-red-300' : ''
                    }`}
                  />
                </div>
                {errors.depositAmount && (
                  <p className="mt-2 text-sm text-red-600">{errors.depositAmount}</p>
                )}
                <p className="mt-1 text-xs text-gray-900">
                  Amount to add to deposit ledger (remainder goes to invoices)
                </p>
              </div>

              {/* Payment Breakdown Info */}
              {parseFloat(formData.amount) > 0 && (
                <div className="col-span-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">Payment Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-purple-700">To Deposit Ledger:</span>
                      <span className="ml-2 font-semibold text-purple-900">
                        ₱{(parseFloat(formData.depositAmount) || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-700">To Invoice Payment:</span>
                      <span className="ml-2 font-semibold text-purple-900">
                        ₱{(parseFloat(formData.amount) - (parseFloat(formData.depositAmount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Type */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="type" className="block text-sm font-medium text-gray-900">
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
                  <option value="downpayment">Downpayment</option>
                  <option value="fee">Fee</option>
                  <option value="utilities">Utilities</option>
                  <option value="other">Other</option>
                </select>
                {errors.type && (
                  <p className="mt-2 text-sm text-red-600">{errors.type}</p>
                )}
              </div>

              {/* Payment Date */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-900">
                  Payment Date *
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  min="2000-01-01"
                  max={new Date().toISOString().split('T')[0]}
                  className={`mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 ${
                    errors.paymentDate ? 'border-red-300' : ''
                  }`}
                  style={{
                    colorScheme: 'light',
                  }}
                />
                {errors.paymentDate && (
                  <p className="mt-2 text-sm text-red-600">{errors.paymentDate}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-900">
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
                <label htmlFor="transactionId" className="block text-sm font-medium text-gray-900">
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
                <label htmlFor="description" className="block text-sm font-medium text-gray-900">
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
          className="bg-white py-3 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
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