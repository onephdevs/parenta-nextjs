'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; payments: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  // Use real data from database
  const chartData = data && data.length > 0 
    ? data 
    : [];

  if (chartData.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Monthly Revenue Trend
          </h3>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No revenue data available for the last 12 months
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Monthly Revenue Trend
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Last 12 months of payment data
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `₱${value.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

