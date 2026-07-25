'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, Download, X, Upload } from 'lucide-react';

interface DocumentUploadProps {
  tenantId: string;
  currentDocumentUrl?: string | null;
  currentDocumentName?: string | null;
  onUploadComplete?: (documentId: string) => void;
  onDeleteComplete?: () => void;
  documentType?: string;
  accept?: string;
}

export default function DocumentUpload({
  tenantId,
  currentDocumentUrl,
  currentDocumentName,
  onUploadComplete,
  onDeleteComplete,
  documentType = 'tenant_agreement',
  accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}: DocumentUploadProps) {
  const { showNotification } = useNotifications();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdminContext = session?.user?.role === 'admin' || pathname?.startsWith('/admin');
  const isTenantContext = session?.user?.role === 'tenant' || pathname?.startsWith('/tenant');

  const apiBaseUrl =
    isTenantContext && !isAdminContext
      ? '/api/tenant/agreement'
      : `/api/tenants/${tenantId}/agreement`;

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
      message: 'Uploading document...',
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
        message: 'Document uploaded successfully',
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
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) {
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
    if (currentDocumentUrl) {
      window.open(currentDocumentUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {currentDocumentUrl && currentDocumentName ? (
        <Card padding="md" className="bg-gray-50 border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{currentDocumentName}</p>
                <p className="text-xs text-gray-900">Tenant Agreement Document</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                leftIcon={<Download className="h-4 w-4" />}
                className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
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
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-900 mb-4">No agreement document uploaded</p>
          <Button
            type="button"
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-900">PDF, DOC, or DOCX. Max 10MB.</p>
    </div>
  );
}
