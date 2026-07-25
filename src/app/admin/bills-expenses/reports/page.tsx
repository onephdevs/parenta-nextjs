'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileType,
  Calendar,
  Loader2,
  Filter,
  Printer,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';

export default function ExpenseReportsPage() {
  const { showNotification } = useNotifications();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'semi-annual' | 'annual'>('monthly');
  const [category, setCategory] = useState<string>('');
  const [buildingId, setBuildingId] = useState<string>('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    // Set default date range (last month)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        let buildingsList: any[] = [];
        
        if (data.success && data.data) {
          // Handle { success: true, data: { buildings: [...] } } format
          if (data.data.buildings && Array.isArray(data.data.buildings)) {
            buildingsList = data.data.buildings;
          } else if (Array.isArray(data.data)) {
            buildingsList = data.data;
          }
        } else if (Array.isArray(data)) {
          buildingsList = data;
        } else if (data.buildings) {
          buildingsList = data.buildings;
        }
        
        setBuildings(buildingsList);
      } else {
        setBuildings([]);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setBuildings([]);
    }
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      showNotification({
        type: 'warning',
        title: 'Date Required',
        message: 'Please select both start and end dates',
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        periodType,
      });
      if (category) params.append('category', category);
      if (buildingId) params.append('buildingId', buildingId);
      
      const response = await fetch(`/api/reports/expenses?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Report Generated',
          message: 'Expense report generated successfully',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to generate report',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate report. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!reportData) {
      showNotification({
        type: 'warning',
        title: 'No Data',
        message: 'Please generate the report first',
      });
      return;
    }

    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'expenses',
          data: reportData,
          filename: `expense-report-${new Date().toISOString().split('T')[0]}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification({
        type: 'success',
        title: 'Export Successful',
        message: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export report',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const expenseCategories = [
    'cleaning',
    'maintenance',
    'repair',
    'upgrade',
    'garbage_collection',
    'utilities',
    'supplies',
    'services',
    'insurance',
    'taxes',
    'other',
  ];

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/bills-expenses"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Bills & Expenses
      </Link>
      <PageHeader
        title="Expense Reports"
        description="Generate detailed expense reports by period"
        actions={
          reportData ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                isLoading={isExporting}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                isLoading={isExporting}
                leftIcon={<FileType className="h-4 w-4" />}
              >
                Export PDF
              </Button>
              <Button variant="outline" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
                Print
              </Button>
            </>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
        </CardHeader>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const lastMonth = new Date();
              lastMonth.setMonth(today.getMonth() - 1);
              lastMonth.setDate(1);
              const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
              setStartDate(lastMonth.toISOString().split('T')[0]);
              setEndDate(lastDayOfMonth.toISOString().split('T')[0]);
            }}
          >
            Last Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const last3Months = new Date();
              last3Months.setMonth(today.getMonth() - 3);
              setStartDate(last3Months.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
          >
            Last 3 Months
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const last6Months = new Date();
              last6Months.setMonth(today.getMonth() - 6);
              setStartDate(last6Months.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
          >
            Last 6 Months
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const thisYear = new Date(today.getFullYear(), 0, 1);
              setStartDate(thisYear.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
          >
            This Year
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const lastYear = new Date(today.getFullYear() - 1, 0, 1);
              const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
              setStartDate(lastYear.toISOString().split('T')[0]);
              setEndDate(lastYearEnd.toISOString().split('T')[0]);
            }}
          >
            Last Year
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <FormField label="Start Date" htmlFor="startDate">
            <Input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min="2000-01-01"
              max="2099-12-31"
            />
          </FormField>
          <FormField label="End Date" htmlFor="endDate">
            <Input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || '2000-01-01'}
              max="2099-12-31"
            />
          </FormField>
          <FormField label="Period Type" htmlFor="periodType">
            <Select
              id="periodType"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as typeof periodType)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </Select>
          </FormField>
          <FormField label="Category" htmlFor="category">
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Building" htmlFor="buildingId">
            <Select
              id="buildingId"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">All Buildings</option>
              {buildings && Array.isArray(buildings) && buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name || building.building_name || building.buildingName || 'Unknown'}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex items-end">
            <Button
              onClick={handleGenerateReport}
              isLoading={isGenerating}
              className="w-full"
              leftIcon={!isGenerating ? <FileText className="h-4 w-4" /> : undefined}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Card>

        {/* Report Summary */}
        {reportData && reportData.summary && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.totalExpenses)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Count</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalCount}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Average Expense</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.averageExpense)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Period</p>
                <p className="text-sm font-medium text-gray-900">{reportData.summary.period}</p>
                <p className="text-xs text-gray-600 mt-1">{reportData.summary.periodType}</p>
              </div>
            </div>
          </div>
        )}

        {/* By Period Table */}
        {reportData && reportData.byPeriod && reportData.byPeriod.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Expenses by Period</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.byPeriod.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Category */}
        {reportData && reportData.byCategory && reportData.byCategory.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Expenses by Category</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.byCategory.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Building */}
        {reportData && reportData.byBuilding && reportData.byBuilding.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Expenses by Building</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.byBuilding.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.buildingName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expense Details */}
        {reportData && reportData.details && reportData.details.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Expense Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.details.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(item.expenseDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.buildingName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.vendorName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.expenseStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          item.expenseStatus === 'approved' ? 'bg-blue-100 text-blue-800' :
                          item.expenseStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.expenseStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!reportData && !isGenerating && (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-sm text-gray-900 mb-4">Select date range and period type, then click &quot;Generate Report&quot;</p>
          </Card>
        )}

        {isGenerating && (
          <Card className="p-12">
            <SkeletonCard />
          </Card>
        )}
    </div>
  );
}
