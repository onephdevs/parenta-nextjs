'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, CreditCard, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { SectionedFormSection, SectionCard } from '@/components/ui/SectionedFormShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

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

type SectionId = 'tenant' | 'payment' | 'notes';

const SECTIONS: SectionedFormSection<SectionId>[] = [
  {
    id: 'tenant',
    label: 'Tenant',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant Selection',
    subtitle: 'Choose the tenant making this payment',
  },
  {
    id: 'payment',
    label: 'Payment Details',
    icon: <CreditCard className="h-4 w-4" />,
    title: 'Payment Information',
    subtitle: 'Amount, type, and payment method',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Description & Notes',
    subtitle: 'Optional payment description',
  },
];

export default function PaymentForm({ initialData, onSubmit, onCancel }: PaymentFormProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('tenant');
  
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
          // Handle response format: { success: true, data: { tenants: [], pagination: {} } }
          let tenantsList: Tenant[] = [];
          if (tenantsData.success && tenantsData.data) {
            tenantsList = Array.isArray(tenantsData.data.tenants) 
              ? tenantsData.data.tenants 
              : Array.isArray(tenantsData.data)
              ? tenantsData.data
              : [];
          } else if (Array.isArray(tenantsData.tenants)) {
            tenantsList = tenantsData.tenants;
          } else if (Array.isArray(tenantsData.data)) {
            tenantsList = tenantsData.data;
          }
          
          // Ensure it's always an array
          setTenants(Array.isArray(tenantsList) ? tenantsList : []);
        } else {
          console.error('Failed to fetch tenants:', tenantsRes.status);
          setTenants([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        addNotification('Failed to load tenant data', 'error');
        setTenants([]); // Ensure tenants is always an array
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
    <div className="text-gray-900">
      <SectionedFormShell
        mode="page"
        eyebrow="Record payment"
        sections={SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onCancel={handleCancel}
        primaryLabel="Record Payment"
        primaryLoading={isLoading}
        primaryType="submit"
        formId="payment-form"
      >
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
          {activeSection === 'tenant' && (
            <SectionCard title="Tenant Selection">
              <FormField
                label="Tenant"
                htmlFor="tenantId"
                required
                error={errors.tenantId}
              >
                <Select
                  id="tenantId"
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={(e) => handleInputChange('tenantId', e.target.value)}
                  isInvalid={Boolean(errors.tenantId)}
                >
                  <option value="">Select a tenant</option>
                  {Array.isArray(tenants) && tenants.length > 0 ? (
                    tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName}
                        {tenant.currentRoomId &&
                          ` (${tenant.buildingName} ${tenant.roomNumber})`}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Loading tenants...
                    </option>
                  )}
                </Select>
                {selectedTenant && !selectedTenant.currentRoomId && (
                  <p className="mt-2 text-sm text-blue-600">
                    This tenant is not currently assigned to a room. Payment can still be recorded,
                    but it won&apos;t be automatically allocated to invoices.
                  </p>
                )}
              </FormField>
            </SectionCard>
          )}

          {activeSection === 'payment' && (
            <SectionCard title="Payment Details">
              <div className="grid grid-cols-6 gap-6">
                <FormField
                  label="Total Amount Paid"
                  htmlFor="amount"
                  required
                  error={errors.amount}
                  hint="Total amount received from tenant"
                  className="col-span-6 sm:col-span-3"
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-gray-900">
                      ₱
                    </span>
                    <Input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount === '0' ? '' : formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-8"
                      isInvalid={Boolean(errors.amount)}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Deposit Amount"
                  htmlFor="depositAmount"
                  error={errors.depositAmount}
                  hint="Amount to add to deposit ledger (remainder goes to invoices)"
                  className="col-span-6 sm:col-span-3"
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-base font-medium text-gray-900">
                      ₱
                    </span>
                    <Input
                      type="number"
                      id="depositAmount"
                      name="depositAmount"
                      value={formData.depositAmount === '0' ? '' : formData.depositAmount}
                      onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="pl-8"
                      isInvalid={Boolean(errors.depositAmount)}
                    />
                  </div>
                </FormField>

                {(parseFloat(formData.amount) || 0) > 0 && (
                  <Alert variant="info" title="Payment Breakdown" className="col-span-6">
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span>To Deposit Ledger:</span>
                        <span className="ml-2 font-semibold">
                          ₱{(parseFloat(formData.depositAmount) || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span>To Invoice Payment:</span>
                        <span className="ml-2 font-semibold">
                          ₱
                          {(
                            (parseFloat(formData.amount) || 0) -
                            (parseFloat(formData.depositAmount) || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Alert>
                )}

                <FormField
                  label="Payment Type"
                  htmlFor="type"
                  required
                  error={errors.type}
                  className="col-span-6 sm:col-span-3"
                >
                  <Select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    isInvalid={Boolean(errors.type)}
                  >
                    <option value="rent">Rent</option>
                    <option value="deposit">Deposit</option>
                    <option value="advance">Advance</option>
                    <option value="fee">Fee</option>
                    <option value="utilities">Utilities</option>
                    <option value="other">Other</option>
                  </Select>
                </FormField>

                <FormField
                  label="Payment Date"
                  htmlFor="paymentDate"
                  required
                  error={errors.paymentDate}
                  className="col-span-6 sm:col-span-3"
                >
                  <Input
                    type="date"
                    id="paymentDate"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                    min="2000-01-01"
                    max={new Date().toISOString().split('T')[0]}
                    isInvalid={Boolean(errors.paymentDate)}
                    style={{ colorScheme: 'light' }}
                  />
                </FormField>

                <FormField
                  label="Payment Method"
                  htmlFor="paymentMethod"
                  required
                  error={errors.paymentMethod}
                  className="col-span-6 sm:col-span-3"
                >
                  <Select
                    id="paymentMethod"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    isInvalid={Boolean(errors.paymentMethod)}
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="online">Online Payment</option>
                  </Select>
                </FormField>

                <FormField
                  label="Transaction ID"
                  htmlFor="transactionId"
                  className="col-span-6 sm:col-span-3"
                >
                  <Input
                    type="text"
                    id="transactionId"
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={(e) => handleInputChange('transactionId', e.target.value)}
                    placeholder="Optional transaction reference"
                  />
                </FormField>
              </div>
            </SectionCard>
          )}

          {activeSection === 'notes' && (
            <SectionCard title="Description & Notes">
              <FormField label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional payment description or notes"
                />
              </FormField>
            </SectionCard>
          )}
        </form>
      </SectionedFormShell>
    </div>
  );
}