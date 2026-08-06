'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import type { BuiltInPipelineBoardSlug, PipelineBoardSlug } from '@/types/database';

const SUGGESTED_TAGS: Record<BuiltInPipelineBoardSlug, string[]> = {
  onboarding: [
    'Hot lead',
    'Docs complete',
    'Awaiting ID',
    'Awaiting income proof',
    'BG pending',
    'Lease out',
    'Budget concern',
    'Referral',
    'Call back',
    'Viewing scheduled',
  ],
  payments: ['Payment plan', 'Chronically late', 'Partial payment', 'Reminder due', 'Escalated'],
  expenses: ['Recurring', 'Needs receipt', 'Urgent', 'Pending vendor', 'Reconcile'],
  maintenance: ['Urgent', 'Parts ordered', 'Vendor scheduled', 'Waiting on tenant', 'Recurring issue'],
};

const DEFAULT_SUGGESTED = ['Follow up', 'Urgent', 'Waiting', 'Blocked'];

interface OpportunityTagsFieldProps {
  boardSlug: PipelineBoardSlug;
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function OpportunityTagsField({ boardSlug, tags, onChange }: OpportunityTagsFieldProps) {
  const [draft, setDraft] = useState('');
  const suggested =
    SUGGESTED_TAGS[boardSlug as BuiltInPipelineBoardSlug] || DEFAULT_SUGGESTED;

  function normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  function addTag(raw: string) {
    const value = normalize(raw);
    if (!value) return;
    const exists = tags.some((t) => t.toLowerCase() === value.toLowerCase());
    if (exists) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function toggleSuggested(tag: string) {
    const exists = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) {
      onChange(tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
    } else {
      onChange([...tags, tag]);
    }
  }

  return (
    <div className="space-y-5">
      <FormField
        label="Tags"
        htmlFor="opp-tag-input"
        hint="Use tags to track status or follow-ups (e.g. Docs complete, Awaiting ID)."
      >
        <div className="flex gap-2">
          <Input
            id="opp-tag-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(draft.replace(/,/g, ''));
              }
            }}
            placeholder="Type a tag and press Enter"
          />
          <button
            type="button"
            onClick={() => addTag(draft)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </FormField>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-800"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {suggested.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Suggested
          </p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((tag) => {
              const selected = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSuggested(tag)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
