'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Image as ImageIcon, Info, Map, MapPin, Wallet } from 'lucide-react';
import { CreateBuildingData } from '@/types/database';
import type { Image as BuildingImage } from '@/lib/api/images';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell, { type SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import BuildingLocationFields from '@/components/features/BuildingLocationFields';
import BuildingDepositFields, {
  DEFAULT_BUILDING_DEPOSIT_FORM,
  type BuildingDepositFormData,
} from '@/components/features/BuildingDepositFields';
import ImageUpload from '@/components/features/ImageUpload';
import ImageGallery from '@/components/features/ImageGallery';
import BuildingNearbyPlacesPanel, {
  type BuildingNearbyPlacesPanelHandle,
} from '@/components/features/BuildingNearbyPlacesPanel';

interface AddBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingAdded: (buildingId?: string) => void;
}

type AddBuildingSection = 'basic' | 'location' | 'nearby' | 'details' | 'deposits' | 'photos';

const SECTIONS: SectionedFormSection<AddBuildingSection>[] = [
  {
    id: 'basic',
    label: 'Basic info',
    icon: <Building2 className="h-4 w-4" />,
    title: 'Basic information',
    subtitle: 'Name and building type.',
  },
  {
    id: 'location',
    label: 'Location',
    icon: <MapPin className="h-4 w-4" />,
    title: 'Location',
    subtitle: 'Address, region, and Google Maps pin.',
  },
  {
    id: 'nearby',
    label: 'Nearby places',
    icon: <Map className="h-4 w-4" />,
    title: 'Nearby places',
    subtitle: 'Get latest from OpenStreetMap, verify, then save for the landing map.',
  },
  {
    id: 'details',
    label: 'Details',
    icon: <Info className="h-4 w-4" />,
    title: 'Additional details',
    subtitle: 'Description, size, and amenities.',
  },
  {
    id: 'deposits',
    label: 'Deposits & advance',
    icon: <Wallet className="h-4 w-4" />,
    title: 'Deposits & advance',
    subtitle: 'Rooms inherit these unless overridden individually.',
  },
  {
    id: 'photos',
    label: 'Photos',
    icon: <ImageIcon className="h-4 w-4" />,
    title: 'Photos',
    subtitle: 'Upload photos and set the primary image for this property.',
  },
];

const EMPTY_FORM: CreateBuildingData = {
  name: '',
  showOnLandingNearby: false,
  googleMapsUrl: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'Philippines',
  description: '',
  buildingType: 'residential',
  yearBuilt: undefined,
  totalFloors: undefined,
  amenities: '',
};

