import { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ActivityFeedClient from '@/components/features/activity/ActivityFeedClient';

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6 p-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          </div>
        }
      >
        <ActivityFeedClient />
      </Suspense>
    </div>
  );
}
