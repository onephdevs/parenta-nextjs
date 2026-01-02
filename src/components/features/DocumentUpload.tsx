'use client';

import { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/context/NotificationContext';
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
  accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}: DocumentUploadProps) {
  const { showNotification } = useNotifications();
  const pathname = usePathname();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Determine if we're in tenant portal (use tenant API) or admin portal (use admin API)
  const isTenantContext = pathname?.startsWith('/tenant');
  const apiBaseUrl = isTenantContext ? '/api/tenant/agreement' : `/api/tenants/${tenantId}/agreement`;
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a PDF, DOC, or DOCX file'
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'File must be less than 10MB'
      });
      return;
    }

    // Auto-upload
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    showNotification({
      type: 'loading',
      title: 'Uploading',
      message: 'Uploading document...'
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', file.name);
      formData.append('documentType', documentType);

      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Document uploaded successfully'
      });

      if (onUploadComplete) {
        onUploadComplete(data.data.id);
      }

      // Refresh to show new document
      window.location.reload();
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload document'
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
      message: 'Deleting document...'
    });

    try {
      const response = await fetch(apiBaseUrl, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Document deleted successfully'
      });

      if (onDeleteComplete) {
        onDeleteComplete();
      }

      // Refresh to remove document
      window.location.reload();
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete document'
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
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{currentDocumentName}</p>
                <p className="text-xs text-gray-900">Tenant Agreement Document</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
      <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>View</span>
      </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <X className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-900 mb-4">No agreement document uploaded</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
        </div>
      )}

                  <input
                    ref={fileInputRef}
                    type="file"
        accept={accept}
        onChange={handleFileSelect}
                    className="hidden"
                  />

      <p className="text-xs text-gray-900">
        PDF, DOC, or DOCX. Max 10MB.
      </p>
    </div>
  );
} 
