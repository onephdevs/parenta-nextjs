import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { listLeasePackageTemplates } from '@/lib/api/lease-package-templates';
import LeasingClient from '@/components/features/leasing/LeasingClient';

export const dynamic = 'force-dynamic';

export default async function LeasingPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  let templates: Awaited<ReturnType<typeof listLeasePackageTemplates>> = [];
  try {
    templates = await listLeasePackageTemplates({ activeOnly: true });
  } catch (error) {
    console.error('Leasing page load error:', error);
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
          Loading lease templates…
        </div>
      }
    >
      <LeasingClient initialTemplates={templates} />
    </Suspense>
  );
}
