'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, Download, X, Upload, FilePlus2 } from 'lucide-react';

interface DocumentUploadProps {
  tenantId: string;
  currentDocumentId?: string | null;
  currentDocumentUrl?: string | null;
  currentDocumentName?: string | null;
  onUploadComplete?: (documentId: string) => void;
  onDeleteComplete?: () => void;
  documentType?: string;
  accept?: string;
  /** Show Generate lease (admin tenant page). Default true in admin context. */
  allowGenerate?: boolean;
}

export default function DocumentUpload({
  tenantId,
  currentDocumentId,
  currentDocumentUrl,
  currentDocumentName,
  onUploadComplete,
  onDeleteComplete,
  documentType = 'tenant_agreement',
  accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  allowGenerate,
}: DocumentUploadProps) {
  const { showNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdminContext = session?.user?.role === 'admin' || pathname?.startsWith('/admin');
  const isTenantContext = session?.user?.role === 'tenant' || pathname?.startsWith('/tenant');
  const canGenerate = allowGenerate ?? isAdminContext;

  const apiBaseUrl =
    isTenantContext && !isAdminContext
      ? '/api/tenant/agreement'
      : `/api/tenants/${tenantId}/agreement`;

  const viewUrl = currentDocumentId
    ? `/api/documents/${currentDocumentId}/download`
    : currentDocumentUrl || null;

  const hasDocument = Boolean(viewUrl && currentDocumentName);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('DocumentUpload API selection:', {
        pathname,
        userRole: session?.user?.role,
        isAdminContext,
        isTenantContext,
        apiBaseUrl,
        tenantId,
      });
    }
  }, [pathname, session, isAdminContext, isTenantContext, apiBaseUrl, tenantId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    const isValidType =
      allowedTypes.includes(file.type) ||
      (file.type === '' && allowedExtensions.includes(fileExtension)) ||
      allowedExtensions.includes(fileExtension);

    if (!isValidType) {
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a PDF, DOC, or DOCX file',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'File must be less than 10MB',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    showNotification({
      type: 'loading',
      title: 'Uploading',
      message: 'Uploading signed lease...',
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', file.name);
      formData.append('documentType', documentType);

      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          const contextMessage = isTenantContext
            ? 'Please ensure you are logged in as a tenant to upload your agreement.'
            : 'Please ensure you are logged in as an admin to upload tenant agreements.';
          errorData = {
            success: false,
            error:
              response.status === 403
                ? `Access denied. ${contextMessage}`
                : `Upload failed with status ${response.status}: ${text.substring(0, 100)}`,
          };
        }

        const errorMessage =
          errorData.error || errorData.message || `Upload failed with status ${response.status}`;
        console.error('Upload error response:', { status: response.status, errorData, apiBaseUrl });
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.error || data.message || `Upload failed with status ${response.status}`;
        console.error('Upload error response:', { status: response.status, data });
        throw new Error(errorMessage);
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Signed lease uploaded successfully',
      });

      if (onUploadComplete) {
        onUploadComplete(data.data.id);
      }

      window.location.reload();
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload document',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const requestGenerate = async (forceReplace: boolean) => {
    const response = await fetch(`/api/tenants/${tenantId}/agreement/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ forceReplace }),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    showNotification({
      type: 'loading',
      title: 'Generating',
      message: 'Generating lease agreement...',
    });

    try {
      let { response, data } = await requestGenerate(false);

      if (response.status === 409 && data.code === 'AGREEMENT_LOCKED') {
        const replace = await confirm({
          title: 'Replace signed lease?',
          message:
            'A signed lease is already on file. Generate a new draft and replace it? The previous file will be removed.',
          confirmText: 'Replace & generate',
          variant: 'danger',
        });
        if (!replace) {
          showNotification({
            type: 'info',
            title: 'Cancelled',
            message: 'Existing signed lease kept',
          });
          return;
        }
        ({ response, data } = await requestGenerate(true));
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate lease agreement');
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: data.message || 'Lease agreement generated',
      });

      if (onUploadComplete && data.data?.documentId) {
        onUploadComplete(data.data.documentId);
      }

      if (data.data?.downloadUrl) {
        window.open(data.data.downloadUrl, '_blank');
      }

      window.location.reload();
    } catch (error) {
      console.error('Error generating lease:', error);
      showNotification({
        type: 'error',
        title: 'Generate Failed',
        message: error instanceof Error ? error.message : 'Failed to generate lease',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !(await confirm({
        title: 'Delete document?',
        message: 'Are you sure you want to delete this document?',
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
      return;
    }

    setIsDeleting(true);
    showNotification({
      type: 'loading',
      title: 'Deleting',
      message: 'Deleting document...',
    });

    try {
      const response = await fetch(apiBaseUrl, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          const contextMessage = isTenantContext
            ? 'Please ensure you are logged in as a tenant to manage your agreement.'
            : 'Please ensure you are logged in as an admin to manage tenant agreements.';
          errorData = {
            success: false,
            error:
              response.status === 403
                ? `Access denied. ${contextMessage}`
                : `Delete failed with status ${response.status}: ${text.substring(0, 100)}`,
          };
        }

        const errorMessage =
          errorData.error || errorData.message || `Delete failed with status ${response.status}`;
        console.error('Delete error response:', { status: response.status, errorData, apiBaseUrl });
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Document deleted successfully',
      });

      if (onDeleteComplete) {
        onDeleteComplete();
      }

      window.location.reload();
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete document',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    if (viewUrl) {
      window.open(viewUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {dialog}
      {hasDocument ? (
        <Card padding="md" className="bg-gray-50 border-gray-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <FileText className="h-8 w-8 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{currentDocumentName}</p>
                <p className="text-xs text-gray-500">Lease agreement on file</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                leftIcon={<Download className="h-4 w-4" />}
              >
                View
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
                leftIcon={<X className="h-4 w-4" />}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-900">No lease agreement on file</p>
          <p className="mt-1 text-xs text-gray-500">
            Generate a draft from lease data, or upload a signed PDF.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canGenerate && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void handleGenerate()}
            isLoading={isGenerating}
            leftIcon={<FilePlus2 className="h-4 w-4" />}
          >
            {hasDocument ? 'Regenerate lease' : 'Generate lease'}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          isLoading={isUploading}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          {isUploading ? 'Uploading...' : hasDocument ? 'Upload signed PDF' : 'Upload'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500">
        Generate creates a branded draft from the tenant&apos;s assignment and building policies.
        Upload accepts PDF, DOC, or DOCX (max 10MB) as the signed copy.
      </p>
    </div>
  );
}
