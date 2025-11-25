'use client';

import { useState, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Document, DocumentCategory, DOCUMENT_TYPES } from '@/types/document';

interface BulkDocumentOperationsProps {
  selectedDocuments: Document[];
  onDocumentsUpdated: () => void;
  onSelectionCleared: () => void;
  buildings: Array<{ id: string; name: string }>;
  tenants: Array<{ id: string; firstName: string; lastName: string }>;
}

interface UploadProgress {
  [key: string]: {
    name: string;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
  };
}

export default function BulkDocumentOperations({
  selectedDocuments,
  onDocumentsUpdated,
  onSelectionCleared,
  buildings,
  tenants
}: BulkDocumentOperationsProps) {
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Bulk categorization state
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<DocumentCategory>('lease');
  const [bulkBuildingId, setBulkBuildingId] = useState('');
  const [bulkTenantId, setBulkTenantId] = useState('');

  const handleMultipleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const initialProgress: UploadProgress = {};
    
    // Initialize progress tracking for all files
    Array.from(files).forEach((file, index) => {
      initialProgress[`${file.name}-${index}`] = {
        name: file.name,
        progress: 0,
        status: 'uploading'
      };
    });
    setUploadProgress(initialProgress);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileKey = `${file.name}-${i}`;
        
        await uploadSingleFile(file, fileKey);
      }

      addNotification({
        type: 'success',
        title: 'Upload Complete',
        message: `Successfully uploaded ${files.length} documents`
      });

      onDocumentsUpdated();
    } catch (error) {
      console.error('Error during bulk upload:', error);
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Some files failed to upload. Please try again.'
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadSingleFile = async (file: File, fileKey: string): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'lease'); // Default category for bulk uploads
    formData.append('buildingId', ''); // Will be set later via bulk categorization
    formData.append('tenantId', '');

    try {
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], progress }
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            setUploadProgress(prev => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], progress: 100, status: 'success' }
            }));
            resolve();
          } else {
            const error = `Upload failed: ${xhr.statusText}`;
            setUploadProgress(prev => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], status: 'error', error }
            }));
            reject(new Error(error));
          }
        };

        xhr.onerror = () => {
          const error = 'Network error during upload';
          setUploadProgress(prev => ({
            ...prev,
            [fileKey]: { ...prev[fileKey], status: 'error', error }
          }));
          reject(new Error(error));
        };

        xhr.open('POST', '/api/documents');
        xhr.send(formData);
      });
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      throw error;
    }
  };

  const handleBulkCategorize = async () => {
    if (selectedDocuments.length === 0) return;

    try {
      const updatePromises = selectedDocuments.map(doc => 
        fetch(`/api/documents/${doc.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: bulkCategory,
            buildingId: bulkBuildingId || undefined,
            tenantId: bulkTenantId || undefined,
          }),
        })
      );

      await Promise.all(updatePromises);

      addNotification({
        type: 'success',
        title: 'Bulk Update Complete',
        message: `Successfully updated ${selectedDocuments.length} documents`
      });

      setShowBulkCategorize(false);
      onDocumentsUpdated();
      onSelectionCleared();
    } catch (error) {
      console.error('Error during bulk categorization:', error);
      addNotification({
        type: 'error',
        title: 'Bulk Update Failed',
        message: 'Failed to update document categories. Please try again.'
      });
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocuments.length === 0) return;

    setIsDownloading(true);

    try {
      const response = await fetch('/api/documents/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: selectedDocuments.map(doc => doc.id)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create download archive');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addNotification({
        type: 'success',
        title: 'Download Complete',
        message: `Downloaded ${selectedDocuments.length} documents as ZIP archive`
      });

      onSelectionCleared();
    } catch (error) {
      console.error('Error during bulk download:', error);
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download documents. Please try again.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedDocuments.length} documents? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const deletePromises = selectedDocuments.map(doc => 
        fetch(`/api/documents/${doc.id}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);

      addNotification({
        type: 'success',
        title: 'Bulk Delete Complete',
        message: `Successfully deleted ${selectedDocuments.length} documents`
      });

      onDocumentsUpdated();
      onSelectionCleared();
    } catch (error) {
      console.error('Error during bulk delete:', error);
      addNotification({
        type: 'error',
        title: 'Bulk Delete Failed',
        message: 'Failed to delete some documents. Please try again.'
      });
    }
  };

  const clearUploadProgress = () => {
    setUploadProgress({});
  };

  return (
    <div className="space-y-4">
      {/* Bulk Operations Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-900">
              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
            </span>
            {selectedDocuments.length > 0 && (
              <button
                onClick={onSelectionCleared}
                className="text-sm text-gray-900 hover:text-gray-900"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Multiple File Upload */}
            <button
              onClick={handleMultipleFileSelect}
              disabled={isUploading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  📁 Upload Multiple
                </>
              )}
            </button>

            {/* Bulk Operations - only show when documents are selected */}
            {selectedDocuments.length > 0 && (
              <>
                <button
                  onClick={() => setShowBulkCategorize(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  🏷️ Categorize
                </button>

                <button
                  onClick={handleBulkDownload}
                  disabled={isDownloading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating ZIP...
                    </>
                  ) : (
                    <>
                      📦 Download ZIP
                    </>
                  )}
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hidden file input for multiple uploads */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Upload Progress Display */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
            <button
              onClick={clearUploadProgress}
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              Clear
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(uploadProgress).map(([key, file]) => (
              <div key={key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </span>
                  <span className="text-sm text-gray-900">
                    {file.status === 'success' ? '✅' : 
                     file.status === 'error' ? '❌' : 
                     `${file.progress}%`}
                  </span>
                </div>
                
                {file.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                )}
                
                {file.status === 'error' && file.error && (
                  <p className="text-sm text-red-600 mt-1">{file.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Categorization Modal */}
      {showBulkCategorize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Bulk Categorize Documents
            </h3>
            <p className="text-sm text-gray-900 mb-4">
              Update {selectedDocuments.length} selected documents
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Category
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Building (Optional)
                </label>
                <select
                  value={bulkBuildingId}
                  onChange={(e) => setBulkBuildingId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Tenant (Optional)
                </label>
                <select
                  value={bulkTenantId}
                  onChange={(e) => setBulkTenantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.firstName} {tenant.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkCategorize(false)}
                className="px-4 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCategorize}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 