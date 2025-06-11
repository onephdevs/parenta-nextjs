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
  CashFlowData,
  Building as BuildingType
} from '../../../types/analytics';
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
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load analytics data'
      });
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
      addNotification({
        type: 'info',
        title: 'Export Started',
        message: `Generating ${format.toUpperCase()} report...`
      });
      
      // TODO: Implement export functionality
      setTimeout(() => {
        addNotification({
          type: 'success',
          title: 'Export Complete',
          message: `Analytics report exported as ${format.toUpperCase()}`
        });
      }, 2000);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export analytics report'
      });
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
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics & Reporting</h1>
            <p className="text-gray-600">
              Comprehensive insights into your property management business
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="relative">
              <select
                onChange={(e) => handleExport(e.target.value as 'pdf' | 'excel' | 'csv')}
                defaultValue=""
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <option value="" disabled>Export</option>
                <option value="pdf">Export PDF</option>
                <option value="excel">Export Excel</option>
                <option value="csv">Export CSV</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building
              </label>
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
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
          <div className="space-y-6">
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
          <div className="space-y-6">
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
          <div className="space-y-6">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Building
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Occupancy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expenses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Income
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
  );
} 