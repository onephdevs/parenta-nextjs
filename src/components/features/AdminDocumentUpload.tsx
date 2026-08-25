'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import {
  DocumentCategory,
  DOCUMENT_TYPES,
  MAX_FILE_SIZE,
  SUPPORTED_FILE_TYPES,
  documentTypeHasExpiry,
} from '@/types/document';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';

interface AdminDocumentUploadProps {
  categories: DocumentCategory[];
  buildings: Array<{ id: string; name: string }>;
  tenants?: Array<{ id: string; firstName: string; lastName: string }>;
}

function fileLabel(file: File): string {
  return file.name.replace(/\.[^/.]+$/, '') || file.name;
}

export default function AdminDocumentUpload({
  categories,
  buildings,
  tenants = [],
}: AdminDocumentUploadProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setDocumentName('');
      setCategoryId('');
      setBuildingId('');
      setTenantId('');
      setDocumentType('');
      setExpiryDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    if (files.length === 0 && incoming.length === 1 && !documentName.trim()) {
      setDocumentName(incoming[0].name);
    }
    setFiles((prev) => [...prev, ...incoming]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 1) {
        setDocumentName((name) => name.trim() || next[0].name);
      }
      if (next.length === 0) setDocumentName('');
      return next;
    });
  };

  const uploadOne = async (file: File, name: string) => {
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.name}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`${file.name} is over ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentName', name);
    if (categoryId) formData.append('categoryId', categoryId);
    if (buildingId) formData.append('buildingId', buildingId);
    if (tenantId) formData.append('tenantId', tenantId);
    if (documentType) formData.append('documentType', documentType);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    const response = await fetch('/api/documents', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Failed to upload ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      showNotification({
        type: 'error',
        title: 'File required',
        message: 'Please choose one or more files to upload.',
      });
      return;
    }

    if (files.length === 1 && !documentName.trim()) {
      showNotification({
        type: 'error',
        title: 'Name required',
        message: 'Please enter a document name.',
      });
      return;
    }

    setIsUploading(true);
    let uploaded = 0;
    const errors: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name =
          files.length === 1 ? documentName.trim() : fileLabel(file);
        try {
          await uploadOne(file, name);
          uploaded += 1;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `Failed ${file.name}`);
        }
      }

      if (uploaded > 0 && errors.length === 0) {
        showNotification({
          type: 'success',
          title: uploaded === 1 ? 'Document uploaded' : 'Documents uploaded',
          message:
            uploaded === 1
              ? `"${documentName.trim() || files[0].name}" has been uploaded.`
              : `${uploaded} documents have been uploaded.`,
        });
        setIsOpen(false);
        router.refresh();
      } else if (uploaded > 0) {
        showNotification({
          type: 'warning',
          title: 'Partial upload',
          message: `${uploaded} uploaded. ${errors[0] || 'Some files failed.'}`,
        });
        router.refresh();
      } else {
        showNotification({
          type: 'error',
          title: 'Upload failed',
          message: errors[0] || 'Failed to upload documents',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setIsOpen(true)}>
        Upload document
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={() => !isUploading && setIsOpen(false)}
        title="Upload document"
        description="Add one or more files and optionally link them to a property or tenant."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} isDisabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} isLoading={isUploading}>
              {files.length > 1 ? `Upload ${files.length} files` : 'Upload'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 px-6 py-4">
          <FormField label="Files" htmlFor="doc-upload-file" required>
            <div className="space-y-2">
              <input
                id="doc-upload-file"
                ref={fileInputRef}
                type="file"
                multiple
                accept={SUPPORTED_FILE_TYPES.join(',')}
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-purple-700 hover:file:bg-purple-100"
              />
              <TakePhotoButton
                disabled={isUploading}
                onCapture={(captured) => addFiles([captured])}
                title="Take document photo"
                description="Allow camera access if prompted, then capture the document or receipt."
                fileNamePrefix="document"
              />
              {files.length > 0 ? (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-gray-800">
                        {file.name}
                        <span className="ml-2 text-xs text-gray-500">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </span>
                      <button
                        type="button"
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label={`Remove ${file.name}`}
                        disabled={isUploading}
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">You can select multiple files at once.</p>
              )}
            </div>
          </FormField>

          {files.length <= 1 ? (
            <FormField label="Document name" htmlFor="doc-upload-name" required>
              <Input
                id="doc-upload-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g. Signed lease 2026"
              />
            </FormField>
          ) : (
            <p className="text-sm text-gray-600">
              Each file will be uploaded with its filename. Category, type, and links below apply to
              all files.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="doc-upload-category">
              <Select
                id="doc-upload-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Type" htmlFor="doc-upload-type">
              <Select
                id="doc-upload-type"
                value={documentType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setDocumentType(nextType);
                  if (!documentTypeHasExpiry(nextType)) setExpiryDate('');
                }}
              >
                <option value="">Select type</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Property" htmlFor="doc-upload-building">
              <Select
                id="doc-upload-building"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
              >
                <option value="">Not linked</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tenant" htmlFor="doc-upload-tenant">
              <Select
                id="doc-upload-tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">Not linked</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName}
                  </option>
                ))}
              </Select>
            </FormField>

            {documentTypeHasExpiry(documentType) ? (
              <FormField label="Expiry date" htmlFor="doc-upload-expiry">
                <Input
                  id="doc-upload-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </FormField>
            ) : null}
          </div>
        </div>
      </Dialog>
    </>
  );
}
