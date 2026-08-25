import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LeasePackageTemplateForm from '@/components/features/leasing/LeasePackageTemplateForm';

export default async function CreateLeaseTemplatePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  return <LeasePackageTemplateForm mode="create" />;
}
