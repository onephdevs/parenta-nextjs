'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AdvancedAnalyticsHeaderActions() {
  return (
    <div className="flex items-center space-x-3">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Real-time Data
      </span>
      <Link href="/admin/reports">
        <Button
          variant="outline"
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }
        >
          Export Analytics
        </Button>
      </Link>
    </div>
  );
}
