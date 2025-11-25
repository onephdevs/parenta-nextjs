import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { 
  Building2, 
  Home, 
  Users, 
  DollarSign,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Package
} from 'lucide-react';

// Force fresh data on every page load (no caching)
export const revalidate = 0;

interface DashboardStats {
  buildings: {
    total: number;
    active: number;
    totalUnits: number;
    activeUnits: number;
  };
  rooms: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
    occupancyRate: number;
  };
  tenants: {
    total: number;
    active: number;
    pending: number;
  };
  financial: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    overduePayments: number;
    totalRevenue: number;
    pendingRevenue: number;
  };
  summary: {
    occupancyRate: number;
    activeBuildings: number;
    activeTenants: number;
    monthlyRevenue: number;
  };
}

async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const { getBuildingStats, getOccupancyStats } = await import('@/lib/api/buildings');
    const pool = (await import('@/lib/db')).default;
    
    // Get building and occupancy stats
    const [buildingStats, occupancyStats] = await Promise.all([
      getBuildingStats(),
      getOccupancyStats()
    ]);
    
    // Get tenant stats
    const tenantStatsQuery = `
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(*) FILTER (WHERE tenant_status = 'active') as active_tenants,
        COUNT(*) FILTER (WHERE tenant_status = 'pending') as pending_tenants
      FROM tenants 
      WHERE is_active = true
    `;
    
    const tenantStatsResult = await pool.query(tenantStatsQuery);
    const tenantStats = tenantStatsResult.rows[0];
    
    // Get financial stats
    const financialStatsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_payments,
        COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payments,
        COUNT(*) FILTER (WHERE payment_status = 'overdue') as overdue_payments,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'pending'), 0) as pending_revenue
      FROM payments
    `;
    
    const financialStatsResult = await pool.query(financialStatsQuery);
    const financialStats = financialStatsResult.rows[0];
    
    // Calculate metrics
    const occupancyRate = parseFloat(occupancyStats.occupancy_rate || '0');
    const activeTenantsCount = parseInt(tenantStats.active_tenants || '0');
    const totalRevenue = parseFloat(financialStats.total_revenue || '0');
    
    return {
      buildings: {
        total: parseInt(buildingStats.total_buildings || '0'),
        active: parseInt(buildingStats.active_buildings || '0'),
        totalUnits: parseInt(buildingStats.total_units || '0'),
        activeUnits: parseInt(buildingStats.active_units || '0')
      },
      rooms: {
        total: parseInt(occupancyStats.total_rooms || '0'),
        occupied: parseInt(occupancyStats.occupied_rooms || '0'),
        vacant: parseInt(occupancyStats.vacant_rooms || '0'),
        maintenance: parseInt(occupancyStats.maintenance_rooms || '0'),
        occupancyRate: occupancyRate
      },
      tenants: {
        total: parseInt(tenantStats.total_tenants || '0'),
        active: activeTenantsCount,
        pending: parseInt(tenantStats.pending_tenants || '0')
      },
      financial: {
        totalPayments: parseInt(financialStats.total_payments || '0'),
        paidPayments: parseInt(financialStats.paid_payments || '0'),
        pendingPayments: parseInt(financialStats.pending_payments || '0'),
        overduePayments: parseInt(financialStats.overdue_payments || '0'),
        totalRevenue: totalRevenue,
        pendingRevenue: parseFloat(financialStats.pending_revenue || '0')
      },
      summary: {
        occupancyRate: occupancyRate,
        activeBuildings: parseInt(buildingStats.active_buildings || '0'),
        activeTenants: activeTenantsCount,
        monthlyRevenue: totalRevenue
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin?role=admin');
  }

  const stats = await getDashboardStats();

  const quickActions = [
    {
      title: 'Add Building',
      description: 'Create a new property',
      href: '/admin/buildings',
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'Add Room',
      description: 'Add a new unit',
      href: '/admin/rooms',
      icon: Home,
      color: 'green'
    },
    {
      title: 'Add Tenant',
      description: 'Register new tenant',
      href: '/admin/tenants',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Record Payment',
      description: 'Log a payment',
      href: '/admin/financial/payments/new',
      icon: DollarSign,
      color: 'yellow'
    },
    {
      title: 'Add Asset',
      description: 'Track new asset',
      href: '/admin/assets',
      icon: Package,
      color: 'indigo'
    },
    {
      title: 'View Reports',
      description: 'Financial reports',
      href: '/admin/reports',
      icon: BarChart3,
      color: 'pink'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user.firstName}! 👋
          </h2>
          <p className="text-gray-900">
            Here's what's happening with your properties today.
                </p>
              </div>

          {/* Stats Grid */}
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Buildings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.buildings.total}
              </h3>
              <p className="text-sm text-gray-900 mb-3">Total Buildings</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-900">{stats.buildings.totalUnits} units</span>
                <Link href="/admin/buildings" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  View <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Occupancy */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Home className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {stats.rooms.occupancyRate}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.rooms.occupied}
              </h3>
              <p className="text-sm text-gray-900 mb-3">Occupied Units</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-900">{stats.rooms.vacant} vacant</span>
                <Link href="/admin/rooms" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  View <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Tenants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {stats.tenants.active}
              </h3>
              <p className="text-sm text-gray-900 mb-3">Active Tenants</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-900">{stats.tenants.pending} pending</span>
                <Link href="/admin/tenants" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  View <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                ₱{stats.summary.monthlyRevenue.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-900 mb-3">Monthly Revenue</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-900">{stats.financial.paidPayments} payments</span>
                <Link href="/admin/payments" className="text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  View <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className={`bg-${action.color}-100 p-2 rounded-lg w-fit mb-3 group-hover:scale-110 transition`}>
                      <action.icon className={`h-5 w-5 text-${action.color}-600`} />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
                    <p className="text-sm text-gray-900">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                Financial Overview
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-900">Total Payments</span>
                  <span className="font-semibold text-gray-900">{stats.financial.totalPayments}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-900">Paid Payments</span>
                  <span className="font-semibold text-green-600">{stats.financial.paidPayments}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-900">Pending Payments</span>
                  <span className="font-semibold text-yellow-600">{stats.financial.pendingPayments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">Overdue Payments</span>
                  <span className="font-semibold text-red-600">{stats.financial.overduePayments}</span>
                </div>
              </div>
              <Link 
                href="/admin/reports"
                className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium text-center block"
              >
                View Full Report
              </Link>
            </div>

            {/* Property Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Home className="h-5 w-5 mr-2 text-blue-600" />
                Property Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-900">Total Units</span>
                  <span className="font-semibold text-gray-900">{stats.rooms.total}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-900">Occupied</span>
                  <span className="font-semibold text-green-600">{stats.rooms.occupied}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-900">Vacant</span>
                  <span className="font-semibold text-blue-600">{stats.rooms.vacant}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">Under Maintenance</span>
                  <span className="font-semibold text-orange-600">{stats.rooms.maintenance}</span>
                </div>
              </div>
              <Link 
                href="/admin/analytics"
                className="mt-6 w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg hover:bg-gray-200 transition font-medium text-center block"
              >
                View Analytics
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
