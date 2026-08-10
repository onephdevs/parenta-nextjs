'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileType,
  Calendar,
  Loader2,
  CheckCircle2,
  Users,
  Filter,
  Printer
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { MetricTile } from '@/components/ui/MetricTile';

export default function TenantListReportPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [buildingId, setBuildingId] = useState<string>('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }
  }, [session, status]);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const data = await response.json();
      if (data.success) {
        const list = Array.isArray(data.data?.buildings)
          ? data.data.buildings
          : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.buildings)
              ? data.buildings
              : [];
        setBuildings(list);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (buildingId) params.append('buildingId', buildingId);
      
      const response = await fetch(`/api/reports/tenant-list?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Report Generated',
          message: 'Tenant list report generated successfully',
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
          reportType: 'tenant-list',
          data: reportData,
          filename: `tenant-list-report-${new Date().toISOString().split('T')[0]}`,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant-list-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
      <PageHeader
        title="Tenant List Report"
        description="List of tenants with balances and past due status"
        backHref="/admin/reports"
        backLabel="Back to Reports"
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
              <Button
                variant="outline"
                onClick={handlePrint}
                leftIcon={<Printer className="h-4 w-4" />}
              >
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Tenant Status" htmlFor="statusFilter">
            <Select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <FormField label="Building" htmlFor="buildingId">
            <Select
              id="buildingId"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricTile
                tone="blue"
                label="Total Tenants"
                value={reportData.summary.totalTenants}
              />
              <MetricTile
                tone="yellow"
                label="Total Balance"
                value={formatCurrency(reportData.summary.totalBalance)}
              />
              <MetricTile
                tone="red"
                label="Total Past Due"
                value={formatCurrency(reportData.summary.totalPastDue)}
              />
              <MetricTile
                tone="green"
                label="Tenants with Balance"
                value={reportData.summary.tenantsWithBalance}
              />
            </div>
          </div>
        )}

        {/* Report Table */}
        {reportData && reportData.tenants && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tenant Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Past Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Past Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {tenant.firstName} {tenant.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.roomNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.buildingName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(tenant.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(tenant.pastDueAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.daysPastDue > 0 ? `${tenant.daysPastDue} days` : 'Current'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.daysPastDue > 0 
                            ? 'bg-red-100 text-red-800' 
                            : tenant.balance > 0 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {tenant.daysPastDue > 0 ? 'Past Due' : tenant.balance > 0 ? 'Balance Due' : 'Current'}
                        </span>
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
            <SkeletonCard showHeader={true} lines={8} />
          </div>
        )}

        {!reportData && !isGenerating && (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Generate a report to view tenant list data</p>
          </Card>
        )}
    </div>
  );
}
