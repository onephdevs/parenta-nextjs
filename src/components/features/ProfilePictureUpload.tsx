'use client';

import { useState, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select an image file'
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'Image must be less than 5MB'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const notificationId = showNotification({
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
        throw new Error(data.error || 'Upload failed');
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
      // Revert preview on error
      setPreview(currentPictureUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this profile picture?')) {
      return;
    }

    setIsDeleting(true);
    const notificationId = showNotification({
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isDeleting}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {preview ? 'Change' : 'Upload'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
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

