import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getTenantById } from '@/lib/api/tenants';
import { sanitizeReturnTo } from '@/lib/navigation';
import { EditTenantForm } from '@/components/features/EditTenantForm';

interface EditTenantPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function EditTenantPage({ params, searchParams }: EditTenantPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const query = await searchParams;
  const returnTo = sanitizeReturnTo(query.returnTo);

  try {
    const tenant = await getTenantById(id);

    if (!tenant) {
      notFound();
    }

    return (
      <div className="min-h-0 flex-1 bg-white">
        <EditTenantForm tenant={tenant} returnTo={returnTo} />
      </div>
    );
  } catch (error) {
    console.error('Error loading tenant:', error);
    notFound();
  }
}
