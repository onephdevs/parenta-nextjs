'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateBuildingData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import FullScreenModal from '@/components/ui/FullScreenModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';

interface AddBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingAdded: (buildingId?: string) => void;
}

export default function AddBuildingModal({ isOpen, onClose, onBuildingAdded }: AddBuildingModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen) return null;

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Building"
      secondaryButton={
        <Button variant="outline" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      }
      primaryButton={
        <Button
          type="submit"
          form="building-form"
          variant="primary"
          isLoading={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Building'}
        </Button>
      }
    >
      {error && <FormErrorBanner message={error} className="mb-6" />}

      <form id="building-form" onSubmit={handleSubmit} className="space-y-8 text-gray-900">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Building Name" htmlFor="name" required>
                <Input
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </FormField>

              <FormField label="Building Type" htmlFor="buildingType">
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
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>

            <FormField label="Address Line 1" htmlFor="addressLine1" required>
              <Input
                id="addressLine1"
                name="addressLine1"
                required
                value={formData.addressLine1}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Address Line 2" htmlFor="addressLine2">
              <Input
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField label="City" htmlFor="city" required>
                <Input
                  id="city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </FormField>
              <FormField label="State" htmlFor="state" required>
                <Input
                  id="state"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </FormField>
              <FormField label="Postal Code" htmlFor="postalCode" required>
                <Input
                  id="postalCode"
                  name="postalCode"
                  required
                  value={formData.postalCode}
                  onChange={handleInputChange}
                />
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Year Built" htmlFor="yearBuilt">
                <Input
                  type="number"
                  id="yearBuilt"
                  name="yearBuilt"
                  min={1800}
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt || ''}
                  onChange={handleInputChange}
                />
              </FormField>
              <FormField label="Total Floors" htmlFor="totalFloors">
                <Input
                  type="number"
                  id="totalFloors"
                  name="totalFloors"
                  min={1}
                  max={200}
                  value={formData.totalFloors || ''}
                  onChange={handleInputChange}
                />
              </FormField>
            </div>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField
              label="Amenities"
              htmlFor="amenities"
              hint="Enter amenities freely with spaces and commas as needed"
            >
              <Input
                id="amenities"
                name="amenities"
                value={formData.amenities || ''}
                onChange={handleInputChange}
                placeholder="e.g., Parking, Pool (heated), Gym, 24/7 Security"
              />
            </FormField>
          </div>
        </div>
      </form>
    </FullScreenModal>
  );
}
