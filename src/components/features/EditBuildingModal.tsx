'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Building } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import FullScreenModal from '@/components/ui/FullScreenModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';

interface EditBuildingModalProps {
  building: Building;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditBuildingModal({ building, isOpen, onClose }: EditBuildingModalProps) {
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

  const [depositConfig, setDepositConfig] = useState<any>(null);
  const [depositFormData, setDepositFormData] = useState({
    depositMonths: 1,
    depositType: 'months' as 'fixed' | 'percentage' | 'months',
    depositAmount: undefined as number | undefined,
    depositPercentage: undefined as number | undefined,
    advanceMonths: 1,
    advanceType: 'months' as 'fixed' | 'percentage' | 'months',
    advanceAmount: undefined as number | undefined,
    advancePercentage: undefined as number | undefined,
    utilityDepositAmount: 0,
    depositValidityDays: 5,
    depositRefundableAfterDays: 5,
    minimumDepositAmount: 3000,
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepositConfig();
    }
  }, [isOpen, building.id]);

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

  const fetchDepositConfig = async () => {
    try {
      const response = await fetch(`/api/building-deposit-config/${building.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        setDepositConfig(result.data);
        setDepositFormData({
          depositMonths: result.data.depositMonths || 1,
          depositType: result.data.depositType || 'months',
          depositAmount: result.data.depositAmount,
          depositPercentage: result.data.depositPercentage,
          advanceMonths: result.data.advanceMonths || 1,
          advanceType: result.data.advanceType || 'months',
          advanceAmount: result.data.advanceAmount,
          advancePercentage: result.data.advancePercentage,
          utilityDepositAmount: result.data.utilityDepositAmount || 0,
          depositValidityDays: result.data.depositValidityDays || 5,
          depositRefundableAfterDays: result.data.depositRefundableAfterDays || 5,
          minimumDepositAmount: result.data.minimumDepositAmount || 3000,
        });
      }
    } catch (error) {
      console.error('Error fetching deposit config:', error);
    }
  };

  const handleDepositConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setDepositFormData((prev) => ({
      ...prev,
      [name]:
        name.includes('Months') ||
        name.includes('Days') ||
        name.includes('Amount') ||
        name.includes('Percentage')
          ? value
            ? parseFloat(value)
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

      const buildingResponse = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amenities: amenitiesArray,
        }),
      });

      const buildingResult = await buildingResponse.json();

      if (!buildingResult.success) {
        throw new Error(buildingResult.error || 'Failed to update building');
      }

      try {
        await fetch('/api/building-deposit-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            buildingId: building.id,
            ...depositFormData,
          }),
        });
      } catch (depositError) {
        console.error('Error saving deposit config:', depositError);
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building updated successfully!',
        message: `${formData.name} has been updated.`,
      });

      router.refresh();
      onClose();
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
        router.push('/admin/properties');
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

  const actionButtons = (
    <div className="flex justify-end items-center w-full">
      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={onClose}
          isDisabled={isSubmitting || isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          className="text-red-700 border-red-300 hover:bg-red-50"
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={() => setShowDeleteConfirm(true)}
          isDisabled={isDeleting || isSubmitting}
        >
          Delete Building
        </Button>
        <Button
          type="submit"
          form="edit-building-form"
          variant="primary"
          isLoading={isSubmitting}
          isDisabled={isDeleting}
        >
          {isSubmitting ? 'Updating...' : 'Update Building'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <FullScreenModal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Building"
        subtitle={`Update information for ${building.name}`}
        actionButtons={actionButtons}
      >
        {error && <FormErrorBanner message={error} className="mb-6" />}

        <form id="edit-building-form" onSubmit={handleSubmit} className="space-y-8 text-gray-900">
          <Card padding="md" className="border border-gray-200 shadow-none">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0H3m2 0v-8a2 2 0 012-2h4a2 2 0 012 2v8M9 7h6m-6 4h6m-2 5h2" />
              </svg>
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Building Name" htmlFor="name" required>
                <Input
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter building name"
                />
              </FormField>

              <FormField label="Building Type" htmlFor="buildingType" required>
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
          </Card>

          <Card padding="md" className="border border-gray-200 shadow-none">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Address
            </h3>

            <div className="space-y-6">
              <FormField label="Address Line 1" htmlFor="addressLine1" required>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  required
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  placeholder="Enter street address"
                />
              </FormField>

              <FormField label="Address Line 2" htmlFor="addressLine2">
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, etc. (optional)"
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
                    placeholder="City"
                  />
                </FormField>

                <FormField label="State" htmlFor="state" required>
                  <Input
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State"
                  />
                </FormField>

                <FormField label="Postal Code" htmlFor="postalCode" required>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    required
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="Postal Code"
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
                  placeholder="Country"
                />
              </FormField>
            </div>
          </Card>

          <Card padding="md" className="border border-gray-200 shadow-none">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Building Details
            </h3>

            <div className="space-y-6">
              <FormField label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the building, its features, and amenities..."
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Year Built" htmlFor="yearBuilt">
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

                <FormField label="Total Floors" htmlFor="totalFloors">
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
                hint="Enter amenities freely with spaces and commas as needed."
              >
                <Input
                  id="amenities"
                  name="amenities"
                  value={formData.amenities || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, amenities: e.target.value }));
                  }}
                  placeholder="e.g., Parking, Pool (heated), Gym, 24/7 Security, Laundry Room"
                />
              </FormField>
            </div>
          </Card>

          <Card padding="md" className="border border-gray-200 shadow-none">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deposit & Advance Configuration
            </h3>
            <p className="text-sm text-gray-900 mb-4">
              Configure deposit, advance payment, and utility deposit requirements for this building.
              Rooms will inherit these settings unless configured individually.
            </p>

            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Deposit Type" htmlFor="depositType">
                    <Select
                      id="depositType"
                      name="depositType"
                      value={depositFormData.depositType}
                      onChange={handleDepositConfigChange}
                    >
                      <option value="months">Months of Rent</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </Select>
                  </FormField>

                  {depositFormData.depositType === 'months' && (
                    <FormField
                      label="Deposit Months"
                      htmlFor="depositMonths"
                      hint="Number of months (e.g., 2 = 2 months rent)"
                    >
                      <Input
                        type="number"
                        id="depositMonths"
                        name="depositMonths"
                        min={0}
                        step={0.5}
                        value={depositFormData.depositMonths}
                        onChange={handleDepositConfigChange}
                        placeholder="e.g., 2"
                      />
                    </FormField>
                  )}

                  {depositFormData.depositType === 'fixed' && (
                    <FormField label="Deposit Amount" htmlFor="depositAmount">
                      <Input
                        type="number"
                        id="depositAmount"
                        name="depositAmount"
                        min={0}
                        step={0.01}
                        value={depositFormData.depositAmount || ''}
                        onChange={handleDepositConfigChange}
                        placeholder="e.g., 9600"
                      />
                    </FormField>
                  )}

                  {depositFormData.depositType === 'percentage' && (
                    <FormField
                      label="Deposit Percentage"
                      htmlFor="depositPercentage"
                      hint="Percentage of monthly rent"
                    >
                      <Input
                        type="number"
                        id="depositPercentage"
                        name="depositPercentage"
                        min={0}
                        max={100}
                        step={0.01}
                        value={depositFormData.depositPercentage || ''}
                        onChange={handleDepositConfigChange}
                        placeholder="e.g., 50"
                      />
                    </FormField>
                  )}

                  <FormField
                    label="Minimum Deposit Amount"
                    htmlFor="minimumDepositAmount"
                    hint="Minimum required deposit (default: 3,000)"
                  >
                    <Input
                      type="number"
                      id="minimumDepositAmount"
                      name="minimumDepositAmount"
                      min={0}
                      step={0.01}
                      value={depositFormData.minimumDepositAmount}
                      onChange={handleDepositConfigChange}
                      placeholder="e.g., 3000"
                    />
                  </FormField>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Advance Payment Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Advance Type" htmlFor="advanceType">
                    <Select
                      id="advanceType"
                      name="advanceType"
                      value={depositFormData.advanceType}
                      onChange={handleDepositConfigChange}
                    >
                      <option value="months">Months of Rent</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </Select>
                  </FormField>

                  {depositFormData.advanceType === 'months' && (
                    <FormField
                      label="Advance Months"
                      htmlFor="advanceMonths"
                      hint="Number of months (e.g., 1 = 1 month rent)"
                    >
                      <Input
                        type="number"
                        id="advanceMonths"
                        name="advanceMonths"
                        min={0}
                        step={0.5}
                        value={depositFormData.advanceMonths}
                        onChange={handleDepositConfigChange}
                        placeholder="e.g., 1"
                      />
                    </FormField>
                  )}

                  {depositFormData.advanceType === 'fixed' && (
                    <FormField label="Advance Amount" htmlFor="advanceAmount">
                      <Input
                        type="number"
                        id="advanceAmount"
                        name="advanceAmount"
                        min={0}
                        step={0.01}
                        value={depositFormData.advanceAmount || ''}
                        onChange={handleDepositConfigChange}
                        placeholder="e.g., 4800"
                      />
                    </FormField>
                  )}

                  {depositFormData.advanceType === 'percentage' && (
                    <FormField
                      label="Advance Percentage"
                      htmlFor="advancePercentage"
                      hint="Percentage of monthly rent"
                    >
                      <Input
                        type="number"
                        id="advancePercentage"
                        name="advancePercentage"
                        min={0}
                        max={100}
                        step={0.01}
                        value={depositFormData.advancePercentage || ''}
                        onChange={handleDepositConfigChange}
                        placeholder="e.g., 50"
                      />
                    </FormField>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Utility Deposit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Utility Deposit Amount"
                    htmlFor="utilityDepositAmount"
                    hint="Fixed utility deposit amount"
                  >
                    <Input
                      type="number"
                      id="utilityDepositAmount"
                      name="utilityDepositAmount"
                      min={0}
                      step={0.01}
                      value={depositFormData.utilityDepositAmount}
                      onChange={handleDepositConfigChange}
                      placeholder="e.g., 1000"
                    />
                  </FormField>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Validity Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Deposit Validity (Days)"
                    htmlFor="depositValidityDays"
                    hint="Number of days deposit is valid (default: 5)"
                  >
                    <Input
                      type="number"
                      id="depositValidityDays"
                      name="depositValidityDays"
                      min={1}
                      value={depositFormData.depositValidityDays}
                      onChange={handleDepositConfigChange}
                      placeholder="e.g., 5"
                    />
                  </FormField>

                  <FormField
                    label="Non-Refundable After (Days)"
                    htmlFor="depositRefundableAfterDays"
                    hint="After this many days, deposit becomes non-refundable (default: 5)"
                  >
                    <Input
                      type="number"
                      id="depositRefundableAfterDays"
                      name="depositRefundableAfterDays"
                      min={1}
                      value={depositFormData.depositRefundableAfterDays}
                      onChange={handleDepositConfigChange}
                      placeholder="e.g., 5"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </Card>
        </form>
      </FullScreenModal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Building"
        message={`Are you sure you want to delete "${building.name}"? This action cannot be undone and will remove all associated rooms and data.`}
        confirmText="Delete Building"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
