import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LeaseDetailClient from '@/components/features/LeaseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeaseDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const { id } = await params;
  return <LeaseDetailClient leaseId={id} />;
}
