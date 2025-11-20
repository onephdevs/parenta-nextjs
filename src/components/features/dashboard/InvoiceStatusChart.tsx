'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InvoiceStatusChartProps {
  data: any;
}

const COLORS = {
  draft: '#9CA3AF',
  sent: '#3B82F6',
  partial: '#F59E0B',
  paid: '#10B981',
  overdue: '#EF4444',
  cancelled: '#6B7280',
};

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export default function InvoiceStatusChart({ data }: InvoiceStatusChartProps) {
  if (!data) return null;

  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([status, value]) => ({
      name: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
      value: value as number,
      color: COLORS[status as keyof typeof COLORS] || '#6B7280',
    }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Invoice Status Distribution
          </h3>
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No invoice data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Invoice Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

