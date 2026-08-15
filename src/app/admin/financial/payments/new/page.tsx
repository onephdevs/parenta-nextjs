import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ProcessPaymentClient from '@/components/features/payments/ProcessPaymentClient';

interface NewPaymentPageProps {
  searchParams: Promise<{
    tenantId?: string;
    amount?: string;
    invoiceId?: string;
  }>;
}

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !['admin', 'caretaker'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  const params = await searchParams;

  return (
    <div className="min-h-0 flex-1 bg-gray-50">
      <ProcessPaymentClient
        initialTenantId={params.tenantId?.trim() || ''}
        initialInvoiceId={params.invoiceId?.trim() || ''}
        initialAmount={params.amount?.trim() || ''}
      />
    </div>
  );
}
