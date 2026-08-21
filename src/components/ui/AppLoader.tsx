'use client';

import HomeTraceLoader from '@/components/ui/HomeTraceLoader';
import { cn } from '@/lib/utils';

interface AppLoaderProps {
  variant?: 'overlay' | 'inline';
  label?: string;
  size?: number;
  className?: string;
}

export default function AppLoader({
  variant = 'inline',
  label = 'Loading…',
  size = 120,
  className = '',
}: AppLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <HomeTraceLoader size={size} />
      {label ? (
        <p className="text-sm font-medium tracking-wide text-slate-500">{label}</p>
      ) : null}
    </div>
  );

  if (variant === 'overlay') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[9999] flex h-dvh min-h-dvh w-full items-center justify-center bg-white',
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label || 'Loading'}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-full w-full flex-1 items-center justify-center bg-white',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || 'Loading'}
    >
      {content}
    </div>
  );
}
