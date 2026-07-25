'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';

interface ReceiptUploadProps {
  paymentId: string;
  currentReceipt?: {
    fileName: string;
    uploadedAt: string;
  } | null;
  onUploadComplete?: () => void;
}

export default function ReceiptUpload({
  paymentId,
  currentReceipt,
  onUploadComplete,
}: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotifications();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please upload a PDF, JPEG, or PNG file',
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification({
        type: 'error',
        title: 'File Too Large',
        message: 'File size must be less than 5MB',
      });
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/tenant/payments/${paymentId}/receipt`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Receipt uploaded successfully',
        });

        setSelectedFile(null);
        setPreview(null);

        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        showNotification({
          type: 'error',
          title: 'Upload Failed',
          message: data.error || 'Failed to upload receipt',
        });
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      showNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'An error occurred while uploading the receipt',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    window.open(`/api/tenant/payments/${paymentId}/receipt`, '_blank');
  };

  return (
    <div className="space-y-4">
      {currentReceipt ? (
        <Alert variant="success" title="Receipt Uploaded">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs">
              {currentReceipt.fileName} • {new Date(currentReceipt.uploadedAt).toLocaleDateString()}
            </p>
            <Button variant="ghost" size="sm" onClick={handleDownload} className="text-green-700 hover:text-green-900">
              Download
            </Button>
          </div>
        </Alert>
      ) : (
        <>
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-gray-400 mb-4 mx-auto" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Drag and drop or choose a file
              </p>
              <p className="text-xs text-gray-500 mb-4">
                PDF, JPEG, or PNG (Max 5MB)
              </p>
              <Button
                variant="success"
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
            </div>
          ) : (
            <Card padding="sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <IconButton label="Remove file" variant="ghost" onClick={handleRemove}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>

              {preview && (
                <div className="mb-3">
                  <img
                    src={preview}
                    alt="Receipt preview"
                    className="max-w-full h-48 object-contain rounded border border-gray-200"
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={handleUpload}
                  isLoading={isUploading}
                  leftIcon={!isUploading ? <Upload className="h-4 w-4" /> : undefined}
                >
                  {isUploading ? 'Uploading...' : 'Upload Receipt'}
                </Button>
                <Button variant="outline" onClick={handleRemove}>
                  Cancel
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
