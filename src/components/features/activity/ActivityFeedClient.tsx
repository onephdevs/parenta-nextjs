'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/forms/FormField';
import { ACTIVITY_CATEGORIES, CATEGORY_DEFAULTS } from '@/lib/services/activity-taxonomy';

interface ActivityItem {
  id: string;
  actorName: string;
  actionType: string;
  category: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  description: string;
  createdAt: string;
  link?: string | null;
}

interface ActivityDetail {
  id: string;
  description: string;
  actorName: string;
  actionType: string;
  category: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  link: string | null;
  createdAt: string;
  diffs: Array<{
    field: string;
    label: string;
    before: string;
    after: string;
    changed: boolean;
  }>;
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString();
}

function entityHref(item: { entityType: string; entityId: string | null; link?: string | null }) {
  if (item.link) return item.link;
  if (!item.entityId) return null;
  switch (item.entityType) {
    case 'tenant':
      return `/admin/tenants/${item.entityId}`;
    case 'building':
      return `/admin/buildings/${item.entityId}`;
    case 'room':
      return `/admin/rooms/${item.entityId}`;
    case 'payment':
      return `/admin/financial/payments/${item.entityId}`;
    case 'invoice':
      return `/admin/financial/invoices/${item.entityId}`;
    default:
      return null;
  }
}

export default function ActivityFeedClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get('id');

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [actionType, setActionType] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkId);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectActivity = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('id', id);
      else params.delete('id');
      const qs = params.toString();
      router.replace(qs ? `/admin/activity?${qs}` : '/admin/activity', { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (deepLinkId) setSelectedId(deepLinkId);
  }, [deepLinkId]);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (category) params.set('category', category);
      if (actionType) params.set('actionType', actionType);
      if (q.trim()) params.set('q', q.trim());
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/activity?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setTotal(data.data.pagination?.total || 0);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, actionType, q, from, to]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/activity/${selectedId}`, { credentials: 'include' });
        const data = await res.json();
        if (!cancelled && data.success) setDetail(data.data);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
        <p className="mt-1 text-sm text-gray-600">
          Chronological audit of meaningful changes across the app.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FormField label="Category" htmlFor="filter-category">
            <Select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
            >
              <option value="">All categories</option>
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_DEFAULTS[c].label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Action type" htmlFor="filter-action">
            <Input
              id="filter-action"
              value={actionType}
              onChange={(e) => {
                setPage(1);
                setActionType(e.target.value);
              }}
              placeholder="e.g. tenant.created"
            />
          </FormField>
          <FormField label="Search label" htmlFor="filter-q">
            <Input
              id="filter-q"
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Entity name"
            />
          </FormField>
          <FormField label="From" htmlFor="filter-from">
            <Input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
            />
          </FormField>
          <FormField label="To" htmlFor="filter-to">
            <Input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
            />
          </FormField>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
              {total} event{total === 1 ? '' : 's'}
            </div>
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-16 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No activity found"
                  description="Try clearing filters or perform an action in the app."
                />
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectActivity(item.id)}
                      className={`w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${
                        selectedId === item.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.description}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone="neutral" size="sm">
                              {CATEGORY_DEFAULTS[item.category as keyof typeof CATEGORY_DEFAULTS]
                                ?.label || item.category}
                            </Badge>
                            <span className="text-xs text-gray-500">{item.actionType}</span>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-gray-500">
                          {formatRelative(item.createdAt)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                isDisabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isDisabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>
            {!selectedId && (
              <p className="mt-3 text-sm text-gray-500">Select an activity entry to see changes.</p>
            )}
            {selectedId && detailLoading && (
              <div className="mt-4 h-40 animate-pulse rounded bg-gray-100" />
            )}
            {detail && !detailLoading && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{detail.description}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {detail.actorName} · {new Date(detail.createdAt).toLocaleString()}
                  </p>
                </div>
                {(detail.link || entityHref(detail)) && (
                  <Link
                    href={detail.link || entityHref(detail) || '#'}
                    className="text-sm font-medium text-purple-700 hover:underline"
                  >
                    Open related record
                  </Link>
                )}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Changes
                  </h3>
                  {detail.diffs.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">No field-level diff available.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {detail.diffs
                        .filter((d) => d.changed || !detail.diffs.some((x) => x.changed))
                        .slice(0, 40)
                        .map((d) => (
                          <li
                            key={d.field}
                            className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                          >
                            <p className="font-medium text-gray-900">{d.label}</p>
                            {d.changed ? (
                              <p className="mt-0.5 text-gray-700">
                                <span className="text-gray-500">{d.before}</span>
                                <span className="mx-1 text-gray-400">→</span>
                                <span>{d.after}</span>
                              </p>
                            ) : (
                              <p className="mt-0.5 text-gray-600">{d.after}</p>
                            )}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
