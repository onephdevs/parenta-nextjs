'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateBuildingData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { X, MapPin } from 'lucide-react';
import { createBuilding } from '@/lib/api/buildings';
import FullScreenModal from '@/components/ui/FullScreenModal';

interface AddBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingAdded: () => void;
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
    amenities: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearBuilt' || name === 'totalFloors' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Creating building...',
      message: 'Please wait while we create the building.'
    });

    try {
      // Convert amenities string to array (split by comma, trim whitespace, filter empty)
      const amenitiesArray = formData.amenities
        ? String(formData.amenities).split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];

      const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          amenities: amenitiesArray
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create building');
      }

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building created successfully!',
        message: `${formData.name} has been added to your portfolio.`
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
        amenities: []
      });
      setAmenitiesInput('');
      
      onClose();
      
      setTimeout(() => {
        router.push(`/admin/buildings/${result.data.id}`);
      }, 1000);
      
    } catch (err) {
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to create building',
        message: err instanceof Error ? err.message : 'An error occurred'
      });
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cancelButton = (
    <button
      type="button"
      onClick={onClose}
      disabled={isSubmitting}
      className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
    >
      Cancel
    </button>
  );

  const createButton = (
    <button
      form="building-form"
      type="submit"
      disabled={isSubmitting}
      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? 'Creating...' : 'Create Building'}
    </button>
  );

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Building"
      primaryButton={createButton}
      secondaryButton={cancelButton}
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form id="building-form" onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
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
                />
              </div>
              
              <div>
                <label htmlFor="buildingType" className="block text-sm font-medium text-gray-900 mb-1">
                  Building Type
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

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            
            <div>
              <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-900 mb-1">
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
              />
            </div>

            <div>
              <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-900 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-1">
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
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-900 mb-1">
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
                />
              </div>

              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-900 mb-1">
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
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="yearBuilt" className="block text-sm font-medium text-gray-900 mb-1">
                  Year Built
                </label>
                <input
                  type="number"
                  id="yearBuilt"
                  name="yearBuilt"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="totalFloors" className="block text-sm font-medium text-gray-900 mb-1">
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
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="amenities" className="block text-sm font-medium text-gray-900 mb-1">
                Amenities
              </label>
              <input
                type="text"
                id="amenities"
                name="amenities"
                value={formData.amenities || ''}
                onChange={handleInputChange}
                placeholder="e.g., Parking, Pool (heated), Gym, 24/7 Security"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-900 mt-1">Enter amenities freely with spaces and commas as needed</p>
            </div>
          </div>
        </div>
      </form>
    </FullScreenModal>
  );
} 