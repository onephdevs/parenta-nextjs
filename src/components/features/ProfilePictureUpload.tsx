'use client';

import { useState, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';

interface ProfilePictureUploadProps {
  tenantId: string;
  currentPictureUrl?: string | null;
  onUploadComplete?: (url: string) => void;
  onDeleteComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProfilePictureUpload({
  tenantId,
  currentPictureUrl,
  onUploadComplete,
  onDeleteComplete,
  size = 'md'
}: ProfilePictureUploadProps) {
  const { showNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const [preview, setPreview] = useState<string | null>(currentPictureUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processSelectedFile(file);
    e.target.value = '';
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select an image file'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'Image must be less than 5MB'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    void handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    showNotification({
      type: 'loading',
      title: 'Uploading',
      message: 'Uploading profile picture...'
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tenants/${tenantId}/profile-picture`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Upload failed');
      }

      setPreview(data.data.url);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Profile picture uploaded successfully'
      });

      if (onUploadComplete) {
        onUploadComplete(data.data.url);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload profile picture'
      });
      setPreview(currentPictureUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !(await confirm({
        title: 'Delete profile picture?',
        message: 'Are you sure you want to delete this profile picture?',
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    showNotification({
      type: 'loading',
      title: 'Deleting',
      message: 'Deleting profile picture...'
    });

    try {
      const response = await fetch(`/api/tenants/${tenantId}/profile-picture`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      setPreview(null);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Profile picture deleted successfully'
      });

      if (onDeleteComplete) {
        onDeleteComplete();
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete profile picture'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {dialog}
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center`}>
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-1/2 h-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        {(isUploading || isDeleting) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <Spinner className="text-white" label="Uploading" />
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <Button
          type="button"
          variant="success"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          isDisabled={isUploading || isDeleting}
        >
          {preview ? 'Change' : 'Upload'}
        </Button>
        <TakePhotoButton
          size="sm"
          disabled={isUploading || isDeleting}
          onCapture={processSelectedFile}
          title="Take profile photo"
          description="Allow camera access if prompted, then capture."
          fileNamePrefix="profile"
          preferUserCamera
        />
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            isDisabled={isUploading || isDeleting}
          >
            Delete
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-900 text-center">
        JPEG, PNG, or WebP. Max 5MB.
      </p>
    </div>
  );
}
