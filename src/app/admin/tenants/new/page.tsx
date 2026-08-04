import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import TenantForm from '@/components/features/TenantForm';

export default async function NewTenantPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Add New Tenant</h1>
          <p className="mt-1 text-sm text-gray-600">
            Complete the steps below. Your progress is saved as a draft in this browser until you
            create the tenant.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6 lg:p-8">
            <TenantForm />
          </div>
        </div>
      </div>
    </div>
  );
}
