'use client';

import type { ReactNode } from 'react';
import { TenantPortalShell } from '@/components/features/tenant/TenantPortalShell';
import { TenantDataProvider } from '@/hooks/useTenantPortalData';
import { TenantThemeProvider } from '@/hooks/useTenantTheme';

export function TenantPortalShellProvider({ children }: { children: ReactNode }) {
  return (
    <TenantThemeProvider>
      <TenantDataProvider>
        <TenantPortalShell>{children}</TenantPortalShell>
      </TenantDataProvider>
    </TenantThemeProvider>
  );
}
