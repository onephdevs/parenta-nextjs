'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MoreVertical, Plus } from 'lucide-react';
import DocumentUpload from '@/components/features/DocumentUpload';
import LeaseSignPanel from '@/components/features/lease-designer/LeaseSignPanel';
import { EditableSectionCard } from '@/components/ui/EditableSectionCard';
import { FileAttachmentChip } from '@/components/ui/FileAttachmentChip';
import Pagination from '@/components/ui/Pagination';

interface DocRow {
  id: string;
  documentName: string;
  documentType?: string;
  fileName?: string;
  mimeType?: string;
}

const PAGE_SIZE = 5;

function pickDoc(docs: DocRow[], types: string[]): DocRow | null {
  const set = new Set(types.map((t) => t.toLowerCase()));
  return (
    docs.find((d) => set.has(String(d.documentType || '').toLowerCase())) ||
    docs.find((d) =>
      types.some((t) =>
        String(d.documentName || d.fileName || '')
          .toLowerCase()
          .includes(t.replace('_', ' '))
      )
    ) ||
    null
  );
}

export function DocumentsTab({
  tenantId,
  agreementDocumentId,
  agreementDocumentUrl,
  agreementDocumentName,
}: {
  tenantId: string;
  agreementDocumentId?: string | null;
  agreementDocumentUrl?: string | null;
  agreementDocumentName?: string | null;
}) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/documents?tenantId=${encodeURIComponent(tenantId)}&limit=50`
      );
      const json = await res.json();
      if (json.success) setDocs(json.data || []);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const leaseDoc =
    agreementDocumentId
      ? ({
          id: agreementDocumentId,
          documentName: agreementDocumentName || 'Lease contract',
          documentType: 'lease',
          fileName: agreementDocumentName || undefined,
        } as DocRow)
      : pickDoc(docs, ['lease', 'tenant_agreement']);
  const idDoc = pickDoc(docs, ['id_proof', 'id', 'passport']);
  const residencyDoc = pickDoc(docs, ['background_check', 'residency', 'barangay']);

  const optionalDocs = useMemo(() => {
    const requiredIds = new Set(
      [leaseDoc?.id, idDoc?.id, residencyDoc?.id].filter(Boolean) as string[]
    );
    return docs.filter((d) => !requiredIds.has(d.id));
  }, [docs, leaseDoc?.id, idDoc?.id, residencyDoc?.id]);

  const totalPages = Math.max(1, Math.ceil(optionalDocs.length / PAGE_SIZE));
  const pageRows = optionalDocs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <EditableSectionCard
        title="Required Documents"
        editHref={`/admin/tenants/${tenantId}/edit?tab=documents`}
      >
        <div className="space-y-4">
          <RequiredRow
            label="Lease Contract"
            doc={leaseDoc}
            fallbackHref={agreementDocumentUrl}
          />
          <RequiredRow label="ID Requirements" doc={idDoc} metaLabel="ID Type" metaValue="—" />
          <RequiredRow
            label="Proof of Residency"
            doc={residencyDoc}
            metaLabel="Document Type"
            metaValue="—"
          />
        </div>

        <div className="mt-6 border-t border-gray-100 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Upload / e-sign lease
          </p>
          <DocumentUpload
            tenantId={tenantId}
            currentDocumentId={agreementDocumentId}
            currentDocumentUrl={agreementDocumentUrl}
            currentDocumentName={agreementDocumentName}
            allowGenerate
            onUploadComplete={() => void load()}
            onDeleteComplete={() => void load()}
          />
          <div className="mt-4">
            <LeaseSignPanel tenantId={tenantId} onSigned={() => void load()} />
          </div>
        </div>
      </EditableSectionCard>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-gray-900">Optional Documents</h3>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
            <Plus className="h-3.5 w-3.5" />
            Add Document
            <input
              type="file"
              className="hidden"
              onChange={() => {
                /* DocumentUpload covers primary lease; optional upload via existing panel flow */
                window.location.href = `#optional-upload`;
              }}
            />
          </label>
        </div>

        <div id="optional-upload" className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">ID Type</th>
                <th className="px-5 py-3">File</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                    Loading documents…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                    No optional documents yet.
                  </td>
                </tr>
              ) : (
                pageRows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {doc.documentName || 'Document'}
                    </td>
                    <td className="px-5 py-3.5 capitalize text-gray-700">
                      {(doc.documentType || 'other').replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <FileAttachmentChip
                        fileName={doc.fileName || doc.documentName || 'file'}
                        href={`/api/documents/${doc.id}/download`}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Document actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={optionalDocs.length}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}

function RequiredRow({
  label,
  doc,
  fallbackHref,
  metaLabel,
  metaValue,
}: {
  label: string;
  doc: DocRow | null;
  fallbackHref?: string | null;
  metaLabel?: string;
  metaValue?: string;
}) {
  const href = doc
    ? `/api/documents/${doc.id}/download`
    : fallbackHref || null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>
        <FileAttachmentChip
          fileName={doc?.fileName || doc?.documentName || 'No file uploaded'}
          href={href}
        />
      </div>
      {metaLabel ? (
        <div className="sm:text-right">
          <p className="text-xs text-gray-500">{metaLabel}</p>
          <p className="mt-0.5 text-sm font-medium text-gray-900">{metaValue || '—'}</p>
        </div>
      ) : null}
    </div>
  );
}
