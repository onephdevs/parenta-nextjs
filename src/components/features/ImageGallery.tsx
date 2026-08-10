'use client';

import { useState } from 'react';
import { Trash2, Star } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  useImageLightbox,
  type LightboxImageItem,
} from '@/components/ui/ImageLightbox';

interface ImageData {
  id: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  caption?: string;
  isPrimary: boolean;
  createdAt: Date;
}

interface ImageGalleryProps {
  images: ImageData[];
  entityType: 'building' | 'room' | 'asset';
  entityId: string;
  onImageUpdate?: () => void;
  className?: string;
  showUpload?: boolean;
}

export default function ImageGallery({
  images,
  entityType,
  entityId,
  onImageUpdate,
  className = '',
  showUpload = true,
}: ImageGalleryProps) {
  const { showNotification } = useNotifications();
  const { open: openLightbox } = useImageLightbox();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    imageId: string | null;
    imageName: string;
  }>({
    isOpen: false,
    imageId: null,
    imageName: '',
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getImageUrl = (filePath: string) => {
    if (filePath.startsWith('https://') || filePath.startsWith('http://') || filePath.startsWith('/')) {
      return filePath;
    }
    const pathParts = filePath.replace('uploads/images/', '').split('/');
    return `/api/images/serve/${pathParts.join('/')}`;
  };

  const galleryItems: LightboxImageItem[] = images.map((image) => ({
    src: getImageUrl(image.filePath),
    alt: image.caption || image.fileName,
    title: image.fileName,
  }));

  const handleSetPrimary = async (imageId: string) => {
    setIsUpdating(imageId);
    try {
      const response = await fetch(`/api/images/${imageId}/set-primary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update primary image');
      }
      showNotification({
        type: 'success',
        title: 'Primary image updated',
        message: 'The primary image has been updated successfully.',
      });
      onImageUpdate?.();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Failed to update primary image',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const openDeleteConfirm = (imageId: string, imageName: string) => {
    setDeleteConfirm({ isOpen: true, imageId, imageName });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, imageId: null, imageName: '' });
  };

  const handleDeleteImage = async () => {
    if (!deleteConfirm.imageId) return;
    const imageId = deleteConfirm.imageId;
    setIsUpdating(imageId);

    try {
      const response = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete image');
      }
      showNotification({
        type: 'success',
        title: 'Image deleted',
        message: 'The image has been deleted successfully.',
      });
      closeDeleteConfirm();
      onImageUpdate?.();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete image',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  if (images.length === 0) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <p className="mb-2 text-lg text-gray-900">No images uploaded yet</p>
        <p className="text-sm text-gray-400">
          {showUpload ? 'Upload some images to get started' : 'Images will appear here when uploaded'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <button
                type="button"
                className="relative block aspect-[4/3] w-full bg-gray-100"
                onClick={() => openLightbox(galleryItems, index)}
                aria-label={`View ${image.fileName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(image.filePath)}
                  alt={image.caption || image.fileName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {image.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                    Primary
                  </span>
                )}
              </button>

              <div className="space-y-3 p-3">
                <div>
                  <p className="truncate text-sm font-medium text-gray-900">{image.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(image.fileSize)} • {formatDate(image.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!image.isPrimary && (
                    <button
                      type="button"
                      onClick={() => void handleSetPrimary(image.id)}
                      disabled={isUpdating === image.id}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(image.id, image.fileName)}
                    disabled={isUpdating === image.id}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-600">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleDeleteImage}
        title="Delete Image"
        message={`Are you sure you want to delete "${deleteConfirm.imageName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isUpdating === deleteConfirm.imageId}
      />
    </>
  );
}
