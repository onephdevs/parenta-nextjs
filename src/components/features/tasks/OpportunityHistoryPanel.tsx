'use client';

import { useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';

interface HistoryFieldChange {
  field: string;
  label: string;
  from: string | string[] | null;
  to: string | string[] | null;
  added?: string[];
  removed?: string[];
  summary: string;
}

interface HistoryEvent {
  id: string;
  eventType: string;
  summary: string;
  note?: string;
  metadata?: Record<string, unknown>;
  actorName?: string;
  createdAt: string;
  fromStageName?: string;
  toStageName?: string;
}

interface DisplayEvent extends HistoryEvent {
  /** Collapsed count for consecutive detail-less tag updates */
  collapsedCount?: number;
}

interface OpportunityHistoryPanelProps {
  cardId: string;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function displayValue(value: string | string[] | null | undefined): string {
  if (value == null) return '(cleared)';
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '(cleared)';
  }
  const trimmed = String(value).trim();
  return trimmed || '(cleared)';
}

function parseFieldChanges(metadata?: Record<string, unknown>): HistoryFieldChange[] {
  const raw = metadata?.fields;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === 'string' ? row.label : null;
      const field = typeof row.field === 'string' ? row.field : 'field';
      const summary = typeof row.summary === 'string' ? row.summary : '';
      if (!label && !summary) return null;
      const from =
        Array.isArray(row.from) || typeof row.from === 'string' || row.from === null
          ? (row.from as string | string[] | null)
          : null;
      const to =
        Array.isArray(row.to) || typeof row.to === 'string' || row.to === null
          ? (row.to as string | string[] | null)
          : null;
      const added = Array.isArray(row.added)
        ? row.added.filter((t): t is string => typeof t === 'string')
        : undefined;
      const removed = Array.isArray(row.removed)
        ? row.removed.filter((t): t is string => typeof t === 'string')
        : undefined;
      return {
        field,
        label: label || field,
        from,
        to,
        added,
        removed,
        summary: summary || `${label || field} updated`,
      } satisfies HistoryFieldChange;
    })
    .filter((c): c is HistoryFieldChange => Boolean(c));
}

