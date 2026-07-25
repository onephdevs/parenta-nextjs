'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Home,
  Zap,
  Building,
  BarChart3,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import SkeletonCard from '../../../components/ui/SkeletonCard';
import {
  MetricCard,
  FinancialTrendChart,
  OccupancyChart,
  UtilityBreakdownChart,
  BuildingPerformanceChart,
  CashFlowChart
} from '../../../components/features/Charts';
import { useNotifications } from '../../../hooks/useNotifications';
import { 
  DashboardMetrics,
  AnalyticsFilter,
  FinancialTrend,
  OccupancyTrend,
  CashFlowData
} from '../../../types/analytics';
import { Building as BuildingType } from '../../../types/database';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [financialTrends, setFinancialTrends] = useState<FinancialTrend[]>([]);
  const [occupancyTrends, setOccupancyTrends] = useState<OccupancyTrend[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (buildings && buildings.length > 0) {
      loadAnalyticsData();
    }
  }, [dateRange, period, selectedBuildingId, buildings]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const data = await response.json();
      if (data.success) {
        setBuildings(data.data.buildings);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      const filters: AnalyticsFilter = {
        buildingId: selectedBuildingId || undefined,
        dateRange,
        period
      };

      const baseParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period
      });

      if (selectedBuildingId) {
        baseParams.append('buildingId', selectedBuildingId);
      }

      // Fetch all analytics data in parallel
      const [
        dashboardResponse,
        trendsResponse,
        occupancyResponse,
        cashFlowResponse
      ] = await Promise.all([
        fetch(`/api/analytics?${baseParams}&type=dashboard`),
        fetch(`/api/analytics?${baseParams}&type=financial-trends`),
        fetch(`/api/analytics?${baseParams}&type=occupancy-trends`),
        fetch(`/api/analytics?${baseParams}&type=cash-flow`)
      ]);

      const [
        dashboardData,
        trendsData,
        occupancyData,
        cashFlowDataResponse
      ] = await Promise.all([
        dashboardResponse.json(),
        trendsResponse.json(),
        occupancyResponse.json(),
        cashFlowResponse.json()
      ]);

      if (dashboardData.success) setMetrics(dashboardData.data);
      if (trendsData.success) setFinancialTrends(trendsData.data);
      if (occupancyData.success) setOccupancyTrends(occupancyData.data);
      if (cashFlowDataResponse.success) setCashFlowData(cashFlowDataResponse.data);

    } catch (error) {
      console.error('Error loading analytics:', error);
      addNotification('Failed to load analytics data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalyticsData();
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      addNotification(`Generating ${format.toUpperCase()} export...`);

      if (!metrics) {
        addNotification('No analytics data to export yet. Refresh and try again.');
        return;
      }

      // CSV of currently loaded metrics (honest client-side export)
      // PDF/Excel fall back to the same CSV payload with a clear filename.
      const rows: string[][] = [
        ['Section', 'Metric', 'Value'],
        ['Financial', 'Total Revenue', String(metrics.financial?.totalRevenue ?? '')],
        ['Financial', 'Total Expenses', String(metrics.financial?.totalExpenses ?? '')],
        ['Financial', 'Net Income', String(metrics.financial?.netIncome ?? '')],
        ['Occupancy', 'Occupancy Rate', String(metrics.occupancy?.occupancyRate ?? '')],
        ['Occupancy', 'Occupied Units', String(metrics.occupancy?.occupiedUnits ?? '')],
        ['Occupancy', 'Vacant Units', String(metrics.occupancy?.vacantUnits ?? '')],
        ['Tenants', 'Active Tenants', String(metrics.tenant?.activeTenants ?? '')],
        ['Exported At', 'Timestamp', new Date().toISOString()],
        ['Format Requested', 'format', format],
      ];

      const csv = rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.${
        format === 'csv' ? 'csv' : format === 'excel' ? 'csv' : 'csv'
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addNotification(
        format === 'csv'
          ? 'Analytics CSV downloaded'
          : `${format.toUpperCase()} export downloaded as CSV (native ${format.toUpperCase()} not yet available)`
      );
    } catch (error) {
      addNotification('Failed to export analytics report');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'occupancy', label: 'Occupancy', icon: Home },
    { id: 'buildings', label: 'Buildings', icon: Building }
  ];

  if (isLoading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} showHeader={false} lines={2} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonCard showHeader={true} lines={8} />
              <SkeletonCard showHeader={true} lines={8} />
            </div>
            <SkeletonCard showHeader={true} lines={10} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Analytics & Reporting
              </h1>
              <p className="mt-1 text-sm text-gray-900">
                Comprehensive insights into your property management business
              </p>
            </div>
            <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <select
                onChange={(e) => handleExport(e.target.value as 'pdf' | 'excel' | 'csv')}
                defaultValue=""
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <option value="" disabled>Export</option>
                <option value="pdf">Export PDF</option>
                <option value="excel">Export Excel</option>
                <option value="csv">Export CSV</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Building
              </label>
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Buildings</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            {activeTab === 'overview' && metrics && (
              <div className="p-6 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Revenue"
                value={metrics.financial.totalRevenue}
                format="currency"
                icon={<DollarSign className="h-5 w-5 text-green-600" />}
              />
              <MetricCard
                title="Net Income"
                value={metrics.financial.netIncome}
                format="currency"
                icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              />
              <MetricCard
                title="Occupancy Rate"
                value={metrics.occupancy.occupancyRate}
                format="percentage"
                icon={<Home className="h-5 w-5 text-purple-600" />}
              />
              <MetricCard
                title="Active Tenants"
                value={metrics.tenant.activeTenants}
                icon={<Users className="h-5 w-5 text-orange-600" />}
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow border p-6">
                <FinancialTrendChart data={financialTrends} height={300} />
              </div>
              <div className="bg-white rounded-lg shadow border p-6">
                <OccupancyChart data={occupancyTrends} height={300} />
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow border p-6">
                <UtilityBreakdownChart data={metrics.utility.utilityTypes} height={300} />
              </div>
              <div className="bg-white rounded-lg shadow border p-6">
                <CashFlowChart data={cashFlowData} height={300} />
              </div>
            </div>
              </div>
            )}

            {activeTab === 'financial' && metrics && (
              <div className="p-6 space-y-6">
            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Total Revenue"
                value={metrics.financial.totalRevenue}
                format="currency"
                icon={<DollarSign className="h-5 w-5 text-green-600" />}
              />
              <MetricCard
                title="Total Expenses"
                value={metrics.financial.totalExpenses}
                format="currency"
                icon={<DollarSign className="h-5 w-5 text-red-600" />}
              />
              <MetricCard
                title="Profit Margin"
                value={metrics.financial.profitMargin}
                format="percentage"
                icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              />
            </div>

            {/* Financial Charts */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow border p-6">
                <FinancialTrendChart data={financialTrends} height={400} />
              </div>
              <div className="bg-white rounded-lg shadow border p-6">
                <CashFlowChart data={cashFlowData} height={400} />
              </div>
            </div>
              </div>
            )}

            {activeTab === 'occupancy' && metrics && (
              <div className="p-6 space-y-6">
            {/* Occupancy Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard
                title="Total Units"
                value={metrics.occupancy.totalUnits}
                icon={<Home className="h-5 w-5 text-blue-600" />}
              />
              <MetricCard
                title="Occupied Units"
                value={metrics.occupancy.occupiedUnits}
                icon={<Users className="h-5 w-5 text-green-600" />}
              />
              <MetricCard
                title="Vacant Units"
                value={metrics.occupancy.vacantUnits}
                icon={<Home className="h-5 w-5 text-red-600" />}
              />
              <MetricCard
                title="Average Rent"
                value={metrics.occupancy.averageRent}
                format="currency"
                icon={<DollarSign className="h-5 w-5 text-purple-600" />}
              />
            </div>

            {/* Occupancy Chart */}
            <div className="bg-white rounded-lg shadow border p-6">
              <OccupancyChart data={occupancyTrends} height={400} />
            </div>
              </div>
            )}

            {activeTab === 'buildings' && metrics && (
              <div className="p-6 space-y-6">
            {/* Building Performance Chart */}
            <div className="bg-white rounded-lg shadow border p-6">
              <BuildingPerformanceChart data={metrics.buildings} height={400} />
            </div>

            {/* Building Performance Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Building Performance Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Building
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Occupancy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Expenses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Net Income
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        ROI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.buildings.map((building) => (
                      <tr key={building.buildingId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {building.buildingName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {building.occupancyRate.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${building.totalRevenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${building.totalExpenses.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${building.netIncome.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {building.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 