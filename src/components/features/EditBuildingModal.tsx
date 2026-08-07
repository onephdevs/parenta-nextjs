'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  Clock,
  Image as ImageIcon,
  Info,
  Lock,
  MapPin,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Building } from '@/types/database';
import type { Image as BuildingImage } from '@/lib/api/images';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SectionedFormShell, { SectionCard, type SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import ImageUpload from '@/components/features/ImageUpload';
import ImageGallery from '@/components/features/ImageGallery';
import BuildingLocationFields from '@/components/features/BuildingLocationFields';
import { cn } from '@/lib/utils';

type EditSection = 'basic' | 'location' | 'details' | 'deposits' | 'photos';
type AmountType = 'months' | 'fixed' | 'percentage';

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
    subtitle: 'Street address and region.' 
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

const TYPE_OPTIONS: { value: AmountType; label: string }[] = [
  { value: 'months', label: 'Months of rent' },
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'percentage', label: 'Percentage' },
];

function SegmentedControl({
  value,
  onChange,
  options,
  name,
}: {
  value: AmountType;
  onChange: (next: AmountType) => void;
  options: { value: AmountType; label: string }[];
  name: string;
}) {
  return (
    <div
      className="inline-flex w-full flex-wrap gap-1 rounded-lg bg-gray-100 p-1 sm:w-auto"
      role="group"
      aria-label={name}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AffixedNumberInput({
  id,
  name,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  placeholder,
}: {
  id: string;
  name: string;
  value: number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        id={id}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(prefix && 'pl-8', suffix && 'pr-16')}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
          {suffix}
        </span>
      )}
    </div>
  );
}


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

  const [depositFormData, setDepositFormData] = useState({
    depositMonths: 1,
    depositType: 'months' as AmountType,
    depositAmount: undefined as number | undefined,
    depositPercentage: undefined as number | undefined,
    advanceMonths: 1,
    advanceType: 'months' as AmountType,
    advanceAmount: undefined as number | undefined,
    advancePercentage: undefined as number | undefined,
    utilityDepositAmount: 0,
    depositValidityDays: 5,
    depositRefundableAfterDays: 5,
    minimumDepositAmount: 3000,
  });

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
      addressLine1: building.addressLine1,
      addressLine2: building.addressLine2 || '',
      city: building.city,
      state: building.state,
      postalCode: building.postalCode,
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

  const handleDepositConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDepositFormData((prev) => ({
      ...prev,
      [name]: value === '' ? undefined : parseFloat(value),
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
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amenities: e.target.value }))
                  }
                  placeholder="Parking, Pool, Gym, Security"
                />
              </FormField>
            </div>
          )}

          {section === 'deposits' && (
            <div className="space-y-5">
              <SectionCard title="Deposit requirement">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Deposit type</p>
                    <SegmentedControl
                      name="depositType"
                      value={depositFormData.depositType}
                      options={TYPE_OPTIONS}
                      onChange={(next) =>
                        setDepositFormData((prev) => ({ ...prev, depositType: next }))
                      }
                    />
                  </div>

                  {depositFormData.depositType === 'months' && (
                    <FormField label="Months of rent" htmlFor="depositMonths">
                      <AffixedNumberInput
                        id="depositMonths"
                        name="depositMonths"
                        min={0}
                        step={0.5}
                        value={depositFormData.depositMonths}
                        onChange={handleDepositConfigChange}
                        suffix="months"
                        placeholder="e.g., 2"
                      />
                    </FormField>
                  )}

                  {depositFormData.depositType === 'fixed' && (
                    <FormField label="Deposit amount" htmlFor="depositAmount">
                      <AffixedNumberInput
                        id="depositAmount"
                        name="depositAmount"
                        min={0}
                        step={0.01}
                        value={depositFormData.depositAmount}
                        onChange={handleDepositConfigChange}
                        prefix="₱"
                        placeholder="e.g., 9600"
                      />
                    </FormField>
                  )}

                  {depositFormData.depositType === 'percentage' && (
                    <FormField label="Deposit percentage" htmlFor="depositPercentage">
                      <AffixedNumberInput
                        id="depositPercentage"
                        name="depositPercentage"
                        min={0}
                        max={100}
                        step={0.01}
                        value={depositFormData.depositPercentage}
                        onChange={handleDepositConfigChange}
                        suffix="%"
                        placeholder="e.g., 50"
                      />
                    </FormField>
                  )}

                  <FormField
                    label="Minimum deposit floor"
                    htmlFor="minimumDepositAmount"
                    hint="Applied if computed deposit is lower than this."
                  >
                    <AffixedNumberInput
                      id="minimumDepositAmount"
                      name="minimumDepositAmount"
                      min={0}
                      step={0.01}
                      value={depositFormData.minimumDepositAmount}
                      onChange={handleDepositConfigChange}
                      prefix="₱"
                      placeholder="3000"
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard title="Advance payment">
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Advance type</p>
                    <SegmentedControl
                      name="advanceType"
                      value={depositFormData.advanceType}
                      options={TYPE_OPTIONS}
                      onChange={(next) =>
                        setDepositFormData((prev) => ({ ...prev, advanceType: next }))
                      }
                    />
                  </div>

                  {depositFormData.advanceType === 'months' && (
                    <FormField label="Months of rent" htmlFor="advanceMonths">
                      <AffixedNumberInput
                        id="advanceMonths"
                        name="advanceMonths"
                        min={0}
                        step={0.5}
                        value={depositFormData.advanceMonths}
                        onChange={handleDepositConfigChange}
                        suffix="months"
                        placeholder="e.g., 1"
                      />
                    </FormField>
                  )}

                  {depositFormData.advanceType === 'fixed' && (
                    <FormField label="Advance amount" htmlFor="advanceAmount">
                      <AffixedNumberInput
                        id="advanceAmount"
                        name="advanceAmount"
                        min={0}
                        step={0.01}
                        value={depositFormData.advanceAmount}
                        onChange={handleDepositConfigChange}
                        prefix="₱"
                        placeholder="e.g., 4800"
                      />
                    </FormField>
                  )}

                  {depositFormData.advanceType === 'percentage' && (
                    <FormField label="Advance percentage" htmlFor="advancePercentage">
                      <AffixedNumberInput
                        id="advancePercentage"
                        name="advancePercentage"
                        min={0}
                        max={100}
                        step={0.01}
                        value={depositFormData.advancePercentage}
                        onChange={handleDepositConfigChange}
                        suffix="%"
                        placeholder="e.g., 50"
                      />
                    </FormField>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Utility deposit & validity">
                <div className="space-y-5">
                  <FormField label="Utility deposit amount" htmlFor="utilityDepositAmount">
                    <AffixedNumberInput
                      id="utilityDepositAmount"
                      name="utilityDepositAmount"
                      min={0}
                      step={0.01}
                      value={depositFormData.utilityDepositAmount}
                      onChange={handleDepositConfigChange}
                      prefix="₱"
                      placeholder="0"
                    />
                  </FormField>

                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        Lease starts
                      </span>
                      <span className="hidden h-px w-8 bg-emerald-300 sm:block" />
                      <span className="inline-flex items-center gap-1.5 text-amber-700">
                        <Clock className="h-3.5 w-3.5" />
                        Refundable window ends
                      </span>
                      <span className="hidden h-px w-8 bg-amber-300 sm:block" />
                      <span className="inline-flex items-center gap-1.5 text-red-600">
                        <Lock className="h-3.5 w-3.5" />
                        Non-refundable
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField label="Deposit validity" htmlFor="depositValidityDays">
                      <AffixedNumberInput
                        id="depositValidityDays"
                        name="depositValidityDays"
                        min={1}
                        step={1}
                        value={depositFormData.depositValidityDays}
                        onChange={handleDepositConfigChange}
                        suffix="days"
                        placeholder="5"
                      />
                    </FormField>
                    <FormField
                      label="Non-refundable after"
                      htmlFor="depositRefundableAfterDays"
                    >
                      <AffixedNumberInput
                        id="depositRefundableAfterDays"
                        name="depositRefundableAfterDays"
                        min={1}
                        step={1}
                        value={depositFormData.depositRefundableAfterDays}
                        onChange={handleDepositConfigChange}
                        suffix="days"
                        placeholder="5"
                      />
                    </FormField>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}
        </form>
        
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
