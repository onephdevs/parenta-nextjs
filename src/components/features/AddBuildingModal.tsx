'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Info } from 'lucide-react';
import { CreateBuildingData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import BuildingLocationFields from '@/components/features/BuildingLocationFields';

interface AddBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingAdded: (buildingId?: string) => void;
}

type AddBuildingSection = 'basic' | 'location' | 'details';

const SECTIONS: { id: AddBuildingSection; label: string; icon: React.ReactNode; title: string; subtitle: string }[] = [
  { 
    id: 'basic', 
    label: 'Basic info', 
    icon: <Building2 className="h-4 w-4" />,
    title: 'Basic information',
    subtitle: 'Name and building type.'
  },
  { 
    id: 'location', 
    label: 'Location', 
    icon: <MapPin className="h-4 w-4" />,
    title: 'Location',
    subtitle: 'Street address and region.'
  },
  { 
    id: 'details', 
    label: 'Details', 
    icon: <Info className="h-4 w-4" />,
    title: 'Additional details',
    subtitle: 'Description, size, and amenities.'
  },
];

export default function AddBuildingModal({ isOpen, onClose, onBuildingAdded }: AddBuildingModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<AddBuildingSection>('basic');

  const [formData, setFormData] = useState<CreateBuildingData>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Philippines',
    description: '',
    buildingType: 'residential',
    yearBuilt: undefined,
    totalFloors: undefined,
    amenities: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'yearBuilt' || name === 'totalFloors'
          ? value
            ? parseInt(value)
            : undefined
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating building...',
      message: 'Please wait while we create the building.',
    });

    try {
      const amenitiesArray = formData.amenities
        ? String(formData.amenities)
            .split(',')
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
        : [];

      const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amenities: amenitiesArray,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create building');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building created successfully!',
        message: `${formData.name} has been added to your portfolio.`,
      });

      setFormData({
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Philippines',
        description: '',
        buildingType: 'residential',
        yearBuilt: undefined,
        totalFloors: undefined,
        amenities: '',
      });
      setSection('basic');

      onClose();
      onBuildingAdded(result.data.id);

      setTimeout(() => {
        router.push(`/admin/properties?buildingId=${result.data.id}`);
        router.refresh();
      }, 400);
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create building',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionedFormShell
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow="Add building"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={setSection}
      formId="add-building-form"
      primaryLabel="Create building"
      primaryLoading={isSubmitting}
      primaryType="submit"
      errorBanner={error ? <FormErrorBanner message={error} className="mb-6" /> : null}
    >
      <form id="add-building-form" onSubmit={handleSubmit} className="space-y-5">
        {section === 'basic' && (
          <div className="space-y-5">
            <FormField label="Building name" htmlFor="name" required>
              <Input
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter building name"
              />
            </FormField>

            <FormField label="Building type" htmlFor="buildingType" required>
              <Select
                id="buildingType"
                name="buildingType"
                value={formData.buildingType}
                onChange={handleInputChange}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="mixed">Mixed Use</option>
              </Select>
            </FormField>
          </div>
        )}

        {section === 'location' && (
          <BuildingLocationFields
            addressLine1={formData.addressLine1}
            addressLine2={formData.addressLine2 || ''}
            city={formData.city}
            state={formData.state}
            postalCode={formData.postalCode}
            country={formData.country || 'Philippines'}
            onChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
            disabled={isSubmitting}
          />
        )}

        {section === 'details' && (
          <div className="space-y-5">
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the building..."
              />
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Year built" htmlFor="yearBuilt">
                <Input
                  type="number"
                  id="yearBuilt"
                  name="yearBuilt"
                  min={1800}
                  max={new Date().getFullYear() + 5}
                  value={formData.yearBuilt || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 2015"
                />
              </FormField>
              <FormField label="Total floors" htmlFor="totalFloors">
                <Input
                  type="number"
                  id="totalFloors"
                  name="totalFloors"
                  min={1}
                  max={200}
                  value={formData.totalFloors || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 5"
                />
              </FormField>
            </div>

            <FormField
              label="Amenities"
              htmlFor="amenities"
              hint="Separate with commas."
            >
              <Input
                id="amenities"
                name="amenities"
                value={formData.amenities || ''}
                onChange={handleInputChange}
                placeholder="Parking, Pool, Gym, Security"
              />
            </FormField>
          </div>
        )}
      </form>
    </SectionedFormShell>
  );
}
