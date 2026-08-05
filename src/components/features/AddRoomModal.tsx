'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Info, DollarSign, FileText } from 'lucide-react';
import { Building, CreateRoomData } from '@/types/database';
import { useNotifications } from '@/hooks/useNotifications';
import SectionedFormShell from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import {
  expandRoomRange,
  MAX_BULK_ROOMS,
  parseRoomList,
} from '@/lib/rooms/parse-room-numbers';

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings?: Building[];
  building?: Building;
  buildingId?: string;
  onRoomAdded?: (roomId?: string) => void;
}

type AddRoomSection = 'basic' | 'details' | 'financial' | 'additional';
type RoomEntryMode = 'single' | 'list' | 'range';

const SECTIONS: { id: AddRoomSection; label: string; icon: React.ReactNode; title: string; subtitle: string }[] = [
  { 
    id: 'basic', 
    label: 'Basic info', 
    icon: <Building2 className="h-4 w-4" />,
    title: 'Basic information',
    subtitle: 'Building and room identification.'
  },
  { 
    id: 'details', 
    label: 'Details', 
    icon: <Info className="h-4 w-4" />,
    title: 'Room details',
    subtitle: 'Type, floor, and size information.'
  },
  { 
    id: 'financial', 
    label: 'Financial', 
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Financial information',
    subtitle: 'Monthly rate and pricing.'
  },
  { 
    id: 'additional', 
    label: 'Additional', 
    icon: <FileText className="h-4 w-4" />,
    title: 'Additional information',
    subtitle: 'Description and amenities.'
  },
];

function previewRoomNumbers(numbers: string[], limit = 12): string {
  if (numbers.length === 0) return '';
  const shown = numbers.slice(0, limit).join(', ');
  const more = numbers.length > limit ? ` (+${numbers.length - limit} more)` : '';
  return `${shown}${more}`;
}

