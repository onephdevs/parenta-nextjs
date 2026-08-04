'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Info, DollarSign, FileText } from 'lucide-react';
import { Building, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings?: Building[];
  building?: Building;
  buildingId?: string;
  onRoomAdded?: (roomId?: string) => void;
}

type AddRoomSection = 'basic' | 'details' | 'financial' | 'additional';

const SECTIONS: { id: AddRoomSection; label: string; icon: React.ReactNode; title: string; subtitle: string }[] = [
  { 
    id: 'basic', 
    label: 'Basic info', 
    icon: <Building2 className="h-4 w-4" />,
    title: 'Basic information',
    subtitle: 'Building and room identification.'
  },
  { 
    id: 'details', 
    label: 'Details', 
    icon: <Info className="h-4 w-4" />,
    title: 'Room details',
    subtitle: 'Type, floor, and size information.'
  },
  { 
    id: 'financial', 
    label: 'Financial', 
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Financial information',
    subtitle: 'Monthly rate and pricing.'
  },
  { 
    id: 'additional', 
    label: 'Additional', 
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional information',
    subtitle: 'Description and amenities.'
  },
];

export default function AddRoomModal({
  isOpen,
  onClose,
  buildings,
  building,
  buildingId,
  onRoomAdded,
}: AddRoomModalProps) {
  const buildingOptions = buildings || (building ? [building] : []);
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<AddRoomSection>('basic');

  const [formData, setFormData] = useState<CreateRoomData>({
    buildingId: buildingId || building?.id || '',
    roomNumber: '',
    roomType: 'bedroom',
    floorNumber: undefined,
    squareFootage: undefined,
    monthlyRate: 0,
    amenities: '',
    description: '',
  });

  const [amenitiesInput, setAmenitiesInput] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'squareFootage' || name === 'monthlyRate' || name === 'floorNumber'
          ? value
            ? parseFloat(value)
            : undefined
          : value,
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmenitiesInput(e.target.value);
    setFormData((prev) => ({ ...prev, amenities: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Creating room...',
      message: 'Please wait while we create your room.',
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

      const targetBuildingId = formData.buildingId || buildingId || building?.id || '';

      updateNotification(loadingId, {
        type: 'success',
        title: 'Room created successfully!',
        message: `Room ${formData.roomNumber} has been added. Opening the property page…`,
      });

      setFormData({
        buildingId: buildingId || building?.id || '',
        roomNumber: '',
        roomType: 'bedroom',
        floorNumber: undefined,
        squareFootage: undefined,
        monthlyRate: 0,
        amenities: '',
        description: '',
      });
      setAmenitiesInput('');
      setSection('basic');

      onClose();
      onRoomAdded?.(result.data.id);

      setTimeout(() => {
        const params = new URLSearchParams();
        if (targetBuildingId) params.set('buildingId', targetBuildingId);
        if (result.data?.id) params.set('roomId', result.data.id);
        router.push(`/admin/properties?${params.toString()}`);
        router.refresh();
      }, 400);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to create room',
        message: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionedFormShell
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow="Add room"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={setSection}
      formId="add-room-form"
      primaryLabel="Create room"
      primaryLoading={isSubmitting}
      primaryType="submit"
      errorBanner={error ? <FormErrorBanner message={error} className="mb-6" /> : null}
    >
      <form id="add-room-form" onSubmit={handleSubmit} className="space-y-5">
        {section === 'basic' && (
          <div className="space-y-5">
            <FormField label="Building" htmlFor="buildingId" required>
              <Select
                id="buildingId"
                name="buildingId"
                required
                value={formData.buildingId}
                onChange={handleInputChange}
                isDisabled={!!(buildingId || building)}
              >
                <option value="">Select a building</option>
                {buildingOptions.map((bldg) => (
                  <option key={bldg.id} value={bldg.id}>
                    {bldg.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Room number" htmlFor="roomNumber" required>
              <Input
                type="text"
                id="roomNumber"
                name="roomNumber"
                required
                value={formData.roomNumber}
                onChange={handleInputChange}
                placeholder="e.g., 101, A-201, Studio 5"
              />
            </FormField>
          </div>
        )}

        {section === 'details' && (
          <div className="space-y-5">
            <FormField label="Room type" htmlFor="roomType" required>
              <Select
                id="roomType"
                name="roomType"
                value={formData.roomType}
                onChange={handleInputChange}
              >
                <option value="bedroom">Bedroom</option>
                <option value="studio">Studio</option>
                <option value="1br">1 Bedroom</option>
                <option value="2br">2 Bedroom</option>
                <option value="3br">3 Bedroom</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="storage">Storage</option>
              </Select>
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Floor number" htmlFor="floorNumber">
                <Input
                  type="number"
                  id="floorNumber"
                  name="floorNumber"
                  min={0}
                  max={50}
                  value={formData.floorNumber || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 2"
                />
              </FormField>

              <FormField label="Square footage" htmlFor="squareFootage">
                <Input
                  type="number"
                  id="squareFootage"
                  name="squareFootage"
                  min={1}
                  max={5000}
                  step={1}
                  value={formData.squareFootage || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 250"
                />
              </FormField>
            </div>
          </div>
        )}

        {section === 'financial' && (
          <div className="space-y-5">
            <FormField
              label="Monthly rate (₱)"
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
                value={formData.monthlyRate || ''}
                onChange={handleInputChange}
                placeholder="e.g., 5000, 8000, 12000"
              />
            </FormField>
          </div>
        )}

        {section === 'additional' && (
          <div className="space-y-5">
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the room..."
              />
            </FormField>

            <FormField
              label="Amenities"
              htmlFor="amenities"
              hint="Separate with commas."
            >
              <Input
                type="text"
                id="amenities"
                name="amenities"
                value={amenitiesInput}
                onChange={handleAmenitiesChange}
                placeholder="Private Bathroom, Balcony, Air Conditioning"
              />
            </FormField>
          </div>
        )}
      </form>
    </SectionedFormShell>
  );
}
