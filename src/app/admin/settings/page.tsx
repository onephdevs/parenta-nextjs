import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { authOptions } from '@/lib/auth';
import SettingsClient from '@/components/features/settings/SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading settings…</div>}>
      <SettingsClient session={session} />
    </Suspense>
  );
}
