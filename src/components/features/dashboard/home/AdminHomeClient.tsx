'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Moon, Plus, Settings2, Sun } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotifications } from '@/hooks/useNotifications';
import type { NeedsAttentionCard } from '@/lib/services/needs-attention-service';
import {
  ACTIVITY_CATEGORIES,
  CATEGORY_DEFAULTS,
  type ActivityCategory,
} from '@/lib/services/activity-taxonomy';
import type { AdminHomeSticky } from '@/lib/admin-home-stickies-shared';
import {
  DEFAULT_WIDGETS,
  PINNED_LINKS_STORAGE_KEY,
  WIDGETS_STORAGE_KEY,
  formatHomeClock,
  greetingForHour,
  readJson,
  writeJson,
  type HomeWidgetVisibility,
  type PinnedQuickLink,
} from './home-utils';
import HomeQuickLinks from './HomeQuickLinks';
import HomeRecents from './HomeRecents';
import HomeStickies from './HomeStickies';
import PortfolioLedger from './PortfolioLedger';

const PIN_PRESETS: PinnedQuickLink[] = [
  { id: 'preset-properties', title: 'Properties', href: '/admin/properties' },
  { id: 'preset-tenants', title: 'Tenants', href: '/admin/tenants' },
  { id: 'preset-invoices', title: 'Invoices', href: '/admin/financial/invoices' },
  { id: 'preset-tasks', title: 'All tasks', href: '/admin/tasks' },
];

interface AdminHomeClientProps {
  firstName: string;
}

