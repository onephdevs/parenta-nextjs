'use client';

import { useState, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Document, DOCUMENT_TYPES } from '@/types/document';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { Dialog } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { FolderUp, Tags, Package, Trash2 } from 'lucide-react';

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
  tenants,
}: BulkDocumentOperationsProps) {
  const { showNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('lease');
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

    Array.from(files).forEach((file, index) => {
      initialProgress[`${file.name}-${index}`] = {
        name: file.name,
        progress: 0,
        status: 'uploading',
      };
    });
    setUploadProgress(initialProgress);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileKey = `${file.name}-${i}`;
        await uploadSingleFile(file, fileKey);
      }

      showNotification({
        type: 'success',
        title: 'Upload Complete',
        message: `Successfully uploaded ${files.length} documents`,
      });

      onDocumentsUpdated();
    } catch (error) {
      console.error('Error during bulk upload:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Some files failed to upload. Please try again.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadSingleFile = async (file: File, fileKey: string): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentName', file.name.replace(/\.[^/.]+$/, '') || file.name);
    formData.append('documentType', 'other');

    try {
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress((prev) => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], progress },
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            setUploadProgress((prev) => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], progress: 100, status: 'success' },
            }));
            resolve();
          } else {
            const error = `Upload failed: ${xhr.statusText}`;
            setUploadProgress((prev) => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], status: 'error', error },
            }));
            reject(new Error(error));
          }
        };

        xhr.onerror = () => {
          const error = 'Network error during upload';
          setUploadProgress((prev) => ({
            ...prev,
            [fileKey]: { ...prev[fileKey], status: 'error', error },
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
      const updatePromises = selectedDocuments.map((doc) =>
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

      showNotification({
        type: 'success',
        title: 'Bulk Update Complete',
        message: `Successfully updated ${selectedDocuments.length} documents`,
      });

      setShowBulkCategorize(false);
      onDocumentsUpdated();
      onSelectionCleared();
    } catch (error) {
      console.error('Error during bulk categorization:', error);
      showNotification({
        type: 'error',
        title: 'Bulk Update Failed',
        message: 'Failed to update document categories. Please try again.',
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
          documentIds: selectedDocuments.map((doc) => doc.id),
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

      showNotification({
        type: 'success',
        title: 'Download Complete',
        message: `Downloaded ${selectedDocuments.length} documents as ZIP archive`,
      });

      onSelectionCleared();
    } catch (error) {
      console.error('Error during bulk download:', error);
      showNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download documents. Please try again.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.length === 0) return;

    const confirmed = await confirm({
      title: 'Delete documents?',
      message: `Are you sure you want to delete ${selectedDocuments.length} documents? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const deletePromises = selectedDocuments.map((doc) =>
        fetch(`/api/documents/${doc.id}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);

      showNotification({
        type: 'success',
        title: 'Bulk Delete Complete',
        message: `Successfully deleted ${selectedDocuments.length} documents`,
      });

      onDocumentsUpdated();
      onSelectionCleared();
    } catch (error) {
      console.error('Error during bulk delete:', error);
      showNotification({
        type: 'error',
        title: 'Bulk Delete Failed',
        message: 'Failed to delete some documents. Please try again.',
      });
    }
  };

  const clearUploadProgress = () => {
    setUploadProgress({});
  };

  return (
    <div className="space-y-4">
      {dialog}
      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-900">
              {selectedDocuments.length} document
              {selectedDocuments.length !== 1 ? 's' : ''} selected
            </span>
            {selectedDocuments.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={onSelectionCleared}>
                Clear selection
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleMultipleFileSelect}
              isLoading={isUploading}
              leftIcon={<FolderUp className="h-4 w-4" />}
            >
              Upload Multiple
            </Button>

            {selectedDocuments.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="success"
                  onClick={() => setShowBulkCategorize(true)}
                  leftIcon={<Tags className="h-4 w-4" />}
                >
                  Categorize
                </Button>

                <Button
                  type="button"
                  onClick={handleBulkDownload}
                  isLoading={isDownloading}
                  leftIcon={<Package className="h-4 w-4" />}
                >
                  Download ZIP
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={handleBulkDelete}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </Card>

      {Object.keys(uploadProgress).length > 0 && (
        <Card padding="md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
            <Button type="button" variant="ghost" size="sm" onClick={clearUploadProgress}>
              Clear
            </Button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(uploadProgress).map(([key, file]) => (
              <div key={key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                  <span className="text-sm text-gray-900">
                    {file.status === 'success'
                      ? 'Done'
                      : file.status === 'error'
                        ? 'Error'
                        : `${file.progress}%`}
                  </span>
                </div>

                {file.status === 'uploading' && (
                  <Progress value={file.progress} size="md" tone="default" className="mt-0" />
                )}

                {file.status === 'error' && file.error && (
                  <p className="text-sm text-red-600 mt-1">{file.error}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog
        isOpen={showBulkCategorize}
        onClose={() => setShowBulkCategorize(false)}
        title="Bulk Categorize Documents"
        description={`Update ${selectedDocuments.length} selected documents`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowBulkCategorize(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleBulkCategorize}>
              Update Documents
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Category" htmlFor="bulkCategory">
            <Select
              id="bulkCategory"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Building (Optional)" htmlFor="bulkBuildingId">
            <Select
              id="bulkBuildingId"
              value={bulkBuildingId}
              onChange={(e) => setBulkBuildingId(e.target.value)}
            >
              <option value="">Select building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Tenant (Optional)" htmlFor="bulkTenantId">
            <Select
              id="bulkTenantId"
              value={bulkTenantId}
              onChange={(e) => setBulkTenantId(e.target.value)}
            >
              <option value="">Select tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.firstName} {tenant.lastName}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Dialog>
    </div>
  );
}
