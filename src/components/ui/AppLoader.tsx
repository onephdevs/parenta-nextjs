'use client';

import HomeTraceLoader from '@/components/ui/HomeTraceLoader';

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
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm ${className}`}
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
      className={`flex min-h-[50vh] w-full items-center justify-center bg-white/80 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || 'Loading'}
    >
      {content}
    </div>
  );
}
