'use client';

import { useState, useEffect } from 'react';
import { Building } from '@/types/database';
import { Image } from '@/lib/api/images';
import ImageUpload from '@/components/features/ImageUpload';
import ImageGallery from '@/components/features/ImageGallery';
import { useNotifications } from '@/hooks/useNotifications';

interface BuildingDetailWithImagesProps {
  building: Building;
}

export default function BuildingDetailWithImages({ building }: BuildingDetailWithImagesProps) {
  const { addNotification } = useNotifications();
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Fetch building images
  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/images?entityType=building&entityId=${building.id}`);
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
      }

      // Check if response has content before parsing
      const text = await response.text();
      if (!text.trim()) {
        console.warn('Empty response received for images');
        setImages([]);
        return;
      }

      const result = JSON.parse(text);

      if (result.success) {
        setImages(result.data);
      } else {
        console.error('Failed to fetch images:', result.error);
        setImages([]);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [building.id]);

  const handleUploadComplete = () => {
    fetchImages(); // Refresh images after upload
    setShowUpload(false); // Close upload interface
  };

  const handleImageUpdate = () => {
    fetchImages(); // Refresh images after any update
  };

  const formatAddress = (building: Building) => {
    return `${building.addressLine1}${building.addressLine2 ? `, ${building.addressLine2}` : ''}, ${building.city}, ${building.state} ${building.postalCode}`;
  };

  return (
    <div className="space-y-6">
      {/* Building Images Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Building Photos</h3>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Photos
            </button>
          </div>

          {/* Upload Interface */}
          {showUpload && (
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <ImageUpload
                entityType="building"
                entityId={building.id}
                onUploadComplete={handleUploadComplete}
                maxImages={20}
              />
            </div>
          )}

          {/* Images Gallery */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-gray-900">Loading images...</span>
            </div>
          ) : (
            <ImageGallery
              images={images}
              entityType="building"
              entityId={building.id}
              onImageUpdate={handleImageUpdate}
              showUpload={!showUpload}
            />
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Building Information</h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-900">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatAddress(building)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Building Type</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{building.buildingType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Year Built</dt>
              <dd className="mt-1 text-sm text-gray-900">{building.yearBuilt || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Total Floors</dt>
              <dd className="mt-1 text-sm text-gray-900">{building.totalFloors || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Total Units</dt>
              <dd className="mt-1 text-sm text-gray-900">{building.totalUnits}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Active Units</dt>
              <dd className="mt-1 text-sm text-gray-900">{building.activeUnits}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-900">Country</dt>
              <dd className="mt-1 text-sm text-gray-900">{building.country}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-900">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{building.description || 'No description provided'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Amenities */}
      {building.amenities && building.amenities.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Amenities</h3>
            <div className="text-gray-900 bg-gray-50 p-4 rounded-md">
              {Array.isArray(building.amenities) 
                ? building.amenities.join(', ') 
                : building.amenities}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 