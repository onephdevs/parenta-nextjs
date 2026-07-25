'use client';

import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Document, DocumentCategory, DOCUMENT_TYPES } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';
import PDFPreview from './PDFPreview';
import BulkDocumentOperations from './BulkDocumentOperations';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Filter, Search } from 'lucide-react';

interface DocumentsListProps {
  documents: Document[];
  categories: DocumentCategory[];
  searchParams: Record<string, string | undefined>;
  totalPages: number;
  currentPage: number;
}

export default function DocumentsList({
  documents,
  categories,
  searchParams,
  totalPages,
  currentPage,
}: DocumentsListProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { showNotification } = useNotifications();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);

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
      month: 'short',
      day: 'numeric'
    });
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'lease':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'photo':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'invoice':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const handleSearch = (searchTerm: string) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/documents?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/documents?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/documents?${params.toString()}`);
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (!confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(documentId);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Document deleted',
          message: `Document "${documentName}" has been deleted successfully.`,
        });

        // Refresh the page to update the list
        router.refresh();
      } else {
        throw new Error(result.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete document',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadDocument = (document: Document) => {
    // Open the file in a new tab for download
    const fileUrl = `/uploads/documents/${document.fileName}`;
    window.open(fileUrl, '_blank');
  };

  const handlePreviewDocument = (document: Document) => {
    setPreviewDocument(document);
  };

  const handleDocumentSelect = (document: Document, isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments(prev => [...prev, document]);
    } else {
      setSelectedDocuments(prev => prev.filter(doc => doc.id !== document.id));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments(documents);
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleSelectionCleared = () => {
    setSelectedDocuments([]);
  };

  const isDocumentSelected = (documentId: string) => {
    return selectedDocuments.some(doc => doc.id === documentId);
  };

  const isExpired = (expiryDate: Date | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: Date | null) => {
    if (!expiryDate) return false;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const handleDocumentsUpdated = () => {
    // Refresh the page to show updated data
    router.refresh();
    setSelectedDocuments([]);
  };

  return (
    <div className="space-y-6">
      {/* Bulk Operations */}
      <BulkDocumentOperations
        selectedDocuments={selectedDocuments}
        onDocumentsUpdated={handleDocumentsUpdated}
        onSelectionCleared={handleSelectionCleared}
        buildings={[]}
        tenants={[]}
      />

      <Card padding="none" className="overflow-hidden">
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search documents..."
              defaultValue={searchParams.search || ''}
              onChange={(e) => {
                const value = e.target.value;
                window.setTimeout(() => handleSearch(value), 500);
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              value={searchParams.categoryId || ''}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              aria-label="Category"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select
              value={searchParams.documentType || ''}
              onChange={(e) => handleFilterChange('documentType', e.target.value)}
              aria-label="Document Type"
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </Select>

            <Select
              value={searchParams.accessLevel || ''}
              onChange={(e) => handleFilterChange('accessLevel', e.target.value)}
              aria-label="Access Level"
            >
              <option value="">All Access Levels</option>
              <option value="admin">Admin Only</option>
              <option value="tenant">Tenant Access</option>
              <option value="public">Public</option>
            </Select>

            <Select
              value={searchParams.isExpired || ''}
              onChange={(e) => handleFilterChange('isExpired', e.target.value)}
              aria-label="Expiry Status"
            >
              <option value="">All Documents</option>
              <option value="false">Active Documents</option>
              <option value="true">Expired Documents</option>
            </Select>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                <Checkbox
                  checked={selectedDocuments.length === documents.length && documents.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all documents"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Document
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Associated With
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Uploaded
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-900">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-1">No documents found</p>
                    <p>Upload some documents to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox
                      checked={isDocumentSelected(document.id)}
                      onChange={(e) => handleDocumentSelect(document, e.target.checked)}
                      aria-label={`Select ${document.documentName}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3">
                        {getDocumentTypeIcon(document.documentType || 'other')}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {document.documentName}
                        </div>
                        <div className="text-sm text-gray-900">
                          {document.fileName}
                        </div>
                        {document.tags && document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {document.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {document.tags.length > 3 && (
                              <span className="text-xs text-gray-900">
                                +{document.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.categoryName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      {document.buildingName && (
                        <div className="flex items-center text-xs text-gray-900">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {document.buildingName}
                        </div>
                      )}
                      {document.roomNumber && (
                        <div className="flex items-center text-xs text-gray-900">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                          Room {document.roomNumber}
                        </div>
                      )}
                      {document.tenantName && (
                        <div className="flex items-center text-xs text-gray-900">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {document.tenantName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.fileSize ? formatFileSize(document.fileSize) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {formatDate(document.createdAt)}
                    </div>
                    {document.uploaderName && (
                      <div className="text-xs text-gray-900">
                        by {document.uploaderName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {document.expiryDate ? (
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isExpired(document.expiryDate)
                          ? 'bg-red-100 text-red-800'
                          : isExpiringSoon(document.expiryDate)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isExpired(document.expiryDate)
                          ? 'Expired'
                          : isExpiringSoon(document.expiryDate)
                          ? 'Expiring Soon'
                          : 'Valid'
                        }
                      </div>
                    ) : (
                      <span className="text-gray-900">No expiry</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewDocument(document)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Preview"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleDownloadDocument(document)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      
                      <Link
                        href={`/admin/documents/${document.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      
                      <button
                        onClick={() => handleDeleteDocument(document.id, document.documentName)}
                        disabled={isDeleting === document.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete"
                      >
                        {isDeleting === document.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-900">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * 20 + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, documents.length + (currentPage - 1) * 20)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{documents.length + (currentPage - 1) * 20}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  const isCurrentPage = page === currentPage;
                  
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          isCurrentPage
                            ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span
                        key={page}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-900"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      </Card>

      {/* PDF Preview Modal */}
      {previewDocument && (
        <PDFPreview
          document={previewDocument}
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
} 