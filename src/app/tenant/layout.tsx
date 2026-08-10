import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { readPreviewCookie } from '@/lib/tenant-preview';
import { TenantPortalGateProvider } from '@/hooks/useTenantPortalGate';
import { TenantPreviewBanner } from '@/components/features/tenant/TenantPreviewBanner';
import { TenantPortalShellProvider } from '@/components/features/tenant/TenantPortalShellProvider';
import { isTenantPortalEnabled } from '@/lib/tenant-portal-settings';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portalEnabled = await isTenantPortalEnabled();
  if (!portalEnabled) {
    redirect('/auth/signin?portal=disabled');
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin?role=tenant');
  }

  if (session.user.role === 'tenant') {
    return (
      <TenantPortalGateProvider>
        <TenantPortalShellProvider>{children}</TenantPortalShellProvider>
      </TenantPortalGateProvider>
    );
  }

  if (session.user.role === 'admin') {
    const preview = await readPreviewCookie();
    if (preview && preview.adminUserId === session.user.id) {
      return (
        <TenantPortalGateProvider>
          <TenantPreviewBanner />
          <TenantPortalShellProvider>{children}</TenantPortalShellProvider>
        </TenantPortalGateProvider>
      );
    }
  }

  redirect('/auth/signin?role=tenant');
}
