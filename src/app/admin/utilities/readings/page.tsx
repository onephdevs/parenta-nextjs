import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import MeterReadingsDashboard from '@/components/features/MeterReadingsDashboard';
import { PageHeader } from '@/components/layout/PageHeader';

export default async function MeterReadingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Meter Readings"
        description="Track utility consumption and manage meter readings across all properties"
      />

      <MeterReadingsDashboard />
    </div>
  );
}