export default function AdminHomeClient({ firstName }: AdminHomeClientProps) {
  const { showError, showSuccess } = useNotifications();
  const [now, setNow] = useState(() => new Date());
  const [widgets, setWidgets] = useState<HomeWidgetVisibility>(DEFAULT_WIDGETS);
  const [pinned, setPinned] = useState<PinnedQuickLink[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinTitle, setPinTitle] = useState('');
  const [pinHref, setPinHref] = useState('');
  const [cards, setCards] = useState<NeedsAttentionCard[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [stickies, setStickies] = useState<AdminHomeSticky[]>([]);
  const [recentsFilter, setRecentsFilter] = useState<'all' | ActivityCategory>('all');
  const widgetsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWidgets({ ...DEFAULT_WIDGETS, ...readJson(WIDGETS_STORAGE_KEY, DEFAULT_WIDGETS) });
    setPinned(readJson(PINNED_LINKS_STORAGE_KEY, [] as PinnedQuickLink[]));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(WIDGETS_STORAGE_KEY, widgets);
  }, [hydrated, widgets]);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(PINNED_LINKS_STORAGE_KEY, pinned);
  }, [hydrated, pinned]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (!widgetsRef.current?.contains(e.target as Node)) setWidgetsOpen(false);
    };
    if (widgetsOpen) document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [widgetsOpen]);

  const loadAttention = useCallback(async () => {
    try {
      setAttentionLoading(true);
      const res = await fetch('/api/admin/dashboard/needs-attention', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load');
      setCards(json.data?.cards || []);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load quick links');
      setCards([]);
    } finally {
      setAttentionLoading(false);
    }
  }, [showError]);

  const loadStickies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/home/stickies', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load stickies');
      setStickies(json.data || []);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load stickies');
    }
  }, [showError]);

  useEffect(() => {
    void loadAttention();
    void loadStickies();
    const interval = setInterval(() => void loadAttention(), 60_000);
    return () => clearInterval(interval);
  }, [loadAttention, loadStickies]);

  const hour = now.getHours();
  const greeting = `${greetingForHour(hour)}, ${firstName || 'there'}.`;
  const isDay = hour >= 6 && hour < 18;

  const addSticky = async () => {
    try {
      const res = await fetch('/api/admin/home/stickies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to add sticky');
      setStickies((prev) => [json.data, ...prev]);
      setWidgets((prev) => ({ ...prev, stickies: true }));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add sticky');
    }
  };

  const addPinned = (link: PinnedQuickLink) => {
    setPinned((prev) => {
      if (prev.some((p) => p.href === link.href)) return prev;
      return [...prev, link];
    });
    setWidgets((prev) => ({ ...prev, quickLinks: true }));
    setPinOpen(false);
    setPinTitle('');
    setPinHref('');
    showSuccess('Quick link pinned');
  };

  const saveCustomPin = () => {
    const title = pinTitle.trim();
    const href = pinHref.trim();
    if (!title || !href) {
      showError('Title and link are required');
      return;
    }
    addPinned({
      id: `pin-${Date.now()}`,
      title,
      href: href.startsWith('/') || href.startsWith('http') ? href : `/${href}`,
    });
  };

  const railButton =
    'inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900';

  const filterOptions = useMemo(
    () => ACTIVITY_CATEGORIES.map((key) => ({ key, label: CATEGORY_DEFAULTS[key].label })),
    []
  );

  return (
    <div className="min-h-full bg-[#FAFBFC] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-2 lg:grid-cols-[minmax(0,1fr)_11.5rem]">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">{greeting}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            {isDay ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {formatHomeClock(now)}
          </p>
        </header>
        <div className="relative mb-6 flex items-start justify-end" ref={widgetsRef}>
          <button type="button" className={railButton} onClick={() => setWidgetsOpen((o) => !o)}>
            <Settings2 className="h-4 w-4" />
            Manage widgets
          </button>
          {widgetsOpen && (
            <div className="absolute right-0 top-8 z-20 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Visible on Home</p>
              {(
                [
                  ['quickLinks', 'Quick links'],
                  ['ledger', 'Portfolio ledger'],
                  ['recents', 'Recents'],
                  ['stickies', 'Your stickies'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={widgets[key]}
                    onChange={(e) => setWidgets((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>

        {widgets.quickLinks && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Quick links</h2>
            <div className="mb-3 flex items-start justify-end">
              <button type="button" className={railButton} onClick={() => setPinOpen(true)}>
                <Plus className="h-4 w-4" />
                Add quick link
              </button>
            </div>
            <div className="mb-10 lg:col-span-2">
              <HomeQuickLinks
                cards={cards}
                isLoading={attentionLoading}
                pinned={pinned}
                onRemovePinned={(id) => setPinned((prev) => prev.filter((p) => p.id !== id))}
              />
            </div>
          </>
        )}

        {widgets.ledger && (
          <div className="mb-10 lg:col-span-2">
            <PortfolioLedger />
          </div>
        )}

        {widgets.recents && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900">Recents</h2>
              <select
                value={recentsFilter}
                onChange={(e) =>
                  setRecentsFilter(
                    e.target.value === 'all' ? 'all' : (e.target.value as ActivityCategory)
                  )
                }
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 shadow-sm"
              >
                <option value="all">All activity</option>
                {filterOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-10 lg:col-span-2">
              <HomeRecents filter={recentsFilter} />
            </div>
          </>
        )}

        {widgets.stickies && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Your stickies</h2>
            <div className="mb-3 flex items-start justify-end">
              <button type="button" className={railButton} onClick={() => void addSticky()}>
                <Plus className="h-4 w-4" />
                Add sticky
              </button>
            </div>
            <div className="lg:col-span-2">
              <HomeStickies stickies={stickies} onChange={setStickies} />
            </div>
          </>
        )}
      </div>

      <Dialog
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        title="Add quick link"
        description="Pin a page you open often, or add a custom destination."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPinOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustomPin}>Pin link</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PIN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => addPinned(preset)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              >
                {preset.title}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
            <Input value={pinTitle} onChange={(e) => setPinTitle(e.target.value)} placeholder="Deposits report" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Link</label>
            <Input
              value={pinHref}
              onChange={(e) => setPinHref(e.target.value)}
              placeholder="/admin/reports/deposits"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
