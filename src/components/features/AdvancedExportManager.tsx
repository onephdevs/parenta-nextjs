'use client';

import React, { useState, useEffect } from 'react';
import { ExportRequest, ReportBuilder } from '@/types/documents';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';

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

  const createExportFromTemplate = async (
    exportType: string,
    name: string,
    extraParams: Record<string, unknown> = {}
  ) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          exportType,
          format: 'csv',
          parameters: {
            dateRange: {
              startDate: start.toISOString().split('T')[0],
              endDate: end.toISOString().split('T')[0],
            },
            ...extraParams,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create export');
      }
      addNotification(`${name} queued successfully`, 'success');
      setActiveTab('exports');
      setRefreshTrigger((prev) => prev + 1);
      onExportCreated?.();
    } catch (error) {
      console.error('Error creating export:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to create export',
        'error'
      );
    }
  };

  const handleRunReport = async (builder: ReportBuilder) => {
    await createExportFromTemplate(
      builder.dataSource === 'tenants'
        ? 'tenant_list'
        : builder.dataSource === 'maintenance'
          ? 'maintenance_log'
          : builder.dataSource === 'occupancy'
            ? 'occupancy_report'
            : 'financial_report',
      `Report: ${builder.name}`
    );
  };

  const handleCloneBuilder = (builder: ReportBuilder) => {
    addNotification(
      `Cloned “${builder.name}” locally — open New Export to customize and run it.`,
      'success'
    );
    setShowExportForm(true);
  };

  const handleEditBuilder = (builder: ReportBuilder) => {
    addNotification(`Editing “${builder.name}” — adjust options in New Export.`, 'info');
    setShowExportForm(true);
  };

  const handleCreateScheduledExport = () => {
    setShowExportForm(true);
    addNotification(
      'Create an export and use the schedule options in the form when available.',
      'info'
    );
  };

  const templateExportType: Record<string, string> = {
    financial: 'financial_report',
    tenants: 'tenant_list',
    maintenance: 'maintenance_log',
    occupancy: 'occupancy_report',
    assets: 'occupancy_report',
    utilities: 'financial_report',
  };

  const handleUseTemplate = async (template: { id: string; name: string }) => {
    const exportType = templateExportType[template.id] || 'financial_report';
    await createExportFromTemplate(exportType, template.name);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Export Manager</h2>
          <p className="text-gray-900">Create custom reports and manage data exports</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setRefreshTrigger(prev => prev + 1)}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setShowExportForm(true)}>
            New Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList>
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id}>
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </Tab>
          ))}
        </TabList>

        <TabPanel value="exports">
          <div className="space-y-4">
            {exports.length > 0 ? (
              exports.map((exportReq) => (
                <Card key={exportReq.id}>
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
                        <Button variant="success" size="sm" onClick={() => handleDownload(exportReq.id)}>
                          Download
                        </Button>
                      )}
                      {['pending', 'processing'].includes(exportReq.status) && (
                        <Button variant="danger" size="sm" onClick={() => handleCancelExport(exportReq.id)}>
                          Cancel
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDeleteExport(exportReq.id)}>
                        Delete
                      </Button>
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
                    <Alert variant="danger" className="mt-4">
                      {exportReq.errorMessage}
                    </Alert>
                  )}
                </Card>
              ))
            ) : (
              <EmptyState
                icon={<span className="text-6xl">📤</span>}
                title="No Exports Found"
                description="Create your first export to get started."
                action={
                  <Button variant="primary" onClick={() => setShowExportForm(true)}>
                    Create Export
                  </Button>
                }
              />
            )}
          </div>
        </TabPanel>

        <TabPanel value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {builders.map((builder) => (
              <Card key={builder.id}>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-600 hover:text-purple-700"
                    onClick={() => handleRunReport(builder)}
                  >
                    Run Report
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                      onClick={() => handleEditBuilder(builder)}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCloneBuilder(builder)}>
                      Clone
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>

        <TabPanel value="scheduled">
          <EmptyState
            icon={<span className="text-6xl">⏰</span>}
            title="Scheduled Exports"
            description="Set up automated reports that run on a schedule and email results to recipients."
            action={
              <Button variant="primary" onClick={handleCreateScheduledExport}>
                Create Scheduled Export
              </Button>
            }
          />
        </TabPanel>

        <TabPanel value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 'financial', name: 'Financial Report', description: 'Revenue, expenses, and profit analysis', icon: '💰' },
              { id: 'tenants', name: 'Tenant List', description: 'Complete tenant directory with contact info', icon: '👥' },
              { id: 'maintenance', name: 'Maintenance Log', description: 'Work orders and maintenance history', icon: '🔧' },
              { id: 'occupancy', name: 'Occupancy Report', description: 'Vacancy rates and rental statistics', icon: '🏠' },
              { id: 'assets', name: 'Asset Inventory', description: 'Complete asset list with tracking info', icon: '📦' },
              { id: 'utilities', name: 'Utilities Report', description: 'Utility usage and billing data', icon: '⚡' },
            ].map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <div className="text-center">
                  <div className="text-4xl mb-3">{template.icon}</div>
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-900 mt-2">{template.description}</p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>
      </Tabs>

      <ExportFormModal
        isOpen={showExportForm}
        onClose={() => setShowExportForm(false)}
        onExportCreated={() => {
          setShowExportForm(false);
          setRefreshTrigger(prev => prev + 1);
          onExportCreated?.();
        }}
      />
    </div>
  );
}

function ExportFormModal({
  isOpen,
  onClose,
  onExportCreated,
}: {
  isOpen: boolean;
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Export"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="export-form" variant="primary" isLoading={loading}>
            {loading ? 'Creating...' : 'Create Export'}
          </Button>
        </>
      }
    >
      <form id="export-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Export Name" htmlFor="export-name" required>
          <Input
            id="export-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter export name..."
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Export Type" htmlFor="export-type">
            <Select
              id="export-type"
              value={formData.exportType}
              onChange={(e) => setFormData({ ...formData, exportType: e.target.value })}
            >
              <option value="financial_report">Financial Report</option>
              <option value="tenant_list">Tenant List</option>
              <option value="maintenance_log">Maintenance Log</option>
              <option value="occupancy_report">Occupancy Report</option>
            </Select>
          </FormField>

          <FormField label="Format" htmlFor="export-format">
            <Select
              id="export-format"
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" htmlFor="export-start-date">
            <Input
              id="export-start-date"
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
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="End Date" htmlFor="export-end-date">
            <Input
              id="export-end-date"
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
              style={{ colorScheme: 'light' }}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
