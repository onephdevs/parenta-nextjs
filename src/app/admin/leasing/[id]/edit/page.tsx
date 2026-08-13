import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getLeasePackageTemplate } from '@/lib/api/lease-package-templates';
import LeasePackageTemplateForm from '@/components/features/leasing/LeasePackageTemplateForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLeaseTemplatePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const template = await getLeasePackageTemplate(id);
  if (!template || !template.isActive) notFound();

  return <LeasePackageTemplateForm mode="edit" initial={template} />;
}
