'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

// Supported image types
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg', // Progressive JPEG
  'image/png',
  'image/gif',
  'image/webp'
];

const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for images

interface ImageUploadProps {
  entityType: 'building' | 'room' | 'asset';
  entityId: string;
  onUploadComplete?: (images: UploadedImage[]) => void;
  maxImages?: number;
  className?: string;
}

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
  name: string;
  size: number;
  type: string;
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

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      files.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const validateFile = (file: File): string | null => {
    console.log('🔍 Validating file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    });

    // Check file extension as fallback if MIME type is not recognized
    const extension = file.name.split('.').pop()?.toLowerCase();
    const hasValidExtension = SUPPORTED_EXTENSIONS.includes(extension || '');
    const hasValidMimeType = SUPPORTED_IMAGE_TYPES.includes(file.type);

    if (!hasValidMimeType && !hasValidExtension) {
      const error = `File type not supported. 
      File: ${file.name}
      Detected type: ${file.type || 'unknown'}
      Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`;
      console.error('❌ Validation failed - unsupported type:', error);
      return error;
    }

    if (!hasValidMimeType && hasValidExtension) {
      console.warn('⚠️ MIME type mismatch but extension is valid:', {
        mimeType: file.type,
        extension: extension,
        proceeding: true
      });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      const error = `File "${file.name}" is too large.
      Size: ${(file.size / 1024 / 1024).toFixed(2)}MB
      Maximum: ${(MAX_IMAGE_SIZE / 1024 / 1024)}MB`;
      console.error('❌ Validation failed - file too large:', error);
      return error;
    }

    if (file.size === 0) {
      const error = `File "${file.name}" is empty (0 bytes)`;
      console.error('❌ Validation failed - empty file:', error);
      return error;
    }

    console.log('✅ File validation passed');
    return null;
  };

  const createPreview = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        // Validate file first
        if (!file || !(file instanceof File)) {
          console.error('❌ Invalid file object:', file);
          resolve(null);
          return;
        }

        if (file.size === 0) {
          console.error('❌ File is empty:', file.name);
          resolve(null);
          return;
        }

        // Use createObjectURL for instant, reliable preview
        // This creates a blob URL directly from the file without processing
        const objectUrl = URL.createObjectURL(file);
        console.log('✅ Preview created successfully for:', file.name);
        console.log('✅ Blob URL:', objectUrl);
        console.log('✅ File size:', (file.size / 1024).toFixed(2), 'KB');
        console.log('✅ File type:', file.type);
        
        // Verify the URL is valid
        if (!objectUrl || !objectUrl.startsWith('blob:')) {
          console.error('❌ Invalid blob URL created:', objectUrl);
          resolve(null);
          return;
        }
        
        resolve(objectUrl);
      } catch (error) {
        console.error('❌ Error creating preview for:', file.name, error);
        resolve(null);
      }
    });
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    const remainingSlots = maxImages - files.length;
    const filesToProcess = Array.from(selectedFiles).slice(0, remainingSlots);

    console.log('📁 Files selected:', filesToProcess.map(f => ({
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
      console.log('🔄 Processing file:', { name: file.name, type: file.type, size: file.size });
      
      // Additional validation to ensure file is valid
      if (!file.name || file.size === 0) {
        console.error('❌ Invalid file detected:', { name: file.name, type: file.type, size: file.size });
        showNotification({
          type: 'error',
          title: 'Invalid file',
          message: `File "${file.name || 'unknown'}" is invalid. Please select a valid image file.`
        });
        continue;
      }
      
      // Validate file first
      const error = validateFile(file);
      
      // Only create preview if file is valid
      let preview: string | undefined = undefined;
      if (!error) {
        console.log('🖼️ Creating preview for:', file.name);
        const previewResult = await createPreview(file);
        preview = previewResult || undefined;
        
        if (!previewResult) {
          console.warn('⚠️ Preview creation failed for:', file.name, '- will show placeholder');
        }
      } else {
        console.log('⚠️ Skipping preview creation due to validation error:', error);
      }
      
      // Create UploadFile object properly
      const uploadFile: UploadFile = {
        id: Math.random().toString(36).substring(7),
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview,
        error
      };
      
      console.log('📦 Created UploadFile:', { 
        id: uploadFile.id, 
        name: uploadFile.name, 
        type: uploadFile.type, 
        size: uploadFile.size,
        hasPreview: !!uploadFile.preview,
        previewLength: uploadFile.preview?.length,
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
      // Revoke object URL to free memory
      if (fileToRemove?.preview && fileToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(file => file.id !== fileId);
    });
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<UploadedImage | null> => {
    // Additional validation before upload
    if (!uploadFile || !uploadFile.file || !uploadFile.name || !uploadFile.type || uploadFile.size === 0) {
      console.error('Invalid file object:', { 
        hasUploadFile: !!uploadFile,
        hasFile: !!uploadFile?.file,
        name: uploadFile?.name, 
        type: uploadFile?.type, 
        size: uploadFile?.size 
      });
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, error: 'Invalid file. Please select the file again.' } : f
      ));
      return null;
    }

    const formData = new FormData();
    
    // Verify file is still valid before appending
    if (!uploadFile.file || !(uploadFile.file instanceof File)) {
      console.error('❌ File object is invalid:', uploadFile.file);
      throw new Error('File object is invalid. Please select the file again.');
    }
    
    formData.append('file', uploadFile.file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('imageType', 'photo'); // Default type
    
    console.log('Uploading file:', {
      fileName: uploadFile.name,
      fileType: uploadFile.type,
      fileSize: uploadFile.size,
      entityType,
      entityId,
      fileObjectValid: uploadFile.file instanceof File,
      fileObjectName: uploadFile.file.name,
      fileObjectSize: uploadFile.file.size,
      fileObjectType: uploadFile.file.type
    });
    
    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      // Get response text first to see what the error is
      const responseText = await response.text();
      console.log('Upload response status:', response.status);
      console.log('Upload response text:', responseText);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = `Upload failed with status: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Upload error details:', errorData);
        } catch (e) {
          // If response isn't JSON, use the text
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('Upload response:', result);

      if (result.success) {
        // Update file progress to 100%
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress: 100 } : f
        ));
        return result.data;
      } else {
        // Update file with specific error message from API
        const errorMessage = result.error || 'Upload failed';
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, error: errorMessage } : f
        ));
        console.error('Upload failed for file:', uploadFile.name, 'Error:', errorMessage);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      // Update file with specific error
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, error: errorMessage } : f
      ));
      console.error('Upload error for file:', uploadFile.name, 'Error:', error);
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
    
    console.log('Upload results:', results);
    console.log('Valid files count:', validFiles.length);
    
    const uploadedImages = results.filter((result): result is UploadedImage => result !== null);
    const successCount = uploadedImages.length;
    const errorCount = validFiles.length - successCount;

    console.log('Success count:', successCount, 'Error count:', errorCount);

    if (successCount > 0) {
      showNotification({
        type: 'success',
        title: 'Upload complete',
        message: `${successCount} image${successCount > 1 ? 's' : ''} uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`
      });
      
      if (onUploadComplete) {
        onUploadComplete(uploadedImages);
      }
      
      // Clear successful uploads, keep failed ones temporarily for user to see errors
      setFiles(prev => prev.filter(f => f.error || f.progress !== 100));
      
      // If there were any failures, show additional info
      if (errorCount > 0) {
        const failedFiles = files.filter(f => f.error);
        const errorDetails = failedFiles.map(f => `${f.name}: ${f.error}`).join('; ');
        console.error('Failed uploads:', errorDetails);
        
        setTimeout(() => {
          showNotification({
            type: 'error',
            title: `${errorCount} upload${errorCount > 1 ? 's' : ''} failed`,
            message: `Failed files: ${failedFiles.map(f => f.name).join(', ')}. Check below for details.`
          });
        }, 500);
      }
    } else {
      // Get detailed error messages from failed files
      const failedFiles = files.filter(f => f.error);
      const errorMessages = [...new Set(failedFiles.map(f => f.error))]; // Unique errors
      const fileNames = failedFiles.map(f => f.name).join(', ');
      
      console.error('All uploads failed:', {
        files: fileNames,
        errors: errorMessages
      });
      
      showNotification({
        type: 'error',
        title: 'Upload failed',
        message: errorMessages.length === 1 
          ? `${errorMessages[0]} (Files: ${fileNames})`
          : `${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload. Check the error messages below each image for details.`
      });
      
      // Remove failed files after user has time to read the error
      setTimeout(() => {
        setFiles(prev => prev.filter(f => !f.error));
      }, 5000); // Clear after 5 seconds
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
                <div className={`relative aspect-square rounded-lg overflow-hidden ${
                  file.error ? 'ring-2 ring-red-500 bg-red-50' : 'bg-white'
                }`}>
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className={`w-full h-full object-cover ${file.error ? 'opacity-50' : ''}`}
                      style={{ 
                        display: 'block',
                        position: 'relative',
                        zIndex: 10,
                        backgroundColor: 'transparent'
                      }}
                      onLoad={(e) => {
                        console.log('✅ Preview image loaded successfully for:', file.name);
                        console.log('✅ Image URL:', file.preview);
                        console.log('✅ Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
                        console.log('✅ Image display size:', e.currentTarget.offsetWidth, 'x', e.currentTarget.offsetHeight);
                        console.log('✅ Image computed style:', window.getComputedStyle(e.currentTarget).display);
                      }}
                      onError={(e) => {
                        console.error('❌ Failed to display preview for:', file.name);
                        console.error('❌ Preview URL:', file.preview);
                        console.error('❌ URL type:', file.preview?.startsWith('blob:') ? 'blob URL' : 'other');
                        console.error('❌ Error event:', e);
                        // Set error state so placeholder shows
                        setFiles(prev => prev.map(f => 
                          f.id === file.id ? { ...f, preview: undefined } : f
                        ));
                      }}
                      loading="eager"
                      decoding="sync"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                      <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-400">Preview unavailable</span>
                    </div>
                  )}
                  
                  {/* Error Overlay */}
                  {file.error && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-10 flex items-center justify-center p-2 z-10">
                      <div className="bg-white rounded-full p-2">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  {/* File Info Overlay - Only show on hover */}
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none group-hover:pointer-events-auto z-20">
                    <button
                      onClick={() => removeFile(file.id)}
                      disabled={isUploading}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all duration-200 disabled:opacity-50 pointer-events-auto"
                      title="Remove file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* File Info */}
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  
                  {file.error && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-start gap-1">
                        <svg className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-red-700 leading-tight">{file.error}</p>
                      </div>
                    </div>
                  )}
                  
                  {file.progress !== undefined && !file.error && (
                    <div className="mt-1">
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      {file.progress < 100 && (
                        <p className="text-xs text-gray-500 mt-0.5">Uploading... {file.progress}%</p>
                      )}
                      {file.progress === 100 && (
                        <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Uploaded
                        </p>
                      )}
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