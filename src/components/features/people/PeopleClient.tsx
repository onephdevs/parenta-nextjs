'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Home,
  Mail,
  Phone,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  DirectoryPerson,
  DirectoryPersonDetail,
  PersonBadge,
} from '@/lib/api/people';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cn } from '@/lib/utils';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';

interface PeopleStats {
  total: number;
  active: number;
  past: number;
  prospect: number;
  withPortal: number;
}

interface BuildingOption {
  id: string;
  name: string;
}

interface PeopleClientProps {
  initialPeople: DirectoryPerson[];
  initialTotal: number;
  initialStats: PeopleStats;
  buildings: BuildingOption[];
}

const BADGE_FILTERS: { value: PersonBadge | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active tenants' },
  { value: 'past', label: 'Past tenants' },
  { value: 'prospect', label: 'Prospects' },
];

function badgeLabel(badge: PersonBadge): string {
  switch (badge) {
    case 'active':
      return 'Active';
    case 'past':
      return 'Past';
    default:
      return 'Prospect';
  }
}

function badgeClass(badge: PersonBadge): string {
  switch (badge) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800';
    case 'past':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-amber-100 text-amber-900';
  }
}

function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim() || 'Unnamed';
}

function formatShort(date?: string | null) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PeopleClient({
  initialPeople,
  initialTotal,
  initialStats,
  buildings,
}: PeopleClientProps) {
  const [people, setPeople] = useState(initialPeople);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState('');
  const [badge, setBadge] = useState<PersonBadge | 'all'>('all');
  const [buildingId, setBuildingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DirectoryPersonDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (badge !== 'all') params.set('badge', badge);
      if (buildingId) params.set('buildingId', buildingId);
      params.set('limit', '300');
      const res = await fetch(`/api/people?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.success) {
        setPeople(json.data.people);
        setTotal(json.data.total);
        setStats(json.data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [search, badge, buildingId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadList();
    }, 250);
    return () => window.clearTimeout(t);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/people/${selectedId}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          setDetail(json.data as DirectoryPersonDetail);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedSummary = useMemo(
    () => people.find((p) => p.id === selectedId) || null,
    [people, selectedId]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-gray-50 lg:flex-row">
      <div className="flex min-h-0 w-full flex-col border-b border-gray-200 bg-white lg:w-[420px] lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-gray-100 px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900">People</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                All-time directory — status from current stays, not a stored flag.
              </p>
            </div>
            <AddTenantButton label="Add person" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'All', value: stats.total },
              { label: 'Active', value: stats.active },
              { label: 'Past', value: stats.past },
              { label: 'Prospect', value: stats.prospect },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {s.label}
                </p>
                <p className="mt-0.5 text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, unit…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {BADGE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setBadge(f.value)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  badge === f.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 focus:border-gray-900 focus:outline-none"
            aria-label="Filter by property"
          >
            <option value="">All properties</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-500">
            {loading ? 'Updating…' : `${total} ${total === 1 ? 'person' : 'people'}`}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {people.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">No people found</p>
              <p className="mt-1 text-xs text-gray-500">
                Try another search, or add someone from inquiry / tenants.
              </p>
            </div>
          ) : (
            <ul>
              {people.map((person) => {
                const active = selectedId === person.id;
                const place =
                  person.currentRoomNumber && person.currentBuildingName
                    ? `${person.currentRoomNumber} · ${person.currentBuildingName}`
                    : person.currentRoomNumber || person.currentBuildingName || null;
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(person.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors',
                        active ? 'bg-gray-100' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold uppercase text-white">
                        {person.firstName?.charAt(0) || '?'}
                        {person.lastName?.charAt(0) || ''}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {fullName(person)}
                          </p>
                          <span
                            className={cn(
                              'flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              badgeClass(person.badge)
                            )}
                          >
                            {badgeLabel(person.badge)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {person.phone || person.email || 'No contact'}
                        </p>
                        {place && (
                          <p className="mt-1 truncate text-xs text-gray-600">
                            <Home className="mr-1 inline h-3 w-3" />
                            {place}
                          </p>
                        )}
                        {!place && person.stayCount > 0 && (
                          <p className="mt-1 text-xs text-gray-400">
                            {person.stayCount} past stay
                            {person.stayCount === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
        {!selectedId && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-800">Select a person</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              View stay history and contacts. Ending a lease never deletes the person.
            </p>
          </div>
        )}

        {selectedId && detailLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">
            Loading person…
          </div>
        )}

        {selectedId && !detailLoading && detail && (
          <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900">{fullName(detail)}</h2>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      badgeClass(detail.badge)
                    )}
                  >
                    {badgeLabel(detail.badge)}
                  </span>
                  {detail.hasPortal && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                      Portal access
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  On file since {formatShort(detail.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-400 hover:bg-white hover:text-gray-900 lg:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/tenants/${detail.id}`}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:border-gray-900 hover:bg-gray-900 hover:text-white"
              >
                Open full profile
              </Link>
              {detail.badge !== 'active' && (
                <Link
                  href="/admin/properties"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  <UserPlus className="h-4 w-4" />
                  Find a unit to place them
                </Link>
              )}
              {detail.badge === 'active' && detail.currentRoomId && (
                <>
                  <Link
                    href={`/admin/properties?buildingId=${detail.currentBuildingId || ''}&roomId=${detail.currentRoomId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white"
                  >
                    <Home className="h-4 w-4" />
                    View unit
                  </Link>
                  <Link
                    href={`/admin/rooms/${detail.currentRoomId}`}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white"
                  >
                    Manage stay
                  </Link>
                </>
              )}
              <Link
                href={`/admin/financial/payments/new?tenantId=${detail.id}`}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white"
              >
                Record payment
              </Link>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Contacts</h3>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Phone
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {detail.phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Email
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 truncate text-sm text-gray-900">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {detail.email || '—'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Emergency
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {[detail.emergencyContactName, detail.emergencyContactPhone]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {detail.badge === 'active' && (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                <h3 className="text-sm font-bold text-emerald-900">Current place</h3>
                <p className="mt-2 text-base font-semibold text-gray-900">
                  {detail.currentRoomNumber || 'Unit'}
                  {detail.currentBuildingName ? ` · ${detail.currentBuildingName}` : ''}
                </p>
                {detail.currentMonthlyRent != null && (
                  <p className="mt-1 text-sm text-gray-700">
                    Rent {formatCurrency(detail.currentMonthlyRent)}
                  </p>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900">Stay history</h3>
                <span className="text-xs text-gray-500">
                  {detail.stays.length} record{detail.stays.length === 1 ? '' : 's'}
                </span>
              </div>
              {detail.stays.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  No unit stays yet. Place them in a room when they become a tenant.
                </p>
              ) : (
                <ol className="mt-4 space-y-0">
                  {detail.stays.map((stay, index) => {
                    const isActive =
                      stay.assignmentStatus === 'active' &&
                      (!stay.endDate || new Date(stay.endDate) >= new Date());
                    return (
                      <li
                        key={stay.id}
                        className="relative border-l border-gray-200 pb-5 pl-4 last:pb-0"
                      >
                        <span
                          className={cn(
                            'absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white',
                            isActive ? 'bg-emerald-500' : 'bg-gray-300'
                          )}
                        />
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {stay.roomNumber}
                              {stay.buildingName ? ` · ${stay.buildingName}` : ''}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatShort(stay.startDate)} –{' '}
                              {stay.endDate ? formatShort(stay.endDate) : 'Present'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              )}
                            >
                              {isActive ? 'Active' : stay.assignmentStatus}
                            </span>
                            <p className="mt-1 text-xs font-medium text-gray-900">
                              {formatCurrency(stay.monthlyRate)}
                            </p>
                          </div>
                        </div>
                        {index === 0 && stay.buildingId && (
                          <Link
                            href={`/admin/properties?buildingId=${stay.buildingId}`}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-700 underline-offset-2 hover:underline"
                          >
                            <Building2 className="h-3 w-3" />
                            Open property
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {selectedSummary && (
              <p className="text-center text-[11px] text-gray-400">
                Person records are kept forever. Ending a stay never deletes the person.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
