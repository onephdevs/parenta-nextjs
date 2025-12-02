'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
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
import { useNotifications } from '@/context/NotificationContext';
import SkeletonList from '@/components/ui/SkeletonList';
import SkeletonCard from '@/components/ui/SkeletonCard';

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
  const [documentsData, setDocumentsData] = useState<DocumentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'tenant') {
      fetchDocuments();
    }
  }, [status, session]);

  // Show loading state while checking authentication
  if (status === 'loading' || isLoading) {
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

  // Redirect if not authenticated or not tenant
  if (!session || session.user.role !== 'tenant') {
    redirect('/auth/signin?role=tenant');
  }

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
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to load documents'
        });
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link
                href="/tenant"
                className="flex items-center text-gray-900 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
                <p className="text-sm text-gray-900">Access and download your property documents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

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
                              <button
                                onClick={() => handlePreview(document)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </button>
                              <button
                                onClick={() => handleDownload(document)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </button>
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
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterCategory('all');
                          }}
                          className="mt-4 text-purple-600 hover:text-purple-800 text-sm font-medium"
                        >
                          Clear filters
                        </button>
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
      </main>
    </div>
  );
} 