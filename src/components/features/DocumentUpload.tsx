'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, DOCUMENT_TYPES } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

interface UploadFile extends File {
  id: string;
  progress?: number;
  error?: string;
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  
  const [formData, setFormData] = useState({
    categoryId: '',
    buildingId: '',
    roomId: '',
    tenantId: '',
    documentType: '',
    description: '',
    tags: '',
    isPublic: false,
    expiryDate: '',
    accessLevel: 'admin' as 'admin' | 'tenant' | 'public',
  });

  // Load categories when modal opens
  const handleOpenModal = async () => {
    setIsOpen(true);
    try {
      const response = await fetch('/api/documents/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setFiles([]);
    setFormData({
      categoryId: '',
      buildingId: '',
      roomId: '',
      tenantId: '',
      documentType: '',
      description: '',
      tags: '',
      isPublic: false,
      expiryDate: '',
      accessLevel: 'admin',
    });
  };

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    return null;
  };

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      ...file,
      id: Math.random().toString(36).substring(7),
    }));

    // Validate files
    const validatedFiles = newFiles.map(file => {
      const error = validateFile(file);
      return error ? { ...file, error } : file;
    });

    setFiles(prev => [...prev, ...validatedFiles]);
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
    setFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const uploadFile = async (file: UploadFile): Promise<boolean> => {
    const formDataToSend = new FormData();
    formDataToSend.append('file', file);
    formDataToSend.append('documentName', file.name.split('.')[0]); // Use filename without extension as default name
    
    // Add form data
    if (formData.categoryId) formDataToSend.append('categoryId', formData.categoryId);
    if (formData.buildingId) formDataToSend.append('buildingId', formData.buildingId);
    if (formData.roomId) formDataToSend.append('roomId', formData.roomId);
    if (formData.tenantId) formDataToSend.append('tenantId', formData.tenantId);
    if (formData.documentType) formDataToSend.append('documentType', formData.documentType);
    if (formData.description) formDataToSend.append('description', formData.description);
    if (formData.tags) formDataToSend.append('tags', formData.tags);
    if (formData.expiryDate) formDataToSend.append('expiryDate', formData.expiryDate);
    formDataToSend.append('isPublic', formData.isPublic.toString());
    formDataToSend.append('accessLevel', formData.accessLevel);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        // Update file progress to 100%
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, progress: 100 } : f
        ));
        return true;
      } else {
        // Update file with error
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, error: result.error } : f
        ));
        return false;
      }
    } catch (error) {
      // Update file with error
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, error: 'Upload failed' } : f
      ));
      return false;
    }
  };

  const handleUpload = async () => {
    const validFiles = files.filter(file => !file.error);
    
    if (validFiles.length === 0) {
      addNotification({
        type: 'error',
        title: 'No valid files',
        message: 'Please select valid files to upload.'
      });
      return;
    }

    setIsUploading(true);
    
    const uploadPromises = validFiles.map(uploadFile);
    const results = await Promise.all(uploadPromises);
    
    const successCount = results.filter(result => result).length;
    const errorCount = results.length - successCount;

    if (successCount > 0) {
      addNotification({
        type: 'success',
        title: 'Upload complete',
        message: `${successCount} document${successCount > 1 ? 's' : ''} uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`
      });
      
      // Refresh the page to show new documents
      router.refresh();
      
      if (onUploadComplete) {
        onUploadComplete();
      }
      
      // Close modal after successful upload
      setTimeout(() => {
        handleCloseModal();
      }, 1000);
    } else {
      addNotification({
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

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenModal}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Documents
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseModal}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Documents</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload Area */}
              <div>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center ${
                    isDragOver
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-purple-600 hover:text-purple-500 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, images, documents up to {MAX_FILE_SIZE / 1024 / 1024}MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={SUPPORTED_FILE_TYPES.join(',')}
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Files</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            {file.error && (
                              <p className="text-xs text-red-600 mt-1">{file.error}</p>
                            )}
                            {file.progress !== undefined && (
                              <div className="mt-1">
                                <div className="bg-gray-200 rounded-full h-1">
                                  <div
                                    className="bg-purple-600 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${file.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="ml-2 text-gray-400 hover:text-red-500"
                            disabled={isUploading}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Document Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select a type</option>
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Brief description of the document..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="contract, lease, important..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Level
                  </label>
                  <select
                    name="accessLevel"
                    value={formData.accessLevel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="admin">Admin Only</option>
                    <option value="tenant">Tenant Access</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Make document publicly accessible
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleUpload}
              disabled={files.filter(f => !f.error).length === 0 || isUploading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                `Upload ${files.filter(f => !f.error).length} Document${files.filter(f => !f.error).length !== 1 ? 's' : ''}`
              )}
            </button>
            <button
              onClick={handleCloseModal}
              disabled={isUploading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 