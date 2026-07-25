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

interface Building {
  id: string | number;
  name: string;
  address?: string;
}

interface Room {
  id: string | number;
  roomNumber: string;
  buildingName?: string;
  buildingId: string | number;
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [buildingsRes, roomsRes] = await Promise.all([
          fetch('/api/buildings', { credentials: 'include' }),
          fetch('/api/rooms', { credentials: 'include' }),
        ]);

        if (buildingsRes.ok) {
          const buildingsData = await buildingsRes.json();
          setBuildings(buildingsData.data?.buildings || buildingsData.buildings || []);
        } else {
          console.error('Failed to load buildings:', buildingsRes.status);
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const roomsList = roomsData.data || roomsData.rooms || [];

          const mappedRooms: Room[] = roomsList.map((room: Record<string, unknown>) => ({
            id: room.id as string | number,
            roomNumber: (room.roomNumber || room.room_number || '') as string,
            buildingName: (room.buildingName || room.building_name || '') as string,
            buildingId: (room.buildingId || room.building_id || '') as string | number,
          }));

          setRooms(mappedRooms);
        } else {
          console.error('Failed to load rooms:', roomsRes.status);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        addNotification('Failed to load building and room data', 'error');
      }
    };

    loadData();
  }, [addNotification]);

  useEffect(() => {
    if (formData.buildingId) {
      const selectedBuildingId = String(formData.buildingId);
      const buildingRooms = rooms.filter((room) => String(room.buildingId) === selectedBuildingId);
      setFilteredRooms(buildingRooms);

      if (formData.roomId) {
        const selectedRoom = rooms.find((r) => String(r.id) === String(formData.roomId));
        if (!selectedRoom || String(selectedRoom.buildingId) !== selectedBuildingId) {
          setFormData((prev) => ({ ...prev, roomId: '' }));
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
      <Card>
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Expense Information</h3>
            <p className="mt-1 text-sm text-gray-900">
              Record a new expense or update expense details.
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <FormField
                label="Amount"
                htmlFor="amount"
                required
                error={errors.amount}
                className="col-span-6 sm:col-span-2"
              >
                <Input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  isInvalid={Boolean(errors.amount)}
                />
              </FormField>

              <FormField
                label="Category"
                htmlFor="category"
                required
                error={errors.category}
                className="col-span-6 sm:col-span-2"
              >
                <Select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  isInvalid={Boolean(errors.category)}
                >
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="repair">Repair</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="garbage_collection">Garbage Collection</option>
                  <option value="worker_wages">Worker Wages</option>
                  <option value="utilities">Utilities</option>
                  <option value="supplies">Supplies</option>
                  <option value="services">Services</option>
                  <option value="insurance">Insurance</option>
                  <option value="taxes">Taxes</option>
                  <option value="other">Other</option>
                </Select>
              </FormField>

              <FormField
                label="Expense Date"
                htmlFor="expenseDate"
                required
                error={errors.expenseDate}
                className="col-span-6 sm:col-span-2"
              >
                <Input
                  type="date"
                  id="expenseDate"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                  min="2000-01-01"
                  max="2099-12-31"
                  style={{ colorScheme: 'light' }}
                  isInvalid={Boolean(errors.expenseDate)}
                />
              </FormField>

              <FormField
                label="Building (Optional)"
                htmlFor="buildingId"
                className="col-span-6 sm:col-span-3"
              >
                <Select
                  id="buildingId"
                  name="buildingId"
                  value={formData.buildingId}
                  onChange={(e) => handleInputChange('buildingId', e.target.value)}
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
                hint={!formData.buildingId ? 'Select a building first to choose a room' : undefined}
                className="col-span-6 sm:col-span-3"
              >
                <Select
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={(e) => handleInputChange('roomId', e.target.value)}
                  isDisabled={!formData.buildingId}
                >
                  <option value="">Select a room</option>
                  {filteredRooms.map((room) => (
                    <option key={room.id} value={String(room.id)}>
                      {room.buildingName ? `${room.buildingName} - ` : ''}Room {room.roomNumber}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Vendor"
                htmlFor="vendor"
                className="col-span-6 sm:col-span-3"
              >
                <Input
                  type="text"
                  id="vendor"
                  name="vendor"
                  value={formData.vendor}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  placeholder="Vendor or service provider name"
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="description"
                required
                error={errors.description}
                className="col-span-6"
              >
                <Input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the expense"
                  isInvalid={Boolean(errors.description)}
                />
              </FormField>

              <FormField label="Notes" htmlFor="notes" className="col-span-6">
                <Textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes or details about the expense"
                />
              </FormField>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" size="lg" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
          {isLoading ? 'Recording...' : 'Record Expense'}
        </Button>
      </div>
    </form>
  );
}
