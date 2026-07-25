'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Building } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface EditBuildingFormProps {
  building: Building;
}

export default function EditBuildingForm({ building }: EditBuildingFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amenitiesString = Array.isArray(building.amenities)
    ? building.amenities.join(', ')
    : (building.amenities || '');

  const [formData, setFormData] = useState({
    name: building.name,
    buildingType: building.buildingType,
    addressLine1: building.addressLine1,
    addressLine2: building.addressLine2 || '',
    city: building.city,
    state: building.state,
    postalCode: building.postalCode,
    country: building.country,
    description: building.description || '',
    yearBuilt: building.yearBuilt,
    totalFloors: building.totalFloors,
    amenities: amenitiesString,
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
      title: 'Updating building...',
      message: 'Please wait while we update the building information.',
    });

    try {
      const amenitiesArray = formData.amenities
        ? formData.amenities.split(',').map((a) => a.trim()).filter((a) => a.length > 0)
        : [];

      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amenities: amenitiesArray,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update building');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building updated successfully!',
        message: `${formData.name} has been updated.`,
      });

      router.refresh();
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to update building',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Deleting building...',
      message: 'Please wait while we delete the building.',
    });

    try {
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete building');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building deleted successfully!',
        message: `${building.name} has been removed from your portfolio.`,
      });

      setTimeout(() => {
        router.push('/admin/buildings');
      }, 1000);
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to delete building',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Card id="edit-building-form" padding="none" className="shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Edit Building</h3>
          <p className="text-sm text-gray-900 mt-1">Update building information and settings</p>
        </div>

        <div className="p-6">
          {error && <FormErrorBanner message={error} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Address</h4>
              <div className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <FormField label="Country" htmlFor="country" required>
                  <Input
                    id="country"
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleInputChange}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Building Details</h4>
              <div className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Year Built" htmlFor="yearBuilt">
                    <Input
                      type="number"
                      id="yearBuilt"
                      name="yearBuilt"
                      min={1800}
                      max={new Date().getFullYear() + 5}
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

                <FormField
                  label="Amenities"
                  htmlFor="amenities"
                  hint="Enter amenities freely with spaces and commas as needed"
                >
                  <Input
                    id="amenities"
                    name="amenities"
                    value={formData.amenities || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, amenities: e.target.value }));
                    }}
                    placeholder="e.g., Parking, Pool (heated), Gym, 24/7 Security"
                  />
                </FormField>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setShowDeleteConfirm(true)}
                isDisabled={isDeleting}
              >
                Delete Building
              </Button>

              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Building'}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Building"
        message={`Are you sure you want to delete "${building.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
