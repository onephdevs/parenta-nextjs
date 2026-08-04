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

  return (
    <div className="min-h-0 flex-1 bg-white">
      <CreateInvoiceForm roomId={params.roomId} tenantId={params.tenantId} />
    </div>
  );
}
