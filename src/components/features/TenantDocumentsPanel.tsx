'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TenantDocument {
  id: string;
  documentName: string;
  documentType?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: string | Date;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  id_proof: 'ID / government ID',
  income_proof: 'Income proof',
  lease: 'Lease agreement',
  background_check: 'Background / credit report',
  tenant_agreement: 'Tenant agreement',
  other: 'Other',
};

interface TenantDocumentsPanelProps {
  tenantId: string;
}

export function TenantDocumentsPanel({ tenantId }: TenantDocumentsPanelProps) {
  const [docs, setDocs] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents?tenantId=${encodeURIComponent(tenantId)}&limit=50`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load documents');
      setDocs(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Remove this document from the tenant?')) return;
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
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No documents yet. Files uploaded on the opportunity (ID, income proof, lease, screening)
          appear here after Generate lease.
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
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    className="block truncate text-sm font-medium text-indigo-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                    title={doc.documentName || doc.fileName}
                  >
                    {doc.documentName || doc.fileName || 'Document'}
                  </a>
                  <p className="truncate text-xs text-gray-500">
                    {DOC_TYPE_LABELS[doc.documentType || ''] ||
                      doc.documentType ||
                      'Document'}
                    {doc.fileSize != null
                      ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB`
                      : ''}
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

      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
