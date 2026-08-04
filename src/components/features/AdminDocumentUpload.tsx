'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import { DocumentCategory, DOCUMENT_TYPES, MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from '@/types/document';

interface AdminDocumentUploadProps {
  categories: DocumentCategory[];
  buildings: Array<{ id: string; name: string }>;
  tenants?: Array<{ id: string; firstName: string; lastName: string }>;
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
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setDocumentName('');
      setCategoryId('');
      setBuildingId('');
      setTenantId('');
      setDocumentType('');
      setExpiryDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    if (selected && !documentName.trim()) {
      setDocumentName(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      showNotification({
        type: 'error',
        title: 'File required',
        message: 'Please choose a file to upload.',
      });
      return;
    }

    if (!documentName.trim()) {
      showNotification({
        type: 'error',
        title: 'Name required',
        message: 'Please enter a document name.',
      });
      return;
    }

    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Unsupported file',
        message: 'This file type is not supported.',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showNotification({
        type: 'error',
        title: 'File too large',
        message: `File must be under ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', documentName.trim());
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
        throw new Error(result.error || 'Failed to upload document');
      }

      showNotification({
        type: 'success',
        title: 'Document uploaded',
        message: `"${documentName.trim()}" has been uploaded.`,
      });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Upload failed',
        message: error instanceof Error ? error.message : 'Failed to upload document',
      });
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
        description="Add a file and optionally link it to a property or tenant."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} isDisabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isUploading}>
              Upload
            </Button>
          </div>
        }
      >
        <div className="space-y-4 px-6 py-4">
          <FormField label="File" htmlFor="doc-upload-file" required>
            <input
              id="doc-upload-file"
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-purple-700 hover:file:bg-purple-100"
            />
          </FormField>

          <FormField label="Document name" htmlFor="doc-upload-name" required>
            <Input
              id="doc-upload-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g. Signed lease 2026"
            />
          </FormField>

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
                onChange={(e) => setDocumentType(e.target.value)}
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

            <FormField label="Expiry date" htmlFor="doc-upload-expiry">
              <Input
                id="doc-upload-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </Dialog>
    </>
  );
}
