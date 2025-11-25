'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { ChartConfiguration } from '../../types/analytics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartProps {
  config: ChartConfiguration;
  height?: number;
  className?: string;
}

// Color schemes for different chart types
const colorSchemes = {
  primary: [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ],
  gradient: [
    'rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)', 'rgba(139, 92, 246, 0.8)'
  ],
  light: [
    'rgba(59, 130, 246, 0.2)', 'rgba(239, 68, 68, 0.2)', 'rgba(16, 185, 129, 0.2)',
    'rgba(245, 158, 11, 0.2)', 'rgba(139, 92, 246, 0.2)'
  ]
};

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
};

export function AnalyticsChart({ config, height = 400, className = '' }: ChartProps) {
  const chartData = {
    labels: config.labels || [],
    datasets: config.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || 
        (config.type === 'pie' || config.type === 'doughnut' 
          ? colorSchemes.primary.slice(0, (dataset.data as number[]).length)
          : colorSchemes.gradient[index % colorSchemes.gradient.length]
        ),
      borderColor: dataset.borderColor || colorSchemes.primary[index % colorSchemes.primary.length],
      borderWidth: dataset.borderWidth || (config.type === 'line' ? 2 : 1),
      fill: dataset.fill !== undefined ? dataset.fill : config.type === 'area',
    }))
  };

  const chartOptions = {
    ...defaultOptions,
    ...config.options,
    plugins: {
      ...defaultOptions.plugins,
      ...config.options?.plugins,
      title: {
        display: true,
        text: config.title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: 20,
      },
    },
  };

  const containerClasses = `relative ${className}`;
  const style = { height: `${height}px` };

  switch (config.type) {
    case 'line':
    case 'area':
      return (
        <div className={containerClasses} style={style}>
          <Line data={chartData} options={chartOptions} />
        </div>
      );
    
    case 'bar':
      return (
        <div className={containerClasses} style={style}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      );
    
    case 'pie':
      return (
        <div className={containerClasses} style={style}>
          <Pie data={chartData} options={chartOptions} />
        </div>
      );
    
    case 'doughnut':
      return (
        <div className={containerClasses} style={style}>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      );
    
    default:
      return (
        <div className={containerClasses} style={style}>
          <Line data={chartData} options={chartOptions} />
        </div>
      );
  }
}

// Specialized chart components for common use cases

interface FinancialTrendChartProps {
  data: Array<{
    date: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
  height?: number;
}

export function FinancialTrendChart({ data, height = 400 }: FinancialTrendChartProps) {
  const config: ChartConfiguration = {
    type: 'line',
    title: 'Financial Trends',
    labels: data.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Revenue',
        data: data.map(item => item.revenue),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
      },
      {
        label: 'Expenses',
        data: data.map(item => item.expenses),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
      },
      {
        label: 'Net Income',
        data: data.map(item => item.netIncome),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
      },
    ],
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + Number(value).toLocaleString();
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': $' + Number(context.parsed.y).toLocaleString();
            }
          }
        }
      }
    }
  };

  return <AnalyticsChart config={config} height={height} />;
}

interface OccupancyChartProps {
  data: Array<{
    date: string;
    occupancyRate: number;
    totalUnits: number;
    occupiedUnits: number;
  }>;
  height?: number;
}

export function OccupancyChart({ data, height = 400 }: OccupancyChartProps) {
  const config: ChartConfiguration = {
    type: 'area',
    title: 'Occupancy Rate Trends',
    labels: data.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Occupancy Rate (%)',
        data: data.map(item => item.occupancyRate),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: true,
      },
    ],
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const dataPoint = data[context.dataIndex];
              return [
                `Occupancy Rate: ${context.parsed.y.toFixed(1)}%`,
                `Occupied: ${dataPoint.occupiedUnits}/${dataPoint.totalUnits} units`
              ];
            }
          }
        }
      }
    }
  };

  return <AnalyticsChart config={config} height={height} />;
}

interface UtilityBreakdownChartProps {
  data: Array<{
    type: string;
    cost: number;
    percentage: number;
  }>;
  height?: number;
}

export function UtilityBreakdownChart({ data, height = 300 }: UtilityBreakdownChartProps) {
  const config: ChartConfiguration = {
    type: 'doughnut',
    title: 'Utility Cost Breakdown',
    labels: data.map(item => item.type.charAt(0).toUpperCase() + item.type.slice(1)),
    datasets: [
      {
        label: 'Cost',
        data: data.map(item => item.cost),
        backgroundColor: colorSchemes.primary.slice(0, data.length),
      },
    ],
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = data[context.dataIndex];
              return [
                `${context.label}: $${Number(context.parsed).toLocaleString()}`,
                `${item.percentage.toFixed(1)}% of total`
              ];
            }
          }
        }
      }
    }
  };

  return <AnalyticsChart config={config} height={height} />;
}

interface BuildingPerformanceChartProps {
  data: Array<{
    buildingName: string;
    occupancyRate: number;
    netIncome: number;
    roi: number;
  }>;
  height?: number;
}

export function BuildingPerformanceChart({ data, height = 400 }: BuildingPerformanceChartProps) {
  const config: ChartConfiguration = {
    type: 'bar',
    title: 'Building Performance Comparison',
    labels: data.map(item => item.buildingName),
    datasets: [
      {
        label: 'Occupancy Rate (%)',
        data: data.map(item => item.occupancyRate),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
      {
        label: 'ROI (%)',
        data: data.map(item => item.roi),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const building = data[context.dataIndex];
              return [
                `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`,
                `Net Income: $${Number(building.netIncome).toLocaleString()}`
              ];
            }
          }
        }
      }
    }
  };

  return <AnalyticsChart config={config} height={height} />;
}

interface CashFlowChartProps {
  data: Array<{
    date: string;
    inflow: number;
    outflow: number;
    netFlow: number;
    cumulativeFlow: number;
  }>;
  height?: number;
}

export function CashFlowChart({ data, height = 400 }: CashFlowChartProps) {
  const config: ChartConfiguration = {
    type: 'bar',
    title: 'Cash Flow Analysis',
    labels: data.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Cash Inflow',
        data: data.map(item => item.inflow),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
      {
        label: 'Cash Outflow',
        data: data.map(item => -item.outflow), // Negative for visual distinction
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
    options: {
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return '$' + Math.abs(Number(value)).toLocaleString();
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const item = data[context.dataIndex];
              const value = Math.abs(context.parsed.y);
              const isOutflow = context.datasetIndex === 1;
              return [
                `${context.dataset.label}: $${value.toLocaleString()}`,
                `Net Flow: $${item.netFlow.toLocaleString()}`,
                `Cumulative: $${item.cumulativeFlow.toLocaleString()}`
              ];
            }
          }
        }
      }
    }
  };

  return <AnalyticsChart config={config} height={height} />;
}

// Metric card with trend indicator
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
}

export function MetricCard({ title, value, change, icon, format = 'number' }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return '$' + val.toLocaleString();
      case 'percentage':
        return val.toFixed(1) + '%';
      default:
        return val.toLocaleString();
    }
  };

  const getChangeColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  const getChangeIcon = (direction: string) => {
    switch (direction) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatValue(value)}
          </p>
          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${getChangeColor(change.direction)}`}>
                {getChangeIcon(change.direction)} {Math.abs(change.percentage).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-900 ml-2">
                from previous period
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 