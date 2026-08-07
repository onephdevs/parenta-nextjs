import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  DollarSign,
  Plus,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getPaymentSummary, getPayments } from '@/lib/api/payments';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import {
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';

async function getFinancialData() {
  try {
    const [summary, recentPayments] = await Promise.all([
      getPaymentSummary(),
      getPayments({}, 1, 10),
    ]);

    return { summary, recentPayments: recentPayments.payments };
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return {
      summary: {
        totalPayments: 0,
        totalAmount: 0,
        pendingPayments: 0,
        pendingAmount: 0,
        completedPayments: 0,
        completedAmount: 0,
        overduePayments: 0,
        overdueAmount: 0,
        averagePaymentAmount: 0,
      },
      recentPayments: [],
    };
  }
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
    month: 'short',
    day: 'numeric',
  });
}

export default async function FinancialDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const { summary, recentPayments } = await getFinancialData();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financial Overview"
        description="Monitor payments, expenses, and financial performance"
        actions={
          <>
            <Link href="/admin/financial/payments/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Record Payment</Button>
            </Link>
            <Link href="/admin/financial/payments">
              <Button variant="outline">View All Payments</Button>
            </Link>
            <Link href="/admin/financial/expenses">
              <Button variant="outline">Manage Expenses</Button>
            </Link>
            <Link href="/admin/financial/invoices">
              <Button variant="outline">Manage Invoices</Button>
            </Link>
            <Link href="/admin/financial/reports">
              <Button variant="outline">View Reports</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Revenue"
          value={formatCurrency(summary.completedAmount)}
          footer={`${summary.completedPayments} completed payments`}
          icon={<DollarSign className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Pending Payments"
          value={formatCurrency(summary.pendingAmount)}
          footer={`${summary.pendingPayments} pending payments`}
          icon={<Clock className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="Overdue Payments"
          value={formatCurrency(summary.overdueAmount)}
          footer={`${summary.overduePayments} overdue payments`}
          icon={<AlertTriangle className="h-8 w-8 text-red-600" />}
        />
        <ListSummaryCard
          title="Average Payment"
          value={formatCurrency(summary.averagePaymentAmount)}
          footer={`${summary.totalPayments} total payments`}
          icon={<BarChart3 className="h-8 w-8 text-blue-600" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Payments</h3>
            <Link
              href="/admin/financial/payments"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              View all
            </Link>
          </div>

          {recentPayments.length > 0 ? (
            <ul className="-my-2 divide-y divide-gray-200">
              {recentPayments.map((payment) => (
                <li key={payment.id} className="flex items-center gap-4 py-4">
                  <Avatar
                    name={payment.tenantName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {payment.tenantName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {payment.roomNumber && `Room ${payment.roomNumber} · `}
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PaymentTypeBadge type={payment.paymentType} />
                    <PaymentStatusBadge status={payment.paymentStatus} />
                  </div>
                  <div className="flex-shrink-0 text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No payments yet"
              description="Get started by recording your first payment."
              action={
                <Link href="/admin/financial/payments/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Record Payment</Button>
                </Link>
              }
            />
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-medium text-gray-900">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <Link href="/admin/financial/payments/new">
              <Button className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
                Record New Payment
              </Button>
            </Link>
            <Link href="/admin/financial/payments?status=overdue">
              <Button variant="outline" className="w-full" leftIcon={<AlertTriangle className="h-4 w-4" />}>
                View Overdue Payments
              </Button>
            </Link>
            <Link href="/admin/financial/reports">
              <Button variant="outline" className="w-full" leftIcon={<BarChart3 className="h-4 w-4" />}>
                Financial Reports
              </Button>
            </Link>
            <Link href="/admin/financial/invoices">
              <Button variant="outline" className="w-full">
                Manage Invoices
              </Button>
            </Link>
            <Link href="/admin/financial/payment-gateways">
              <Button variant="outline" className="w-full">
                Payment Gateways
              </Button>
            </Link>
            <Link href="/admin/financial/advanced-analytics">
              <Button variant="outline" className="w-full">
                Advanced Analytics
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
