'use client';

import { Suspense, type ReactNode } from 'react';
import { TenantPortalShell } from '@/components/features/tenant/TenantPortalShell';
import { TenantDataProvider } from '@/hooks/useTenantPortalData';
import { TenantThemeProvider, useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

function ShellFallback({ children }: { children: ReactNode }) {
  const theme = useTenantTheme();
  return <div className={cn('min-h-screen', theme.page)}>{children}</div>;
}

function ShellWithTheme({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
      <TenantPortalShell>{children}</TenantPortalShell>
    </Suspense>
  );
}

export function TenantPortalShellProvider({ children }: { children: ReactNode }) {
  return (
    <TenantThemeProvider>
      <TenantDataProvider>
        <ShellWithTheme>{children}</ShellWithTheme>
      </TenantDataProvider>
    </TenantThemeProvider>
  );
}
