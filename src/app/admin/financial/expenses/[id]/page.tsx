import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getExpenseById } from '@/lib/api/expenses';
import DeleteExpenseButton from '@/components/features/DeleteExpenseButton';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { DetailSection } from '@/components/ui/DetailSection';
import { DescriptionItem, DescriptionList } from '@/components/ui/DescriptionList';
import { ExpenseCategoryBadge } from '@/components/domain/StatusBadges';
import { formatReportCategoryLabel } from '@/lib/constants/bills-expenses';
import { formatPaymentNotesDisplay, formatPaymentNotesLabel } from '@/lib/format-payment-notes';

interface ExpenseDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const expense = await getExpenseById(id);

  if (!expense) {
    notFound();
  }

  const notesDisplay = expense.notes ? formatPaymentNotesDisplay(expense.notes) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expense Details"
        description={formatPaymentNotesLabel(expense.description, expense.description)}
        actions={
          <>
            <Link href="/admin/financial/expenses">
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
            <Link href={`/admin/financial/expenses/${expense.id}/edit`}>
              <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
                Edit Expense
              </Button>
            </Link>
            <DeleteExpenseButton expenseId={expense.id} />
          </>
        }
      />

      <DetailSection title="Overview">
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <ExpenseCategoryBadge category={expense.category} />
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(expense.amount)}
            </span>
            <span className="text-sm text-gray-600">
              {formatReportCategoryLabel(expense.category)}
            </span>
          </div>
        </div>
      </DetailSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailSection
          title="Expense Information"
          description="Basic details about this expense."
        >
          <DescriptionList>
            <DescriptionItem label="Date">{formatDate(expense.expenseDate)}</DescriptionItem>
            <DescriptionItem label="Category">
              {formatReportCategoryLabel(expense.category)}
            </DescriptionItem>
            <DescriptionItem label="Amount">
              <span className="font-semibold">{formatCurrency(expense.amount)}</span>
            </DescriptionItem>
            {expense.vendor && (
              <DescriptionItem label="Vendor">{expense.vendor}</DescriptionItem>
            )}
            <DescriptionItem label="Description">
              {formatPaymentNotesLabel(expense.description, expense.description)}
            </DescriptionItem>
            {notesDisplay && (
              <DescriptionItem label="Notes">
                <div>{notesDisplay.label || '—'}</div>
                {notesDisplay.billingPeriodLabel && (
                  <div className="mt-1 text-sm text-gray-600">
                    Billing period: {notesDisplay.billingPeriodLabel}
                  </div>
                )}
              </DescriptionItem>
            )}
          </DescriptionList>
        </DetailSection>

        <DetailSection
          title="Location Details"
          description="Building and room associated with this expense."
        >
          <DescriptionList>
            {expense.buildingName ? (
              <>
                <DescriptionItem label="Building">{expense.buildingName}</DescriptionItem>
                {expense.roomNumber && (
                  <DescriptionItem label="Room">Room {expense.roomNumber}</DescriptionItem>
                )}
              </>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-600 sm:px-6">
                No specific building or room associated with this expense.
              </div>
            )}
          </DescriptionList>
        </DetailSection>
      </div>

      <DetailSection
        title="Record Details"
        description="When this expense was recorded and last updated."
      >
        <DescriptionList>
          <DescriptionItem label="Created">{formatDate(expense.createdAt)}</DescriptionItem>
          <DescriptionItem label="Last Updated">{formatDate(expense.updatedAt)}</DescriptionItem>
          <DescriptionItem label="Expense ID">
            <span className="font-mono">#{expense.id}</span>
          </DescriptionItem>
        </DescriptionList>
      </DetailSection>
    </div>
  );
}
