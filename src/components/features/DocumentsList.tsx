'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Pencil,
  Search,
  Trash2,
  Download,
  Eye,
  Shield,
  IdCard,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { Document, DocumentCategory } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import PDFPreview from './PDFPreview';
import BulkDocumentOperations from './BulkDocumentOperations';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/forms/FormField';
import Pagination from '@/components/ui/Pagination';
import { DocumentStatusBadge } from '@/components/domain/StatusBadges';
import {
  formatDocumentLinkedTo,
  getDocumentUiStatus,
  type DocumentUiStatus,
} from '@/lib/documents-shared';

const PAGE_SIZE = 20;

interface DocumentsListProps {
  documents: Document[];
  categories: DocumentCategory[];
  buildings: Array<{ id: string; name: string }>;
  tenants: Array<{ id: string; firstName: string; lastName: string }>;
  searchParams: Record<string, string | undefined>;
  totalPages: number;
  currentPage: number;
  total: number;
}

function getDocumentIcon(doc: Document) {
  const status = getDocumentUiStatus(doc);
  const type = (doc.documentType || '').toLowerCase();
  const category = (doc.categoryName || '').toLowerCase();

  if (status === 'needs_review') {
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
  if (type === 'lease' || category.includes('lease') || category.includes('agreement')) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (type === 'insurance' || category.includes('insurance')) {
    return <Shield className="h-5 w-5 text-amber-500" />;
  }
  if (category.includes('id') || category.includes('identity')) {
    return <IdCard className="h-5 w-5 text-violet-500" />;
  }
  if (type === 'legal' || category.includes('notice')) {
    return <Bell className="h-5 w-5 text-orange-500" />;
  }
  return <FileText className="h-5 w-5 text-gray-500" />;
}

export default function DocumentsList({
  documents,
  categories,
  buildings,
  tenants,
  searchParams,
  totalPages,
  currentPage,
  total,
}: DocumentsListProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const { showNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [searchDraft, setSearchDraft] = useState(searchParams.search || '');
  const [categoryDraft, setCategoryDraft] = useState(searchParams.categoryId || '');
  const [buildingDraft, setBuildingDraft] = useState(searchParams.buildingId || '');
  const [statusDraft, setStatusDraft] = useState(searchParams.status || '');

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const applyFilters = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    const next = {
      search: searchDraft,
      categoryId: categoryDraft,
      buildingId: buildingDraft,
      status: statusDraft,
      ...overrides,
    };

    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', '1');
    router.push(`/admin/documents?${params.toString()}`);
  };

  useEffect(() => {
    setCategoryDraft(searchParams.categoryId || '');
    setBuildingDraft(searchParams.buildingId || '');
    setStatusDraft(searchParams.status || '');
  }, [searchParams.categoryId, searchParams.buildingId, searchParams.status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === (searchParams.search || '')) return;
      applyFilters({ search: searchDraft });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [searchDraft]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/documents?${params.toString()}`);
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (
      !(await confirm({
        title: 'Delete document?',
        message: `Are you sure you want to delete "${documentName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
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
        router.refresh();
      } else {
        throw new Error(result.error || 'Failed to delete document');
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete document',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    window.open(`/api/documents/${document.id}/download`, '_blank');
  };

  const handleDocumentSelect = (document: Document, isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments((prev) => [...prev, document]);
    } else {
      setSelectedDocuments((prev) => prev.filter((doc) => doc.id !== document.id));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    setSelectedDocuments(isSelected ? documents : []);
  };

  const handleSelectionCleared = () => {
    setSelectedDocuments([]);
  };

  const isDocumentSelected = (documentId: string) => {
    return selectedDocuments.some((doc) => doc.id === documentId);
  };

  const handleDocumentsUpdated = () => {
    router.refresh();
    setSelectedDocuments([]);
  };

  return (
    <div className="space-y-6">
      {dialog}
      <BulkDocumentOperations
        selectedDocuments={selectedDocuments}
        onDocumentsUpdated={handleDocumentsUpdated}
        onSelectionCleared={handleSelectionCleared}
        buildings={buildings}
        tenants={tenants}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Search" htmlFor="document-search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="document-search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Filename, tenant..."
                className="pl-10"
              />
            </div>
          </FormField>
          <FormField label="Category" htmlFor="document-category">
            <Select
              id="document-category"
              value={categoryDraft}
              onChange={(e) => {
                const value = e.target.value;
                setCategoryDraft(value);
                applyFilters({ categoryId: value });
              }}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Building" htmlFor="document-building">
            <Select
              id="document-building"
              value={buildingDraft}
              onChange={(e) => {
                const value = e.target.value;
                setBuildingDraft(value);
                applyFilters({ buildingId: value });
              }}
            >
              <option value="">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="document-status">
            <Select
              id="document-status"
              value={statusDraft}
              onChange={(e) => {
                const value = e.target.value;
                setStatusDraft(value);
                applyFilters({ status: value });
              }}
            >
              <option value="">All Status</option>
              <option value="signed">Signed</option>
              <option value="on_file">On file</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="needs_review">Needs review</option>
            </Select>
          </FormField>
        </div>
      </Card>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {documents.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="mb-2 text-lg font-medium">No documents found</p>
            <p className="text-sm text-gray-600">Upload a document or adjust your filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      <Checkbox
                        checked={
                          selectedDocuments.length === documents.length && documents.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all documents"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Linked to
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {documents.map((document) => {
                    const status: DocumentUiStatus = getDocumentUiStatus(document);
                    const linkedTo = formatDocumentLinkedTo(document);
                    const unlinked = !linkedTo;

                    return (
                      <tr key={document.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <Checkbox
                            checked={isDocumentSelected(document.id)}
                            onChange={(e) => handleDocumentSelect(document, e.target.checked)}
                            aria-label={`Select ${document.documentName}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">{getDocumentIcon(document)}</div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-gray-900">
                                {document.documentName}
                              </div>
                              <div className="truncate text-xs text-gray-500">
                                {document.fileName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {document.categoryName || (
                            <span className="text-gray-400">Uncategorized</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {unlinked ? (
                            <span className="font-medium text-red-600">Not linked</span>
                          ) : (
                            <span className="text-gray-900">{linkedTo}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {formatDate(document.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <DocumentStatusBadge status={status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDocument(document)}
                              className="text-gray-500 hover:text-gray-900"
                              title="Preview"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(document)}
                              className="text-gray-500 hover:text-gray-900"
                              title="Download"
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <Link
                              href={`/admin/documents/${document.id}/edit`}
                              className="text-gray-500 hover:text-gray-900"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteDocument(document.id, document.documentName)
                              }
                              disabled={isDeleting === document.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

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
