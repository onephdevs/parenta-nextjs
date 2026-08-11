'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Wallet,
  Home,
  Zap,
  Droplet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Users,
  Receipt,
  ChevronRight,
  Plus,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import type {
  ExpenseCategoryRow,
  PortfolioLedgerData,
  PropertyCardData,
  RentRollRow,
  RentRollStatus,
  WaterfallStep,
} from '@/lib/portfolio-ledger-types';

const NAVY = '#252A45';
const TEAL = '#39CCCC';

const peso = (n: number) =>
  `${n < 0 ? '-₱' : '₱'}${Math.abs(n).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const STATUS_STYLE: Record<
  RentRollStatus,
  { label: string; bg: string; text: string; ring: string }
> = {
  onTime: { label: 'On-time', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  late: { label: 'Late', bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
  vacant: { label: 'Vacant', bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-200' },
  newTenant: { label: 'New tenant', bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  atRisk: { label: 'At risk', bg: 'bg-rose-100', text: 'text-rose-800', ring: 'ring-rose-300' },
  moveOut: { label: 'Moved out', bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-200' },
};

function expenseIcon(key: string): LucideIcon {
  if (key === 'electricity') return Zap;
  if (key === 'water') return Droplet;
  if (key === 'staff_salary' || key === 'food_allowance') return Users;
  if (key === 'maintenance' || key === 'repair' || key === 'cleaning' || key === 'upgrade') return Home;
  if (key === 'refund' || key === 'garbage_collection') return Receipt;
  return Building2;
}

export default function PortfolioLedger() {
  const [scope, setScope] = useState('ALL');
  const [month, setMonth] = useState('');
  const [data, setData] = useState<PortfolioLedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (buildingId: string, monthKey: string, silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
        setError(null);
      }
      const params = new URLSearchParams();
      if (buildingId !== 'ALL') params.set('buildingId', buildingId);
      if (monthKey) params.set('month', monthKey);
      const res = await fetch(`/api/admin/dashboard/portfolio-ledger?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load ledger');
      setData(json.data);
      if (!monthKey && json.data?.monthKey) setMonth(json.data.monthKey);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load ledger');
        setData(null);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(scope, month);
    const interval = setInterval(() => void load(scope, month, true), 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(scope, month, true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load, scope, month]);

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!data) return null;

  const k = data.kpis;
  const expenseTotal = data.expenses.reduce((s, c) => s + c.value, 0) || 1;
  let running = 0;
  const runningTotals = data.waterfall.map((step) => {
    running += step.value;
    return running;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Portfolio overview</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-500" htmlFor="ledger-month">
              Billing period
            </label>
            <select
              id="ledger-month"
              value={month || data.monthKey}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm"
            >
              {(data.availableMonths.length > 0
                ? data.availableMonths
                : [{ value: data.monthKey, label: data.periodLabel }]
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-white p-1 ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setScope('ALL')}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                scope === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All properties
            </button>
            {data.buildings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setScope(b.id)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  scope === b.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {b.shortName}
              </button>
            ))}
          </div>
          <Link
            href="/admin/financial/payments/new"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
            style={{ background: NAVY }}
          >
            Record Payment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi
          icon={Wallet}
          label="Total collection"
          value={peso(k.collection)}
          sub={k.priorCollection ? `vs ${peso(k.priorCollection)} prior` : 'This period'}
          tone="ink"
        />
        <Kpi
          icon={Receipt}
          label="Operating expenses"
          value={peso(k.expenses)}
          sub={k.collection ? `${Math.round((k.expenses / k.collection) * 100)}% of collection` : 'This period'}
          tone="rose"
        />
        <Kpi
          icon={CheckCircle2}
          label="Net income"
          value={peso(k.netIncome)}
          sub="collection − expenses"
          tone="emerald"
        />
        <Kpi
          icon={Home}
          label="Occupancy"
          value={`${k.occupied} / ${k.totalUnits}`}
          sub={`${k.occupancyRate}% occupied`}
          tone="ink"
        />
        <Kpi
          icon={Clock}
          label="Late payment rate"
          value={`${k.lateRate}%`}
          sub={
            k.trackableUnits
              ? `${k.lateUnits} of ${k.trackableUnits} units late`
              : 'No trackable units'
          }
          tone="amber"
        />
      </div>

      <div className="relative overflow-hidden rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">Cash summary</div>
            <div className="text-xs text-slate-500">
              Same Grand Total line as the apartment records: collection, less expenses, plus deposits and cheques
            </div>
          </div>
          <span className="rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-500 ring-1 ring-slate-200">
            {data.periodLabel}
          </span>
        </div>
        <div className="flex flex-col items-stretch gap-0 md:flex-row md:gap-2">
          {data.waterfall.map((step, i) => (
            <WaterfallCell
              key={step.label}
              step={step}
              running={runningTotals[i]}
              showArrow={i < data.waterfall.length - 1}
            />
          ))}
          <div className="hidden items-center justify-center px-1 md:flex">
            <ArrowRight size={16} className="text-slate-300" />
          </div>
          <div className="flex-1 rounded-lg p-3.5 text-white" style={{ background: NAVY }}>
            <div className="mb-1.5 text-xs text-slate-300">Grand total</div>
            <div className="font-mono text-xl" style={{ color: TEAL }}>
              {peso(data.grandTotal)}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-slate-300">
              Cash left this period after expenses
            </div>
          </div>
        </div>
      </div>

      {data.properties.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.properties.map((p) => (
            <PropertyCard key={p.buildingId} property={p} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <RentRollTable rows={data.rentRoll} />
        <div className="flex flex-col gap-4">
          <ExpenseBreakdown rows={data.expenses} total={expenseTotal} />
          <UtilityRecovery rows={data.utilityRecovery} />
          {data.alerts.length > 0 && (
            <div className="rounded-xl p-5 ring-1 ring-rose-100" style={{ background: '#FDF4F3' }}>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-500" />
                <div className="text-base font-semibold text-rose-900">Needs attention</div>
              </div>
              <ul className="space-y-1.5 text-xs text-rose-800">
                {data.alerts.map((alert) => (
                  <li key={alert.id}>
                    {alert.href ? (
                      <Link href={alert.href} className="hover:underline">
                        • {alert.text}
                      </Link>
                    ) : (
                      <>• {alert.text}</>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WaterfallCell({
  step,
  running,
  showArrow,
}: {
  step: WaterfallStep;
  running: number;
  showArrow: boolean;
}) {
  return (
    <>
      <div className="flex-1 rounded-lg bg-slate-50/60 p-3.5 ring-1 ring-slate-200">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          {step.sign === '+' ? (
            <Plus size={12} className="text-emerald-600" />
          ) : (
            <Minus size={12} className="text-rose-500" />
          )}
          {step.label}
        </div>
        <div className={`font-mono text-lg ${step.sign === '+' ? 'text-emerald-700' : 'text-rose-600'}`}>
          {peso(step.value)}
        </div>
        <div className="mt-1 font-mono text-[11px] text-slate-400">running: {peso(running)}</div>
      </div>
      {showArrow && (
        <div className="hidden items-center justify-center px-1 md:flex">
          <ArrowRight size={16} className="text-slate-300" />
        </div>
      )}
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: 'ink' | 'emerald' | 'rose' | 'amber';
}) {
  const toneMap = { ink: NAVY, emerald: '#0F766E', rose: '#BE123C', amber: '#8A6A1F' };
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
        <Icon size={14} style={{ color: toneMap[tone] }} />
      </div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

function PropertyCard({ property }: { property: PropertyCardData }) {
  const occPct = property.totalUnits > 0 ? Math.round((property.occupied / property.totalUnits) * 100) : 0;
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-slate-900">{property.name}</div>
          <div className="text-xs text-slate-400">{property.totalUnits} units</div>
        </div>
        <span className="rounded-full px-2 py-1 font-mono text-xs text-slate-500 ring-1 ring-slate-200">
          {occPct}% occupied
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="font-mono text-sm text-emerald-700">{property.occupied}</div>
          <div className="text-[10px] text-slate-400">Occupied</div>
        </div>
        <div>
          <div className="font-mono text-sm text-rose-500">{property.vacant}</div>
          <div className="text-[10px] text-slate-400">Vacant</div>
        </div>
        <div>
          <div className="font-mono text-sm text-slate-700">{peso(property.collection)}</div>
          <div className="text-[10px] text-slate-400">Collected</div>
        </div>
        <div>
          <div className="font-mono text-sm text-amber-700">{property.avgDaysLate}d</div>
          <div className="text-[10px] text-slate-400">Avg. late ({property.lateRate}%)</div>
        </div>
      </div>
    </div>
  );
}

function RentRollTable({ rows }: { rows: RentRollRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <div className="text-lg font-semibold text-slate-900">Rent Roll</div>
        <Link href="/admin/properties" className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-700">
          View all units <ChevronRight size={13} />
        </Link>
      </div>
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Unit</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Due</th>
              <th className="px-2 py-2 font-medium">Paid</th>
              <th className="px-2 py-2 font-medium text-right">Amount</th>
              <th className="px-5 py-2 font-medium text-right">Utilities</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                  No units in this view
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const s = STATUS_STYLE[r.status];
                return (
                  <tr key={r.roomId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-2.5">
                      <Link href={r.href} className="font-medium text-slate-800 hover:underline">
                        {r.unit}
                      </Link>
                      <div className="text-[11px] text-slate-400">{r.shortName}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.bg} ${s.text} ${s.ring}`}
                      >
                        {s.label}
                        {r.daysLate != null && r.daysLate > 0 ? ` · ${r.daysLate}d` : ''}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs text-slate-500">{r.due || '—'}</td>
                    <td className="px-2 py-2.5 font-mono text-xs text-slate-500">{r.paidDate || '—'}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs text-slate-700">
                      {r.amount !== 0 ? peso(r.amount) : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right text-[11px] text-slate-400">
                      {r.elec != null || r.water != null ? (
                        <span className="inline-flex items-center justify-end gap-1 font-mono">
                          {r.elec != null && (
                            <>
                              <Zap size={10} />
                              {Math.round(r.elec)}
                            </>
                          )}
                          {r.elec != null && r.water != null ? ' · ' : ''}
                          {r.water != null && (
                            <>
                              <Droplet size={10} />
                              {Math.round(r.water)}
                            </>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseBreakdown({ rows, total }: { rows: ExpenseCategoryRow[]; total: number }) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="mb-3 text-lg font-semibold text-slate-900">Expense Breakdown</div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No expenses this period</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((c) => {
            const pct = Math.round((c.value / total) * 100);
            const Icon = expenseIcon(c.key);
            return (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Icon size={12} className="text-slate-400" /> {c.label}
                  </span>
                  <span className="font-mono text-slate-500">{peso(c.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: NAVY }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UtilityRecovery({ rows }: { rows: Array<PortfolioLedgerData['utilityRecovery'][number]> }) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="mb-1 text-lg font-semibold text-slate-900">Utility Cost Recovery</div>
      <div className="mb-3 text-xs text-slate-500">Sub-metered charges billed vs. the bulk bill received</div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No utility bills this period</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {rows.map((u) => {
            const short = u.billed > 0 && u.pct < 90;
            return (
              <div key={`${u.buildingId}-${u.type}`} className="rounded-lg p-2.5 ring-1 ring-slate-100">
                <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500">
                  {u.type === 'Electric' ? <Zap size={11} /> : <Droplet size={11} />}
                  {u.prop} · {u.type}
                </div>
                <div className={`font-mono text-base ${short ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {u.billed > 0 ? `${u.pct}%` : '—'}
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  {peso(u.recovered)} of {peso(u.billed)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
