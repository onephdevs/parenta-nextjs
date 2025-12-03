'use client';

import React, { useState, useEffect } from 'react';
import { ExportRequest, ReportBuilder } from '@/types/documents';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Settings,
  Plus,
  X,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface AdvancedExportManagerProps {
  onExportCreated?: () => void;
}

export default function AdvancedExportManager({ onExportCreated }: AdvancedExportManagerProps) {
  const [exports, setExports] = useState<ExportRequest[]>([]);
  const [builders, setBuilders] = useState<ReportBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exports');
  const [showExportForm, setShowExportForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exportsResponse, buildersResponse] = await Promise.all([
        fetch('/api/export?type=queue'),
        fetch('/api/export?type=builders'),
      ]);

      const exportsData = await exportsResponse.json();
      const buildersData = await buildersResponse.json();

      if (exportsData.success) setExports(exportsData.data.exports || []);
      if (buildersData.success) setBuilders(buildersData.data || []);
    } catch (error) {
      console.error('Error fetching export data:', error);
      addNotification('Failed to fetch export data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelExport = async (exportId: string) => {
    try {
      const response = await fetch('/api/export', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'export', id: exportId, status: 'cancelled' }),
      });

      if (response.ok) {
        addNotification('Export cancelled successfully', 'success');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error cancelling export:', error);
      addNotification('Failed to cancel export', 'error');
    }
  };

  const handleDeleteExport = async (exportId: string) => {
    if (!confirm('Are you sure you want to delete this export?')) return;

    try {
      const response = await fetch(`/api/export?type=export&id=${exportId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addNotification('Export deleted successfully', 'success');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error deleting export:', error);
      addNotification('Failed to delete export', 'error');
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(`/api/export?type=download&exportId=${exportId}`);
      const data = await response.json();

      if (data.success) {
        // Simulate download (in production, this would be an actual file download)
        addNotification('Download started', 'success');
        window.open(data.data.downloadUrl, '_blank');
      } else {
        addNotification(data.error || 'Download failed', 'error');
      }
    } catch (error) {
      console.error('Error downloading export:', error);
      addNotification('Failed to download export', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'exports', name: 'Export Queue', icon: '📤' },
    { id: 'reports', name: 'Custom Reports', icon: '📊' },
    { id: 'scheduled', name: 'Scheduled Exports', icon: '⏰' },
    { id: 'templates', name: 'Export Templates', icon: '📋' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Export Manager</h2>
          <p className="text-gray-900">Create custom reports and manage data exports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowExportForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            New Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Export Queue Tab */}
        {activeTab === 'exports' && (
          <div className="space-y-4">
            {exports.length > 0 ? (
              exports.map((exportReq) => (
                <div key={exportReq.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{exportReq.name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-900">
                          Type: {exportReq.exportType.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-900">
                          Format: {exportReq.format.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exportReq.status)}`}>
                          {exportReq.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {exportReq.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(exportReq.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Download
                        </button>
                      )}
                      {['pending', 'processing'].includes(exportReq.status) && (
                        <button
                          onClick={() => handleCancelExport(exportReq.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteExport(exportReq.id)}
                        className="px-3 py-1 border border-gray-300 text-gray-900 rounded text-sm hover:bg-gray-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-900">Created:</span>
                      <div className="font-medium">
                        {new Date(exportReq.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-900">Created By:</span>
                      <div className="font-medium">{exportReq.createdBy}</div>
                    </div>
                    {exportReq.fileName && (
                      <div>
                        <span className="text-gray-900">File:</span>
                        <div className="font-medium">{exportReq.fileName}</div>
                      </div>
                    )}
                    {exportReq.fileSize && (
                      <div>
                        <span className="text-gray-900">Size:</span>
                        <div className="font-medium">{(exportReq.fileSize / 1024).toFixed(1)} KB</div>
                      </div>
                    )}
                  </div>

                  {exportReq.errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{exportReq.errorMessage}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📤</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exports Found</h3>
                <p className="text-gray-900 mb-6">Create your first export to get started.</p>
                <button
                  onClick={() => setShowExportForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  Create Export
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom Reports Tab */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {builders.map((builder) => (
              <div key={builder.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{builder.name}</h3>
                    {builder.description && (
                      <p className="text-sm text-gray-900 mt-1">{builder.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    builder.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {builder.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">Data Source:</span>
                    <span className="font-medium capitalize">{builder.dataSource}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">Fields:</span>
                    <span className="font-medium">{builder.fields.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">Filters:</span>
                    <span className="font-medium">{builder.filters.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900">Created:</span>
                    <span className="font-medium">
                      {new Date(builder.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Run Report
                  </button>
                  <div className="flex items-center space-x-2">
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      Edit
                    </button>
                    <button className="text-sm text-gray-900 hover:text-gray-900">
                      Clone
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scheduled Exports Tab */}
        {activeTab === 'scheduled' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⏰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Scheduled Exports</h3>
            <p className="text-gray-900 mb-6">
              Set up automated reports that run on a schedule and email results to recipients.
            </p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">
              Create Scheduled Export
            </button>
          </div>
        )}

        {/* Export Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 'financial', name: 'Financial Report', description: 'Revenue, expenses, and profit analysis', icon: '💰' },
              { id: 'tenants', name: 'Tenant List', description: 'Complete tenant directory with contact info', icon: '👥' },
              { id: 'maintenance', name: 'Maintenance Log', description: 'Work orders and maintenance history', icon: '🔧' },
              { id: 'occupancy', name: 'Occupancy Report', description: 'Vacancy rates and rental statistics', icon: '🏠' },
              { id: 'assets', name: 'Asset Inventory', description: 'Complete asset list with tracking info', icon: '📦' },
              { id: 'utilities', name: 'Utilities Report', description: 'Utility usage and billing data', icon: '⚡' },
            ].map((template) => (
              <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow">
                <div className="text-center">
                  <div className="text-4xl mb-3">{template.icon}</div>
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-900 mt-2">{template.description}</p>
                  <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700">
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Form Modal */}
      {showExportForm && (
        <ExportFormModal
          onClose={() => setShowExportForm(false)}
          onExportCreated={() => {
            setShowExportForm(false);
            setRefreshTrigger(prev => prev + 1);
            onExportCreated?.();
          }}
        />
      )}
    </div>
  );
}

// Export Form Modal
function ExportFormModal({
  onClose,
  onExportCreated,
}: {
  onClose: () => void;
  onExportCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    exportType: 'financial_report',
    format: 'csv',
    parameters: {
      dateRange: {
        startDate: '',
        endDate: '',
      },
      buildingIds: [] as string[],
      includeFields: [] as string[],
    },
  });
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      addNotification('Export name is required', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        addNotification('Export created successfully', 'success');
        onExportCreated();
      } else {
        addNotification(result.error || 'Failed to create export', 'error');
      }
    } catch (error) {
      console.error('Error creating export:', error);
      addNotification('Failed to create export', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Create New Export</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Export Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter export name..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Export Type
              </label>
              <select
                value={formData.exportType}
                onChange={(e) => setFormData({ ...formData, exportType: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="financial_report">Financial Report</option>
                <option value="tenant_list">Tenant List</option>
                <option value="maintenance_log">Maintenance Log</option>
                <option value="occupancy_report">Occupancy Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Format
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.parameters.dateRange.startDate}
                onChange={(e) => setFormData({
                  ...formData,
                  parameters: {
                    ...formData.parameters,
                    dateRange: {
                      ...formData.parameters.dateRange,
                      startDate: e.target.value,
                    },
                  },
                })}
                min="2000-01-01"
                max="2099-12-31"
                style={{
                  colorScheme: 'light',
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.parameters.dateRange.endDate}
                onChange={(e) => setFormData({
                  ...formData,
                  parameters: {
                    ...formData.parameters,
                    dateRange: {
                      ...formData.parameters.dateRange,
                      endDate: e.target.value,
                    },
                  },
                })}
                min={formData.parameters.dateRange.startDate || '2000-01-01'}
                max="2099-12-31"
                style={{
                  colorScheme: 'light',
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Export'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 