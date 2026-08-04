'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Star, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
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

  const closeLightbox = () => setSelectedImage(null);

  useEffect(() => {
    if (!selectedImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (deleteConfirm.isOpen) {
        closeDeleteConfirm();
        return;
      }
      closeLightbox();
    };

    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedImage, deleteConfirm.isOpen]);

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
      if (selectedImage?.id === imageId) setSelectedImage(null);
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

  const lightbox =
    selectedImage && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[120] flex flex-col bg-black/90"
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            onClick={closeLightbox}
          >
            <div
              className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/80 px-4 py-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{selectedImage.fileName}</p>
                <p className="text-xs text-white/70">
                  {formatFileSize(selectedImage.fileSize)} • {formatDate(selectedImage.createdAt)}
                  {selectedImage.isPrimary ? ' • Primary' : ''}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {!selectedImage.isPrimary && (
                  <button
                    type="button"
                    onClick={() => void handleSetPrimary(selectedImage.id)}
                    disabled={isUpdating === selectedImage.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Star className="h-4 w-4" />
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openDeleteConfirm(selectedImage.id, selectedImage.fileName)}
                  disabled={isUpdating === selectedImage.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(selectedImage.filePath)}
                alt={selectedImage.caption || selectedImage.fileName}
                className="max-h-full max-w-full object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <button
                type="button"
                className="relative block aspect-[4/3] w-full bg-gray-100"
                onClick={() => setSelectedImage(image)}
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

      {lightbox}

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
