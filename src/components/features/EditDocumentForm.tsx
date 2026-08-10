'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Document, DocumentCategory, DOCUMENT_TYPES } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import SectionedFormShell, { SectionedFormSection } from '@/components/ui/SectionedFormShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { FileText, Tag, Shield, Calendar, Trash2, Download } from 'lucide-react';
import { looksLikeImage, useImageLightbox } from '@/components/ui/ImageLightbox';

interface EditDocumentFormProps {
  document: Document;
  categories: DocumentCategory[];
}

type FormSection = 'basic' | 'classification' | 'access' | 'metadata';

const formSections: SectionedFormSection<FormSection>[] = [
  {
    id: 'basic',
    label: 'Basic Info',
    icon: <FileText className="h-4 w-4" />,
    title: 'Document Information',
    subtitle: 'Name and description',
  },
  {
    id: 'classification',
    label: 'Classification',
    icon: <Tag className="h-4 w-4" />,
    title: 'Category & Type',
    subtitle: 'Document classification',
  },
  {
    id: 'access',
    label: 'Access',
    icon: <Shield className="h-4 w-4" />,
    title: 'Access Control',
    subtitle: 'Who can access this document',
  },
  {
    id: 'metadata',
    label: 'Metadata',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Additional Information',
    subtitle: 'Tags and expiry date',
  },
];

