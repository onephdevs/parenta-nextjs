'use client';

import { useState, useRef, useCallback } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

// Supported image types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jpg'
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for images

interface ImageUploadProps {
  entityType: 'building' | 'room' | 'asset';
  entityId: string;
  onUploadComplete?: (images: UploadedImage[]) => void;
  maxImages?: number;
  className?: string;
}

interface UploadFile extends File {
  id: string;
  preview?: string;
  progress?: number;
  error?: string;
}

interface UploadedImage {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  caption?: string;
  isPrimary: boolean;
  createdAt: Date;
}

export default function ImageUpload({ 
  entityType, 
  entityId, 
  onUploadComplete, 
  maxImages = 10,
  className = ""
}: ImageUploadProps) {
  const { showNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return `File type ${file.type} is not supported. Please use JPEG, PNG, GIF, or WebP.`;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return `File size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    const remainingSlots = maxImages - files.length;
    const filesToProcess = Array.from(selectedFiles).slice(0, remainingSlots);

    console.log('Files selected:', filesToProcess.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    if (selectedFiles.length > remainingSlots) {
      showNotification({
        type: 'warning',
        title: 'Upload limit',
        message: `Only ${remainingSlots} more images can be uploaded (limit: ${maxImages})`
      });
    }

    const newFiles: UploadFile[] = [];
    
    for (const file of filesToProcess) {
      console.log('Processing file:', { name: file.name, type: file.type, size: file.size });
      
      // Additional validation to ensure file is valid
      if (!file.name || !file.type || file.size === 0) {
        console.error('Invalid file detected:', { name: file.name, type: file.type, size: file.size });
        showNotification({
          type: 'error',
          title: 'Invalid file',
          message: `File "${file.name || 'unknown'}" is invalid. Please select a valid image file.`
        });
        continue;
      }
      
      const error = validateFile(file);
      const preview = error ? undefined : await createPreview(file);
      
      // Create UploadFile without spreading to preserve File properties
      const uploadFile: UploadFile = Object.assign(file, {
        id: Math.random().toString(36).substring(7),
        preview,
        error
      });
      
      console.log('Created UploadFile:', { 
        id: uploadFile.id, 
        name: uploadFile.name, 
        type: uploadFile.type, 
        size: uploadFile.size,
        error: uploadFile.error 
      });
      
      newFiles.push(uploadFile);
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, []);

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(file => file.id !== fileId);
    });
  };

  const uploadFile = async (file: UploadFile): Promise<UploadedImage | null> => {
    // Additional validation before upload
    if (!file || !file.name || !file.type || file.size === 0) {
      console.error('Invalid file object:', { 
        hasFile: !!file, 
        name: file?.name, 
        type: file?.type, 
        size: file?.size 
      });
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, error: 'Invalid file. Please select the file again.' } : f
      ));
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('imageType', 'photo'); // Default type
    
    console.log('Uploading file:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      entityType,
      entityId
    });
    
    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload response:', result);

      if (result.success) {
        // Update file progress to 100%
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, progress: 100 } : f
        ));
        return result.data;
      } else {
        // Update file with specific error message from API
        const errorMessage = result.error || 'Upload failed';
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, error: errorMessage } : f
        ));
        console.error('Upload failed for file:', file.name, 'Error:', errorMessage);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      // Update file with specific error
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, error: errorMessage } : f
      ));
      console.error('Upload error for file:', file.name, 'Error:', error);
      return null;
    }
  };

  const handleUpload = async () => {
    const validFiles = files.filter(file => !file.error);
    
    if (validFiles.length === 0) {
      showNotification({
        type: 'error',
        title: 'No valid files',
        message: 'Please select valid image files to upload.'
      });
      return;
    }

    setIsUploading(true);
    
    // Initialize progress for all files
    setFiles(prev => prev.map(f => !f.error ? { ...f, progress: 0 } : f));
    
    const uploadPromises = validFiles.map(uploadFile);
    const results = await Promise.all(uploadPromises);
    
    const uploadedImages = results.filter((result): result is UploadedImage => result !== null);
    const successCount = uploadedImages.length;
    const errorCount = validFiles.length - successCount;

    if (successCount > 0) {
      showNotification({
        type: 'success',
        title: 'Upload complete',
        message: `${successCount} image${successCount > 1 ? 's' : ''} uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`
      });
      
      if (onUploadComplete) {
        onUploadComplete(uploadedImages);
      }
      
      // Clear successful uploads
      setFiles(prev => prev.filter(f => f.error || f.progress !== 100));
    } else {
      showNotification({
        type: 'error',
        title: 'Upload failed',
        message: 'All uploads failed. Please check the files and try again.'
      });
    }
    
    setIsUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : files.length >= maxImages
            ? 'border-gray-200 bg-gray-50 opacity-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg 
          className={`w-12 h-12 mx-auto mb-4 ${
            files.length >= maxImages ? 'text-gray-300' : 'text-gray-400'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        <p className={`text-sm mb-2 ${files.length >= maxImages ? 'text-gray-400' : 'text-gray-600'}`}>
          {files.length >= maxImages ? (
            `Maximum ${maxImages} images reached`
          ) : (
            <>
              Drag and drop images here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= maxImages}
                className="text-blue-600 hover:text-blue-500 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                browse
              </button>
            </>
          )}
        </p>
        <p className="text-xs text-gray-500">
          JPEG, PNG, GIF, WebP up to {MAX_IMAGE_SIZE / 1024 / 1024}MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_IMAGE_TYPES.join(',')}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          disabled={files.length >= maxImages}
          className="hidden"
        />
      </div>

      {/* Selected Images Preview */}
      {files.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Selected Images ({files.length}/{maxImages})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <div key={file.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* File Info Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => removeFile(file.id)}
                    disabled={isUploading}
                    className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* File Info */}
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                  
                  {file.progress !== undefined && !file.error && (
                    <div className="mt-1">
                      <div className="bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.filter(f => !f.error).length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              `Upload ${files.filter(f => !f.error).length} Image${files.filter(f => !f.error).length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
} 