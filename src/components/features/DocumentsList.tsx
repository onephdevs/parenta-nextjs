'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Eye,
  MoreVertical,
  Shield,
  IdCard,
  Bell,
  Image as ImageIcon,
} from 'lucide-react';
import { Document, DocumentCategory } from '@/types/document';
import { useListQuery } from '@/hooks/useListQuery';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import PDFPreview from './PDFPreview';
import BulkDocumentOperations from './BulkDocumentOperations';
import {
  Button,
  Checkbox,
  EmptyState,
  FilterBar,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { formatShortDate } from '@/lib/utils';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';
import {
  formatDocumentLinkedTo,
  getDocumentUiStatus,
  type DocumentUiStatus,
} from '@/lib/documents-shared';
import { useImageLightbox } from '@/components/ui/ImageLightbox';

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
  const { open: openLightbox } = useImageLightbox();

  if (!isImageDocument(doc) || failed) {
    return (
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
        <DocumentTypeIcon doc={doc} />
      </div>
    );
  }

  const src = documentPreviewSrc(doc);
  const title = (doc.documentName || doc.fileName || 'Untitled').trim();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openLightbox({ src, alt: title, title });
      }}
      className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
      aria-label={`View ${title}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- document thumbs from blob/local paths */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </button>
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
  const { navigateList } = useListQuery();
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
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuId]);

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
    navigateList(`/admin/documents?${params.toString()}`);
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
    navigateList(`/admin/documents?${params.toString()}`);
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

      <FilterBar
        columns={3}
        collapsible
        activeCount={[categoryDraft, buildingDraft, statusDraft].filter(Boolean).length}
        search={
          <SearchInput
            id="document-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Filename, tenant..."
            aria-label="Search documents"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {documents.length} of {total} documents
          </p>
        }
      >
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

      <TableCard
        title="Documents"
        description="Preview a file from the View button."
        actions={
          documents.length > 0 ? (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <Checkbox
                checked={
                  selectedDocuments.length === documents.length && documents.length > 0
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label="Select all documents"
              />
              Select all
            </label>
          ) : null
        }
      >
        {documents.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="Upload a document or adjust your filters."
          />
        ) : (
          documents.map((document) => {
            const status: DocumentUiStatus = getDocumentUiStatus(document);
            const linkedTo = formatDocumentLinkedTo(document);
            const unlinked = !linkedTo;
            const secondary = documentSecondaryLabel(document);
            const statusTone: WorkItemTone =
              status === 'signed'
                ? 'success'
                : status === 'expiring_soon'
                  ? 'warning'
                  : status === 'needs_review'
                    ? 'danger'
                    : 'neutral';
            const statusLabel =
              status === 'on_file'
                ? 'On file'
                : status === 'expiring_soon'
                  ? 'Expiring soon'
                  : status === 'needs_review'
                    ? 'Needs review'
                    : 'Signed';

            return (
              <WorkItemRow
                key={document.id}
                className="relative"
                href={`/admin/documents/${document.id}/edit`}
                leading={
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isDocumentSelected(document.id)}
                      onChange={(e) => handleDocumentSelect(document, e.target.checked)}
                      aria-label={`Select ${document.documentName}`}
                    />
                    <DocumentThumb doc={document} />
                  </div>
                }
                title={documentPrimaryLabel(document)}
                subtitle={secondary}
                badges={[
                  { key: 'status', label: statusLabel, tone: statusTone },
                  {
                    key: 'category',
                    label: document.categoryName || 'Uncategorized',
                    tone: document.categoryName ? 'info' : 'neutral',
                  },
                  ...(unlinked
                    ? [{ key: 'link', label: 'Not linked', tone: 'danger' as const }]
                    : []),
                ]}
                date={formatShortDate(document.createdAt)}
                metaLabel={linkedTo}
                metaTone="default"
                dotTone={statusTone}
                actions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => setPreviewDocument(document)}
                    >
                      View
                    </Button>
                    <button
                      type="button"
                      className="inline-flex rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Document actions"
                      onClick={() =>
                        setMenuId((id) => (id === document.id ? null : document.id))
                      }
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuId === document.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 text-left shadow-lg"
                      >
                        <button
                          type="button"
                          className="block w-full px-3.5 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                          onClick={() => {
                            setMenuId(null);
                            setPreviewDocument(document);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3.5 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
                          onClick={() => {
                            setMenuId(null);
                            void handleDownloadDocument(document);
                          }}
                        >
                          Download
                        </button>
                        <Link
                          href={`/admin/documents/${document.id}/edit`}
                          className="block px-3.5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                          onClick={() => setMenuId(null)}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="block w-full px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          disabled={isDeleting === document.id}
                          onClick={() => {
                            setMenuId(null);
                            void handleDeleteDocument(document.id, document.documentName);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                }
              />
            );
          })
        )}

        {documents.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        ) : null}
      </TableCard>

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
