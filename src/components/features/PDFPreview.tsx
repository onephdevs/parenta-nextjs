'use client';

import { useState, useEffect } from 'react';
import type { Document as DocumentType } from '@/types/document';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

interface PDFPreviewProps {
  document: DocumentType;
  isOpen: boolean;
  onClose: () => void;
}

function isImageFile(document: DocumentType): boolean {
  if (document.mimeType?.startsWith('image/')) return true;
  const name = (document.fileName || document.documentName || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
}

function previewSrc(document: DocumentType): string {
  const path = document.filePath || '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  if (path.startsWith('uploads/') || path.startsWith('public/')) {
    return `/${path.replace(/^public\//, '')}`;
  }
  return `/api/documents/${document.id}/download`;
}

export default function PDFPreview({ document, isOpen, onClose }: PDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  const isPDF =
    document.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(document.fileName || document.documentName || '');
  const isImage = isImageFile(document);
  const isViewable = isPDF || isImage;
  const src = previewSrc(document);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setScale(1.0);

      if (!isViewable) {
        setError('This file type cannot be previewed in the browser');
        setIsLoading(false);
      }
    }
  }, [isOpen, isViewable, document.id]);

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = `/api/documents/${document.id}/download`;
    link.download = document.fileName || document.documentName || 'document';
    link.click();
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="mx-4 flex h-[90vh] w-full max-w-7xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex min-w-0 items-center gap-4">
            <h2 className="truncate text-lg font-semibold text-gray-900">
              {document.documentName}
            </h2>
            {document.fileName &&
              document.fileName.toLowerCase() !== document.documentName.toLowerCase() && (
                <span className="truncate text-sm text-gray-500">({document.fileName})</span>
              )}
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <IconButton label="Zoom Out" onClick={handleZoomOut}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                    />
                  </svg>
                </IconButton>
                <span className="px-2 text-sm text-gray-900">{Math.round(scale * 100)}%</span>
                <IconButton label="Zoom In" onClick={handleZoomIn}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </IconButton>
                <IconButton label="Reset Zoom" onClick={handleResetZoom}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </IconButton>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            >
              Download
            </Button>

            <IconButton label="Close preview" onClick={onClose}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </IconButton>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-gray-100">
          {isLoading && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <svg
                  className="mx-auto mb-4 h-12 w-12 animate-spin text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-gray-900">Loading preview...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-medium text-gray-900">Cannot Preview File</h3>
                <p className="mb-4 text-gray-600">{error}</p>
                <Button onClick={handleDownload}>Download File</Button>
              </div>
            </div>
          ) : isPDF ? (
            <div className="h-full w-full">
              <iframe
                src={`${src}#toolbar=1&navpanes=1&scrollbar=1`}
                className="h-full w-full border-0"
                title={`Preview of ${document.documentName}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setError('Failed to load PDF preview');
                  setIsLoading(false);
                }}
              />
            </div>
          ) : isImage ? (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={document.documentName}
                className="h-auto max-h-full max-w-full shadow-lg"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setError('Failed to load image preview');
                  setIsLoading(false);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                Type: {document.mimeType || (isImage ? 'image' : isPDF ? 'PDF' : 'Unknown')}
              </span>
              {document.fileSize ? <span>Size: {formatFileSize(document.fileSize)}</span> : null}
              <span>Version: v{document.versionNumber}</span>
            </div>
            <div>Uploaded: {new Date(document.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
