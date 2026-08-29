'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  FileSignature,
  Home,
  Info,
  Plus,
} from 'lucide-react';
import type { PropertyBuildingReport } from '@/lib/api/properties';
import { getImageUrl } from '@/lib/format/image-url';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import { LightboxImage } from '@/components/ui/ImageLightbox';
import AppLoader from '@/components/ui/AppLoader';

const LATO = 'var(--font-lato), Lato, sans-serif';

interface PropertyReportPanelProps {
  buildingId: string;
  /** Refresh parent after creating a tenant from a unit card / fallback button. */
  onTenantCreated?: () => void;
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

export default function PropertyReportPanel({
  buildingId,
  onTenantCreated,
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

  const noInvoicesYet =
    !!report &&
    report.rent.unitsWithInvoices === 0 &&
    report.rent.totalRent <= 0 &&
    report.rent.rentCollected <= 0 &&
    report.rent.rentOutstanding <= 0;

  const occupiedDenom = report?.availability.occupied || 0;

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

  return (
    <div className="space-y-5" style={{ fontFamily: LATO }}>
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
          <AppLoader
            variant="inline"
            label="Loading…"
            size={72}
            className="min-h-[10rem] bg-transparent"
          />
        )}
        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {report && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(220px,0.9fr)_1.4fr]">
              {/* Left: legend / stats */}
              <div className="flex flex-col justify-center gap-7">
                <div className="flex items-start gap-3">
                  <span className="mt-2.5 h-3 w-3 flex-shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-base font-medium text-gray-800">Rent Outstanding</p>
                      <p className="text-right text-2xl font-bold text-red-600">
                        {formatCurrency(report.rent.rentOutstanding)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <p className="text-sm text-gray-500">
                        Units due:{' '}
                        <span className="font-semibold text-gray-700">
                          {report.rent.unitsWithInvoiceDue}/
                          {report.rent.unitsWithInvoices || occupiedDenom || 0}
                        </span>
                      </p>
                      <p className="text-sm text-gray-400">
                        {noInvoicesYet ? '—' : `${report.rent.unpaidPercent}%`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-2.5 h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-base font-medium text-gray-800">Rent Collected</p>
                      <p className="text-right text-2xl font-bold text-green-600">
                        {formatCurrency(report.rent.rentCollected)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <p className="text-sm text-gray-500">
                        Units paid:{' '}
                        <span className="font-semibold text-gray-700">
                          {report.rent.unitsWithInvoicePaid}/
                          {report.rent.unitsWithInvoices || occupiedDenom || 0}
                        </span>
                      </p>
                      <p className="text-sm text-gray-400">
                        {noInvoicesYet ? '—' : `${report.rent.collectedPercent}%`}
                      </p>
                    </div>
                  </div>
                </div>

                {!noInvoicesYet && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-gray-500">Total Rent</p>
                      <p className="text-base font-semibold text-indigo-700">
                        {formatCurrency(report.rent.totalRent)}
                      </p>
                    </div>
                    {report.rent.rentProcessing > 0 && (
                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <p className="text-sm text-gray-500">Processing</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatCurrency(report.rent.rentProcessing)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: chart */}
              <div className="min-h-[200px] w-full">
                <div className="relative h-[200px] w-full sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={noInvoicesYet ? 0 : 2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      {!noInvoicesYet && (
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs font-medium text-gray-500">{report.monthLabel}</p>
                    {!noInvoicesYet && (
                      <p className="mt-0.5 text-sm font-semibold text-gray-900">
                        {report.rent.collectedPercent}% collected
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {noInvoicesYet && (
              <div className="flex flex-wrap items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" />
                <p>
                  No invoices generated yet for {report.monthLabel} —{' '}
                  <Link
                    href="/admin/financial/invoices"
                    className="font-semibold text-sky-700 underline-offset-2 hover:underline"
                  >
                    view billing schedule →
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Availability */}
      {report && (
        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <p className="text-xs text-gray-500">Unassigned</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">
                {report.availability.unassigned}
                <span className="ml-1 text-sm font-medium text-orange-500">
                  ({report.availability.unassignedPercent}%)
                </span>
              </p>
            </div>
          </div>
          <p className="px-1 text-xs text-gray-500">
            {report.availability.totalUnits} total = {report.availability.occupied} occupied +{' '}
            {report.availability.vacant} vacant + {report.availability.unassigned} unassigned
            {report.availability.reconciles === false
              ? ' — reconciliation failed'
              : ''}
          </p>
        </section>
      )}

      {/* Vacancy duration & lost rent */}
      {report && report.vacantUnits && report.vacantUnits.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-base font-semibold text-gray-900">
            Vacant units — days vacant &amp; estimated lost rent
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2">Unit</th>
                  <th className="pb-2 text-right">Days vacant</th>
                  <th className="pb-2 text-right">Monthly rent</th>
                  <th className="pb-2 text-right">Est. lost rent</th>
                  <th className="pb-2 text-right">Owner utilities</th>
                </tr>
              </thead>
              <tbody>
                {report.vacantUnits.map((u) => (
                  <tr key={u.roomId} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-indigo-900">
                      <Link
                        href={`/admin/rooms/${u.roomId}`}
                        className="hover:underline"
                      >
                        {u.roomNumber}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums">{u.daysVacant}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(u.monthlyRate)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-amber-700">
                      {formatCurrency(u.estimatedLostRent)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(u.ownerAbsorbedUtility)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Lost rent = days vacant × (monthly rent ÷ 30). Owner utilities are
            vacant-unit provider charges (not tenant balance).
          </p>
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
                      <LightboxImage
                        src={getImageUrl(unit.imagePath)}
                        alt={unit.roomNumber}
                        title={unit.roomNumber}
                        wrapperClassName="block h-full w-full focus:outline-none"
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
                        {unit.roomNumber}
                      </p>
                      <span className="text-xs text-gray-500">
                        {unit.reason === 'awaiting_signature'
                          ? '0/1'
                          : unit.reason === 'unassigned'
                            ? 'Unassigned'
                            : 'Vacant'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatCurrency(unit.monthlyRate)}/mo
                    </p>
                    {unit.reason === 'awaiting_signature' ? (
                      <Link
                        href="/admin/tasks?board=onboarding"
                        className="mt-2 flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Send Reminder
                      </Link>
                    ) : (
                      <AddTenantButton
                        buildingId={buildingId}
                        roomId={unit.roomId}
                        lockHousing
                        redirectAfterCreate={false}
                        refreshOnCreated={false}
                        onCreated={() => onTenantCreated?.()}
                        renderTrigger={(open) => (
                          <button
                            type="button"
                            onClick={open}
                            className="mt-2 flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Tenant
                          </button>
                        )}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
