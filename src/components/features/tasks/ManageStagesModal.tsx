'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PipelineBoard, PipelineStage } from '@/types/database';

const COLOR_OPTIONS = [
  '#7c3aed',
  '#8b5cf6',
  '#6366f1',
  '#3b82f6',
  '#f59e0b',
  '#14b8a6',
  '#22c55e',
  '#ef4444',
  '#94a3b8',
];

interface ManageStagesModalProps {
  isOpen: boolean;
  board: PipelineBoard;
  onClose: () => void;
  onSaved: () => void;
}

export function ManageStagesModal({ isOpen, board, onClose, onSaved }: ManageStagesModalProps) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStages(board.stages.map((s) => ({ ...s })));
    setNewName('');
    setNewColor(COLOR_OPTIONS[board.stages.length % COLOR_OPTIONS.length] || COLOR_OPTIONS[0]);
    setError(null);
  }, [isOpen, board]);

  if (!isOpen) return null;

  async function persistOrder(next: PipelineStage[]) {
    setStages(next);
    const res = await fetch('/api/pipeline/stages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId: board.id,
        stageIds: next.map((s) => s.id),
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to reorder');
  }

  async function handleRename(stage: PipelineStage, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === stage.name) return;
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to rename');
      setStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, name: trimmed } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename stage');
    }
  }

  async function handleColor(stage: PipelineStage, color: string) {
    setError(null);
    try {
      const res = await fetch(`/api/pipeline/stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update color');
      setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, color } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update color');
    }
  }

  async function moveStage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= stages.length) return;
    const next = [...stages];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setError(null);
    try {
      await persistOrder(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
      setStages(board.stages.map((s) => ({ ...s })));
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/pipeline/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          name,
          color: newColor,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to add stage');
      setStages((prev) => [...prev, json.data.stage]);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stage');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(stage: PipelineStage) {
    if (stages.length <= 1) {
      setError('A board must keep at least one stage');
      return;
    }
    const others = stages.filter((s) => s.id !== stage.id);
    const moveTo = others[0]?.id;
    const hasCards = (stage.cardCount || 0) > 0;
    if (hasCards && !moveTo) {
      setError('Cannot delete the only stage with cards');
      return;
    }
    if (
      hasCards &&
      !window.confirm(
        `"${stage.name}" has ${stage.cardCount} card(s). Move them to "${others[0].name}" and delete?`
      )
    ) {
      return;
    }
    if (!hasCards && !window.confirm(`Delete stage "${stage.name}"?`)) {
      return;
    }

    setError(null);
    try {
      const qs = hasCards && moveTo ? `?moveCardsToStageId=${moveTo}` : '';
      const res = await fetch(`/api/pipeline/stages/${stage.id}${qs}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete');
      setStages((prev) => prev.filter((s) => s.id !== stage.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete stage');
    }
  }

  function handleDone() {
    onSaved();
    onClose();
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4 lg:pl-64">
      <div
        className="pointer-events-auto absolute inset-0 bg-gray-900/50 lg:left-64"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="pointer-events-auto relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit pipeline stages</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Customize columns for {board.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
            >
              <input
                type="color"
                value={stage.color}
                onChange={(e) => void handleColor(stage, e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                title="Stage color"
              />
              <Input
                defaultValue={stage.name}
                onBlur={(e) => void handleRename(stage, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="flex-1"
              />
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => void moveStage(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void moveStage(index, 1)}
                  disabled={index === stages.length - 1}
                  className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(stage)}
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                  aria-label="Delete stage"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-dashed border-gray-300 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Add stage
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Stage name"
                className="min-w-[10rem] flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
              <div className="flex items-center gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`h-6 w-6 rounded-full ring-offset-1 ${
                      newColor === c ? 'ring-2 ring-gray-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              <Button type="button" onClick={() => void handleAdd()} isDisabled={saving || !newName.trim()}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDone}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