export default function EditDocumentForm({ document, categories }: EditDocumentFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const { open: openLightbox } = useImageLightbox();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>('basic');

  const [formData, setFormData] = useState({
    documentName: document.documentName,
    categoryId: document.categoryId || '',
    buildingId: document.buildingId || '',
    roomId: document.roomId || '',
    tenantId: document.tenantId || '',
    assetId: document.assetId || '',
    documentType: document.documentType || '',
    description: document.description || '',
    tags: document.tags ? document.tags.join(', ') : '',
    isPublic: document.isPublic,
    expiryDate: document.expiryDate
      ? new Date(document.expiryDate).toISOString().split('T')[0]
      : '',
    accessLevel: document.accessLevel,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Updating document...',
      message: 'Please wait while we save your changes.',
    });

    try {
      const updateData = {
        documentName: formData.documentName,
        categoryId: formData.categoryId || null,
        buildingId: formData.buildingId || null,
        roomId: formData.roomId || null,
        tenantId: formData.tenantId || null,
        assetId: formData.assetId || null,
        documentType: formData.documentType || null,
        description: formData.description || null,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : [],
        isPublic: formData.isPublic,
        expiryDate: formData.expiryDate || null,
        accessLevel: formData.accessLevel,
      };

      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Document updated successfully!',
          message: `${formData.documentName} has been updated.`,
        });

        router.push('/admin/documents');
      } else {
        throw new Error(result.error || 'Failed to update document');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to update document',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !(await confirm({
        title: 'Delete document?',
        message: `Are you sure you want to delete "${document.documentName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
      return;
    }

    setIsDeleting(true);

    const loadingNotificationId = showNotification({
      type: 'loading',
      title: 'Deleting document...',
      message: 'Please wait while we delete the document.',
    });

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        updateNotification(loadingNotificationId, {
          type: 'success',
          title: 'Document deleted successfully!',
          message: `${document.documentName} has been removed.`,
        });

        router.push('/admin/documents');
      } else {
        throw new Error(result.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      updateNotification(loadingNotificationId, {
        type: 'error',
        title: 'Failed to delete document',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
      setIsDeleting(false);
    }
  };

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'lease':
        return (
          <svg
            className="w-8 h-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'photo':
        return (
          <svg
            className="w-8 h-8 text-green-500"
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
        );
      case 'invoice':
        return (
          <svg
            className="w-8 h-8 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-8 h-8 text-gray-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
  };

  const isExpired = document.expiryDate && new Date(document.expiryDate) < new Date();
  const isExpiringSoon =
    document.expiryDate &&
    new Date(document.expiryDate) > new Date() &&
    Math.ceil(
      (new Date(document.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ) <= 30;

  const renderDocumentInfo = () => (
    <Card className="mb-4">
      <h3 className="text-md font-medium text-gray-900 mb-4">File Information</h3>
      
      <div className="flex items-center space-x-4 mb-4">
        {getDocumentTypeIcon(document.documentType || 'other')}
        <div>
          <p className="text-sm font-medium text-gray-900">{document.fileName}</p>
          <p className="text-sm text-gray-500">
            {document.fileSize ? formatFileSize(document.fileSize) : 'Unknown size'}
          </p>
        </div>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Type:</dt>
          <dd className="text-gray-900">{document.mimeType || 'Unknown'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Version:</dt>
          <dd className="text-gray-900">v{document.versionNumber}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Uploaded:</dt>
          <dd className="text-gray-900">{formatDate(document.createdAt)}</dd>
        </div>
        {document.uploaderName && (
          <div className="flex justify-between">
            <dt className="text-gray-500">By:</dt>
            <dd className="text-gray-900">{document.uploaderName}</dd>
          </div>
        )}
        {document.expiryDate && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Status:</dt>
            <dd className={`${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`}>
              {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Valid'}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const href = `/uploads/documents/${document.fileName}`;
            if (
              looksLikeImage({
                mimeType: document.mimeType,
                fileName: document.fileName,
              })
            ) {
              openLightbox({
                src: href,
                alt: document.documentName || document.fileName,
                title: document.documentName || document.fileName,
              });
              return;
            }
            window.open(href, '_blank');
          }}
          leftIcon={<Download className="h-4 w-4" />}
        >
          {looksLikeImage({
            mimeType: document.mimeType,
            fileName: document.fileName,
          })
            ? 'View file'
            : 'Download File'}
        </Button>
      </div>
    </Card>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            {renderDocumentInfo()}
            
            <FormField label="Document Name" htmlFor="documentName" required>
              <Input
                type="text"
                id="documentName"
                name="documentName"
                required
                value={formData.documentName}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the document..."
              />
            </FormField>
          </div>
        );

      case 'classification':
        return (
          <div className="space-y-6">
            <FormField label="Category" htmlFor="categoryId">
              <Select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Document Type" htmlFor="documentType">
              <Select
                id="documentType"
                name="documentType"
                value={formData.documentType}
                onChange={handleInputChange}
              >
                <option value="">No type specified</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        );

      case 'access':
        return (
          <div className="space-y-6">
            <FormField label="Access Level" htmlFor="accessLevel">
              <Select
                id="accessLevel"
                name="accessLevel"
                value={formData.accessLevel}
                onChange={handleInputChange}
              >
                <option value="admin">Admin Only</option>
                <option value="tenant">Tenant Access</option>
                <option value="public">Public</option>
              </Select>
            </FormField>

            <Checkbox
              id="isPublic"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleInputChange}
              label="Make document publicly accessible"
            />
          </div>
        );

      case 'metadata':
        return (
          <div className="space-y-6">
            <FormField label="Tags (comma-separated)" htmlFor="tags">
              <Input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="contract, lease, important..."
              />
            </FormField>

            <FormField label="Expiry Date" htmlFor="expiryDate">
              <Input
                type="date"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                min="2000-01-01"
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {dialog}
      <SectionedFormShell
        mode="page"
        onCancel={() => router.push('/admin/documents')}
        eyebrow="Edit Document"
        entityLabel={document.documentName}
        sections={formSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        primaryLabel="Update Document"
        primaryLoading={isSubmitting}
        primaryDisabled={isDeleting}
        formId="edit-document-form"
        navFooter={
          <Button
            type="button"
            variant="danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
            isLoading={isDeleting}
            isDisabled={isSubmitting}
            className="w-full"
          >
            {isDeleting ? 'Deleting...' : 'Delete Document'}
          </Button>
        }
      >
        <form id="edit-document-form" onSubmit={handleSubmit} className="space-y-6">
          {renderSectionContent()}
        </form>
      </SectionedFormShell>
    </>
  );
}
