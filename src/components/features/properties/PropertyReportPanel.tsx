'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  FileSignature,
  Home,
  Plus,
  UserPlus,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { PropertyBuildingReport } from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import { Button } from '@/components/ui/Button';

const LATO = 'var(--font-lato), Lato, sans-serif';

interface PropertyReportPanelProps {
  buildingId: string;
  onAddTenant?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function monthOptions(count = 12): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({
      value,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
}

function UnitThumbs({
  thumbs,
  moreCount,
}: {
  thumbs: PropertyBuildingReport['rent']['dueUnitThumbs'];
  moreCount?: number;
}) {
  if (!thumbs.length && !moreCount) return null;
  return (
    <div className="mt-2 flex items-center gap-1.5">
      {thumbs.slice(0, 4).map((t) => (
        <div
          key={t.roomId}
          className="h-8 w-8 overflow-hidden rounded-md border border-white bg-gray-200 shadow-sm"
          title={t.roomNumber}
        >
          {t.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getImageUrl(t.imagePath)}
              alt={t.roomNumber}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-gray-600">
              {t.roomNumber.replace(/[^0-9]/g, '').slice(0, 2) || 'U'}
            </div>
          )}
        </div>
      ))}
      {(moreCount || 0) > 0 && (
        <span className="text-xs font-medium text-indigo-600">+ View {moreCount} more</span>
      )}
    </div>
  );
}

