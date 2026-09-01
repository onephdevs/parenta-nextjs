'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useNotifications } from '@/hooks/useNotifications';
import type { PipelineBoardSlug } from '@/types/database';

interface PipelineCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardSlug: PipelineBoardSlug;
  boardName: string;
  onImported: () => void;
}

const SAMPLE = `title,first_name,last_name,email,phone,amount,notes,tags,due_at,source,stage
Follow up rent,Maria,Santos,maria@example.com,09171234567,8000,Called twice,overdue,2026-09-15,CSV import,
`;

export default function PipelineCsvImportModal({
  isOpen,
  onClose,
  boardSlug,
  boardName,
  onImported,
}: PipelineCsvImportModalProps) {
  const { showNotification } = useNotifications();
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
  };

  const handleImport = async () => {
    if (!csv.trim()) {
      showNotification({
        type: 'error',
        title: 'No CSV',
        message: 'Choose a CSV file first.',
      });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/pipeline/cards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ boardSlug, csv }),
      });
      const data = await response.json();
      if (!data.success) {
        const extra = data.errors?.[0]?.message ? ` ${data.errors[0].message}` : '';
        throw new Error((data.error || 'Import failed') + extra);
      }
      const failed = Number(data.data?.failed || 0);
      showNotification({
        type: failed > 0 ? 'warning' : 'success',
        title: 'CSV imported',
        message:
          failed > 0
            ? `Imported ${data.data.imported} cards. ${failed} row(s) skipped.`
            : `Imported ${data.data.imported} cards onto ${boardName}.`,
      });
      setCsv('');
      setFileName('');
      onClose();
      onImported();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Import failed',
        message: error instanceof Error ? error.message : 'Could not import CSV',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Import CSV · ${boardName}`}
      description="Columns: title, first_name, last_name, email, phone, amount, notes, tags, due_at, source, stage. Max 200 rows."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleImport()} isLoading={saving}>
            Import
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => void handleFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-700"
        />
        {fileName ? (
          <p className="text-sm text-gray-600">Selected: {fileName}</p>
        ) : (
          <p className="text-sm text-gray-500">Or paste CSV below.</p>
        )}
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
          placeholder={SAMPLE}
        />
        <button
          type="button"
          className="text-sm font-medium text-indigo-600 hover:underline"
          onClick={() => setCsv(SAMPLE)}
        >
          Load sample row
        </button>
      </div>
    </Dialog>
  );
}
