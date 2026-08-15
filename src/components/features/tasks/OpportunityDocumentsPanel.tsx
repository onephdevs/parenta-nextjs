'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/ui/Select';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/types/document';
import { TakePhotoButton } from '@/components/features/TakePhotoButton';
import { looksLikeImage, useImageLightboxOptional } from '@/components/ui/ImageLightbox';

interface CardDocument {
  id: string;
  documentName: string;
  documentType?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt?: string | Date;
}

const DEFAULT_DOC_TYPE_OPTIONS = [
  { value: 'id_proof', label: 'ID / government ID' },
  { value: 'income_proof', label: 'Income proof' },
  { value: 'lease', label: 'Lease agreement' },
  { value: 'background_check', label: 'Background / credit report' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_DOC_TYPE_OPTIONS = [
  { value: 'receipt', label: 'Payment receipt' },
  { value: 'invoice', label: 'Invoice copy' },
  { value: 'other', label: 'Other' },
];

interface OpportunityDocumentsPanelProps {
  cardId: string;
  buildingId?: string;
  roomId?: string;
  description?: string;
  docTypeOptions?: Array<{ value: string; label: string }>;
  defaultDocType?: string;
  uploadButtonLabel?: string;
  onUploaded?: (doc: CardDocument) => void;
}

export function OpportunityDocumentsPanel({
  cardId,
  buildingId,
  roomId,
  description = 'Upload ID, income proof, lease drafts, and screening reports for this prospect.',
  docTypeOptions = DEFAULT_DOC_TYPE_OPTIONS,
  defaultDocType,
  uploadButtonLabel = 'Upload',
  onUploaded,
}: OpportunityDocumentsPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<CardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState(
    defaultDocType || docTypeOptions[0]?.value || 'other'
  );
  const [error, setError] = useState<string | null>(null);
  const { open: openLightbox } = useImageLightboxOptional();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents?pipelineCardId=${encodeURIComponent(cardId)}&limit=50`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load documents');
      setDocs(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDocument(doc: CardDocument) {
    const href = `/api/documents/${doc.id}/download`;
    const name = doc.documentName || doc.fileName || 'Document';
    if (
      looksLikeImage({
        mimeType: doc.mimeType,
        fileName: doc.fileName || doc.documentName,
        url: name,
      })
    ) {
      openLightbox({ src: href, alt: name, title: name });
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        throw new Error('Unsupported file type');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      const form = new FormData();
      form.append('file', file);
      // Keep the original upload name for list + download (storage path stays unique)
      form.append('documentName', file.name || 'Opportunity document');
      form.append('documentType', docType);
      form.append('pipelineCardId', cardId);
      form.append('accessLevel', 'admin');
      if (buildingId) form.append('buildingId', buildingId);
      if (roomId) form.append('roomId', roomId);

      const res = await fetch('/api/documents', { method: 'POST', body: form });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Upload failed');

      const created = json.data as CardDocument;
      setDocs((prev) => [created, ...prev]);
      onUploaded?.(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this document?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{description}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField label="Document type" htmlFor="opp-doc-type" className="flex-1">
          <Select
            id="opp-doc-type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {docTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={SUPPORTED_FILE_TYPES.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            isDisabled={uploading}
            isLoading={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading…' : uploadButtonLabel}
          </Button>
          <TakePhotoButton
            disabled={uploading}
            onCapture={(file) => void handleUpload(file)}
            title="Take document photo"
            description="Allow camera access if prompted, then capture the document or receipt."
            fileNamePrefix="document"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          No documents yet
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => void openDocument(doc)}
                    className="block truncate text-left text-sm font-medium text-indigo-600 hover:underline"
                    title={doc.documentName || doc.fileName}
                  >
                    {doc.documentName || doc.fileName || 'Document'}
                  </button>
                  <p className="truncate text-xs text-gray-500">
                    {docTypeOptions.find((o) => o.value === doc.documentType)?.label ||
                      doc.documentType ||
                      'Document'}
                    {doc.fileSize != null ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(doc.id)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                aria-label="Remove document"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