export default function PropertyReportPanel({
  buildingId,
  onAddTenant,
}: PropertyReportPanelProps) {
  const months = useMemo(() => monthOptions(12), []);
  const [month, setMonth] = useState(months[0]?.value || '');
  const [report, setReport] = useState<PropertyBuildingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/buildings/${encodeURIComponent(buildingId)}/report?month=${encodeURIComponent(month)}`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load report');
        }
        if (!cancelled) setReport(json.data as PropertyBuildingReport);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : 'Failed to load report');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (buildingId && month) void load();
    return () => {
      cancelled = true;
    };
  }, [buildingId, month]);

  const pieData = useMemo(() => {
    if (!report) return [];
    const collected = Math.max(report.rent.rentCollected, 0);
    const outstanding = Math.max(report.rent.rentOutstanding, 0);
    if (collected + outstanding <= 0) {
      return [{ name: 'No data', value: 1, color: '#E5E7EB' }];
    }
    return [
      { name: 'Collected', value: collected, color: '#22C55E' },
      { name: 'Unpaid', value: outstanding, color: '#EF4444' },
    ];
  }, [report]);

  const categoryData = useMemo(() => {
    if (!report) return [];
    return report.maintenance.byCategory.map((c) => ({
      name: c.category.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase()),
      count: c.count,
    }));
  }, [report]);

  return (
    <div className="space-y-5" style={{ fontFamily: LATO }}>
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/financial/payments/new">
          <Button leftIcon={<Wallet className="h-4 w-4" />}>Record Payment</Button>
        </Link>
        {onAddTenant ? (
          <Button
            type="button"
            variant="outline"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={onAddTenant}
          >
            Add Tenant
          </Button>
        ) : (
          <Link href={`/admin/tenants/new?buildingId=${encodeURIComponent(buildingId)}`}>
            <Button variant="outline" leftIcon={<UserPlus className="h-4 w-4" />}>
              Add Tenant
            </Button>
          </Link>
        )}
        <Link href={`/admin/maintenance?buildingId=${encodeURIComponent(buildingId)}`}>
          <Button variant="ghost" leftIcon={<Wrench className="h-4 w-4" />}>
            Maintenance
          </Button>
        </Link>
      </div>

      {/* Collection of Rent */}
      <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">
            Collection of Rent
            {report ? ` — ${report.monthLabel.split(' ')[0]}` : ''}
          </h3>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show by</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && (
          <div className="flex h-40 items-center justify-center text-sm text-gray-500">
            Loading collection…
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {report && !loading && (
          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Outstanding */}
            <div className="space-y-2 text-left">
              <p className="text-sm text-gray-500">Rent Outstanding</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(report.rent.rentOutstanding)}
              </p>
              <p className="text-4xl font-bold leading-none text-red-600">
                {report.rent.unpaidPercent}%
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Unpaid
              </p>
              <p className="text-sm text-gray-600">
                Units with Invoices Due{' '}
                <span className="font-semibold text-gray-900">
                  {report.rent.unitsWithInvoiceDue}/{report.rent.unitsWithInvoices || report.availability.occupied || 0}
                </span>
              </p>
              <UnitThumbs
                thumbs={report.rent.dueUnitThumbs}
                moreCount={Math.max(
                  0,
                  report.rent.unitsWithInvoiceDue - report.rent.dueUnitThumbs.length
                )}
              />
            </div>

            {/* Pie */}
            <div className="mx-auto w-full max-w-[220px]">
              <div className="relative h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xs font-medium text-gray-500">{report.monthLabel}</p>
                </div>
              </div>
              <p className="mt-1 text-center text-sm text-gray-600">
                Rent Processing:{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(report.rent.rentProcessing)}
                </span>
              </p>
              <p className="text-center text-sm font-semibold text-indigo-700">
                Total Rent: {formatCurrency(report.rent.totalRent)}
              </p>
            </div>

            {/* Collected */}
            <div className="space-y-2 text-left lg:text-right">
              <p className="text-4xl font-bold leading-none text-green-600">
                {report.rent.collectedPercent}%
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Collected
              </p>
              <p className="text-sm text-gray-500">Rent Collected</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(report.rent.rentCollected)}
              </p>
              <p className="text-sm text-gray-600">
                Units with Invoices Paid{' '}
                <span className="font-semibold text-gray-900">
                  {report.rent.unitsWithInvoicePaid}/{report.rent.unitsWithInvoices || report.availability.occupied || 0}
                </span>
              </p>
              <div className="flex lg:justify-end">
                <UnitThumbs
                  thumbs={report.rent.paidUnitThumbs}
                  moreCount={Math.max(
                    0,
                    report.rent.unitsWithInvoicePaid - report.rent.paidUnitThumbs.length
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Availability */}
      {report && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Total units</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {report.availability.totalUnits}
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Occupied</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              {report.availability.occupied}
              <span className="ml-1 text-sm font-medium text-blue-500">
                ({report.availability.occupiedPercent}%)
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Vacant</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {report.availability.vacant}
              <span className="ml-1 text-sm font-medium text-emerald-500">
                ({report.availability.vacantPercent}%)
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">Availability</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {report.availability.vacant} vacant · {report.availability.occupied} occupied
            </p>
          </div>
        </section>
      )}

      {/* Unsigned / unassigned */}
      {report && (
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">
              Unassigned units & unsigned leases
            </h3>
          </div>
          {report.unsignedUnits.length === 0 ? (
            <p className="text-sm text-gray-500">All units are assigned with no pending leases.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {report.unsignedUnits.map((unit) => (
                <div
                  key={`${unit.reason}-${unit.roomId}`}
                  className="w-40 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                >
                  <div className="relative h-24 bg-gray-200">
                    {unit.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(unit.imagePath)}
                        alt={unit.roomNumber}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        <Home className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <p className="truncate text-sm font-semibold text-indigo-900">
                        Unit {unit.roomNumber}
                      </p>
                      <span className="text-xs text-gray-500">
                        {unit.reason === 'awaiting_signature' ? '0/1' : 'Vacant'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatCurrency(unit.monthlyRate)}/mo
                    </p>
                    <Link
                      href={
                        unit.reason === 'awaiting_signature'
                          ? '/admin/tasks?board=onboarding'
                          : `/admin/tenants/new?buildingId=${encodeURIComponent(buildingId)}&roomId=${encodeURIComponent(unit.roomId)}`
                      }
                      className="mt-2 flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      {unit.reason === 'awaiting_signature' ? 'Send Reminder' : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Add Tenant
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Maintenance */}
      {report && (
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">Open Maintenance Requests</h3>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-emerald-700">
                {report.maintenance.newRequests}
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-800">New Requests</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-5 text-center">
              <p className="text-3xl font-bold text-red-600">
                {report.maintenance.urgentRequests}
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-sm font-medium text-red-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Urgent Requests
              </p>
            </div>
          </div>
          <p className="mb-2 text-sm font-semibold text-indigo-900">By Category</p>
          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No open maintenance requests</p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#93C5FD" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
