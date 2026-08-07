'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, Clock } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

interface UtilizationData {
  utilizationRate: number;
  averageAssignmentDuration: number;
  mostUtilizedAssets: Array<{
    asset: { assetName: string; assetType: string };
    assignmentCount: number;
    totalDays: number;
  }>;
  underutilizedAssets: Array<{
    asset: { assetName: string; assetType: string };
    daysUnassigned: number;
  }>;
}

interface AssetUtilizationChartProps {
  refreshTrigger: number;
}

export function AssetUtilizationChart({ refreshTrigger }: AssetUtilizationChartProps) {
  const [data, setData] = useState<UtilizationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUtilizationData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/assets/stats?type=utilization');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          // Empty inventory is valid — show empty state, don't toast as hard failure
          setData({
            utilizationRate: 0,
            averageAssignmentDuration: 0,
            mostUtilizedAssets: [],
            underutilizedAssets: [],
          });
          if (result.error && !String(result.details || result.error).includes('division')) {
            console.warn('Utilization analytics:', result.error, result.details);
          }
        }
      } catch (error) {
        console.error('Error fetching utilization data:', error);
        setData({
          utilizationRate: 0,
          averageAssignmentDuration: 0,
          mostUtilizedAssets: [],
          underutilizedAssets: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUtilizationData();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading utilization" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-900">
          No utilization data available
        </div>
      </div>
    );
  }

  const utilizationChartData = [
    { name: 'Utilized', value: data.utilizationRate, color: '#3B82F6' },
    { name: 'Available', value: 100 - data.utilizationRate, color: '#E5E7EB' }
  ];

  const mostUtilizedChartData = data.mostUtilizedAssets.map(item => ({
    name: item.asset.assetName,
    assignments: item.assignmentCount,
    days: item.totalDays
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Utilization Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.utilizationRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-900">
                Assets currently assigned
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Avg Assignment Duration</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(data.averageAssignmentDuration)} days
              </p>
              <p className="text-sm text-gray-900">
                Average time per assignment
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Most Utilized Assets</p>
              <p className="text-2xl font-bold text-slate-600">
                {data.mostUtilizedAssets.length}
              </p>
              <p className="text-sm text-gray-900">
                High-demand assets
              </p>
            </div>
            <div className="bg-slate-600 p-3 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Rate Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Utilization</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={utilizationChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {utilizationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-900">Utilized ({data.utilizationRate.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
              <span className="text-sm text-gray-900">Available ({(100 - data.utilizationRate).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Most Utilized Assets */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Most Utilized Assets</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostUtilizedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    name === 'assignments' ? 'Assignments' : 'Total Days'
                  ]}
                />
                <Bar dataKey="assignments" fill="#3B82F6" name="assignments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Underutilized Assets Table */}
      {data.underutilizedAssets.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Underutilized Assets</h3>
            <p className="text-sm text-gray-900">Assets that haven&apos;t been assigned recently</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Asset Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Days Unassigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.underutilizedAssets.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.asset.assetName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {item.asset.assetType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.daysUnassigned} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.daysUnassigned > 90 
                          ? 'bg-red-100 text-red-800' 
                          : item.daysUnassigned > 30 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.daysUnassigned > 90 ? 'Critical' : 
                         item.daysUnassigned > 30 ? 'Attention' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 