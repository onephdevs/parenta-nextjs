'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const tools = [
  {
    label: 'Scenario Analysis',
    href: '/admin/financial/reports',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    label: 'Forecast Model',
    href: '/admin/financial/reports',
    iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Sensitivity Analysis',
    href: '/admin/financial/reports',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    label: 'Custom Reports',
    href: '/admin/financial/reports',
    iconPath: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
  },
] as const;

export default function AnalyticsToolButtons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {tools.map((tool) => (
        <Link key={tool.label} href={tool.href}>
          <Button
            variant="outline"
            className="w-full"
            leftIcon={
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.iconPath} />
              </svg>
            }
          >
            {tool.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
