'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { DocumentStatusBadge } from '@/components/domain/StatusBadges';
import {
  formatDocumentLinkedTo,
  getDocumentUiStatus,
  type DocumentUiStatus,
} from '@/lib/documents-shared';

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

  const pageSize = 20;
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  return (
    <div className="space-y-4">
      {dialog}
      <BulkDocumentOperations
        selectedDocuments={selectedDocuments}
        onDocumentsUpdated={handleDocumentsUpdated}
        onSelectionCleared={handleSelectionCleared}
        buildings={buildings}
        tenants={tenants}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
            placeholder="Search by filename or tenant"
            className="pl-9"
          />
        </div>
        <Select
          value={categoryDraft}
          onChange={(e) => setCategoryDraft(e.target.value)}
          className="sm:w-48"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          value={buildingDraft}
          onChange={(e) => setBuildingDraft(e.target.value)}
          className="sm:w-56"
          aria-label="Property"
        >
          <option value="">All properties</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusDraft}
          onChange={(e) => setStatusDraft(e.target.value)}
          className="sm:w-48"
          aria-label="Status"
        >
          <option value="">All statuses</option>
          <option value="signed">Signed</option>
          <option value="on_file">On file</option>
          <option value="expiring_soon">Expiring soon</option>
          <option value="needs_review">Needs review</option>
        </Select>
        <Button variant="outline" onClick={() => applyFilters()}>
          Apply
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No documents found"
          description="Upload a document or adjust your filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedDocuments.length === documents.length && documents.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all documents"
                  />
                </TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Linked to</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => {
                const status: DocumentUiStatus = getDocumentUiStatus(document);
                const linkedTo = formatDocumentLinkedTo(document);
                const unlinked = !linkedTo;

                return (
                  <TableRow key={document.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={isDocumentSelected(document.id)}
                        onChange={(e) => handleDocumentSelect(document, e.target.checked)}
                        aria-label={`Select ${document.documentName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">{getDocumentIcon(document)}</div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {document.documentName}
                          </div>
                          <div className="truncate text-xs text-gray-500">{document.fileName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {document.categoryName || (
                        <span className="text-gray-400">Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {unlinked ? (
                        <span className="font-medium text-red-600">Not linked</span>
                      ) : (
                        <span className="text-gray-700">{linkedTo}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {formatDate(document.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDocument(document)}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(document)}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-purple-700"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/admin/documents/${document.id}/edit`}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-700"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(document.id, document.documentName)}
                          disabled={isDeleting === document.id}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-700 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{from}</span> to{' '}
                <span className="font-medium">{to}</span> of{' '}
                <span className="font-medium">{total}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  isDisabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  isDisabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
