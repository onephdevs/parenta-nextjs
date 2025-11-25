'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ImageData {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
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
  className = "",
  showUpload = true 
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
    imageName: ''
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSetPrimary = async (imageId: string) => {
    setIsUpdating(imageId);
    try {
      const response = await fetch(`/api/images/${imageId}/set-primary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Primary image updated',
          message: 'The primary image has been updated successfully.'
        });
        
        if (onImageUpdate) {
          onImageUpdate();
        }
      } else {
        throw new Error(result.error || 'Failed to update primary image');
      }
    } catch (error) {
      console.error('Error setting primary image:', error);
      showNotification({
        type: 'error',
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Failed to update primary image'
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const openDeleteConfirm = (imageId: string, imageName: string) => {
    setDeleteConfirm({
      isOpen: true,
      imageId,
      imageName
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({
      isOpen: false,
      imageId: null,
      imageName: ''
    });
  };

  const handleDeleteImage = async () => {
    if (!deleteConfirm.imageId) return;

    const imageId = deleteConfirm.imageId;
    setIsUpdating(imageId);
    
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Image deleted',
          message: 'The image has been deleted successfully.'
        });
        
        if (onImageUpdate) {
          onImageUpdate();
        }
        
        // Close lightbox if deleted image was selected
        if (selectedImage?.id === imageId) {
          setSelectedImage(null);
        }
        
        closeDeleteConfirm();
      } else {
        throw new Error(result.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete image'
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const getImageUrl = (filePath: string) => {
    // If it's a Vercel Blob URL (starts with https://), use it directly
    if (filePath.startsWith('https://')) {
      return filePath;
    }
    
    // Otherwise, use API route to serve images (for backward compatibility with old filesystem images)
    // filePath format: "uploads/images/building/file.jpg"
    // Convert to: "/api/images/serve/building/file.jpg"
    const pathParts = filePath.replace('uploads/images/', '').split('/');
    return `/api/images/serve/${pathParts.join('/')}`;
  };

  if (images.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-900 text-lg mb-2">No images uploaded yet</p>
        <p className="text-gray-400 text-sm">
          {showUpload ? 'Upload some images to get started' : 'Images will appear here when uploaded'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                   onClick={() => setSelectedImage(image)}>
                <img
                  src={getImageUrl(image.filePath)}
                  alt={image.caption || image.fileName}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  style={{ 
                    display: 'block',
                    position: 'relative',
                    zIndex: 1,
                    backgroundColor: 'transparent'
                  }}
                  onError={(e) => {
                    console.error('❌ Failed to load image:', image.fileName, 'URL:', getImageUrl(image.filePath));
                    // Show placeholder on error
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Primary
                    </span>
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                      }}
                      className="bg-white text-gray-800 rounded-full p-2 hover:bg-gray-100 transition-colors"
                      title="View image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    {!image.isPrimary && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(image.id);
                        }}
                        disabled={isUpdating === image.id}
                        className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        title="Set as primary"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(image.id, image.fileName);
                      }}
                      disabled={isUpdating === image.id}
                      className="bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Image Info */}
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-900 truncate">{image.fileName}</p>
                <p className="text-xs text-gray-900">{formatFileSize(image.fileSize)} • {formatDate(image.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Image Count */}
        <div className="text-sm text-gray-900 text-center">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <img
              src={getImageUrl(selectedImage.filePath)}
              alt={selectedImage.caption || selectedImage.fileName}
              className="max-w-full max-h-full object-contain"
            />

            {/* Image Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedImage.fileName}</h3>
                  <p className="text-sm text-gray-300">
                    {formatFileSize(selectedImage.fileSize)} • {formatDate(selectedImage.createdAt)}
                    {selectedImage.isPrimary && ' • Primary Image'}
                  </p>
                  {selectedImage.caption && (
                    <p className="text-sm text-gray-200 mt-1">{selectedImage.caption}</p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {!selectedImage.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(selectedImage.id)}
                      disabled={isUpdating === selectedImage.id}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Set as Primary
                    </button>
                  )}
                  
                  <button
                    onClick={() => openDeleteConfirm(selectedImage.id, selectedImage.fileName)}
                    disabled={isUpdating === selectedImage.id}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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