function legacyChangeLines(event: HistoryEvent): string[] {
  const fromMeta = Array.isArray(event.metadata?.changes)
    ? (event.metadata!.changes as unknown[]).filter(
        (c): c is string => typeof c === 'string' && c.trim().length > 0
      )
    : [];
  if (fromMeta.length > 0) return fromMeta;

  const note = event.note?.trim() || '';
  if (note && note !== 'Opportunity updated') return note.includes('; ')
    ? note.split('; ').map((s) => s.trim()).filter(Boolean)
    : [note];

  const summary = event.summary?.trim() || '';
  if (!summary) return [];
  if (summary.includes('; ')) {
    return summary
      .split('; ')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [summary];
}

function parseLegacyLine(line: string): HistoryFieldChange | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const tagsDetailed = trimmed.match(
    /^Tags:\s*(.+?)\s*\(was\s+(.+?)\s+→\s+now\s+(.+)\)$/i
  );
  if (tagsDetailed) {
    const detail = tagsDetailed[1];
    const addedMatch = detail.match(/added\s+([^;]+)/i);
    const removedMatch = detail.match(/removed\s+([^;]+)/i);
    const added = addedMatch
      ? addedMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const removed = removedMatch
      ? removedMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return {
      field: 'tags',
      label: 'Tags',
      from:
        tagsDetailed[2] === '(none)'
          ? []
          : tagsDetailed[2].split(',').map((s) => s.trim()),
      to:
        tagsDetailed[3] === '(none)'
          ? []
          : tagsDetailed[3].split(',').map((s) => s.trim()),
      added,
      removed,
      summary: trimmed,
    };
  }

  const tagsArrow = trimmed.match(/^Tags\s+(.+?)\s+→\s+(.+)$/i);
  if (tagsArrow) {
    const fromList =
      tagsArrow[1] === '(none)'
        ? []
        : tagsArrow[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    const toList =
      tagsArrow[2] === '(none)'
        ? []
        : tagsArrow[2]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    const fromKeys = new Set(fromList.map((t) => t.toLowerCase()));
    const toKeys = new Set(toList.map((t) => t.toLowerCase()));
    return {
      field: 'tags',
      label: 'Tags',
      from: fromList,
      to: toList,
      added: toList.filter((t) => !fromKeys.has(t.toLowerCase())),
      removed: fromList.filter((t) => !toKeys.has(t.toLowerCase())),
      summary: trimmed,
    };
  }

  // Old generic tag events — no reconstructable values
  if (/^tags updated$/i.test(trimmed)) {
    return null;
  }

  const arrow = trimmed.match(/^(.+?):\s*(.+?)\s+→\s+(.+)$/);
  if (arrow) {
    return {
      field: arrow[1].toLowerCase().replace(/\s+/g, '_'),
      label: arrow[1],
      from: arrow[2],
      to: arrow[3],
      summary: trimmed,
    };
  }

  const arrowLoose = trimmed.match(
    /^(Title|Email|Phone|Building|Room|Amount|Source|Due date|Next follow-up|Viewing|Screening|Lease status|Lease start|Lease end|Move-in date|Deposit|Advance|Move-in payment|Payment method|Contact renamed|Follow-up notes)\s+(.+?)\s+→\s+(.+)$/i
  );
  if (arrowLoose) {
    const label = arrowLoose[1].replace(/^Contact renamed$/i, 'Contact');
    return {
      field: label.toLowerCase().replace(/\s+/g, '_'),
      label,
      from: arrowLoose[2],
      to: arrowLoose[3],
      summary: trimmed,
    };
  }

  // Skip other generic one-word "updated" noise without values
  if (/^(opportunity )?updated$/i.test(trimmed)) return null;

  return {
    field: 'change',
    label: 'Change',
    from: null,
    to: null,
    summary: trimmed,
  };
}

function resolveFieldChanges(event: HistoryEvent): HistoryFieldChange[] {
  const structured = parseFieldChanges(event.metadata);
  if (structured.length > 0) return structured.filter(hasUsefulDiff);
  return legacyChangeLines(event)
    .map(parseLegacyLine)
    .filter((c): c is HistoryFieldChange => Boolean(c))
    .filter(hasUsefulDiff);
}

function hasUsefulDiff(change: HistoryFieldChange): boolean {
  if (change.added?.length || change.removed?.length) return true;
  if (Array.isArray(change.from) || Array.isArray(change.to)) {
    // Empty arrays still count as a known previous/now state
    return change.from != null || change.to != null;
  }
  if (change.from != null || change.to != null) return true;
  // Summary-only with no values — not useful as a detail card
  return false;
}

function isVagueTagsOnlyEvent(event: HistoryEvent): boolean {
  if (event.eventType !== 'updated') return false;
  if (resolveFieldChanges(event).length > 0) return false;
  const lines = legacyChangeLines(event);
  if (lines.length === 0) {
    return /^tags updated$/i.test(event.note || '') || /^tags updated$/i.test(event.summary || '');
  }
  return lines.every((l) => /^tags updated$/i.test(l.trim()));
}

/** Merge consecutive detail-less "Tags updated" spam into one row. */
function collapseHistoryEvents(events: HistoryEvent[]): DisplayEvent[] {
  const out: DisplayEvent[] = [];
  for (const event of events) {
    const prev = out[out.length - 1];
    if (prev && isVagueTagsOnlyEvent(prev) && isVagueTagsOnlyEvent(event)) {
      prev.collapsedCount = (prev.collapsedCount || 1) + 1;
      continue;
    }
    out.push({ ...event, collapsedCount: isVagueTagsOnlyEvent(event) ? 1 : undefined });
  }
  return out;
}

function eventTitle(event: DisplayEvent, fields: HistoryFieldChange[]): string {
  if (isVagueTagsOnlyEvent(event)) {
    const n = event.collapsedCount || 1;
    return n > 1 ? `Tags updated (${n} times)` : 'Tags updated';
  }

  switch (event.eventType) {
    case 'created':
      return 'Opportunity created';
    case 'assignee_changed':
      return fields[0]?.summary || 'Assignee updated';
    case 'stage_changed':
      if (event.fromStageName && event.toStageName) {
        return `Moved: ${event.fromStageName} → ${event.toStageName}`;
      }
      return 'Stage changed';
    case 'moved_to_board':
      return fields[0]?.summary || 'Moved to another board';
    case 'lease_generated':
      return 'Lease generated';
    case 'updated': {
      if (fields.length === 1) {
        const only = fields[0];
        if (only.field === 'tags') return 'Tags updated';
        return `${only.label} updated`;
      }
      if (fields.length > 1) return `${fields.length} fields updated`;
      return event.summary && !/^tags updated$/i.test(event.summary)
        ? event.summary
        : 'Updated';
    }
    default:
      return fields[0]?.summary || event.eventType.replace(/_/g, ' ');
  }
}

function FieldChangeDetails({ change }: { change: HistoryFieldChange }) {
  const fromText = displayValue(change.from);
  const toText = displayValue(change.to);

  return (
    <div className="text-sm">
      <p className="font-medium text-gray-900">{change.label}</p>
      {(change.added?.length || change.removed?.length) ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {change.added?.map((tag) => (
            <span
              key={`add-${tag}`}
              className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
            >
              + {tag}
            </span>
          ))}
          {change.removed?.map((tag) => (
            <span
              key={`rem-${tag}`}
              className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-600/20 line-through"
            >
              − {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-0.5 text-xs text-gray-500">
          {fromText} → {toText}
        </p>
      )}
    </div>
  );
}

export function OpportunityHistoryPanel({ cardId }: OpportunityHistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pipeline/cards/${cardId}/events`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load history');
        }
        if (!cancelled) setEvents(json.data.events || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load history');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const displayEvents = useMemo(() => collapseHistoryEvents(events), [events]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (displayEvents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
        <History className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No history yet for this opportunity.</p>
      </div>
    );
  }

  return (
    <ul className="max-h-[28rem] space-y-0 overflow-y-auto border-l border-gray-200 pl-4">
      {displayEvents.map((event) => {
        const fields = resolveFieldChanges(event);
        const vagueTags = isVagueTagsOnlyEvent(event);
        const actorLine = [
          event.actorName ? `by ${event.actorName}` : 'by System',
          formatWhen(event.createdAt),
        ]
          .filter(Boolean)
          .join(' · ');

        // Field updates + assignee changes: one timeline row per field
        if (
          (event.eventType === 'updated' || event.eventType === 'assignee_changed') &&
          fields.length > 0 &&
          !vagueTags
        ) {
          return fields.map((change, idx) => (
            <li
              key={`${event.id}-${change.field}-${idx}`}
              className="relative pb-5 last:pb-0"
            >
              <span
                aria-hidden
                className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 shadow"
              />
              <p className="text-sm font-medium text-gray-900">{change.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{actorLine}</p>
              {change.added?.length || change.removed?.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {change.added?.map((tag) => (
                    <span
                      key={`add-${tag}`}
                      className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                    >
                      + {tag}
                    </span>
                  ))}
                  {change.removed?.map((tag) => (
                    <span
                      key={`rem-${tag}`}
                      className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-600/20 line-through"
                    >
                      − {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-0.5 text-xs text-gray-500">
                  {displayValue(change.from)} → {displayValue(change.to)}
                </p>
              )}
            </li>
          ));
        }

        const title = eventTitle(event, fields);

        return (
          <li key={event.id} className="relative pb-5 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 shadow"
            />
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="mt-0.5 text-xs text-gray-500">{actorLine}</p>
            {vagueTags ? (
              <p className="mt-0.5 text-xs text-gray-500">
                Older edit — previous and new tag values were not saved.
              </p>
            ) : fields.length > 0 ? (
              <div className="mt-2 space-y-3">
                {fields.map((change, idx) => (
                  <FieldChangeDetails
                    key={`${event.id}-${change.field}-${idx}`}
                    change={change}
                  />
                ))}
              </div>
            ) : null}
            {event.fromStageName &&
              event.toStageName &&
              event.eventType !== 'stage_changed' &&
              !title.includes(event.toStageName) && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {event.fromStageName} → {event.toStageName}
                </p>
              )}
          </li>
        );
      })}
    </ul>
  );
}
