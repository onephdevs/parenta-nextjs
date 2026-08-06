'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { User, Home, Calendar, Plus, FileText } from 'lucide-react';

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
  unitPrice?: number;
  itemType: 'rent' | 'utilities' | 'fees' | 'deposit' | 'other';
}

interface CreateInvoiceFormProps {
  roomId?: string;
  tenantId?: string;
}

type FormSection = 'tenant' | 'dates' | 'items' | 'notes';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'tenant',
    label: 'Tenant',
    icon: <User className="h-4 w-4" />,
    title: 'Tenant & Room',
    subtitle: 'Select tenant and room',
  },
  {
    id: 'dates',
    label: 'Dates',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Billing Period',
    subtitle: 'Set due date and billing period',
  },
  {
    id: 'items',
    label: 'Items',
    icon: <Plus className="h-4 w-4" />,
    title: 'Invoice Items',
    subtitle: 'Add items to the invoice',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional Notes',
    subtitle: 'Payment terms and notes',
  },
];

export default function CreateInvoiceForm({ roomId, tenantId }: CreateInvoiceFormProps = {}) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('tenant');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantRooms, setTenantRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tenantId: tenantId || '',
    roomId: roomId || '',
    dueDate: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    taxRate: 0,
    discountAmount: undefined as number | undefined,
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

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (tenantId && formData.tenantId) {
      fetchTenantRooms(formData.tenantId);
    }
  }, [tenantId]);

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
        const tenantsList = result.data?.tenants || (Array.isArray(result.data) ? result.data : []);
        setTenants(Array.isArray(tenantsList) ? tenantsList : []);
      } else {
        setTenants([]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
    }
  };

  const fetchTenantRooms = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      const result = await response.json();
      if (result.success && result.data.currentAssignment) {
        const room: Room = {
          id: result.data.currentAssignment.roomId || '',
          roomNumber: result.data.currentAssignment.roomNumber,
          buildingName: result.data.currentAssignment.buildingName,
          monthlyRate: result.data.currentAssignment.monthlyRate,
        };
        setTenantRooms([room]);
        setFormData((prev) => ({ ...prev, roomId: room.id }));
      } else {
        setTenantRooms([]);
        setFormData((prev) => ({ ...prev, roomId: '' }));
      }
    } catch (error) {
      console.error('Error fetching tenant rooms:', error);
      setTenantRooms([]);
    }
  };

  const fetchRoomDetails = async (roomId: string) => {
    try {
      const roomResponse = await fetch(`/api/rooms/${roomId}`);
      const roomResult = await roomResponse.json();

      if (roomResult.success && roomResult.data) {
        const roomData = roomResult.data;

        const room: Room = {
          id: roomData.id,
          roomNumber: roomData.roomNumber,
          buildingName: roomData.buildingName || 'Unknown Building',
          monthlyRate: roomData.monthlyRate || 0,
        };

        setTenantRooms([room]);

        if (roomData.currentTenantId) {
          setFormData((prev) => ({
            ...prev,
            roomId: room.id,
            tenantId: roomData.currentTenantId,
          }));

          if (room.monthlyRate > 0 && items[0].unitPrice === 0) {
            setItems([
              {
                description: `Monthly Rent - ${room.roomNumber}`,
                quantity: 1,
                unitPrice: room.monthlyRate,
                itemType: 'rent' as const,
              },
            ]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'taxRate'
          ? parseFloat(value) || 0
          : name === 'discountAmount'
            ? value === ''
              ? undefined
              : parseFloat(value) || 0
            : value,
    }));

    if (name === 'tenantId' && value) {
      fetchTenantRooms(value);
    } else if (name === 'tenantId' && !value) {
      setTenantRooms([]);
      setFormData((prev) => ({ ...prev, roomId: '' }));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number | undefined
  ) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        itemType: 'other',
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * (item.unitPrice ?? 0), 0);
  const taxAmount = subtotal * formData.taxRate;
  const totalAmount = subtotal + taxAmount - (formData.discountAmount ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

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

    if (items.some((item) => !item.description || (item.unitPrice ?? 0) <= 0)) {
      setError('Please fill in all item details with valid prices');
      setIsSubmitting(false);
      return;
    }

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating invoice...',
      message: 'Please wait while we create the invoice.',
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
        discountAmount: formData.discountAmount ?? 0,
        totalAmount,
        notes: formData.notes,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? 0,
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
        message: `Invoice ${result.data.invoice.invoiceNumber} has been created.`,
      });

      setTimeout(() => {
        router.push(`/admin/financial/invoices/${result.data.invoice.id}`);
      }, 1000);
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create invoice',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorBanner = error ? (
    <Alert variant="danger">
      {error}
    </Alert>
  ) : undefined;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'tenant':
        return (
          <div className="space-y-6">
            <FormField label="Tenant" htmlFor="tenantId" required>
              <Select
                id="tenantId"
                name="tenantId"
                required
                value={formData.tenantId}
                onChange={handleInputChange}
              >
                <option value="">Select a tenant</option>
                {Array.isArray(tenants) && tenants.length > 0 ? (
                  tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName} ({tenant.email})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No tenants available
                  </option>
                )}
              </Select>
            </FormField>

            <FormField label="Room" htmlFor="roomId" required>
              <Select
                id="roomId"
                name="roomId"
                required
                value={formData.roomId}
                onChange={handleInputChange}
                isDisabled={!formData.tenantId}
              >
                <option value="">{!formData.tenantId ? 'Select a tenant first' : 'Select a room'}</option>
                {Array.isArray(tenantRooms) && tenantRooms.length > 0 ? (
                  tenantRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} - {room.buildingName} (Rate: {formatCurrency(room.monthlyRate)})
                    </option>
                  ))
                ) : formData.tenantId ? (
                  <option value="" disabled>
                    No rooms available for this tenant
                  </option>
                ) : null}
              </Select>
            </FormField>
          </div>
        );

      case 'dates':
        return (
          <div className="space-y-6">
            <FormField label="Due Date" htmlFor="dueDate" required>
              <Input
                type="date"
                id="dueDate"
                name="dueDate"
                required
                value={formData.dueDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField label="Billing Period Start" htmlFor="billingPeriodStart">
              <Input
                type="date"
                id="billingPeriodStart"
                name="billingPeriodStart"
                value={formData.billingPeriodStart}
                onChange={handleInputChange}
                max={formData.billingPeriodEnd || '2099-12-31'}
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField label="Billing Period End" htmlFor="billingPeriodEnd">
              <Input
                type="date"
                id="billingPeriodEnd"
                name="billingPeriodEnd"
                value={formData.billingPeriodEnd}
                onChange={handleInputChange}
                min={formData.billingPeriodStart || '2000-01-01'}
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>
        );

      case 'items':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-md"
                >
                  <FormField
                    label="Description"
                    htmlFor={`item-description-${index}`}
                    required
                    className="md:col-span-2"
                  >
                    <Input
                      id={`item-description-${index}`}
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </FormField>

                  <FormField label="Type" htmlFor={`item-type-${index}`}>
                    <Select
                      id={`item-type-${index}`}
                      value={item.itemType}
                      onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                    >
                      <option value="rent">Rent</option>
                      <option value="utilities">Utilities</option>
                      <option value="fees">Fees</option>
                      <option value="deposit">Deposit</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormField>

                  <FormField label="Quantity" htmlFor={`item-quantity-${index}`}>
                    <Input
                      id={`item-quantity-${index}`}
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)
                      }
                    />
                  </FormField>

                  <FormField label="Unit Price" htmlFor={`item-unitPrice-${index}`} required>
                    <Input
                      id={`item-unitPrice-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitPrice ?? ''}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'unitPrice',
                          e.target.value === '' ? undefined : parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </FormField>

                  <div className="flex items-end">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'notes':
        return (
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes or payment terms..."
            />
          </FormField>
        );

      default:
        return null;
    }
  };

  return (
    <SectionedFormShell
      mode="page"
      onCancel={() => router.back()}
      eyebrow="Create Invoice"
      entityLabel="New Invoice"
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Create Invoice"
      primaryLoading={isSubmitting}
      formId="create-invoice-form"
      errorBanner={errorBanner}
    >
      <form id="create-invoice-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  );
}
