'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { DollarSign, Tag, Calendar, Home, User, FileText } from 'lucide-react';

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
  onSuccess?: () => void;
  mode?: 'page' | 'modal' | 'dialog';
  isOpen?: boolean;
  headerExtra?: ReactNode;
}

type FormSection = 'amount' | 'category' | 'date' | 'location' | 'vendor' | 'notes';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'amount',
    label: 'Amount',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Expense Amount',
    subtitle: 'Enter the expense amount',
  },
  {
    id: 'category',
    label: 'Category',
    icon: <Tag className="h-4 w-4" />,
    title: 'Category & Description',
    subtitle: 'Classify and describe the expense',
  },
  {
    id: 'date',
    label: 'Date',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Expense Date',
    subtitle: 'When did this expense occur',
  },
  {
    id: 'location',
    label: 'Location',
    icon: <Home className="h-4 w-4" />,
    title: 'Building & Room',
    subtitle: 'Associate expense with a property',
  },
  {
    id: 'vendor',
    label: 'Vendor',
    icon: <User className="h-4 w-4" />,
    title: 'Vendor Information',
    subtitle: 'Who provided the service',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional Notes',
    subtitle: 'Any additional details',
  },
];

export default function ExpenseForm({
  initialData,
  onSubmit,
  onCancel,
  onSuccess,
  mode = 'page',
  isOpen = true,
  headerExtra,
}: ExpenseFormProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('amount');
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
            buildingId: formData.buildingId || null,
            roomId: formData.roomId || null,
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
        if (onSuccess) onSuccess();
        else router.push(`/admin/financial/expenses/${result.expense.id}`);
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

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'amount':
        return (
          <FormField
            label="Amount"
            htmlFor="amount"
            required
            error={errors.amount}
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
        );

      case 'category':
        return (
          <div className="space-y-6">
            <FormField
              label="Category"
              htmlFor="category"
              required
              error={errors.category}
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
                <option value="other">Other</option>
              </Select>
            </FormField>

            <FormField
              label="Description"
              htmlFor="description"
              required
              error={errors.description}
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
          </div>
        );

      case 'date':
        return (
          <FormField
            label="Expense Date"
            htmlFor="expenseDate"
            required
            error={errors.expenseDate}
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
        );

      case 'location':
        return (
          <div className="space-y-6">
            <FormField
              label="Building (Optional)"
              htmlFor="buildingId"
              hint="Leave empty for company-wide expenses"
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
              label="Unit / Room (Optional)"
              htmlFor="roomId"
              hint={
                !formData.buildingId
                  ? 'Select a building first — leave empty for building-wide costs'
                  : 'Leave empty for building-wide costs'
              }
            >
              <Select
                id="roomId"
                name="roomId"
                value={formData.roomId}
                onChange={(e) => handleInputChange('roomId', e.target.value)}
                isDisabled={!formData.buildingId}
              >
                <option value="">Building-wide / no unit</option>
                {filteredRooms.map((room) => (
                  <option key={room.id} value={String(room.id)}>
                    {room.buildingName ? `${room.buildingName} - ` : ''}Room{' '}
                    {room.roomNumber}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        );

      case 'vendor':
        return (
          <FormField
            label="Vendor"
            htmlFor="vendor"
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
        );

      case 'notes':
        return (
          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes or details about the expense"
            />
          </FormField>
        );

      default:
        return null;
    }
  };

  return mode === 'page' ? (
    <SectionedFormShell
      mode="page"
      onCancel={handleCancel}
      eyebrow="Record Expense"
      entityLabel="New Expense"
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Record Expense"
      primaryLoading={isLoading}
      formId="expense-form"
      headerExtra={headerExtra}
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  ) : (
    <SectionedFormShell
      mode={mode}
      isOpen={isOpen}
      onCancel={handleCancel}
      eyebrow="Record Expense"
      entityLabel="New Expense"
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Record Expense"
      primaryLoading={isLoading}
      formId="expense-form"
      headerExtra={headerExtra}
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  );
}
