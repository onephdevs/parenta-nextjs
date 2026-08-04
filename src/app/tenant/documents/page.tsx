'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Download, 
  Calendar,
  Search,
  Eye,
  File,
  FileImage,
  FileType,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantData, fetchTenantDocuments } from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  category: string;
  uploadedAt: string;
  size: number;
  fileType: string;
  url?: string;
  description?: string;
}

interface DocumentsData {
  totalDocuments: number;
  documents: Document[];
  categories?: Record<string, number>;
}

function mapDocuments(raw: Record<string, unknown>): DocumentsData {
  const docs = Array.isArray(raw.documents) ? raw.documents : [];
  return {
    totalDocuments: Number(raw.totalDocuments) || docs.length,
    documents: docs.map((doc: Record<string, unknown>) => ({
      id: String(doc.id),
      name: String(doc.name),
      category: String(doc.category),
      uploadedAt: String(doc.uploadedAt),
      size: Number(doc.size) || 0,
      fileType: String(doc.fileType),
      url: doc.url as string | undefined,
      description: doc.description as string | undefined,
    })),
  };
}

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const { canAccess, isLoading: gateLoading } = useTenantPortalGate();
  const { load, getCached, isLoading: cacheLoading } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const [documentsData, setDocumentsData] = useState<DocumentsData | null>(() => {
    const cached = getCached<Record<string, unknown>>('documents');
    return cached ? mapDocuments(cached) : null;
  });
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotifications();

  const fetchDocuments = async () => {
    try {
      const raw = await load('documents', fetchTenantDocuments);
      setDocumentsData(mapDocuments(raw));
    } catch (error) {
      console.error('Error fetching documents:', error);
      if (!getCached('documents')) {
        showNotification({
          type: 'error',
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to load documents',
        });
      }
    }
  };

  useEffect(() => {
    if (gateLoading || status === 'loading') return;
    if (canAccess) {
      void fetchDocuments();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin?role=tenant');
    }
  }, [status, session, router, canAccess, gateLoading]);

  if (status === 'loading' || gateLoading || (!documentsData && cacheLoading('documents'))) {
    return <TenantPageSkeleton variant="documents" />;
  }

  if (!canAccess) {
    return null;
  }

  const handleDownload = (document: Document) => {
    if (document.url) {
      // Open download URL in new tab
      window.open(document.url, '_blank');
      showNotification({
        type: 'success',
        title: 'Download Started',
        message: `Downloading ${document.name}...`
      });
    } else {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Download URL not available'
      });
    }
  };

  const handlePreview = (document: Document) => {
    if (document.fileType?.includes('pdf')) {
      // Open PDF in new tab for preview
      if (document.url) {
        window.open(document.url, '_blank');
      }
    } else if (document.fileType?.startsWith('image/')) {
      // Open image in new tab for preview
      if (document.url) {
        window.open(document.url, '_blank');
      }
    } else {
      showNotification({
        type: 'info',
        title: 'Preview',
        message: `Preview not available for this file type. Please download to view.`
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) {
      return <FileType className="h-8 w-8 text-red-500" />;
    } else if (type.includes('image')) {
      return <FileImage className="h-8 w-8 text-green-500" />;
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    } else if (type.includes('word') || type.includes('document')) {
      return <FileCode className="h-8 w-8 text-blue-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-900" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'lease':
        return 'bg-blue-100 text-blue-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'insurance':
        return 'bg-purple-100 text-purple-800';
      case 'legal':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredDocuments = (documentsData?.documents || []).filter(document => {
    const matchesCategory = filterCategory === 'all' || document.category === filterCategory;
    const matchesSearch = document.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         document.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'lease', 'payment', 'maintenance', 'insurance', 'legal', 'other'];

  const documentsByCategory = categories.reduce((acc, category) => {
    if (category === 'all') return acc;
    acc[category] = documentsData?.documents.filter(doc => doc.category === category).length || 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={theme.pagePad}>
      <div>
        <h1 className={theme.title}>Documents</h1>
        <p className={cn('mt-1', theme.muted)}>
          Lease agreement, addenda, and files shared with you
        </p>
      </div>
          {documentsData && (
            <div className="space-y-6">
              {/* Document Categories Overview */}
              {documentsData.categories && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(documentsData.categories).map(([category, count]) => (
                    <div key={category} className={theme.card}>
                      <div className="p-4">
                        <div className="text-center">
                          <dt className={cn('capitalize', theme.label)}>
                            {category}
                          </dt>
                          <dd className={theme.value}>{count}</dd>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search and Filter */}
              <div className={cn(theme.formPanel, 'p-4 sm:p-5')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <FormField htmlFor="document-search" className="mb-0 flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="document-search"
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </FormField>
                  <FormField label="Category" htmlFor="document-category" className="mb-0 sm:w-48">
                    <Select
                      id="document-category"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              </div>

              {/* Documents List */}
              <div className={cn(theme.formPanel, 'overflow-hidden')}>
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                    Your Documents ({filteredDocuments.length} of {documentsData.totalDocuments})
                  </h3>

                  {filteredDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {filteredDocuments.map((document) => (
                        <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="flex-shrink-0">
                                {getFileIcon(document.fileType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {document.name}
                                </h4>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-900">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                                    {document.category}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {formatDate(document.uploadedAt)}
                                  </span>
                                  <span>{formatFileSize(document.size)}</span>
                                  <span className="text-gray-400">{document.fileType}</span>
                                </div>
                                {document.description && (
                                  <p className="mt-1 text-sm text-gray-900">
                                    {document.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(document)}
                                leftIcon={<Eye className="h-4 w-4" />}
                              >
                                Preview
                              </Button>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleDownload(document)}
                                leftIcon={<Download className="h-4 w-4" />}
                              >
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-900 text-lg">
                        {searchTerm || filterCategory !== 'all'
                          ? 'No documents found matching your criteria.'
                          : 'No documents available yet.'}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        {searchTerm || filterCategory !== 'all'
                          ? 'Try adjusting your search or filter settings.'
                          : 'Documents such as lease agreements, payment receipts, and maintenance records will appear here.'}
                      </p>
                      {(searchTerm || filterCategory !== 'all') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setFilterCategory('all');
                          }}
                          className="mt-4"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">Document Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Available Document Types</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Lease agreements and amendments</li>
                      <li>• Payment receipts and invoices</li>
                      <li>• Maintenance records and reports</li>
                      <li>• Insurance documents</li>
                      <li>• Legal notices and communications</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Important Notes</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Keep copies of all important documents</li>
                      <li>• Documents are available 24/7</li>
                      <li>• Contact support if you need additional documents</li>
                      <li>• All downloads are logged for security</li>
                      <li>• Documents are automatically organized by category</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
} 