export default function AddRoomModal({
  isOpen,
  onClose,
  buildings,
  building,
  buildingId,
  onRoomAdded,
}: AddRoomModalProps) {
  const buildingOptions = buildings || (building ? [building] : []);
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<AddRoomSection>('basic');
  const [entryMode, setEntryMode] = useState<RoomEntryMode>('single');
  const [roomListText, setRoomListText] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangePrefix, setRangePrefix] = useState('');

  const [formData, setFormData] = useState<CreateRoomData>({
    buildingId: buildingId || building?.id || '',
    roomNumber: '',
    roomType: 'bedroom',
    floorNumber: undefined,
    squareFootage: undefined,
    monthlyRate: 0,
    amenities: '',
    description: '',
  });

  const [amenitiesInput, setAmenitiesInput] = useState('');

  const derivedRoomNumbers = useMemo(() => {
    if (entryMode === 'single') {
      const n = formData.roomNumber.trim();
      return n ? [n] : [];
    }
    if (entryMode === 'list') {
      return parseRoomList(roomListText);
    }
    return expandRoomRange(rangeFrom, rangeTo, rangePrefix);
  }, [entryMode, formData.roomNumber, roomListText, rangeFrom, rangeTo, rangePrefix]);

  const roomCount = derivedRoomNumbers.length;
  const isBulk = entryMode !== 'single';

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'squareFootage' || name === 'monthlyRate' || name === 'floorNumber'
          ? value
            ? parseFloat(value)
            : undefined
          : value,
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmenitiesInput(e.target.value);
    setFormData((prev) => ({ ...prev, amenities: e.target.value }));
  };

  const resetForm = () => {
    setFormData({
      buildingId: buildingId || building?.id || '',
      roomNumber: '',
      roomType: 'bedroom',
      floorNumber: undefined,
      squareFootage: undefined,
      monthlyRate: 0,
      amenities: '',
      description: '',
    });
    setAmenitiesInput('');
    setRoomListText('');
    setRangeFrom('');
    setRangeTo('');
    setRangePrefix('');
    setEntryMode('single');
    setSection('basic');
  };

  const validateRoomNumbers = (): string | null => {
    if (roomCount === 0) {
      if (entryMode === 'range') {
        return 'Enter a valid From / To range (From must be less than or equal to To).';
      }
      return 'Enter at least one room number.';
    }
    if (roomCount > MAX_BULK_ROOMS) {
      return `You can create at most ${MAX_BULK_ROOMS} rooms at once.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const validationError = validateRoomNumbers();
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      return;
    }

    const loadingId = showNotification({
      type: 'loading',
      title: roomCount === 1 ? 'Creating room...' : `Creating ${roomCount} rooms...`,
      message: 'Please wait while we create your room(s).',
    });

    try {
      const targetBuildingId = formData.buildingId || buildingId || building?.id || '';

      if (!isBulk) {
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to create room');
        }

        updateNotification(loadingId, {
          type: 'success',
          title: 'Room created successfully!',
          message: `Room ${formData.roomNumber} has been added. Opening the property page…`,
        });

        resetForm();
        onClose();
        onRoomAdded?.(result.data.id);

        setTimeout(() => {
          const params = new URLSearchParams();
          if (targetBuildingId) params.set('buildingId', targetBuildingId);
          if (result.data?.id) params.set('roomId', result.data.id);
          router.push(`/admin/properties?${params.toString()}`);
          router.refresh();
        }, 400);
        return;
      }

      const response = await fetch('/api/rooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: formData.buildingId,
          roomNumbers: derivedRoomNumbers,
          roomType: formData.roomType,
          floorNumber: formData.floorNumber,
          squareFootage: formData.squareFootage,
          monthlyRate: formData.monthlyRate,
          amenities: formData.amenities,
          description: formData.description,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create rooms');
      }

      const created = Array.isArray(result.data) ? result.data : [];
      const count = created.length || roomCount;
      const firstId = created[0]?.id as string | undefined;

      updateNotification(loadingId, {
        type: 'success',
        title: count === 1 ? 'Room created successfully!' : `${count} rooms created successfully!`,
        message:
          count === 1
            ? `Room ${created[0]?.roomNumber || derivedRoomNumbers[0]} has been added. Opening the property page…`
            : `${count} rooms have been added. Opening the property page…`,
      });

      resetForm();
      onClose();
      onRoomAdded?.(firstId);

      setTimeout(() => {
        const params = new URLSearchParams();
        if (targetBuildingId) params.set('buildingId', targetBuildingId);
        if (count === 1 && firstId) params.set('roomId', firstId);
        router.push(`/admin/properties?${params.toString()}`);
        router.refresh();
      }, 400);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      updateNotification(loadingId, {
        type: 'error',
        title: isBulk ? 'Failed to create rooms' : 'Failed to create room',
        message: errorMessage,
      });

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryLabel =
    !isBulk || roomCount <= 1
      ? 'Create room'
      : `Create ${roomCount} rooms`;

  return (
    <SectionedFormShell
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow="Add room"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={setSection}
      formId="add-room-form"
      primaryLabel={primaryLabel}
      primaryLoading={isSubmitting}
      primaryType="submit"
      errorBanner={error ? <FormErrorBanner message={error} className="mb-6" /> : null}
    >
      <form id="add-room-form" onSubmit={handleSubmit} className="space-y-5">
        {section === 'basic' && (
          <div className="space-y-5">
            <FormField label="Building" htmlFor="buildingId" required>
              <Select
                id="buildingId"
                name="buildingId"
                required
                value={formData.buildingId}
                onChange={handleInputChange}
                isDisabled={!!(buildingId || building)}
              >
                <option value="">Select a building</option>
                {buildingOptions.map((bldg) => (
                  <option key={bldg.id} value={bldg.id}>
                    {bldg.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">
                Room numbers
              </legend>
              <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
                {(
                  [
                    { id: 'single', label: 'Single' },
                    { id: 'list', label: 'List' },
                    { id: 'range', label: 'Range' },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setEntryMode(mode.id);
                      setError(null);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      entryMode === mode.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {entryMode === 'single' && (
                <FormField label="Room number" htmlFor="roomNumber" required>
                  <Input
                    type="text"
                    id="roomNumber"
                    name="roomNumber"
                    required
                    value={formData.roomNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., 101, A-201, Studio 5"
                  />
                </FormField>
              )}

              {entryMode === 'list' && (
                <FormField
                  label="Room numbers"
                  htmlFor="roomList"
                  required
                  hint="Separate with commas or new lines."
                >
                  <Textarea
                    id="roomList"
                    name="roomList"
                    required
                    rows={4}
                    value={roomListText}
                    onChange={(e) => setRoomListText(e.target.value)}
                    placeholder={'101, 102, 103\nA-201\nStudio 5'}
                  />
                </FormField>
              )}

              {entryMode === 'range' && (
                <div className="space-y-4">
                  <FormField
                    label="Prefix (optional)"
                    htmlFor="rangePrefix"
                    hint="Added before each number, e.g. A-"
                  >
                    <Input
                      type="text"
                      id="rangePrefix"
                      name="rangePrefix"
                      value={rangePrefix}
                      onChange={(e) => setRangePrefix(e.target.value)}
                      placeholder="e.g., A- or Floor2-"
                    />
                  </FormField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="From" htmlFor="rangeFrom" required>
                      <Input
                        type="text"
                        inputMode="numeric"
                        id="rangeFrom"
                        name="rangeFrom"
                        required
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                        placeholder="e.g., 101"
                      />
                    </FormField>
                    <FormField label="To" htmlFor="rangeTo" required>
                      <Input
                        type="text"
                        inputMode="numeric"
                        id="rangeTo"
                        name="rangeTo"
                        required
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                        placeholder="e.g., 120"
                      />
                    </FormField>
                  </div>
                </div>
              )}

              {roomCount > 0 && entryMode !== 'single' && (
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-900">
                    {roomCount} {roomCount === 1 ? 'room' : 'rooms'}:
                  </span>{' '}
                  {previewRoomNumbers(derivedRoomNumbers)}
                </p>
              )}
              {roomCount > MAX_BULK_ROOMS && (
                <p className="mt-2 text-sm text-red-600">
                  Maximum is {MAX_BULK_ROOMS} rooms per batch.
                </p>
              )}
            </fieldset>
          </div>
        )}

        {section === 'details' && (
          <div className="space-y-5">
            {isBulk && roomCount > 1 && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                These details apply to all {roomCount} rooms.
              </p>
            )}
            <FormField label="Room type" htmlFor="roomType" required>
              <Select
                id="roomType"
                name="roomType"
                value={formData.roomType}
                onChange={handleInputChange}
              >
                <option value="bedroom">Bedroom</option>
                <option value="studio">Studio</option>
                <option value="1br">1 Bedroom</option>
                <option value="2br">2 Bedroom</option>
                <option value="3br">3 Bedroom</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="storage">Storage</option>
              </Select>
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Floor number" htmlFor="floorNumber">
                <Input
                  type="number"
                  id="floorNumber"
                  name="floorNumber"
                  min={0}
                  max={50}
                  value={formData.floorNumber || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 2"
                />
              </FormField>

              <FormField label="Square footage" htmlFor="squareFootage">
                <Input
                  type="number"
                  id="squareFootage"
                  name="squareFootage"
                  min={1}
                  max={5000}
                  step={1}
                  value={formData.squareFootage || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 250"
                />
              </FormField>
            </div>
          </div>
        )}

        {section === 'financial' && (
          <div className="space-y-5">
            {isBulk && roomCount > 1 && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                This rate applies to all {roomCount} rooms.
              </p>
            )}
            <FormField
              label="Monthly rate (₱)"
              htmlFor="monthlyRate"
              required
              hint="Enter amount in Philippine Pesos"
            >
              <Input
                type="number"
                id="monthlyRate"
                name="monthlyRate"
                required
                min={0}
                step={1}
                value={formData.monthlyRate || ''}
                onChange={handleInputChange}
                placeholder="e.g., 5000, 8000, 12000"
              />
            </FormField>
          </div>
        )}

        {section === 'additional' && (
          <div className="space-y-5">
            {isBulk && roomCount > 1 && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Description and amenities apply to all {roomCount} rooms.
              </p>
            )}
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the room..."
              />
            </FormField>

            <FormField
              label="Amenities"
              htmlFor="amenities"
              hint="Separate with commas."
            >
              <Input
                type="text"
                id="amenities"
                name="amenities"
                value={amenitiesInput}
                onChange={handleAmenitiesChange}
                placeholder="Private Bathroom, Balcony, Air Conditioning"
              />
            </FormField>
          </div>
        )}
      </form>
    </SectionedFormShell>
  );
}
