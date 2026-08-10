'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { Home, Info, DollarSign, Shield, FileText, Star } from 'lucide-react';
import {
  UNIT_PURPOSE_LABELS,
  UNIT_PURPOSES,
  applyUnitPurpose,
  unitPurposeFromRoom,
  type UnitPurpose,
} from '@/lib/constants/unit-purpose';

interface AddRoomFormProps {
  buildingId: string;
  building: Building;
}

type FormSection = 'basic' | 'details' | 'pricing' | 'deposit' | 'description' | 'amenities';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'basic',
    label: 'Basic Info',
    icon: <Home className="h-4 w-4" />,
    title: 'Basic Information',
    subtitle: 'Room number and type',
  },
  {
    id: 'details',
    label: 'Details',
    icon: <Info className="h-4 w-4" />,
    title: 'Room Details',
    subtitle: 'Floor and size information',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Monthly Rate',
    subtitle: 'Set the monthly rental rate',
  },
  {
    id: 'deposit',
    label: 'Deposit',
    icon: <Shield className="h-4 w-4" />,
    title: 'Deposit Requirements',
    subtitle: 'Configure reservation deposit',
  },
  {
    id: 'description',
    label: 'Description',
    icon: <FileText className="h-4 w-4" />,
    title: 'Description',
    subtitle: 'Describe the room features',
  },
  {
    id: 'amenities',
    label: 'Amenities',
    icon: <Star className="h-4 w-4" />,
    title: 'Amenities',
    subtitle: 'List available amenities',
  },
];

