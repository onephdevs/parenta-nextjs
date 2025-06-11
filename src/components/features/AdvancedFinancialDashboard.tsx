'use client';

import { useState, useEffect } from 'react';
import { AdvancedFinancialMetrics } from '@/types/analytics';

export default function AdvancedFinancialDashboard() {
  const [metrics, setMetrics] = useState<AdvancedFinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('6months');

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/financial-analytics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching advanced financial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'cashflow', name: 'Cash Flow Forecast', icon: '💰' },
    { id: 'roi', name: 'ROI Analysis', icon: '📈' },
    { id: 'benchmarks', name: 'Benchmarks', icon: '🎯' },
    { id: 'ratios', name: 'Financial Ratios', icon: '📋' },
  ];

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center text-gray-500">Failed to load analytics data</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Summary */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Properties:</span>
                    <span className="font-semibold">{metrics.summary.totalProperties}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Portfolio Value:</span>
                    <span className="font-semibold">{formatCurrency(metrics.summary.portfolioValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Net Income:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(metrics.summary.monthlyNetIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average ROI:</span>
                    <span className="font-semibold text-blue-600">{formatPercentage(metrics.summary.averageROI)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Occupancy Rate:</span>
                    <span className="font-semibold text-purple-600">{formatPercentage(metrics.summary.occupancyRate)}</span>
                  </div>
                </div>
              </div>

              {/* Recent Performance */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Metrics Trends</h3>
                <div className="space-y-4">
                  {metrics.financialRatios.slice(0, 3).map((ratio, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{ratio.name}</div>
                        <div className="text-xs text-gray-500">{ratio.description}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-semibold ${
                          ratio.status === 'good' ? 'text-green-600' : 
                          ratio.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {ratio.unit === 'percentage' ? formatPercentage(ratio.value) : ratio.value.toFixed(2)}
                        </span>
                        <span className={`text-xs ${
                          ratio.trend === 'up' ? 'text-green-500' : 
                          ratio.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {ratio.trend === 'up' ? '↗' : ratio.trend === 'down' ? '↘' : '→'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Expense vs Revenue Analysis */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Expense vs Revenue Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Sources</h4>
                  {metrics.revenueAnalysis.map((revenue, index) => (
                    <div key={index} className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{revenue.source}</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(revenue.currentPeriod)}</div>
                        <div className={`text-xs ${revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {revenue.growth >= 0 ? '+' : ''}{formatPercentage(revenue.growthPercentage)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Expense Categories</h4>
                  {metrics.expenseAnalysis.map((expense, index) => (
                    <div key={index} className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{expense.category}</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(expense.currentPeriod)}</div>
                        <div className={`text-xs ${expense.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {expense.variance >= 0 ? '+' : ''}{formatPercentage(expense.variancePercentage)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Flow Forecast Tab */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">12-Month Cash Flow Forecast</h3>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="6months">6 Months</option>
                <option value="12months">12 Months</option>
                <option value="24months">24 Months</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projected Inflow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projected Outflow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Cash Flow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.cashFlowForecast.map((forecast, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(forecast.period)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {formatCurrency(forecast.projectedInflow)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {formatCurrency(forecast.projectedOutflow)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                        forecast.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(forecast.netCashFlow)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          forecast.confidence === 'high' ? 'bg-green-100 text-green-800' :
                          forecast.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {forecast.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROI Analysis Tab */}
        {activeTab === 'roi' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Return on Investment Analysis</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {metrics.roiAnalysis.map((roi, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">{roi.buildingName}</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Investment:</span>
                      <span className="font-semibold">{formatCurrency(roi.totalInvestment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Revenue:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(roi.annualRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Expenses:</span>
                      <span className="font-semibold text-red-600">{formatCurrency(roi.annualExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Income:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(roi.netIncome)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROI:</span>
                      <span className="font-bold text-purple-600 text-lg">{formatPercentage(roi.roi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cap Rate:</span>
                      <span className="font-semibold">{formatPercentage(roi.capRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payback Period:</span>
                      <span className="font-semibold">{roi.paybackPeriod.toFixed(1)} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Return:</span>
                      <span className="font-semibold text-green-600">{formatPercentage(roi.totalReturn)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Performance Benchmarks</h3>
            
            <div className="space-y-4">
              {metrics.benchmarks.map((benchmark, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{benchmark.metric}</h4>
                      <p className="text-sm text-gray-500">{benchmark.industry} • {benchmark.region}</p>
                    </div>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      benchmark.trend === 'improving' ? 'bg-green-100 text-green-800' :
                      benchmark.trend === 'declining' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {benchmark.trend}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {benchmark.currentValue.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">Your Performance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {benchmark.benchmarkValue.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">Industry Benchmark</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        benchmark.variance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {benchmark.variance >= 0 ? '+' : ''}{benchmark.variance.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">Variance</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {benchmark.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Ratios Tab */}
        {activeTab === 'ratios' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Financial Ratios & KPIs</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {metrics.financialRatios.map((ratio, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{ratio.name}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ratio.status === 'good' ? 'bg-green-100 text-green-800' :
                      ratio.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {ratio.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{ratio.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {ratio.unit === 'percentage' ? formatPercentage(ratio.value) : ratio.value.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">Current Value</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-600">
                        {ratio.unit === 'percentage' ? formatPercentage(ratio.benchmark) : ratio.benchmark.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">Benchmark</div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">Trend:</span>
                    <span className={`text-sm font-medium ${
                      ratio.trend === 'up' ? 'text-green-600' : 
                      ratio.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {ratio.trend === 'up' ? '↗ Improving' : 
                       ratio.trend === 'down' ? '↘ Declining' : '→ Stable'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 