'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Image as ImageIcon,
  Info,
  Map,
  MapPin,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Building } from '@/types/database';
import { mapsFieldPrefill } from '@/lib/maps/google-maps-location';
import type { Image as BuildingImage } from '@/lib/api/images';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SectionedFormShell, { type SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import ImageUpload from '@/components/features/ImageUpload';
import ImageGallery from '@/components/features/ImageGallery';
import BuildingLocationFields from '@/components/features/BuildingLocationFields';
import BuildingDepositFields, {
  DEFAULT_BUILDING_DEPOSIT_FORM,
} from '@/components/features/BuildingDepositFields';
import BuildingNearbyPlacesPanel from '@/components/features/BuildingNearbyPlacesPanel';

type EditSection = 'basic' | 'location' | 'nearby' | 'details' | 'deposits' | 'photos';

interface EditBuildingModalProps {
  building: Building;
  isOpen: boolean;
  onClose: () => void;
  onImagesChanged?: () => void;
  /** Open directly on a section (e.g. photos from the property dashboard CTA). */
  initialSection?: EditSection;
}

const SECTIONS: SectionedFormSection<EditSection>[] = [
  { 
    id: 'basic', 
    label: 'Basic info', 
    icon: <Building2 className="h-4 w-4" />, 
    title: 'Basic info', 
    subtitle: 'Name and building type.' 
  },
  { 
    id: 'location', 
    label: 'Location', 
    icon: <MapPin className="h-4 w-4" />, 
    title: 'Location', 
    subtitle: 'Address, region, and Google Maps pin.' 
  },
  { 
    id: 'nearby', 
    label: 'Nearby places', 
    icon: <Map className="h-4 w-4" />, 
    title: 'Nearby places', 
    subtitle: 'Get latest from OpenStreetMap, verify, then save for the landing map.' 
  },
  { 
    id: 'details', 
    label: 'Details', 
    icon: <Info className="h-4 w-4" />, 
    title: 'Details', 
    subtitle: 'Description, size, and amenities.' 
  },
  { 
    id: 'deposits', 
    label: 'Deposits & advance', 
    icon: <Wallet className="h-4 w-4" />, 
    title: 'Deposits & advance', 
    subtitle: 'Rooms inherit these unless overridden individually.' 
  },
  { 
    id: 'photos', 
    label: 'Photos', 
    icon: <ImageIcon className="h-4 w-4" />, 
    title: 'Photos', 
    subtitle: 'Upload photos and set the primary image for this property.' 
  },
];

export default function EditBuildingModal({
  building,
  isOpen,
  onClose,
  onImagesChanged,
  initialSection = 'basic',
}: EditBuildingModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [section, setSection] = useState<EditSection>(initialSection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<BuildingImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  const amenitiesString = Array.isArray(building.amenities)
    ? building.amenities.join(', ')
    : building.amenities || '';

  const [formData, setFormData] = useState({
    name: building.name,
    buildingType: building.buildingType,
    googleMapsUrl: mapsFieldPrefill(building),
    addressLine1: building.addressLine1,
    addressLine2: building.addressLine2 || '',
    city: building.city,
    state: building.state,
    country: building.country,
    description: building.description || '',
    yearBuilt: building.yearBuilt,
    totalFloors: building.totalFloors,
    amenities: amenitiesString,
  });

  const [depositFormData, setDepositFormData] = useState(DEFAULT_BUILDING_DEPOSIT_FORM);

  const fetchImages = useCallback(async () => {
    setImagesLoading(true);
    try {
      const response = await fetch(
        `/api/images?entityType=building&entityId=${building.id}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        setImages([]);
        return;
      }
      const result = await response.json();
      setImages(result.success ? result.data : []);
    } catch (err) {
      console.error('Error fetching building images:', err);
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, [building.id]);

  const fetchDepositConfig = useCallback(async () => {
    try {
      const response = await fetch(`/api/building-deposit-config/${building.id}`);
      const result = await response.json();

      if (result.success && result.data) {
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
          minimumDepositAmount: result.data.minimumDepositAmount ?? 0,
        });
      }
    } catch (err) {
      console.error('Error fetching deposit config:', err);
    }
  }, [building.id]);

  useEffect(() => {
    if (!isOpen) return;

    setSection(initialSection);
    setError(null);
    setFormData({
      name: building.name,
      buildingType: building.buildingType,
      googleMapsUrl: mapsFieldPrefill(building),
      addressLine1: building.addressLine1,
      addressLine2: building.addressLine2 || '',
      city: building.city,
      state: building.state,
      country: building.country,
      description: building.description || '',
      yearBuilt: building.yearBuilt,
      totalFloors: building.totalFloors,
      amenities: Array.isArray(building.amenities)
        ? building.amenities.join(', ')
        : building.amenities || '',
    });
    void fetchDepositConfig();
    void fetchImages();
  }, [isOpen, building, initialSection, fetchDepositConfig, fetchImages]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const handleImagesUpdated = () => {
    void fetchImages();
    onImagesChanged?.();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'yearBuilt' || name === 'totalFloors'
          ? value
            ? parseInt(value, 10)
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
        ? formData.amenities
            .split(',')
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
        : [];

      const buildingResponse = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
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

  return (
    <>
      <SectionedFormShell
        isOpen={isOpen}
        onCancel={onClose}
        eyebrow="Edit building"
        entityLabel={building.name}
        sections={SECTIONS}
        activeSection={section}
        onSectionChange={setSection}
        formId="edit-building-form"
        primaryLabel="Update building"
        primaryLoading={isSubmitting}
        primaryDisabled={isDeleting}
        errorBanner={error ? <FormErrorBanner message={error} className="mb-6" /> : null}
        navFooter={
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting || isSubmitting}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete building
          </button>
        }
      >
        <form id="edit-building-form" onSubmit={handleSubmit}>
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
              googleMapsUrl={formData.googleMapsUrl || ''}
              addressLine1={formData.addressLine1 || ''}
              addressLine2={formData.addressLine2 || ''}
              city={formData.city}
              state={formData.state}
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
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amenities: e.target.value }))
                  }
                  placeholder="Parking, Pool, Gym, Security"
                />
              </FormField>
            </div>
          )}

          {section === 'deposits' && (
            <BuildingDepositFields
              value={depositFormData}
              onChange={setDepositFormData}
            />
          )}
        </form>

        {section === 'nearby' && (
          <BuildingNearbyPlacesPanel buildingId={building.id} />
        )}
        
        {section === 'photos' && (
          <div className="space-y-6">
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
              <ImageUpload
                entityType="building"
                entityId={building.id}
                onUploadComplete={handleImagesUpdated}
                maxImages={20}
              />
            </div>
            {imagesLoading ? (
              <p className="text-sm text-gray-500">Loading photos...</p>
            ) : (
              <ImageGallery
                images={images}
                entityType="building"
                entityId={building.id}
                onImageUpdate={handleImagesUpdated}
                showUpload={false}
              />
            )}
          </div>
        )}
      </SectionedFormShell>
      
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
