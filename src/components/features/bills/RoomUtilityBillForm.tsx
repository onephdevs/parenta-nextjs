'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';

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

export default function RoomUtilityBillForm({
  initialData,
  onSubmit,
  onCancel,
}: RoomUtilityBillFormProps) {
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

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          let roomsList: any[] = [];

          if (data.success && data.data) {
            roomsList = Array.isArray(data.data) ? data.data : [];
          } else if (Array.isArray(data)) {
            roomsList = data;
          } else if (data.rooms) {
            roomsList = data.rooms;
          }

          const roomsWithBuilding = roomsList.map((room: any) => ({
            id: room.id,
            roomNumber: room.roomNumber || room.room_number,
            buildingId: room.buildingId || room.building_id,
            buildingName: room.buildingName || room.building_name || 'Unknown Building',
          }));
          setRooms(roomsWithBuilding);
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
        try {
          showNotification({
            type: 'error',
            title: 'Error',
            message: 'Failed to load rooms',
          });
        } catch (e) {
          console.error('Notification error:', e);
        }
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

    if (formData.utilityType === 'electricity' && !formData.usageUnit) {
      setFormData((prev) => ({ ...prev, usageUnit: 'kWh' }));
    } else if (formData.utilityType === 'water' && !formData.usageUnit) {
      setFormData((prev) => ({ ...prev, usageUnit: 'gallons' }));
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

        await response.json();
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
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
      <Card padding="none" className="shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Room Utility Bill</h3>
              <p className="mt-1 text-sm text-gray-900">
                Record electric or water bill for a specific room/apartment.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                  <FormField label="Room/Apartment" htmlFor="roomId" required error={errors.roomId}>
                    <Select
                      id="roomId"
                      name="roomId"
                      size="lg"
                      value={formData.roomId}
                      onChange={(e) => handleInputChange('roomId', e.target.value)}
                      isInvalid={Boolean(errors.roomId)}
                    >
                      <option value="">Select a room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.buildingName} - Room {room.roomNumber}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <FormField label="Utility Type" htmlFor="utilityType" required>
                    <Select
                      id="utilityType"
                      name="utilityType"
                      size="lg"
                      value={formData.utilityType}
                      onChange={(e) => {
                        handleInputChange('utilityType', e.target.value);
                        if (e.target.value === 'electricity') {
                          handleInputChange('usageUnit', 'kWh');
                        } else if (e.target.value === 'water') {
                          handleInputChange('usageUnit', 'gallons');
                        }
                      }}
                    >
                      <option value="electricity">⚡ Electricity</option>
                      <option value="water">💧 Water</option>
                    </Select>
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField label="Amount" htmlFor="amount" required error={errors.amount}>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-900 text-base">
                        ₱
                      </span>
                      <Input
                        type="number"
                        id="amount"
                        name="amount"
                        size="lg"
                        className="pl-7"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        step="0.01"
                        min={0}
                        placeholder="0.00"
                        isInvalid={Boolean(errors.amount)}
                      />
                    </div>
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField label="Usage Amount" htmlFor="usageAmount">
                    <Input
                      type="number"
                      id="usageAmount"
                      name="usageAmount"
                      size="lg"
                      value={formData.usageAmount}
                      onChange={(e) => handleInputChange('usageAmount', e.target.value)}
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField label="Usage Unit" htmlFor="usageUnit">
                    <Input
                      type="text"
                      id="usageUnit"
                      name="usageUnit"
                      size="lg"
                      value={formData.usageUnit}
                      onChange={(e) => handleInputChange('usageUnit', e.target.value)}
                      placeholder={formData.utilityType === 'electricity' ? 'kWh' : 'gallons'}
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField
                    label="Billing Period Start"
                    htmlFor="billingPeriodStart"
                    required
                    error={errors.billingPeriodStart}
                  >
                    <Input
                      type="date"
                      id="billingPeriodStart"
                      name="billingPeriodStart"
                      size="lg"
                      value={formData.billingPeriodStart}
                      onChange={(e) => handleInputChange('billingPeriodStart', e.target.value)}
                      min="2000-01-01"
                      max="2099-12-31"
                      isInvalid={Boolean(errors.billingPeriodStart)}
                      style={{ colorScheme: 'light' }}
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField
                    label="Billing Period End"
                    htmlFor="billingPeriodEnd"
                    required
                    error={errors.billingPeriodEnd}
                  >
                    <Input
                      type="date"
                      id="billingPeriodEnd"
                      name="billingPeriodEnd"
                      size="lg"
                      value={formData.billingPeriodEnd}
                      onChange={(e) => handleInputChange('billingPeriodEnd', e.target.value)}
                      min={formData.billingPeriodStart || '2000-01-01'}
                      max="2099-12-31"
                      isInvalid={Boolean(errors.billingPeriodEnd)}
                      style={{ colorScheme: 'light' }}
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField label="Due Date" htmlFor="dueDate" required error={errors.dueDate}>
                    <Input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      size="lg"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      min={formData.billingPeriodEnd || '2000-01-01'}
                      max="2099-12-31"
                      isInvalid={Boolean(errors.dueDate)}
                      style={{ colorScheme: 'light' }}
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <FormField
                    label="Provider Name"
                    htmlFor="providerName"
                    required
                    error={errors.providerName}
                  >
                    <Input
                      type="text"
                      id="providerName"
                      name="providerName"
                      size="lg"
                      value={formData.providerName}
                      onChange={(e) => handleInputChange('providerName', e.target.value)}
                      placeholder="e.g., Meralco, Maynilad"
                      isInvalid={Boolean(errors.providerName)}
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <FormField label="Account Number" htmlFor="providerAccountNumber">
                    <Input
                      type="text"
                      id="providerAccountNumber"
                      name="providerAccountNumber"
                      size="lg"
                      value={formData.providerAccountNumber}
                      onChange={(e) => handleInputChange('providerAccountNumber', e.target.value)}
                      placeholder="Provider account number"
                    />
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-2">
                  <FormField label="Bill Status" htmlFor="billStatus">
                    <Select
                      id="billStatus"
                      name="billStatus"
                      size="lg"
                      value={formData.billStatus}
                      onChange={(e) => handleInputChange('billStatus', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="disputed">Disputed</option>
                    </Select>
                  </FormField>
                </div>

                <div className="col-span-6 sm:col-span-4">
                  <FormField label="Bill Document URL" htmlFor="billUrl">
                    <Input
                      type="url"
                      id="billUrl"
                      name="billUrl"
                      size="lg"
                      value={formData.billUrl}
                      onChange={(e) => handleInputChange('billUrl', e.target.value)}
                      placeholder="URL to bill document (optional)"
                    />
                  </FormField>
                </div>

                <div className="col-span-6">
                  <FormField label="Notes" htmlFor="notes">
                    <Textarea
                      id="notes"
                      name="notes"
                      size="lg"
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Additional notes about this bill"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" size="lg" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
          {isLoading ? 'Creating...' : 'Create Bill'}
        </Button>
      </div>
    </form>
  );
}
