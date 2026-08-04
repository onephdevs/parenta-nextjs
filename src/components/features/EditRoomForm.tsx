'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Room, CreateRoomData, Building } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import { Pencil, Trash2, Home, Info, DollarSign, Shield, FileText, Star } from 'lucide-react';

interface EditRoomFormProps {
  room: Room & { buildingName?: string };
  onRoomUpdated?: () => void;
  startInEditMode?: boolean;
}

type FormSection = 'basic' | 'details' | 'pricing' | 'deposit' | 'description' | 'amenities';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'basic',
    label: 'Basic Info',
    icon: <Home className="h-4 w-4" />,
    title: 'Basic Information',
    subtitle: 'Building, room number and type',
  },
  {
    id: 'details',
    label: 'Details',
    icon: <Info className="h-4 w-4" />,
    title: 'Room Details',
    subtitle: 'Floor and size information',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Pricing',
    subtitle: 'Monthly rate and deposit settings',
  },
  {
    id: 'deposit',
    label: 'Deposit',
    icon: <Shield className="h-4 w-4" />,
    title: 'Deposit Requirements',
    subtitle: 'Configure reservation deposit',
  },
  {
    id: 'description',
    label: 'Description',
    icon: <FileText className="h-4 w-4" />,
    title: 'Description',
    subtitle: 'Describe the room features',
  },
  {
    id: 'amenities',
    label: 'Amenities',
    icon: <Star className="h-4 w-4" />,
    title: 'Amenities',
    subtitle: 'List available amenities',
  },
];

