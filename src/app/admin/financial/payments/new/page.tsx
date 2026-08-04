import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import PaymentForm from '@/components/features/PaymentForm';

interface NewPaymentPageProps {
  searchParams: Promise<{
    tenantId?: string;
    amount?: string;
    invoiceId?: string;
  }>;
}

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const params = await searchParams;
  const initialData = {
    tenantId: params.tenantId || '',
    amount: params.amount || '',
    description: params.invoiceId ? `Payment for invoice ${params.invoiceId}` : '',
  };

  return (
    <div className="min-h-0 flex-1 bg-white">
      <PaymentForm initialData={initialData} />
    </div>
  );
}
