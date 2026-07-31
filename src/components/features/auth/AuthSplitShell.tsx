'use client';

import Image from 'next/image';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthSplitShellProps {
  left?: ReactNode;
  children: ReactNode;
  className?: string;
}

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
  return (
    <Image
      src="/brand/left-panel.png"
      alt="Alfonso Property Management System"
      fill
      priority
      className="object-cover object-center"
      sizes="50vw"
    />
  );
}
