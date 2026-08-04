import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import PaymentForm from '@/components/features/PaymentForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

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
    <div className="space-y-6 p-6">
      <PageHeader
        title="Record manual payment"
        description="Log a payment received from a tenant"
        actions={
          <Link href="/admin/financial/payments">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to payments
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-4xl">
        <PaymentForm initialData={initialData} />
      </div>
    </div>
  );
}