export default function AddRoomForm({ buildingId, building }: AddRoomFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<FormSection>('basic');
  
  const [formData, setFormData] = useState<CreateRoomData>({
    buildingId,
    roomNumber: '',
    roomType: 'studio',
    floorNumber: undefined,
    squareFootage: undefined,
    monthlyRate: 0,
    depositRequired: false,
    depositType: 'one_month',
    depositFixedAmount: undefined,
    depositPercentage: undefined,
    isRevenueUnit: true,
    amenities: '',
    description: ''
  });

  const [amenitiesInput, setAmenitiesInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'squareFootage' || name === 'monthlyRate' || name === 'floorNumber'
        ? (value ? parseFloat(value) : undefined) 
        : value
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmenitiesInput(e.target.value);
    setFormData(prev => ({ ...prev, amenities: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating room...',
      message: 'Please wait while we create the room.'
    });

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create room');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Room created successfully!',
        message: `Room ${formData.roomNumber} has been created in ${building.name}.`
      });

      router.push(`/admin/properties?buildingId=${buildingId}&roomId=${result.data.id}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create room',
        message: errorMessage
      });
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const errorBanner = error ? (
    <Alert variant="danger" title="Error">
      {error}
    </Alert>
  ) : undefined;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Room Number" htmlFor="roomNumber" required>
              <Input
                id="roomNumber"
                name="roomNumber"
                required
                value={formData.roomNumber}
                onChange={handleInputChange}
                placeholder="e.g., 101, A-1, 2A"
              />
            </FormField>
            
            <FormField
              label="Unit purpose"
              htmlFor="unitPurpose"
              required
              hint="Store = same schema, commercial rate. Admin = owner space, utilities only (no rent)."
            >
              <Select
                id="unitPurpose"
                name="unitPurpose"
                required
                value={unitPurposeFromRoom({
                  roomType: formData.roomType,
                  isRevenueUnit: formData.isRevenueUnit,
                })}
                onChange={(e) => {
                  const purpose = e.target.value as UnitPurpose;
                  const applied = applyUnitPurpose(purpose, formData.roomType);
                  setFormData((prev) => ({
                    ...prev,
                    roomType: applied.roomType,
                    isRevenueUnit: applied.isRevenueUnit,
                    monthlyRate: purpose === 'admin' ? 0 : prev.monthlyRate,
                  }));
                }}
              >
                {UNIT_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {UNIT_PURPOSE_LABELS[p]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Room Type" htmlFor="roomType" required>
              <Select
                id="roomType"
                name="roomType"
                required
                value={formData.roomType}
                onChange={handleInputChange}
                disabled={unitPurposeFromRoom({
                  roomType: formData.roomType,
                  isRevenueUnit: formData.isRevenueUnit,
                }) !== 'residential'}
              >
                <option value="studio">Studio</option>
                <option value="one_bedroom">1 Bedroom</option>
                <option value="two_bedroom">2 Bedroom</option>
                <option value="three_bedroom">3 Bedroom</option>
                <option value="four_bedroom">4+ Bedroom</option>
                <option value="shared">Shared Room</option>
                <option value="single">Single Room</option>
                <option value="double">Double Room</option>
                <option value="store">Store / commercial</option>
                <option value="admin">Admin / owner</option>
              </Select>
            </FormField>
          </div>
        );

      case 'details':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Floor Number" htmlFor="floorNumber">
              <Input
                type="number"
                id="floorNumber"
                name="floorNumber"
                min={0}
                max={100}
                value={formData.floorNumber || ''}
                onChange={handleInputChange}
                placeholder="e.g., 1, 2, 3"
              />
            </FormField>

            <FormField label="Size (sq ft)" htmlFor="squareFootage">
              <Input
                type="number"
                id="squareFootage"
                name="squareFootage"
                min={1}
                step={1}
                value={formData.squareFootage || ''}
                onChange={handleInputChange}
                placeholder="e.g., 600, 800, 1200"
              />
            </FormField>
          </div>
        );

      case 'pricing':
        return (
          <FormField
            label="Monthly Rate (₱)"
            htmlFor="monthlyRate"
            required
            hint="Enter amount in Philippine Pesos"
          >
            <Input
              type="number"
              id="monthlyRate"
              name="monthlyRate"
              required
              min={0}
              step={1}
              value={formData.monthlyRate ?? ''}
              onChange={handleInputChange}
              placeholder="e.g., 5000, 8000, 12000"
            />
          </FormField>
        );

      case 'deposit':
        return (
          <div className="space-y-6">
            <Checkbox
              id="depositRequired"
              name="depositRequired"
              checked={formData.depositRequired || false}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, depositRequired: e.target.checked }))
              }
              label="Require deposit for reservation"
            />

            {formData.depositRequired && (
              <Card className="bg-gray-50 border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Deposit Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="one_month"
                          checked={formData.depositType === 'one_month'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">One Month Rent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="percentage"
                          checked={formData.depositType === 'percentage'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">Percentage of Rent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="fixed"
                          checked={formData.depositType === 'fixed'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">Fixed Amount</span>
                      </label>
                    </div>
                  </div>

                  {formData.depositType === 'percentage' && (
                    <FormField
                      label="Deposit Percentage (%)"
                      htmlFor="depositPercentage"
                      hint={
                        formData.monthlyRate && formData.depositPercentage
                          ? `Deposit: ₱${((formData.monthlyRate * formData.depositPercentage) / 100).toLocaleString()}`
                          : 'Enter percentage to see calculated amount'
                      }
                    >
                      <Input
                        type="number"
                        id="depositPercentage"
                        name="depositPercentage"
                        min={0}
                        max={200}
                        step={1}
                        value={formData.depositPercentage ?? ''}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, depositPercentage: e.target.value ? parseFloat(e.target.value) : undefined }))
                        }
                        placeholder="e.g., 50, 100"
                      />
                    </FormField>
                  )}

                  {formData.depositType === 'fixed' && (
                    <FormField label="Fixed Deposit Amount (₱)" htmlFor="depositFixedAmount">
                      <Input
                        type="number"
                        id="depositFixedAmount"
                        name="depositFixedAmount"
                        min={0}
                        step={1}
                        value={formData.depositFixedAmount ?? ''}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, depositFixedAmount: e.target.value ? parseFloat(e.target.value) : undefined }))
                        }
                        placeholder="e.g., 5000, 10000"
                      />
                    </FormField>
                  )}

                  {formData.depositType === 'one_month' && formData.monthlyRate > 0 && (
                    <div className="text-sm text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                      <strong>Deposit Required:</strong> ₱{formData.monthlyRate.toLocaleString()}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        );

      case 'description':
        return (
          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the room's features, layout, or any special characteristics..."
            />
          </FormField>
        );

      case 'amenities':
        return (
          <FormField label="Amenities (comma-separated)" htmlFor="amenities">
            <Input
              type="text"
              id="amenities"
              name="amenities"
              value={amenitiesInput}
              onChange={handleAmenitiesChange}
              placeholder="e.g., Air Conditioning, Private Bathroom, Balcony, WiFi"
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
      onCancel={handleCancel}
      eyebrow="Add New Room"
      entityLabel={building.name}
      sections={formSections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      primaryLabel="Create Room"
      primaryLoading={isSubmitting}
      formId="add-room-form"
      errorBanner={errorBanner}
    >
      <form id="add-room-form" onSubmit={handleSubmit} className="space-y-6">
        {renderSectionContent()}
      </form>
    </SectionedFormShell>
  );
}
