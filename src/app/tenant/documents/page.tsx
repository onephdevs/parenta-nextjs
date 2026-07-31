'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Download, 
  ArrowLeft,
  Calendar,
  Search,
  Filter,
  Eye,
  File,
  FileImage,
  FileType,
  FileSpreadsheet,
  FileCode
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SkeletonList from '@/components/ui/SkeletonList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { StatCard } from '@/components/ui/StatCard';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';

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

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const { canAccess, isLoading: gateLoading } = useTenantPortalGate();
  const router = useRouter();
  const [documentsData, setDocumentsData] = useState<DocumentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotifications();

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/documents');
      const data = await response.json();

      if (data.success) {
        // Map API response to component format
        setDocumentsData({
          totalDocuments: data.data.totalDocuments,
          documents: data.data.documents.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            category: doc.category,
            uploadedAt: doc.uploadedAt,
            size: doc.size,
            fileType: doc.fileType,
            url: doc.url,
            description: doc.description,
          })),
        });
      } else {
        // Check if it's a "No tenant profile found" error
        if (data.error === 'No tenant profile found' || response.status === 404) {
          showNotification({
            type: 'error',
            title: 'Profile Not Found',
            message: 'No tenant profile found. Please contact admin to link your account to a tenant profile.'
          });
        } else {
          showNotification({
            type: 'error',
            title: 'Error',
            message: data.error || 'Failed to load documents'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load documents'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gateLoading || status === 'loading') return;
    if (canAccess) {
      fetchDocuments();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin?role=tenant');
    }
  }, [status, session, router, canAccess, gateLoading]);

  // Show loading state while checking authentication
  if (status === 'loading' || gateLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-6">
              <SkeletonCard showHeader={true} lines={3} />
              <SkeletonList items={5} showAvatar={true} />
            </div>
          </div>
        </main>
      </div>
    );
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-900">Loading your documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/tenant"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <PageHeader
        title="Documents"
        description="Access and download your property documents"
      />
          {documentsData && (
            <div className="space-y-6">
              {/* Document Categories Overview */}
              {documentsData.categories && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(documentsData.categories).map(([category, count]) => (
                    <div key={category} className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-4">
                        <div className="text-center">
                          <dt className="text-sm font-medium text-gray-900 truncate capitalize">
                            {category}
                          </dt>
                          <dd className="text-2xl font-semibold text-gray-900">{count}</dd>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search and Filter */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              </Card>

              {/* Documents List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
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