import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { 
  BarChart3, 
  ChevronRight,
  DollarSign, 
  TrendingUp, 
  FileText, 
  Users, 
  Home,
  Package,
  Zap,
  Calculator,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { WorkItemList, WorkItemRow } from '@/components/ui/WorkItemRow';
import { ReportsFilterBar } from '@/components/features/ReportsFilterBar';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const params = await searchParams;
  const query = (params.q || '').trim().toLowerCase();
  const categoryFilter = params.category || '';

  const reportCategories = [
    {
      title: 'Financial Reports',
      description: 'Revenue, expenses, profit & loss statements',
      icon: DollarSign,
      color: 'blue',
      reports: [
        {
          name: 'Apartment records',
          description:
            'Excel-style building ledger: tenants paid or not, electric/water, expenses, and summary. See all or pick Balibago / Villasol.',
          href: '/admin/reports/apartment-records',
          icon: FileSpreadsheet
        },
        {
          name: 'Unit × Month Collections',
          description:
            'Spreadsheet desk: paid / partial / unpaid per unit and month (excludes ADMIN units)',
          href: '/admin/reports/unit-month',
          icon: Layers
        },
        {
          name: 'Collected Amount Report',
          description: 'Received/Collected amount per month, quarter, six months, annual',
          href: '/admin/reports/collected-amount',
          icon: DollarSign
        },
        {
          name: 'Disbursement / Cash-flow',
          description:
            'Total Collection − Expenses = Cash Allowance + Deposit cash + Cheques = Grand Total',
          href: '/admin/reports/disbursement',
          icon: Calculator
        },
        {
          name: 'Portfolio Rollup',
          description:
            'Unit → property → portfolio-wide occupancy, collections, vacancy & owner-absorbed utilities',
          href: '/admin/reports/portfolio',
          icon: Layers
        },
        {
          name: 'Deposit Report',
          description: 'Total deposit received per month, six months, annual',
          href: '/admin/reports/deposits',
          icon: DollarSign
        },
        {
          name: 'Expense Report',
          description: 'List of all expenses details and summary total by month, quarterly, six months and annual',
          href: '/admin/reports/expenses',
          icon: DollarSign
        },
        {
          name: 'Comprehensive Financial Report',
          description: 'Complete financial overview with trends',
          href: '/admin/financial/reports',
          icon: FileText
        },
        {
          name: 'Revenue Report',
          description: 'Detailed revenue breakdown by category',
          href: '/admin/financial/reports?type=revenue',
          icon: TrendingUp
        },
        {
          name: 'Expense Analysis',
          description: 'Expense analysis and categorization',
          href: '/admin/financial/reports?type=expenses',
          icon: BarChart3
        },
        {
          name: 'Rent Roll Report',
          description: 'Current tenant rent schedule',
          href: '/admin/financial/reports?type=rent-roll',
          icon: Users
        },
        {
          name: 'Profit & Loss Statement',
          description: 'Income and expense summary',
          href: '/admin/financial/reports?type=profit-loss',
          icon: TrendingUp
        }
      ]
    },
    {
      title: 'Property Reports',
      description: 'Building and room occupancy analytics',
      icon: Home,
      color: 'green',
      reports: [
        {
          name: 'Vacant Rooms Report',
          description: 'List of vacant rooms/apartments',
          href: '/admin/reports/vacant-rooms',
          icon: Home
        },
        {
          name: 'Occupancy Report',
          description: 'Room occupancy rates and trends',
          href: '/admin/analytics?view=occupancy',
          icon: Home
        },
        {
          name: 'Building Performance',
          description: 'Revenue and occupancy by building',
          href: '/admin/analytics?view=buildings',
          icon: BarChart3
        },
        {
          name: 'Room Status Report',
          description: 'Current status of all rooms',
          href: '/admin/rooms',
          icon: Home
        }
      ]
    },
    {
      title: 'Tenant Reports',
      description: 'Tenant analytics and payment patterns',
      icon: Users,
      color: 'purple',
      reports: [
        {
          name: 'Tenant List Report',
          description: 'List of tenants with balances and past due status',
          href: '/admin/reports/tenant-list',
          icon: Users
        },
        {
          name: 'Tenant Summary',
          description: 'Overview of all active tenants',
          href: '/admin/tenants',
          icon: Users
        },
        {
          name: 'Payment Patterns',
          description: 'Tenant payment history and trends',
          href: '/admin/analytics?view=payments',
          icon: DollarSign
        },
        {
          name: 'Outstanding Balances',
          description: 'Tenants with pending payments',
          href: '/admin/financial/payments?status=pending',
          icon: FileText
        }
      ]
    },
    {
      title: 'Asset Reports',
      description: 'Asset tracking and maintenance',
      icon: Package,
      color: 'orange',
      reports: [
        {
          name: 'Asset Inventory',
          description: 'Complete asset inventory list',
          href: '/admin/assets',
          icon: Package
        },
        {
          name: 'Asset Assignment Report',
          description: 'Assets assigned to rooms',
          href: '/admin/assets?filter=assigned',
          icon: Home
        }
      ]
    },
    {
      title: 'Utility Reports',
      description: 'Utility usage and billing',
      icon: Zap,
      color: 'yellow',
      reports: [
        {
          name: 'Utility Bills Summary',
          description: 'Overview of all utility bills',
          href: '/utilities',
          icon: Zap
        },
        {
          name: 'Cost Allocation Report',
          description: 'Utility cost distribution',
          href: '/admin/utilities/cost-allocation',
          icon: BarChart3
        },
        {
          name: 'Meter Readings',
          description: 'Utility meter reading history',
          href: '/admin/utilities/readings',
          icon: FileText
        }
      ]
    },
    {
      title: 'Analytics & Insights',
      description: 'Advanced analytics and visualizations',
      icon: BarChart3,
      color: 'pink',
      reports: [
        {
          name: 'Comprehensive Analytics',
          description: 'All charts and insights in one place',
          href: '/admin/analytics',
          icon: BarChart3
        },
        {
          name: 'Advanced Financial Analytics',
          description: 'Deep dive into financial metrics',
          href: '/admin/financial/advanced-analytics',
          icon: TrendingUp
        },
        {
          name: 'Data Export',
          description: 'Export data for external analysis',
          href: '/admin/export',
          icon: FileText
        }
      ]
    }
  ];

  const visibleCategories = reportCategories
    .filter((category) => !categoryFilter || category.title === categoryFilter)
    .map((category) => ({
      ...category,
      reports: category.reports.filter((report) => {
        if (!query) return true;
        return (
          report.name.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query)
        );
      }),
    }))
    .filter((category) => category.reports.length > 0);

  const reportItems = visibleCategories.flatMap((category) =>
    category.reports.map((report) => ({
      ...report,
      category: category.title.replace(' Reports', ''),
    }))
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reports & Analytics"
        description="Access all available reports and insights"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {reportCategories.slice(0, 4).map((category) => (
          <ListSummaryCard
            key={category.title}
            title={category.title.replace(' Reports', '')}
            value={category.reports.length}
            footer={category.description}
            icon={<category.icon className="h-8 w-8 text-gray-700" />}
          />
        ))}
      </div>

      <ReportsFilterBar
        query={params.q || ''}
        category={categoryFilter}
        categories={reportCategories.map((category) => category.title)}
        shown={visibleCategories.reduce((sum, c) => sum + c.reports.length, 0)}
      />

        <WorkItemList>
          {reportItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">No reports match your filters.</p>
          ) : (
            reportItems.map((report) => (
              <WorkItemRow
                key={report.href}
                href={report.href}
                title={report.name}
                subtitle={report.description}
                badges={[{ key: 'category', label: report.category, tone: 'info' }]}
                metaLabel="Open"
                metaTone="muted"
                trailingIcon={<ChevronRight className="h-4 w-4 text-gray-400" />}
                dotTone="info"
              />
            ))
          )}
        </WorkItemList>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">Need help with reports?</h3>
              <p className="mt-2 text-sm text-blue-700">
                Each report provides specific insights into different aspects of your property management operations. 
                Use the filters and date ranges to customize the data you need. Most reports can be exported for further analysis.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}

