import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminLayoutClient from '@/components/layout/AdminLayoutClient';
import AppLoader from '@/components/ui/AppLoader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <Suspense fallback={<AppLoader variant="inline" className="min-h-screen" />}>
      <AdminLayoutClient session={session}>{children}</AdminLayoutClient>
    </Suspense>
  );
}
