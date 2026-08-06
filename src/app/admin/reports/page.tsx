import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Users, 
  Home,
  Package,
  Zap
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const reportCategories = [
    {
      title: 'Financial Reports',
      description: 'Revenue, expenses, profit & loss statements',
      icon: DollarSign,
      color: 'blue',
      reports: [
        {
          name: 'Collected Amount Report',
          description: 'Received/Collected amount per month, quarter, six months, annual',
          href: '/admin/reports/collected-amount',
          icon: DollarSign
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
          name: 'Expense Report',
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

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'purple':
        return 'bg-purple-100 text-purple-600';
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      case 'pink':
        return 'bg-pink-100 text-pink-600';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reports & Analytics"
        description="Access all available reports and insights"
      />

        {/* Quick Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/admin/financial/reports"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Financial</p>
                  <p className="text-xs text-gray-900">View reports</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/analytics"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-900">View charts</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/export"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Export</p>
                  <p className="text-xs text-gray-900">Download data</p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/financial/advanced-analytics"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-pink-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Insights</p>
                  <p className="text-xs text-gray-900">Advanced data</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Report Categories */}
        <div className="space-y-8">
          {reportCategories.map((category) => (
            <div key={category.title} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(category.color)}`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                    <p className="text-sm text-gray-900">{category.description}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.reports.map((report) => (
                    <Link
                      key={report.name}
                      href={report.href}
                      className="group block p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <report.icon className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                            {report.name}
                          </h4>
                          <p className="mt-1 text-xs text-gray-900">
                            {report.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        View Report
                        <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

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

