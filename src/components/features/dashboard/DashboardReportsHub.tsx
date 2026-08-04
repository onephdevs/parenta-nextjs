'use client';

import Link from 'next/link';
import {
  Users,
  BarChart3,
  Lock,
  DoorOpen,
  ArrowRight,
} from 'lucide-react';

const REPORTS = [
  {
    title: 'Tenant balances',
    description: 'Name, room, balance, status',
    href: '/admin/reports/tenant-list',
    icon: Users,
    iconWrap: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Collections',
    description: 'Monthly / quarterly / annual',
    href: '/admin/reports/collected-amount',
    icon: BarChart3,
    iconWrap: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Deposits received',
    description: 'Monthly / 6-mo / annual',
    href: '/admin/reports/deposits',
    icon: Lock,
    iconWrap: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Vacant units',
    description: 'List by property',
    href: '/admin/reports/vacant-rooms',
    icon: DoorOpen,
    iconWrap: 'bg-amber-50 text-amber-600',
  },
] as const;

/**
 * Dashboard Reports hub — visually separate from monitoring.
 * Opens existing report pages (pick range → preview → export there).
 */
export default function DashboardReportsHub() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            Pick a report and date range, preview the numbers, then export Excel or PDF.
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          All reports <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <span
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${report.iconWrap}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">
                {report.title}
              </h4>
              <p className="mt-1 flex-1 text-xs text-gray-500">{report.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-medium text-blue-600">
                Preview & export
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