export default function AddBuildingModal({
  isOpen,
  onClose,
  onBuildingAdded,
}: AddBuildingModalProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<AddBuildingSection>('basic');
  const [createdBuildingId, setCreatedBuildingId] = useState<string | null>(null);
  const [images, setImages] = useState<BuildingImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBuildingData>(EMPTY_FORM);
  const [depositFormData, setDepositFormData] = useState<BuildingDepositFormData>(
    DEFAULT_BUILDING_DEPOSIT_FORM
  );
  const nearbyPlacesRef = useRef<BuildingNearbyPlacesPanelHandle>(null);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setDepositFormData(DEFAULT_BUILDING_DEPOSIT_FORM);
    setCreatedBuildingId(null);
    setImages([]);
    setSection('basic');
    setError(null);
  };

  const fetchImages = useCallback(async (buildingId: string) => {
    setImagesLoading(true);
    try {
      const response = await fetch(
        `/api/images?entityType=building&entityId=${buildingId}`,
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
  }, []);

  const buildingPayload = () => {
    const amenitiesArray = formData.amenities
      ? String(formData.amenities)
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0)
      : [];
    return { ...formData, amenities: amenitiesArray };
  };

  const saveDepositConfig = async (buildingId: string) => {
    try {
      await fetch('/api/building-deposit-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          ...depositFormData,
        }),
      });
    } catch (depositError) {
      console.error('Error saving deposit config:', depositError);
    }
  };

  const persistBuilding = async (): Promise<string> => {
    const payload = buildingPayload();
    if (createdBuildingId) {
      const response = await fetch(`/api/buildings/${createdBuildingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update building');
      }
      return createdBuildingId;
    }

    const response = await fetch('/api/buildings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create building');
    }
    const id = String(result.data.id);
    setCreatedBuildingId(id);
    return id;
  };

  const ensureBuilding = async (): Promise<string | null> => {
    if (createdBuildingId) return createdBuildingId;
    if (!formData.name.trim() || !formData.city || !formData.state) {
      return null;
    }
    try {
      return await persistBuilding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create property');
      return null;
    }
  };

  const handleSectionChange = async (next: AddBuildingSection) => {
    setError(null);
    if (next === 'photos' && !createdBuildingId) {
      if (!formData.name.trim() || !formData.city || !formData.state) {
        setSection(next);
        return;
      }
      try {
        const id = await persistBuilding();
        await fetchImages(id);
        setSection(next);
      } catch (err) {
        setSection(next);
        setError(
          err instanceof Error ? err.message : 'Could not create property for this tab'
        );
      }
      return;
    }
    setSection(next);
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
      title: createdBuildingId ? 'Saving building...' : 'Creating building...',
      message: 'Please wait while we save the building.',
    });

    try {
      const buildingId = await persistBuilding();
      try {
        await nearbyPlacesRef.current?.persist(buildingId);
      } catch (nearbyErr) {
        console.error('Nearby places save after create', nearbyErr);
        showNotification({
          type: 'error',
          title: 'Nearby places not saved',
          message:
            nearbyErr instanceof Error
              ? nearbyErr.message
              : 'Add a Google Maps pin on Location, then save nearby places from Edit building.',
        });
      }
      await saveDepositConfig(buildingId);

      updateNotification(loadingNotificationId, {
        type: 'success',
        title: 'Building created successfully!',
        message: `${formData.name} has been added to your portfolio.`,
      });

      resetForm();
      onClose();
      onBuildingAdded(buildingId);

      setTimeout(() => {
        router.push(`/admin/properties?buildingId=${buildingId}`);
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

  const handleCancel = () => {
    if (createdBuildingId) {
      onBuildingAdded(createdBuildingId);
    }
    resetForm();
    onClose();
  };

  return (
    <SectionedFormShell
      isOpen={isOpen}
      onCancel={handleCancel}
      eyebrow="Add building"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={(id) => {
        void handleSectionChange(id);
      }}
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

            <FormField label="Amenities" htmlFor="amenities" hint="Separate with commas.">
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

        {section === 'deposits' && (
          <BuildingDepositFields
            value={depositFormData}
            onChange={setDepositFormData}
          />
        )}
      </form>

      <div className={section === 'nearby' ? undefined : 'hidden'}>
        <BuildingNearbyPlacesPanel
          ref={nearbyPlacesRef}
          buildingId={createdBuildingId}
          onEnsureBuilding={ensureBuilding}
        />
      </div>

      {section === 'photos' && (
        <div className="space-y-6">
          {createdBuildingId ? (
            <>
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
                <ImageUpload
                  entityType="building"
                  entityId={createdBuildingId}
                  onUploadComplete={() => void fetchImages(createdBuildingId)}
                  maxImages={20}
                />
              </div>
              {imagesLoading ? (
                <p className="text-sm text-gray-500">Loading photos...</p>
              ) : (
                <ImageGallery
                  images={images}
                  entityType="building"
                  entityId={createdBuildingId}
                  onImageUpdate={() => void fetchImages(createdBuildingId)}
                  showUpload={false}
                />
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">Photos need a saved property</p>
              <p className="mt-1 text-sm text-gray-600">
                Add a name in Basic info and a region and city in Location, then enable
                photo upload.
              </p>
              <button
                type="button"
                onClick={() => void handleSectionChange('photos')}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Enable photo upload
              </button>
            </div>
          )}
        </div>
      )}
    </SectionedFormShell>
  );
}
