'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileType,
  Calendar,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import SkeletonCard from '@/components/ui/SkeletonCard';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reportType, setReportType] = useState<'payments' | 'invoices' | 'summary'>('payments');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const { showNotification } = useNotifications();

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/tenant/signin');
    }
  }, [status, router]);

  // Set default date range (last 3 months) — must run unconditionally (Rules of Hooks)
  React.useEffect(() => {
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    setDateFrom(threeMonthsAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SkeletonCard showHeader={true} lines={5} />
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'tenant') {
    return null; // Will redirect via useEffect
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      const params = new URLSearchParams({
        type: reportType,
      });
      
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      const response = await fetch(`/api/tenant/reports?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Report Generated',
          message: 'Report data loaded successfully',
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
        message: 'Failed to generate report',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/tenant/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          format,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        }),
      });

      if (response.ok) {
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${dateFrom || 'all'}-${dateTo || 'all'}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification({
          type: 'success',
          title: 'Export Started',
          message: `Report exported as ${format.toUpperCase()}`,
        });
      } else {
        const data = await response.json();
        showNotification({
          type: 'error',
          title: 'Export Failed',
          message: data.error || 'Failed to export report',
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/tenant"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <PageHeader
        title="Reports"
        description="Generate and download your financial reports"
      />
          <div className="space-y-6">
            {/* Report Configuration */}
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Report Type" htmlFor="reportType">
                  <Select
                    id="reportType"
                    value={reportType}
                    onChange={(e) => {
                      setReportType(e.target.value as 'payments' | 'invoices' | 'summary');
                      setReportData(null);
                    }}
                  >
                    <option value="payments">Payment History</option>
                    <option value="invoices">Invoice History</option>
                    <option value="summary">Financial Summary</option>
                  </Select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="From Date" htmlFor="dateFrom">
                    <Input
                      type="date"
                      id="dateFrom"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </FormField>
                  <FormField label="To Date" htmlFor="dateTo">
                    <Input
                      type="date"
                      id="dateTo"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex items-center justify-end mt-6">
                <Button
                  variant="success"
                  onClick={handleGenerateReport}
                  isLoading={isGenerating}
                  leftIcon={!isGenerating ? <FileText className="h-4 w-4" /> : undefined}
                >
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </Card>

            {/* Report Preview */}
            {reportData && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Report Preview</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleExport('excel')}
                      isLoading={isExporting}
                      leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                    >
                      Export Excel
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => handleExport('pdf')}
                      isLoading={isExporting}
                      leftIcon={<FileType className="h-4 w-4" />}
                    >
                      Export PDF
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                {reportData.summary && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(reportData.summary).map(([key, value]) => {
                        if (key === 'period' || key === 'tenantName') return null;
                        return (
                          <div key={key}>
                            <p className="text-sm text-gray-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {typeof value === 'number' && key.toLowerCase().includes('amount')
                                ? formatCurrency(value)
                                : String(value ?? '')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Payments Table */}
                {reportData.payments && reportData.payments.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Method</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.payments.map((payment: any) => (
                          <tr key={payment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.paymentMethod}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.paymentType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                              {payment.referenceNumber || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Invoices Table */}
                {reportData.invoices && reportData.invoices.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Issue Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Total</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Paid</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Balance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.invoices.map((invoice: any) => (
                          <tr key={invoice.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(invoice.issueDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(invoice.dueDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(invoice.amountPaid)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.balanceDue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty State */}
                {(!reportData.payments || reportData.payments.length === 0) &&
                 (!reportData.invoices || reportData.invoices.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No data available for the selected period</p>
                  </div>
                )}
              </Card>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">How to Use Reports</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Select a report type (Payment History, Invoice History, or Financial Summary)</li>
                <li>• Choose a date range to filter the data</li>
                <li>• Click "Generate Report" to preview the data</li>
                <li>• Export as Excel (.xlsx) for spreadsheet analysis</li>
                <li>• Export as PDF (.pdf) for printing or sharing</li>
                <li>• Reports include all your financial transactions within the selected period</li>
              </ul>
            </div>
          </div>
    </div>
  );
}