export default function EditRoomForm({ room, onRoomUpdated, startInEditMode = false }: EditRoomFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [activeSection, setActiveSection] = useState<FormSection>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  
  const [formData, setFormData] = useState<Partial<CreateRoomData> & { depositAmount?: number }>({
    buildingId: room.buildingId,
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    floorNumber: room.floorNumber,
    squareFootage: room.squareFootage,
    monthlyRate: Number(room.monthlyRate),
    depositAmount: room.depositAmount != null ? Number(room.depositAmount) : undefined,
    depositRequired: room.depositRequired || false,
    depositType: room.depositType || 'one_month',
    depositFixedAmount: room.depositFixedAmount,
    depositPercentage: room.depositPercentage,
    description: room.description || '',
    amenities: Array.isArray(room.amenities) ? room.amenities.join(', ') : (room.amenities || '')
  });

  // Convert amenities to string for input (if it's an array, join it)
  const amenitiesString = Array.isArray(room.amenities) 
    ? room.amenities.join(', ') 
    : (room.amenities || '');

  const [amenitiesInput, setAmenitiesInput] = useState(amenitiesString);

  // Fetch buildings when edit mode is activated or when component mounts with startInEditMode
  useEffect(() => {
    if ((isEditing || startInEditMode) && buildings.length === 0) {
      fetchBuildings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, startInEditMode]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const result = await response.json();
      if (result.success) {
        // API returns { success: true, data: { buildings: [...] } }
        const buildingsData = result.data?.buildings || result.data || [];
        if (Array.isArray(buildingsData)) {
          setBuildings(buildingsData);
        } else {
          console.error('Invalid buildings data format:', buildingsData);
          setBuildings([]);
        }
      } else {
        console.error('Failed to fetch buildings:', result.error);
        setBuildings([]);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings([]); // Ensure it's always an array on error
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'squareFootage' || name === 'monthlyRate' || name === 'depositAmount' || name === 'floorNumber'
        ? (value ? parseFloat(value) : undefined) 
        : value
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmenitiesInput(e.target.value);
    setFormData(prev => ({ ...prev, amenities: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Updating room...',
      message: 'Please wait while we save your changes.',
    });

    try {
      const amenitiesArray = formData.amenities
        ? String(formData.amenities)
            .split(',')
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
        : [];

      const response = await fetch(`/api/rooms/${room.id}`, {
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
        throw new Error(result.error || 'Failed to update room');
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Room updated',
        message: `Room ${formData.roomNumber} has been updated successfully!`,
      });

      setSuccess('Room updated successfully!');
      setIsEditing(false);

      if (onRoomUpdated) {
        onRoomUpdated();
      }

      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to update room',
        message: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !(await confirm({
        title: 'Delete room?',
        message: 'Are you sure you want to delete this room? This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    const loadingId = showNotification({
      type: 'loading',
      title: 'Deleting room...',
      message: 'Please wait while we delete this room.',
    });

    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete room');
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Room deleted',
        message: `Room ${room.roomNumber} has been deleted successfully!`,
      });

      setTimeout(() => {
        router.push('/admin/rooms');
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      updateNotification(loadingId, {
        type: 'error',
        title: 'Failed to delete room',
        message: errorMessage,
      });

      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    setActiveSection('basic');
    // Reset form data to original values
    setFormData({
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floorNumber: room.floorNumber,
      squareFootage: room.squareFootage,
      monthlyRate: Number(room.monthlyRate),
      depositAmount: room.depositAmount != null ? Number(room.depositAmount) : undefined,
      description: room.description || '',
      depositRequired: room.depositRequired || false,
      depositType: room.depositType || 'one_month',
      depositFixedAmount: room.depositFixedAmount,
      depositPercentage: room.depositPercentage,
      amenities: room.amenities || ''
    });
    setAmenitiesInput(room.amenities || '');
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            <FormField label="Building" htmlFor="buildingId" required>
              <Select
                id="buildingId"
                name="buildingId"
                required
                value={formData.buildingId}
                onChange={handleInputChange}
                isDisabled={!Array.isArray(buildings) || buildings.length === 0}
              >
                <option value="">{Array.isArray(buildings) && buildings.length === 0 ? 'Loading buildings...' : 'Select a building'}</option>
                {Array.isArray(buildings) && buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Room Number" htmlFor="roomNumber" required>
              <Input
                id="roomNumber"
                name="roomNumber"
                required
                value={formData.roomNumber}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Room Type" htmlFor="roomType" required>
              <Select
                id="roomType"
                name="roomType"
                required
                value={formData.roomType}
                onChange={handleInputChange}
              >
                <option value="studio">Studio</option>
                <option value="one_bedroom">1 Bedroom</option>
                <option value="two_bedroom">2 Bedroom</option>
                <option value="three_bedroom">3 Bedroom</option>
                <option value="shared">Shared Room</option>
                <option value="single">Single Room</option>
                <option value="double">Double Room</option>
              </Select>
            </FormField>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <FormField label="Floor" htmlFor="floorNumber">
              <Input
                type="number"
                id="floorNumber"
                name="floorNumber"
                min={0}
                value={formData.floorNumber || ''}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Size (sq ft)" htmlFor="squareFootage">
              <Input
                type="number"
                id="squareFootage"
                name="squareFootage"
                min={0}
                value={formData.squareFootage || ''}
                onChange={handleInputChange}
              />
            </FormField>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <FormField label="Monthly Rent (₱)" htmlFor="monthlyRate" required>
              <Input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                required
                min={0}
                step={0.01}
                value={formData.monthlyRate ?? ''}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Deposit (₱)" htmlFor="depositAmount">
              <Input
                type="number"
                id="depositAmount"
                name="depositAmount"
                min={0}
                step={0.01}
                value={formData.depositAmount ?? ''}
                onChange={handleInputChange}
              />
            </FormField>
          </div>
        );

      case 'deposit':
        return (
          <div className="space-y-6">
            <Checkbox
              id="depositRequired"
              name="depositRequired"
              checked={formData.depositRequired || false}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, depositRequired: e.target.checked }))
              }
              label="Require deposit for reservation"
            />

            {formData.depositRequired && (
              <Card className="bg-gray-50 border-gray-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Deposit Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="one_month"
                          checked={formData.depositType === 'one_month'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">One Month Rent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="percentage"
                          checked={formData.depositType === 'percentage'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">Percentage of Rent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="depositType"
                          value="fixed"
                          checked={formData.depositType === 'fixed'}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, depositType: e.target.value as any }))
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">Fixed Amount</span>
                      </label>
                    </div>
                  </div>

                  {formData.depositType === 'percentage' && (
                    <FormField
                      label="Deposit Percentage (%)"
                      htmlFor="depositPercentage"
                      hint={
                        formData.monthlyRate && formData.depositPercentage
                          ? `Deposit: ₱${((formData.monthlyRate * formData.depositPercentage) / 100).toLocaleString()}`
                          : 'Enter percentage to see calculated amount'
                      }
                    >
                      <Input
                        type="number"
                        id="depositPercentage"
                        name="depositPercentage"
                        min={0}
                        max={200}
                        step={1}
                        value={formData.depositPercentage ?? ''}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, depositPercentage: e.target.value ? parseFloat(e.target.value) : undefined }))
                        }
                        placeholder="e.g., 50, 100"
                      />
                    </FormField>
                  )}

                  {formData.depositType === 'fixed' && (
                    <FormField label="Fixed Deposit Amount (₱)" htmlFor="depositFixedAmount">
                      <Input
                        type="number"
                        id="depositFixedAmount"
                        name="depositFixedAmount"
                        min={0}
                        step={1}
                        value={formData.depositFixedAmount ?? ''}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, depositFixedAmount: e.target.value ? parseFloat(e.target.value) : undefined }))
                        }
                        placeholder="e.g., 5000, 10000"
                      />
                    </FormField>
                  )}

                  {formData.depositType === 'one_month' && formData.monthlyRate && formData.monthlyRate > 0 && (
                    <div className="text-sm text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                      <strong>Deposit Required:</strong> ₱{formData.monthlyRate.toLocaleString()}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        );

      case 'description':
        return (
          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
            />
          </FormField>
        );

      case 'amenities':
        return (
          <FormField label="Amenities (comma-separated)" htmlFor="amenities">
            <Input
              type="text"
              id="amenities"
              value={amenitiesInput}
              onChange={handleAmenitiesChange}
              placeholder="e.g., Air Conditioning, WiFi, Furnished"
            />
          </FormField>
        );

      default:
        return null;
    }
  };

  if (isEditing) {
    const errorBanner = error ? (
      <FormErrorBanner message={error} />
    ) : undefined;

    return (
      <>
        {dialog}
        <SectionedFormShell
          mode="modal"
          isOpen={isEditing}
          onCancel={handleCancel}
          eyebrow="Edit Room"
          entityLabel={`${room.roomNumber} - ${room.buildingName || 'Unknown Building'}`}
          sections={formSections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          primaryLabel="Save Changes"
          primaryLoading={isSubmitting}
          formId="edit-room-form"
          errorBanner={errorBanner}
          navFooter={
            <Button
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDelete}
              isLoading={isDeleting}
              className="w-full"
            >
              Delete Room
            </Button>
          }
        >
          <form id="edit-room-form" onSubmit={handleSubmit} className="space-y-6">
            {renderSectionContent()}
          </form>
        </SectionedFormShell>
      </>
    );
  }

  return (
    <Card padding="none">
      {dialog}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Room Actions</h3>
          <Button
            size="sm"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => setIsEditing(true)}
          >
            Edit Room
          </Button>
        </div>
      </div>

      <div className="p-6">
        {error && <FormErrorBanner message={error} className="mb-4" />}

        {success && (
          <Alert variant="success" className="mb-4">
            {success}
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            className="w-full"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={() => setIsEditing(true)}
          >
            Edit Room Details
          </Button>

          <Button
            className="w-full"
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Delete Room
          </Button>
        </div>
      </div>
    </Card>
  );
} 