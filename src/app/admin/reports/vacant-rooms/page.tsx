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
  Loader2,
  Filter,
  Printer,
  Home,
  Building2
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import SkeletonCard from '@/components/ui/SkeletonCard';

export default function VacantRoomsReportPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [buildingId, setBuildingId] = useState<string>('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin?role=admin');
    }
    
    fetchBuildings();
  }, [session, status]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const data = await response.json();
      if (data.success) {
        setBuildings(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      const params = new URLSearchParams();
      if (buildingId) params.append('buildingId', buildingId);
      
      const response = await fetch(`/api/reports/vacant-rooms?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Report Generated',
          message: 'Vacant rooms report generated successfully',
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
          reportType: 'vacant-rooms',
          data: reportData,
          filename: `vacant-rooms-report-${new Date().toISOString().split('T')[0]}`,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vacant-rooms-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/reports"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vacant Rooms Report</h1>
                <p className="text-sm text-gray-600">List of vacant rooms/apartments</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {reportData && (
                <>
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={isExporting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export Excel'}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileType className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building
              </label>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Buildings</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Summary */}
        {reportData && reportData.summary && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Vacant</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalVacant}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalRooms}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Vacancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.summary.vacancyRate.toFixed(1)}%</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Potential Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.totalPotentialRevenue)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rooms Table */}
        {reportData && reportData.rooms && reportData.rooms.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Vacant Rooms</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Floor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monthly Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Vacant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Tenant
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.rooms.map((room: any) => (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/rooms/${room.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {room.roomNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.buildingName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.floorNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.roomType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(room.monthlyRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.daysVacant ? `${room.daysVacant} days` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {room.lastTenantName || 'N/A'}
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Generate a report to view vacant rooms data</p>
          </div>
        )}
      </div>
    </div>
  );
}
