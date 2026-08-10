'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotifications } from '@/hooks/useNotifications';
import type { EntityNoteType } from '@/lib/api/entity-notes';

export type NotesEntityType = EntityNoteType;

const ENTITY_TITLES: Record<NotesEntityType, string> = {
  tenant: 'Add tenant note',
  room: 'Add room note',
  building: 'Add property note',
  lease: 'Add lease note',
  payment: 'Add payment note',
  document: 'Add document note',
};

export interface EntityNoteItem {
  id: string;
  entityType: NotesEntityType;
  entityId: string;
  body: string;
  createdByUserId: string | null;
  createdByName: string | null;
  createdByRole?: string | null;
  createdAt: string;
}

export interface EntityNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: NotesEntityType;
  entityId: string;
  entityLabel?: string;
  onSaved?: (note: EntityNoteItem) => void;
}

/** Modal to append a new historical note (does not overwrite prior notes). */
export default function EntityNotesModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityLabel,
  onSaved,
}: EntityNotesModalProps) {
  const { showSuccess, showError } = useNotifications();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setBody('');
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      showError('Enter a note before saving');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/entity-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          body: trimmed,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save note');
      }
      showSuccess('Note added');
      onSaved?.(json.data as EntityNoteItem);
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={ENTITY_TITLES[entityType] || 'Add note'}
      description={
        entityLabel
          ? `Add a note for ${entityLabel}. Previous notes stay in the history.`
          : 'Add a note. Previous notes stay in the history.'
      }
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="entity-notes-form"
            isLoading={saving}
            leftIcon={<StickyNote className="h-4 w-4" />}
          >
            Add note
          </Button>
        </>
      }
    >
      <form id="entity-notes-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Note" htmlFor="note-body" required>
          <Textarea
            id="note-body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note…"
            required
            autoFocus
          />
        </FormField>
      </form>
    </Dialog>
  );
}

export interface AddNotesButtonProps {
  entityType: NotesEntityType;
  entityId: string;
  entityLabel?: string;
  label?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  leftIcon?: ReactNode;
  onSaved?: (note: EntityNoteItem) => void;
  renderTrigger?: (open: () => void) => ReactNode;
}

export function AddNotesButton({
  entityType,
  entityId,
  entityLabel,
  label = 'Add note',
  variant = 'outline',
  size = 'sm',
  className,
  leftIcon,
  onSaved,
  renderTrigger,
}: AddNotesButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true))
      ) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          leftIcon={leftIcon ?? <StickyNote className="h-3.5 w-3.5" />}
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
      )}
      <EntityNotesModal
        isOpen={open}
        onClose={() => setOpen(false)}
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
        onSaved={onSaved}
      />
    </>
  );
}

function formatNoteWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatAuthorName(name: string | null): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Unknown author';
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatAuthorRole(role: string | null | undefined): string | null {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return null;
  if (r === 'admin') return 'Admin';
  if (r === 'caretaker') return 'Caretaker';
  if (r === 'staff') return 'Staff';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export interface EntityNotesPanelProps {
  entityType: NotesEntityType;
  entityId: string;
  entityLabel?: string;
  title?: string;
  className?: string;
  /** Compact list without card chrome (for embedding). */
  compact?: boolean;
}

/** Historical notes list + add button for any supported entity. */
export function EntityNotesPanel({
  entityType,
  entityId,
  entityLabel,
  title = 'Notes',
  className,
  compact = false,
}: EntityNotesPanelProps) {
  const { showSuccess, showError } = useNotifications();
  const [notes, setNotes] = useState<EntityNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<EntityNoteItem | null>(null);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/entity-notes?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load notes');
      }
      setNotes(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (!noteToDelete) return;
    setDeletingId(noteToDelete.id);
    try {
      const res = await fetch(`/api/entity-notes/${noteToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete note');
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
      showSuccess('Note deleted');
      setNoteToDelete(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  const list = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <AddNotesButton
          entityType={entityType}
          entityId={entityId}
          entityLabel={entityLabel}
          label="Add note"
          onSaved={(note) => setNotes((prev) => [note, ...prev])}
        />
      </div>

      {loading ? (
        <p className="py-4 text-sm text-gray-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          No notes yet. Add the first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatAuthorName(note.createdByName)}
                    {formatAuthorRole(note.createdByRole) ? (
                      <span className="ml-1.5 font-normal text-gray-500">
                        · {formatAuthorRole(note.createdByRole)}
                      </span>
                    ) : null}
                  </p>
                  <time
                    className="text-xs text-gray-500"
                    dateTime={note.createdAt}
                    title={note.createdAt}
                  >
                    {formatNoteWhen(note.createdAt)}
                  </time>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => setNoteToDelete(note)}
                  isDisabled={deletingId === note.id}
                  aria-label="Delete note"
                >
                  Delete
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Delete note"
        message="Delete this note permanently? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={!!deletingId}
      />
    </>
  );

  if (compact) {
    return <div className={className}>{list}</div>;
  }

  return (
    <section
      className={
        className ||
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5'
      }
    >
      {list}
    </section>
  );
}
