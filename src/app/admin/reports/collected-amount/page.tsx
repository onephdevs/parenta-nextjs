'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
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
  DollarSign
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { MetricTile } from '@/components/ui/MetricTile';

export default function CollectedAmountReportPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'semi-annual' | 'annual'>('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCommittingLifetime, setIsCommittingLifetime] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }
    
    // Set default date range (last month)
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, [session, status]);

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
      
      const response = await fetch(`/api/reports/collected-amount?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Report Generated',
          message: 'Collected amount report generated successfully',
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

  const handleCommitLifetime = async () => {
    if (!startDate || !endDate) return;
    setIsCommittingLifetime(true);
    try {
      const response = await fetch(
        '/api/reports/collected-amount/commit-lifetime',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setReportData((prev: any) =>
          prev
            ? {
                ...prev,
                lifetime: {
                  previousTotal: data.data.previousTotal,
                  currentPeriodCollection: data.data.currentPeriodCollection,
                  overallCollection: data.data.overallCollection,
                  alreadyCommitted: true,
                  asOfDate: data.data.asOfDate,
                },
              }
            : prev
        );
        showNotification({
          type: 'success',
          title: 'Lifetime Updated',
          message: data.message || 'Period committed to running total',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to commit lifetime total',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to commit lifetime total',
      });
    } finally {
      setIsCommittingLifetime(false);
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
          reportType: 'collected-amount',
          data: reportData,
          filename: `collected-amount-report-${new Date().toISOString().split('T')[0]}`,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `collected-amount-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification({
          type: 'success',
          title: 'Export Successful',
          message: `Report exported as ${format.toUpperCase()}`,
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Export Failed',
          message: 'Failed to export report',
        });
      }
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/reports"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Reports
      </Link>
      <PageHeader
        title="Collected Amount Report"
        description="Received/Collected amount per period"
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
              const last7Days = new Date();
              last7Days.setDate(today.getDate() - 7);
              setStartDate(last7Days.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const last30Days = new Date();
              last30Days.setDate(today.getDate() - 30);
              setStartDate(last30Days.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
          >
            Last 30 Days
          </Button>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField label="Start Date" htmlFor="startDate">
            <Input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>
          <FormField label="End Date" htmlFor="endDate">
            <Input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricTile
                tone="blue"
                label="Total Collected"
                value={formatCurrency(reportData.summary.totalCollected)}
              />
              <MetricTile
                tone="green"
                label="Total Payments"
                value={reportData.summary.totalPayments}
              />
              <MetricTile
                tone="yellow"
                label="Average Payment"
                value={formatCurrency(reportData.summary.averagePayment)}
              />
              {reportData.summary.growth !== undefined && (
                <MetricTile
                  tone={reportData.summary.growth >= 0 ? 'green' : 'red'}
                  label="Growth vs Previous"
                  value={`${reportData.summary.growth >= 0 ? '+' : ''}${reportData.summary.growth.toFixed(2)}%`}
                />
              )}
            </div>
          </div>
        )}

        {reportData && reportData.lifetime && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Lifetime collection (running total)
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Previous Total + Current Period = Overall Collection (persisted,
                  not recalculated from scratch)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={reportData.lifetime.alreadyCommitted || isCommittingLifetime}
                onClick={handleCommitLifetime}
              >
                {isCommittingLifetime
                  ? 'Committing…'
                  : reportData.lifetime.alreadyCommitted
                    ? 'Period already committed'
                    : 'Commit period to lifetime'}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricTile
                label="Previous Total Collection"
                value={formatCurrency(reportData.lifetime.previousTotal)}
              />
              <MetricTile
                tone="blue"
                label="Current Period"
                value={formatCurrency(reportData.lifetime.currentPeriodCollection)}
              />
              <MetricTile
                tone="green"
                label="Overall Collection"
                value={formatCurrency(reportData.lifetime.overallCollection)}
              />
            </div>
          </div>
        )}

        {/* By Period Table */}
        {reportData && reportData.byPeriod && reportData.byPeriod.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Collected by Period</h2>
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
                      Payments
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

        {/* By Payment Method */}
        {reportData && reportData.byPaymentMethod && reportData.byPaymentMethod.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">By Payment Method</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
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
                  {reportData.byPaymentMethod.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.method}
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

        {isGenerating && (
          <div className="space-y-6">
            <SkeletonCard showHeader={true} lines={4} />
            <SkeletonCard showHeader={true} lines={6} />
          </div>
        )}

        {!reportData && !isGenerating && (
          <Card className="p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Generate a report to view collected amount data</p>
          </Card>
        )}
    </div>
  );
}
