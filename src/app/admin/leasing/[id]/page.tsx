import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getLeasePackageTemplateDetail } from '@/lib/api/lease-package-templates';
import LeaseTemplateDetailView from '@/components/features/leasing/LeaseTemplateDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeaseTemplateDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const detail = await getLeasePackageTemplateDetail(id);
  if (!detail || !detail.isActive) notFound();

  return <LeaseTemplateDetailView detail={detail} />;
}
