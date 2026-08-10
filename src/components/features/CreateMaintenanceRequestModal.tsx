'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Home,
  ImagePlus,
  Wrench,
  X,
} from 'lucide-react';
import SectionedFormShell, { type SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';
import { useNotifications } from '@/hooks/useNotifications';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { LightboxImage } from '@/components/ui/ImageLightbox';

type SectionId = 'details' | 'location' | 'priority';

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const SECTIONS: SectionedFormSection<SectionId>[] = [
  {
    id: 'details',
    label: 'Details',
    icon: <Wrench className="h-4 w-4" />,
    title: 'Request details',
    subtitle: 'What needs to be fixed or inspected.',
  },
  {
    id: 'location',
    label: 'Location',
    icon: <Home className="h-4 w-4" />,
    title: 'Unit location',
    subtitle: 'Optional room within this property.',
  },
  {
    id: 'priority',
    label: 'Priority',
    icon: <AlertTriangle className="h-4 w-4" />,
    title: 'Priority & schedule',
    subtitle: 'Urgency and optional schedule date.',
  },
];

interface RoomOption {
  id: string;
  roomNumber: string;
}

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

interface CreateMaintenanceRequestModalProps {
  isOpen: boolean;
  buildingId: string;
  buildingName?: string;
  rooms?: RoomOption[];
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateMaintenanceRequestModal({
  isOpen,
  buildingId,
  buildingName,
  rooms = [],
  onClose,
  onCreated,
}: CreateMaintenanceRequestModalProps) {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [section, setSection] = useState<SectionId>('details');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('plumbing');
  const [priority, setPriority] = useState('medium');
  const [roomId, setRoomId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    setSection('details');
    setError(null);
    setTitle('');
    setDescription('');
    setCategory('plumbing');
    setPriority('medium');
    setRoomId('');
    setScheduledDate('');
    clearPhotos();
  }, [isOpen, buildingId]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPhotoFiles = (files: File[]) => {
    const next: PendingPhoto[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showError('Please attach photos only (JPEG, PNG, or WEBP)');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        showError(`${file.name} must be under 5MB`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length === 0) return;
    setPhotos((prev) => {
      const merged = [...prev, ...next];
      if (merged.length > MAX_PHOTOS) {
        merged.slice(MAX_PHOTOS).forEach((p) => URL.revokeObjectURL(p.preview));
        showWarning(`You can attach up to ${MAX_PHOTOS} photos`);
        return merged.slice(0, MAX_PHOTOS);
      }
      return merged;
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      setError('Title, description, and category are required.');
      setSection('details');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('buildingId', buildingId);
      if (roomId) form.append('roomId', roomId);
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('category', category);
      form.append('priority', priority);
      if (scheduledDate) form.append('scheduledDate', scheduledDate);
      photos.forEach((p) => form.append('photos', p.file));

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create maintenance request');
      }
      if (json.warning) {
        showWarning(String(json.warning));
      } else {
        showSuccess('Maintenance request created');
      }
      onCreated?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create request';
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <SectionedFormShell
      mode="modal"
      isOpen={isOpen}
      onCancel={onClose}
      eyebrow="Maintenance"
      entityLabel={buildingName || 'New request'}
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={setSection}
      primaryLabel="Create Request"
      primaryLoading={submitting}
      formId="create-maintenance-form"
      errorBanner={error ? <FormErrorBanner message={error} /> : undefined}
    >
      <form id="create-maintenance-form" onSubmit={handleSubmit} className="space-y-5">
        {section === 'details' && (
          <>
            <FormField label="Title" htmlFor="maint-title" required>
              <Input
                id="maint-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Leaking kitchen faucet"
                required
              />
            </FormField>
            <FormField label="Category" htmlFor="maint-category" required>
              <Select
                id="maint-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="appliance">Appliance</option>
                <option value="structural">Structural</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
            <FormField label="Description" htmlFor="maint-description" required>
              <Textarea
                id="maint-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue…"
                required
              />
            </FormField>
            <FormField
              label="Photos of the issue"
              htmlFor="maint-photos"
              hint={`Optional — up to ${MAX_PHOTOS} photos so staff can assess the issue.`}
            >
              <div className="space-y-3">
                <FileDropzone
                  accept="image/jpeg,image/png,image/webp,image/*"
                  multiple
                  disabled={submitting || photos.length >= MAX_PHOTOS}
                  onFiles={addPhotoFiles}
                  icon={<ImagePlus className="mx-auto mb-3 h-10 w-10 text-gray-400" />}
                  label="Drag photos here, or click to choose from gallery"
                  hint="JPEG, PNG, or WEBP · max 5MB each"
                />
                <div className="flex flex-wrap gap-2">
                  <TakePhotoButton
                    disabled={submitting || photos.length >= MAX_PHOTOS}
                    onCapture={(file) => addPhotoFiles([file])}
                    title="Take maintenance photo"
                    description="Allow camera access if prompted, then capture the issue."
                    fileNamePrefix="maintenance"
                  />
                </div>
                {photos.length > 0 && (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {photos.map((photo, index) => (
                      <li key={photo.id} className="relative">
                        <LightboxImage
                          src={photo.preview}
                          alt="Issue preview"
                          title={photo.file.name || 'Issue photo'}
                          gallery={photos.map((p) => ({
                            src: p.preview,
                            alt: 'Issue preview',
                            title: p.file.name || 'Issue photo',
                          }))}
                          galleryIndex={index}
                          wrapperClassName="block w-full overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                          className="h-20 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white shadow"
                          aria-label="Remove photo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FormField>
          </>
        )}

        {section === 'location' && (
          <FormField label="Unit / Room" htmlFor="maint-room" hint="Optional">
            <Select
              id="maint-room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">Building-wide / unassigned</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  Unit {room.roomNumber}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {section === 'priority' && (
          <>
            <FormField label="Priority" htmlFor="maint-priority">
              <Select
                id="maint-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </FormField>
            <FormField label="Scheduled date" htmlFor="maint-schedule" hint="Optional">
              <Input
                id="maint-schedule"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </FormField>
            <p className="flex items-start gap-2 text-sm text-gray-500">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0" />
              The request will also appear on the Maintenance pipeline board.
            </p>
          </>
        )}
      </form>
    </SectionedFormShell>
  );
}
