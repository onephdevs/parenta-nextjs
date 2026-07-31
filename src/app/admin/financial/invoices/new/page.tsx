import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CreateInvoiceForm from '@/components/features/CreateInvoiceForm';

interface NewInvoicePageProps {
  searchParams: Promise<{
    roomId?: string;
    tenantId?: string;
  }>;
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const params = await searchParams;
  const roomId = params.roomId;
  const tenantId = params.tenantId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <a
                href="/admin/financial/invoices"
                className="text-gray-900 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <CreateInvoiceForm roomId={roomId} tenantId={tenantId} />
      </div>
    </div>
  );
} 