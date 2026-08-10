import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import AdvancedFinancialDashboard from '@/components/features/AdvancedFinancialDashboard';
import AnalyticsToolButtons from '@/components/features/analytics/AnalyticsToolButtons';
import AdvancedAnalyticsHeaderActions from '@/components/features/analytics/AdvancedAnalyticsHeaderActions';
import {
  DetailSection,
  ListSummaryCard,
  PageHeader,
} from '@/components/ui';

export default async function AdvancedFinancialAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start gap-3">
        <Link
          href="/admin/financial"
          className="mt-1 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          title="Back to Financial"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader
          title="Advanced Financial Analytics"
          description="Portfolio benchmarks, cash flow, and deep-dive performance tools"
          actions={<AdvancedAnalyticsHeaderActions />}
          className="flex-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Average ROI"
          value="10.04%"
          footer={
            <>
              <span className="font-medium text-green-600">+0.8%</span> from last quarter
            </>
          }
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          }
        />
        <ListSummaryCard
          title="Portfolio Value"
          value="$3.03M"
          footer={
            <>
              <span className="font-medium text-blue-600">+$125K</span> appreciation
            </>
          }
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          }
        />
        <ListSummaryCard
          title="Monthly Cash Flow"
          value="$25.8K"
          footer={
            <>
              <span className="font-medium text-purple-600">92.5%</span> occupancy rate
            </>
          }
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500">
              <Percent className="h-5 w-5 text-white" />
            </div>
          }
        />
        <ListSummaryCard
          title="Avg Cap Rate"
          value="7.5%"
          footer={
            <>
              <span className="font-medium text-green-600">Above</span> market average
            </>
          }
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500">
              <Clock className="h-5 w-5 text-white" />
            </div>
          }
        />
      </div>

      <DetailSection title="Performance vs. Benchmarks">
        <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">+4.5%</div>
              <div className="text-sm text-gray-900">Occupancy vs. Market</div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-green-500" style={{ width: '75%' }} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">-3.5%</div>
              <div className="text-sm text-gray-900">Operating Expense Ratio</div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: '65%' }} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">+0.7%</div>
              <div className="text-sm text-gray-900">Cap Rate vs. Market</div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-purple-500" style={{ width: '80%' }} />
              </div>
            </div>
          </div>
        </div>
      </DetailSection>

      <AdvancedFinancialDashboard />

      <DetailSection title="Analytics Tools" className="relative z-10">
        <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
          <AnalyticsToolButtons />
        </div>
      </DetailSection>
    </div>
  );
}
