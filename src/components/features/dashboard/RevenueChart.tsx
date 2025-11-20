'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: any;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  // Mock data for demonstration - in real app, this would come from API
  const chartData = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 52000 },
    { month: 'Mar', revenue: 48000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 55000 },
    { month: 'Jun', revenue: 67000 },
    { month: 'Jul', revenue: 72000 },
    { month: 'Aug', revenue: 68000 },
    { month: 'Sep', revenue: 74000 },
    { month: 'Oct', revenue: 79000 },
    { month: 'Nov', revenue: 85000 },
    { month: 'Dec', revenue: data?.monthly || 90000 },
  ];

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Monthly Revenue Trend
        </h3>
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

