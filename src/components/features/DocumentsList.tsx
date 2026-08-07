'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Pencil,
  Trash2,
  Download,
  Eye,
  Shield,
  IdCard,
  Bell,
  Image as ImageIcon,
} from 'lucide-react';
import { Document, DocumentCategory } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import PDFPreview from './PDFPreview';
import BulkDocumentOperations from './BulkDocumentOperations';
import {
  Checkbox,
  EmptyState,
  FilterBar,
  Pagination,
  SearchInput,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
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

function isImageDocument(doc: Document): boolean {
  if (doc.mimeType?.startsWith('image/')) return true;
  const name = (doc.fileName || doc.documentName || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
}

function documentPreviewSrc(doc: Document): string {
  const path = doc.filePath || '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  if (path.startsWith('uploads/') || path.startsWith('public/')) {
    return `/${path.replace(/^public\//, '')}`;
  }
  return `/api/documents/${doc.id}/download`;
}

function DocumentTypeIcon({ doc }: { doc: Document }) {
  const type = (doc.documentType || '').toLowerCase();
  const category = (doc.categoryName || '').toLowerCase();

  if (isImageDocument(doc)) {
    return <ImageIcon className="h-5 w-5 text-emerald-600" aria-hidden />;
  }
  if (type === 'lease' || category.includes('lease') || category.includes('agreement')) {
    return <FileText className="h-5 w-5 text-blue-500" aria-hidden />;
  }
  if (type === 'insurance' || category.includes('insurance')) {
    return <Shield className="h-5 w-5 text-amber-500" aria-hidden />;
  }
  if (category.includes('id') || category.includes('identity')) {
    return <IdCard className="h-5 w-5 text-violet-500" aria-hidden />;
  }
  if (type === 'legal' || category.includes('notice')) {
    return <Bell className="h-5 w-5 text-orange-500" aria-hidden />;
  }
  return <FileText className="h-5 w-5 text-gray-500" aria-hidden />;
}

function DocumentThumb({ doc }: { doc: Document }) {
  const [failed, setFailed] = useState(false);

  if (!isImageDocument(doc) || failed) {
    return (
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
        <DocumentTypeIcon doc={doc} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- document thumbs from blob/local paths
    <img
      src={documentPreviewSrc(doc)}
      alt=""
      className="h-10 w-10 flex-shrink-0 rounded-md object-cover ring-1 ring-gray-200"
      onError={() => setFailed(true)}
    />
  );
}

function documentPrimaryLabel(doc: Document): string {
  return (doc.documentName || doc.fileName || 'Untitled').trim();
}

function documentSecondaryLabel(doc: Document): string | null {
  const primary = documentPrimaryLabel(doc);
  const file = (doc.fileName || '').trim();
  if (!file) return null;
  if (file.toLowerCase() === primary.toLowerCase()) return null;
  return file;
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

      <FilterBar columns={4}>
        <FormField label="Search" htmlFor="document-search">
          <SearchInput
            id="document-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Filename, tenant..."
          />
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
      </FilterBar>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {documents.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="Upload a document or adjust your filters."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={
                        selectedDocuments.length === documents.length && documents.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all documents"
                    />
                  </TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Linked to</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => {
                  const status: DocumentUiStatus = getDocumentUiStatus(document);
                  const linkedTo = formatDocumentLinkedTo(document);
                  const unlinked = !linkedTo;
                  const secondary = documentSecondaryLabel(document);

                  return (
                    <TableRow key={document.id}>
                      <TableCell>
                        <Checkbox
                          checked={isDocumentSelected(document.id)}
                          onChange={(e) => handleDocumentSelect(document, e.target.checked)}
                          aria-label={`Select ${document.documentName}`}
                        />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex items-center gap-3">
                          <DocumentThumb doc={document} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-gray-900">
                              {documentPrimaryLabel(document)}
                            </div>
                            {secondary && (
                              <div className="truncate text-xs text-gray-500">{secondary}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {document.categoryName || (
                          <span className="text-gray-400">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {unlinked ? (
                          <span className="font-medium text-red-600">Not linked</span>
                        ) : (
                          linkedTo
                        )}
                      </TableCell>
                      <TableCell>{formatDate(document.createdAt)}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

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
