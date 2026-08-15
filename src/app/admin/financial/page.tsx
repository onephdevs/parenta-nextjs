import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  Plus,
  Receipt,
  Settings2,
  Wallet,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getPaymentSummary } from '@/lib/api/payments';
import { getInvoiceSummary } from '@/lib/api/invoices';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Financial | Parenta',
  description: 'Payments, invoices, reports, and financial tools',
};

async function getHubSnapshot() {
  try {
    const [payments, invoices] = await Promise.all([
      getPaymentSummary(),
      getInvoiceSummary(),
    ]);
    return { payments, invoices };
  } catch (error) {
    console.error('Error fetching financial hub snapshot:', error);
    return {
      payments: {
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
      invoices: {
        totalInvoices: 0,
        totalAmount: 0,
        paidInvoices: 0,
        paidAmount: 0,
        unpaidInvoices: 0,
        unpaidAmount: 0,
        overdueInvoices: 0,
        overdueAmount: 0,
      },
    };
  }
}

interface HubLink {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const DAY_TO_DAY: HubLink[] = [
  {
    href: '/admin/financial/payments',
    title: 'Payments',
    description: 'Record collections, review receipts, and follow up on pending claims.',
    icon: Wallet,
  },
  {
    href: '/admin/financial/invoices',
    title: 'Invoices',
    description: 'Create bills and track what tenants still owe.',
    icon: FileText,
  },
  {
    href: '/admin/financial/expenses',
    title: 'Expenses',
    description: 'Log property costs and keep spend visible beside collections.',
    icon: Receipt,
  },
  {
    href: '/admin/financial/late-fees/settings',
    title: 'Late fees',
    description: 'Set penalty rules and apply charges on overdue rent.',
    icon: AlertTriangle,
  },
];

const INSIGHTS: HubLink[] = [
  {
    href: '/admin/financial/dashboard',
    title: 'Financial dashboard',
    description: 'Revenue, occupancy, charts, and upcoming due dates.',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/financial/reports',
    title: 'Reports',
    description: 'Period revenue, expenses, and profit & loss.',
    icon: BarChart3,
  },
  {
    href: '/admin/financial/advanced-analytics',
    title: 'Advanced analytics',
    description: 'Portfolio benchmarks and cash-flow deep dives.',
    icon: BarChart3,
  },
  {
    href: '/admin/financial/payment-gateways',
    title: 'Payment gateways',
    description: 'Configure how tenants can pay online.',
    icon: CreditCard,
  },
];

function HubCard({ href, title, description, icon: Icon }: HubLink) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_6px_28px_rgba(15,23,42,0.12)]"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-900" />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

export default async function FinancialHubPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const { payments, invoices } = await getHubSnapshot();

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Financial"
        description="Day-to-day collections live here. Charts and trends are on the financial dashboard."
        actions={
          <>
            <Link href="/admin/financial/payments/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Record Payment</Button>
            </Link>
            <Link href="/admin/financial/dashboard">
              <Button variant="outline" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                Open dashboard
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/financial/payments" className="block">
          <ListSummaryCard
            title="Collected"
            value={formatCurrency(payments.completedAmount)}
            footer={`${payments.completedPayments} completed payments`}
            icon={<Wallet className="h-8 w-8 text-green-600" />}
          />
        </Link>
        <Link href="/admin/financial/payments" className="block">
          <ListSummaryCard
            title="Pending payments"
            value={formatCurrency(payments.pendingAmount)}
            footer={`${payments.pendingPayments} awaiting confirmation`}
            icon={<Clock className="h-8 w-8 text-amber-600" />}
          />
        </Link>
        <Link href="/admin/financial/invoices" className="block">
          <ListSummaryCard
            title="Unpaid invoices"
            value={formatCurrency(invoices.unpaidAmount)}
            footer={`${invoices.unpaidInvoices} open invoices`}
            icon={<FileText className="h-8 w-8 text-blue-600" />}
          />
        </Link>
        <Link href="/admin/financial/invoices?status=overdue" className="block">
          <ListSummaryCard
            title="Overdue invoices"
            value={formatCurrency(invoices.overdueAmount)}
            footer={`${invoices.overdueInvoices} past due`}
            icon={<AlertTriangle className="h-8 w-8 text-red-600" />}
          />
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Day to day
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {DAY_TO_DAY.map((item) => (
            <HubCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Insights & setup
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {INSIGHTS.map((item) => (
            <HubCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}
