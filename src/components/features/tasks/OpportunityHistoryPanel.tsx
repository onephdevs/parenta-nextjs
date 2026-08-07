'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';

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

function changeLines(event: HistoryEvent): string[] {
  const fromMeta = Array.isArray(event.metadata?.changes)
    ? (event.metadata!.changes as unknown[]).filter(
        (c): c is string => typeof c === 'string' && c.trim().length > 0
      )
    : [];
  if (fromMeta.length > 0) return fromMeta;

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

function eventTitle(event: HistoryEvent, lines: string[]): string {
  switch (event.eventType) {
    case 'created':
      return 'Opportunity created';
    case 'assignee_changed':
      return lines[0] || 'Assignee updated';
    case 'stage_changed':
      if (event.fromStageName && event.toStageName) {
        return `Moved: ${event.fromStageName} → ${event.toStageName}`;
      }
      return lines[0] || 'Stage changed';
    case 'moved_to_board':
      return lines[0] || 'Moved to another board';
    case 'lease_generated':
      return lines[0] || 'Lease generated';
    case 'updated':
      if (lines.length === 1) return lines[0];
      if (lines.length > 1) return `${lines.length} fields updated`;
      return 'Updated';
    default:
      return lines[0] || event.eventType.replace(/_/g, ' ');
  }
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

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
        <History className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No history yet for this opportunity.</p>
      </div>
    );
  }

  return (
    <ul className="max-h-[28rem] space-y-0 overflow-y-auto border-l border-gray-200 pl-4">
      {events.map((event) => {
        const lines = changeLines(event);
        const title = eventTitle(event, lines);
        const showDetails =
          event.eventType === 'updated' &&
          lines.length > 1 &&
          lines.some((l) => l !== title);

        return (
          <li key={event.id} className="relative pb-4 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 shadow"
            />
            <p className="text-sm font-medium text-gray-900">{title}</p>
            {showDetails && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-700">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            <p className="mt-0.5 text-xs text-gray-500">
              {[event.actorName || 'System', formatWhen(event.createdAt)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {event.fromStageName &&
              event.toStageName &&
              event.eventType !== 'stage_changed' &&
              !title.includes(event.toStageName) && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {event.fromStageName} → {event.toStageName}
                </p>
              )}
          </li>
        );
      })}
    </ul>
  );
}
