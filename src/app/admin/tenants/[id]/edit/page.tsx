import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getTenantById } from '@/lib/api/tenants';
import { EditTenantForm } from '@/components/features/EditTenantForm';

interface EditTenantPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTenantPage({ params }: EditTenantPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const { id } = await params;
  
  try {
    const tenant = await getTenantById(id);
    
    if (!tenant) {
      notFound();
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Tenant</h1>
            <p className="mt-2 text-sm text-gray-900">
              Update information for {tenant.firstName} {tenant.lastName}
            </p>
          </div>

          <EditTenantForm tenant={tenant} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading tenant:', error);
    notFound();
  }
} 