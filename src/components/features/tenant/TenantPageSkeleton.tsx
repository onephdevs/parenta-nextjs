'use client';

import { cn } from '@/lib/utils';
import { useTenantTheme } from '@/hooks/useTenantTheme';

/** Pulse bar matching current tenant theme */
export function TenantBone({ className }: { className?: string }) {
  const theme = useTenantTheme();
  return <div className={cn(theme.bone, className)} />;
}

function MetricCardSkeleton() {
  const theme = useTenantTheme();
  return (
    <div className={cn(theme.card, 'p-5')}>
      <div className="flex items-center gap-4">
        <TenantBone className="h-6 w-6 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <TenantBone className="h-3 w-20" />
          <TenantBone className="h-5 w-28" />
        </div>
      </div>
    </div>
  );
}

export function TenantPageSkeleton({
  variant = 'default',
}: {
  variant?: 'home' | 'payments' | 'profile' | 'documents' | 'list' | 'default';
}) {
  const theme = useTenantTheme();

  if (variant === 'home') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <TenantBone className="h-9 w-56" />
          <TenantBone className="h-4 w-40" />
        </div>
        <TenantBone className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={cn(theme.cardPad, 'space-y-3')}>
            <TenantBone className="h-3 w-16" />
            <TenantBone className="h-4 w-full" />
            <TenantBone className="h-4 w-3/4" />
          </div>
          <div className={cn(theme.cardPad, 'space-y-3')}>
            <TenantBone className="h-3 w-24" />
            <TenantBone className="h-8 w-32" />
            <TenantBone className="h-3 w-48" />
          </div>
        </div>
        <div>
          <TenantBone className="mb-3 h-4 w-28" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn(theme.card, 'space-y-3 p-4')}>
                <TenantBone className="h-5 w-5" />
                <TenantBone className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn(theme.cardPad, 'space-y-3')}>
            <TenantBone className="h-4 w-32" />
            <TenantBone className="h-3 w-full" />
            <TenantBone className="h-3 w-2/3" />
          </div>
          <div className={cn(theme.cardPad, 'space-y-3')}>
            <TenantBone className="h-4 w-40" />
            <TenantBone className="h-3 w-full" />
            <TenantBone className="h-8 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'payments') {
    return (
      <div className={theme.pagePad}>
        <TenantBone className="h-8 w-36" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <TenantBone key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <MetricCardSkeleton key={`hold-${i}`} />
          ))}
        </div>
        <div className={cn(theme.cardPad, 'space-y-3')}>
          <TenantBone className="h-5 w-40" />
          <TenantBone className="h-4 w-full" />
          <TenantBone className="h-4 w-full" />
          <TenantBone className="h-4 w-3/4" />
          <div className="flex justify-end pt-2">
            <TenantBone className="h-10 w-28 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className={theme.pagePad}>
        <div className="space-y-2">
          <TenantBone className="h-8 w-28" />
          <TenantBone className="h-4 w-64" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <TenantBone key={i} className="h-8 w-32 rounded-full" />
          ))}
        </div>
        <div className={cn(theme.panel, 'space-y-4 p-6')}>
          <TenantBone className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <TenantBone className="h-3 w-20" />
                <TenantBone className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <TenantBone className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'documents') {
    return (
      <div className={theme.pagePad}>
        <div className="space-y-2">
          <TenantBone className="h-8 w-36" />
          <TenantBone className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(theme.card, 'space-y-2 p-4 text-center')}>
              <TenantBone className="mx-auto h-3 w-16" />
              <TenantBone className="mx-auto h-7 w-10" />
            </div>
          ))}
        </div>
        <div className={cn(theme.panel, 'space-y-4 p-5')}>
          <TenantBone className="h-10 w-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <TenantBone className="h-10 w-10" />
              <div className="min-w-0 flex-1 space-y-2">
                <TenantBone className="h-4 w-1/2" />
                <TenantBone className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={theme.pagePad}>
      <div className="space-y-2">
        <TenantBone className="h-8 w-40" />
        <TenantBone className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <div className={cn(theme.panel, 'space-y-4 p-5')}>
        <TenantBone className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn('space-y-2 border-b pb-4 last:border-0', theme.divider)}>
            <TenantBone className="h-4 w-2/3" />
            <TenantBone className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
