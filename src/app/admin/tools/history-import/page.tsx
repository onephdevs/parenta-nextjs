'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Loader2,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { Textarea } from '@/components/ui/Textarea';
import type {
  HistoryImportPreview,
  HistoryImportType,
} from '@/lib/services/history-import-service';

const IMPORT_TYPES: Array<{ value: HistoryImportType; label: string }> = [
  { value: 'payments', label: 'Payments / collections' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'tenants', label: 'Tenants + room assignments' },
  { value: 'meter_readings', label: 'Utility meter readings' },
];

export default function HistoryImportPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [importType, setImportType] = useState<HistoryImportType>('payments');
  const [csvText, setCsvText] = useState('');
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState<HistoryImportPreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }
  }, [session, status]);

  const downloadTemplate = () => {
    window.open(
      `/api/admin/history-import?type=${importType}&template=1`,
      '_blank'
    );
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const runImport = async (dryRun: boolean) => {
    if (!csvText.trim()) {
      showNotification({
        type: 'warning',
        title: 'CSV required',
        message: 'Paste CSV or upload a file first',
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/history-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          csvText,
          dryRun,
          filename: filename || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
        showNotification({
          type: dryRun ? 'info' : 'success',
          title: dryRun ? 'Preview ready' : 'Import committed',
          message: data.message,
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Import failed',
          message: data.error || 'Unknown error',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Historical data migration"
        description="Import past months/years of spreadsheet data into the current schema. Always preview (dry-run) before committing."
        actions={
          <Link href="/admin/bulk-operations">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Bulk operations
            </Button>
          </Link>
        }
      />

      <Card className="border-amber-200 bg-amber-50">
        <div className="flex gap-3 p-1">
          <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Do this last</p>
            <p className="mt-1">
              Schema for Phases 1–4 and move-out inspection is stable. Importing
              earlier would force a re-migration. Match tenants/buildings by
              email or exact name before committing.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Import setup</h2>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Data type" htmlFor="importType">
            <Select
              id="importType"
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as HistoryImportType);
                setPreview(null);
              }}
            >
              {IMPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex items-end">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV template
            </Button>
          </div>
          <FormField label="Upload CSV" htmlFor="csvFile">
            <input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-gray-600"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </FormField>
        </div>
        <FormField label="CSV content" htmlFor="csvText">
          <Textarea
            id="csvText"
            rows={10}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setPreview(null);
            }}
            placeholder="Paste CSV here or upload a file…"
            className="font-mono text-xs mt-1"
          />
        </FormField>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void runImport(true)}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Preview (dry-run)
          </Button>
          <Button
            disabled={busy || !preview || preview.dryRun === false}
            onClick={() => void runImport(false)}
          >
            Commit import
          </Button>
        </div>
        {preview && preview.dryRun && preview.errorCount > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            Preview has {preview.errorCount} row error(s). You can still commit
            valid rows, or fix the CSV first.
          </p>
        )}
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {preview.dryRun ? 'Preview result' : 'Commit result'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {preview.rowCount} rows · {preview.validCount} valid ·{' '}
              {preview.errorCount} errors
              {preview.batchId ? ` · batch ${preview.batchId.slice(0, 8)}…` : ''}
            </p>
          </CardHeader>
          {preview.sample.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Sample mapped rows
              </h3>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(preview.sample, null, 2)}
              </pre>
            </div>
          )}
          {preview.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-700 mb-2">
                Row errors (first {preview.errors.length})
              </h3>
              <ul className="text-sm space-y-1">
                {preview.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`} className="text-red-700">
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
