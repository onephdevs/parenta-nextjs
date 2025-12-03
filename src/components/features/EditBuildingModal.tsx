'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building } from '@/types/database';
import { useNotifications } from '@/context/NotificationContext';
import FullScreenModal from '@/components/ui/FullScreenModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  
  // Convert amenities array to string for input field
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
    amenities: amenitiesString
  });

  // Deposit config state
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

  // Load deposit config when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepositConfig();
    }
  }, [isOpen, building.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearBuilt' || name === 'totalFloors' ? (value ? parseInt(value) : undefined) : value
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

  const handleDepositConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDepositFormData(prev => ({
      ...prev,
      [name]: name.includes('Months') || name.includes('Days') || name.includes('Amount') || name.includes('Percentage')
        ? (value ? parseFloat(value) : undefined)
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Updating building...',
      message: 'Please wait while we update the building information.'
    });

    try {
      // Convert amenities string to array (split by comma, trim whitespace, filter empty)
      const amenitiesArray = formData.amenities
        ? formData.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];

      // Update building
      const buildingResponse = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amenities: amenitiesArray
        }),
      });

      const buildingResult = await buildingResponse.json();

      if (!buildingResult.success) {
        throw new Error(buildingResult.error || 'Failed to update building');
      }

      // Save deposit config
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
        // Don't fail the whole update if deposit config fails
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building updated successfully!',
        message: `${formData.name} has been updated.`
      });

      router.refresh();
      onClose();
      
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to update building',
        message: err instanceof Error ? err.message : 'An error occurred'
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
      message: 'Please wait while we delete the building.'
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
        message: `${building.name} has been removed from your portfolio.`
      });

      setTimeout(() => {
        router.push('/admin/buildings');
      }, 1000);
      
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to delete building',
        message: err instanceof Error ? err.message : 'An error occurred'
      });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const actionButtons = (
    <div className="flex justify-end items-center w-full">
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting || isDeleting}
          className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting || isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Building
        </button>
        <button
          type="submit"
          form="edit-building-form"
          disabled={isSubmitting || isDeleting}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : (
            'Update Building'
          )}
        </button>
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
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form id="edit-building-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0H3m2 0v-8a2 2 0 012-2h4a2 2 0 012 2v8M9 7h6m-6 4h6m-2 5h2" />
              </svg>
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                  Building Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter building name"
                />
              </div>
              
              <div>
                <label htmlFor="buildingType" className="block text-sm font-medium text-gray-900 mb-2">
                  Building Type *
                </label>
                <select
                  id="buildingType"
                  name="buildingType"
                  value={formData.buildingType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed Use</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Address
            </h3>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-900 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  required
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter street address"
                />
              </div>

              <div>
                <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-900 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="addressLine2"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-900 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-900 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    required
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Postal Code"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-900 mb-2">
                  Country *
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Building Details Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
              <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Building Details
            </h3>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief description of the building, its features, and amenities..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="yearBuilt" className="block text-sm font-medium text-gray-900 mb-2">
                    Year Built
                  </label>
                  <input
                    type="number"
                    id="yearBuilt"
                    name="yearBuilt"
                    min="1800"
                    max={new Date().getFullYear() + 5}
                    value={formData.yearBuilt || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 2015"
                  />
                </div>

                <div>
                  <label htmlFor="totalFloors" className="block text-sm font-medium text-gray-900 mb-2">
                    Total Floors
                  </label>
                  <input
                    type="number"
                    id="totalFloors"
                    name="totalFloors"
                    min="1"
                    max="200"
                    value={formData.totalFloors || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="amenities" className="block text-sm font-medium text-gray-900 mb-2">
                  Amenities
                </label>
                <input
                  type="text"
                  id="amenities"
                  name="amenities"
                  value={formData.amenities || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, amenities: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Parking, Pool (heated), Gym, 24/7 Security, Laundry Room"
                />
                <p className="mt-2 text-sm text-gray-900">
                  Enter amenities freely with spaces and commas as needed.
                </p>
              </div>
            </div>
          </div>

          {/* Deposit Configuration Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
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
              {/* Deposit Requirements */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="depositType" className="block text-sm font-medium text-gray-900 mb-2">
                      Deposit Type
                    </label>
                    <select
                      id="depositType"
                      name="depositType"
                      value={depositFormData.depositType}
                      onChange={handleDepositConfigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="months">Months of Rent</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>

                  {depositFormData.depositType === 'months' && (
                    <div>
                      <label htmlFor="depositMonths" className="block text-sm font-medium text-gray-900 mb-2">
                        Deposit Months
                      </label>
                      <input
                        type="number"
                        id="depositMonths"
                        name="depositMonths"
                        min="0"
                        step="0.5"
                        value={depositFormData.depositMonths}
                        onChange={handleDepositConfigChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 2"
                      />
                      <p className="mt-1 text-xs text-gray-900">Number of months (e.g., 2 = 2 months rent)</p>
                    </div>
                  )}

                  {depositFormData.depositType === 'fixed' && (
                    <div>
                      <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-900 mb-2">
                        Deposit Amount
                      </label>
                      <input
                        type="number"
                        id="depositAmount"
                        name="depositAmount"
                        min="0"
                        step="0.01"
                        value={depositFormData.depositAmount || ''}
                        onChange={handleDepositConfigChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 9600"
                      />
                    </div>
                  )}

                  {depositFormData.depositType === 'percentage' && (
                    <div>
                      <label htmlFor="depositPercentage" className="block text-sm font-medium text-gray-900 mb-2">
                        Deposit Percentage
                      </label>
                      <input
                        type="number"
                        id="depositPercentage"
                        name="depositPercentage"
                        min="0"
                        max="100"
                        step="0.01"
                        value={depositFormData.depositPercentage || ''}
                        onChange={handleDepositConfigChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 50"
                      />
                      <p className="mt-1 text-xs text-gray-900">Percentage of monthly rent</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="minimumDepositAmount" className="block text-sm font-medium text-gray-900 mb-2">
                      Minimum Deposit Amount
                    </label>
                    <input
                      type="number"
                      id="minimumDepositAmount"
                      name="minimumDepositAmount"
                      min="0"
                      step="0.01"
                      value={depositFormData.minimumDepositAmount}
                      onChange={handleDepositConfigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 3000"
                    />
                    <p className="mt-1 text-xs text-gray-900">Minimum required deposit (default: 3,000)</p>
                  </div>
                </div>
              </div>

              {/* Advance Configuration */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Advance Payment Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="advanceType" className="block text-sm font-medium text-gray-900 mb-2">
                      Advance Type
                    </label>
                    <select
                      id="advanceType"
                      name="advanceType"
                      value={depositFormData.advanceType}
                      onChange={handleDepositConfigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="months">Months of Rent</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>

                  {depositFormData.advanceType === 'months' && (
                    <div>
                      <label htmlFor="advanceMonths" className="block text-sm font-medium text-gray-900 mb-2">
                        Advance Months
                      </label>
                      <input
                        type="number"
                        id="advanceMonths"
                        name="advanceMonths"
                        min="0"
                        step="0.5"
                        value={depositFormData.advanceMonths}
                        onChange={handleDepositConfigChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 1"
                      />
                      <p className="mt-1 text-xs text-gray-900">Number of months (e.g., 1 = 1 month rent)</p>
                    </div>
                  )}

                  {depositFormData.advanceType === 'fixed' && (
                    <div>
                      <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-900 mb-2">
                        Advance Amount
                      </label>
                      <input
                        type="number"
                        id="advanceAmount"
                        name="advanceAmount"
                        min="0"
                        step="0.01"
                        value={depositFormData.advanceAmount || ''}
                        onChange={handleDepositConfigChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 4800"
                      />
                    </div>
                  )}

                  {depositFormData.advanceType === 'percentage' && (
                    <div>
                      <label htmlFor="advancePercentage" className="block text-sm font-medium text-gray-900 mb-2">
                        Advance Percentage
                      </label>
                      <input
                        type="number"
                        id="advancePercentage"
                        name="advancePercentage"
                        min="0"
                        max="100"
                        step="0.01"
                        value={depositFormData.advancePercentage || ''}
                        onChange={handleDepositConfigChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 50"
                      />
                      <p className="mt-1 text-xs text-gray-900">Percentage of monthly rent</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Utility Deposit */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Utility Deposit</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="utilityDepositAmount" className="block text-sm font-medium text-gray-900 mb-2">
                      Utility Deposit Amount
                    </label>
                    <input
                      type="number"
                      id="utilityDepositAmount"
                      name="utilityDepositAmount"
                      min="0"
                      step="0.01"
                      value={depositFormData.utilityDepositAmount}
                      onChange={handleDepositConfigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 1000"
                    />
                    <p className="mt-1 text-xs text-gray-900">Fixed utility deposit amount</p>
                  </div>
                </div>
              </div>

              {/* Deposit Validity */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Validity Rules</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="depositValidityDays" className="block text-sm font-medium text-gray-900 mb-2">
                      Deposit Validity (Days)
                    </label>
                    <input
                      type="number"
                      id="depositValidityDays"
                      name="depositValidityDays"
                      min="1"
                      value={depositFormData.depositValidityDays}
                      onChange={handleDepositConfigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 5"
                    />
                    <p className="mt-1 text-xs text-gray-900">Number of days deposit is valid (default: 5)</p>
                  </div>

                  <div>
                    <label htmlFor="depositRefundableAfterDays" className="block text-sm font-medium text-gray-900 mb-2">
                      Non-Refundable After (Days)
                    </label>
                    <input
                      type="number"
                      id="depositRefundableAfterDays"
                      name="depositRefundableAfterDays"
                      min="1"
                      value={depositFormData.depositRefundableAfterDays}
                      onChange={handleDepositConfigChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 5"
                    />
                    <p className="mt-1 text-xs text-gray-900">After this many days, deposit becomes non-refundable (default: 5)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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