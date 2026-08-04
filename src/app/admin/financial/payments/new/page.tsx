import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getInvoiceById } from '@/lib/api/invoices';
import PaymentForm from '@/components/features/PaymentForm';

interface NewPaymentPageProps {
  searchParams: Promise<{
    tenantId?: string;
    amount?: string;
    invoiceId?: string;
  }>;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const params = await searchParams;
  const invoiceId = params.invoiceId?.trim() || '';

  let initialData: {
    tenantId: string;
    amount: string;
    type: string;
    paymentDate: string;
    description: string;
    invoiceId?: string;
    invoiceNumber?: string;
  } = {
    tenantId: params.tenantId || '',
    amount: params.amount || '',
    type: 'rent',
    paymentDate: todayISO(),
    description: '',
  };

  if (invoiceId) {
    const invoice = await getInvoiceById(invoiceId);
    if (invoice) {
      const balanceDue = Math.max(
        0,
        Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)
      );
      const amountFromQuery = params.amount ? Number(params.amount) : NaN;
      const amount =
        Number.isFinite(amountFromQuery) && amountFromQuery > 0
          ? amountFromQuery
          : balanceDue;

      initialData = {
        tenantId: String(invoice.tenantId || params.tenantId || ''),
        amount: amount > 0 ? String(Number(amount.toFixed(2))) : '',
        type: 'rent',
        paymentDate: todayISO(),
        description: `Payment for invoice ${invoice.invoiceNumber}`,
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber,
      };
    } else {
      initialData = {
        ...initialData,
        invoiceId,
        description: params.amount
          ? `Payment for invoice ${invoiceId}`
          : `Payment for invoice ${invoiceId}`,
      };
    }
  }

  return (
    <div className="min-h-0 flex-1 bg-white">
      <PaymentForm initialData={initialData} />
    </div>
  );
}
