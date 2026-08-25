'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Document, DOCUMENT_TYPES } from '@/types/document';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { Dialog } from '@/components/ui/Dialog';
import { Tags, Package, Trash2 } from 'lucide-react';

interface BulkDocumentOperationsProps {
  selectedDocuments: Document[];
  onDocumentsUpdated: () => void;
  onSelectionCleared: () => void;
  buildings: Array<{ id: string; name: string }>;
  tenants: Array<{ id: string; firstName: string; lastName: string }>;
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

  const [isDownloading, setIsDownloading] = useState(false);

  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('lease');
  const [bulkBuildingId, setBulkBuildingId] = useState('');
  const [bulkTenantId, setBulkTenantId] = useState('');

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

  if (selectedDocuments.length === 0) {
    return <>{dialog}</>;
  }

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
            <Button type="button" variant="ghost" size="sm" onClick={onSelectionCleared}>
              Clear selection
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </Card>

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
