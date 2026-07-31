import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { readPreviewCookie } from '@/lib/tenant-preview';
import { TenantPortalGateProvider } from '@/hooks/useTenantPortalGate';
import { TenantPreviewBanner } from '@/components/features/tenant/TenantPreviewBanner';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin?role=tenant');
  }

  if (session.user.role === 'tenant') {
    return (
      <TenantPortalGateProvider>
        <div className="min-h-screen bg-gray-50">{children}</div>
      </TenantPortalGateProvider>
    );
  }

  if (session.user.role === 'admin') {
    const preview = await readPreviewCookie();
    if (preview && preview.adminUserId === session.user.id) {
      return (
        <TenantPortalGateProvider>
          <div className="min-h-screen bg-gray-50">
            <TenantPreviewBanner />
            {children}
          </div>
        </TenantPortalGateProvider>
      );
    }
  }

  redirect('/auth/signin?role=tenant');
}
