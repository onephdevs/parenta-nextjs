import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import TenantForm from '@/components/features/TenantForm';

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ buildingId?: string; roomId?: string; returnTo?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const params = await searchParams;

  return (
    <div className="min-h-0 flex-1 bg-white">
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading form…</div>}>
        <TenantForm
          initialBuildingId={params.buildingId}
          initialRoomId={params.roomId}
          returnTo={params.returnTo}
          lockHousing={Boolean(params.buildingId && params.roomId)}
        />
      </Suspense>
    </div>
  );
}
