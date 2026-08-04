'use client';

import Image from 'next/image';
import { Home } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AuthSplitShellProps {
  left?: ReactNode;
  children: ReactNode;
  className?: string;
}

const AUTH_SLIDES = [
  'Easily monitor and manage rent payments, due dates, and outstanding balances',
  'Review tenant documents, applications, and lease details in one place',
  'Keep occupancy, maintenance, and property performance under control',
] as const;

/** 50/50 split auth shell matching Alfonso mockups */
export function AuthSplitShell({ left, children, className }: AuthSplitShellProps) {
  return (
    <div className={cn('min-h-screen flex flex-col lg:flex-row bg-white', className)}>
      <div className="relative hidden lg:flex lg:w-1/2 min-h-screen overflow-hidden">
        {left ?? <AuthHeroPanel />}
      </div>
      <div className="flex flex-1 lg:w-1/2 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}

/** Brand left panel used across all auth screens */
export function AuthHeroPanel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % AUTH_SLIDES.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  const activeCaption = AUTH_SLIDES[activeIndex];

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col">
      <Image
        src="/brand/rectangle-15.png"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="50vw"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a]/25 via-transparent to-[#0f766e]/35"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-10 xl:px-14">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#7EF2D5] shadow-sm">
            <Home className="h-5 w-5 text-[#1e3a8a]" strokeWidth={2.25} aria-hidden />
          </div>
          <div>
            <p className="text-lg font-bold tracking-[0.12em] text-[#7EF2D5]">ALFONSO</p>
            <p className="text-sm font-medium text-white/95">Property Management System</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <Image
            src="/brand/vector.png"
            alt=""
            width={424}
            height={373}
            className="auth-hero-float mx-auto h-auto w-full max-w-[380px] object-contain drop-shadow-lg"
            priority
          />
        </div>

        <div className="mx-auto w-full max-w-md pb-2 text-center">
          <p
            key={activeIndex}
            className="auth-hero-fade min-h-[3.75rem] text-lg font-semibold leading-snug text-white xl:text-xl"
          >
            {activeCaption}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2.5" role="tablist" aria-label="Highlights">
            {AUTH_SLIDES.map((caption, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={caption}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Show highlight ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    isActive
                      ? 'w-9 bg-[#F5D547]'
                      : 'w-6 bg-white/35 hover:bg-white/55'
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
