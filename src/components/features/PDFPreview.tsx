'use client';

import { useState, useEffect } from 'react';
import { Document as DocumentType } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

interface PDFPreviewProps {
  document: DocumentType;
  isOpen: boolean;
  onClose: () => void;
}

export default function PDFPreview({ document, isOpen, onClose }: PDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  const isPDF = document.mimeType === 'application/pdf';
  const isImage = document.mimeType?.startsWith('image/');
  const isViewable = isPDF || isImage;

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      
      // For PDFs, we'll use the browser's built-in PDF viewer
      // For images, they'll load naturally
      if (isViewable) {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        setError('This file type cannot be previewed in the browser');
        setIsLoading(false);
      }
    }
  }, [isOpen, isViewable]);

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = `/api/documents/${document.id}/download`;
    link.download = document.fileName;
    link.click();
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {document.documentName}
            </h2>
            <span className="text-sm text-gray-900">
              ({document.fileName})
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Zoom Controls for Images */}
            {isImage && (
              <>
                <IconButton label="Zoom Out" onClick={handleZoomOut}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </IconButton>
                <span className="text-sm text-gray-900 px-2">
                  {Math.round(scale * 100)}%
                </span>
                <IconButton label="Zoom In" onClick={handleZoomIn}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </IconButton>
                <IconButton label="Reset Zoom" onClick={handleResetZoom}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Download
            </Button>

            <IconButton label="Close preview" onClick={onClose}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-900">Loading preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Preview File</h3>
                <p className="text-gray-900 mb-4">{error}</p>
                <Button onClick={handleDownload}>Download File</Button>
              </div>
            </div>
          ) : isPDF ? (
            <div className="h-full w-full">
              <iframe
                src={`/api/documents/${document.id}/download#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full border-0"
                title={`Preview of ${document.documentName}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setError('Failed to load PDF preview');
                  setIsLoading(false);
                }}
              />
            </div>
          ) : isImage ? (
            <div className="h-full w-full overflow-auto flex items-center justify-center p-4">
              <img
                src={`/api/documents/${document.id}/download`}
                alt={document.documentName}
                className="max-w-none h-auto shadow-lg"
                style={{ 
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center'
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setError('Failed to load image preview');
                  setIsLoading(false);
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Not Available</h3>
                <p className="text-gray-900 mb-4">This file type cannot be previewed in the browser</p>
                <Button onClick={handleDownload}>Download File</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with file info */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-900">
            <div className="flex items-center space-x-4">
              <span>Type: {document.mimeType || 'Unknown'}</span>
              {document.fileSize && (
                <span>Size: {formatFileSize(document.fileSize)}</span>
              )}
              <span>Version: v{document.versionNumber}</span>
            </div>
            <div>
              Uploaded: {new Date(document.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 