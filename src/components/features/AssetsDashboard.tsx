'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, Package, AlertTriangle, TrendingUp, QrCode } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { AssetForm } from './AssetForm';
import { AssetsList } from './AssetsList';
import { AssetStatsCards } from './AssetStatsCards';
import { AssetUtilizationChart } from './AssetUtilizationChart';
import { MaintenanceSchedule } from './MaintenanceSchedule';
import AssetQRCodeManager from './AssetQRCodeManager';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import AppLoader from '@/components/ui/AppLoader';

interface AssetFilters {
  buildingId?: string;
  assetType?: string;
  assetStatus?: string;
  assetCondition?: string;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AssetStats {
  totalAssets: number;
  totalValue: number;
  assignedAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  byType: Array<{ type: string; count: number; value: number }>;
  byCondition: Array<{ condition: string; count: number }>;
  rentalRevenue: number;
  depreciationLoss: number;
}

interface Building {
  id: string;
  name: string;
}

export function AssetsDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<unknown>(null);
  const [filters, setFilters] = useState<AssetFilters>({});
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'analytics' | 'qrcodes'>(
    'overview'
  );
  const [allAssets, setAllAssets] = useState<unknown[]>([]);
  const { addNotification, showLoading, dismissToast } = useNotifications();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/assets/stats?type=overview');
        const result = await response.json();

        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching asset stats:', error);
        addNotification('Failed to load asset statistics', 'error');
      }
    };

    fetchStats();
  }, [refreshTrigger, addNotification]);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch('/api/buildings');
        const result = await response.json();

        if (result.success) {
          const buildingsList = result.data?.buildings || result.data || [];
          if (Array.isArray(buildingsList)) {
            setBuildings(buildingsList);
          } else {
            console.error('Invalid buildings data format:', buildingsList);
            setBuildings([]);
          }
        }
      } catch (error) {
        console.error('Error fetching buildings:', error);
        setBuildings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBuildings();
  }, []);

  useEffect(() => {
    const fetchAllAssets = async () => {
      if (activeTab !== 'qrcodes') return;

      try {
        const response = await fetch('/api/assets?limit=1000');
        const result = await response.json();

        if (result.success) {
          setAllAssets(result.data.assets || []);
        }
      } catch (error) {
        console.error('Error fetching all assets:', error);
        addNotification('Failed to load assets for QR code management', 'error');
      }
    };

    fetchAllAssets();
  }, [activeTab, refreshTrigger, addNotification]);

  const handleAssetCreated = useCallback(() => {
    setShowForm(false);
    setSelectedAsset(null);
    setRefreshTrigger((prev) => prev + 1);
    addNotification('Asset created successfully', 'success');
  }, [addNotification]);

  const handleAssetUpdated = useCallback(() => {
    setShowForm(false);
    setSelectedAsset(null);
    setRefreshTrigger((prev) => prev + 1);
    addNotification('Asset updated successfully', 'success');
  }, [addNotification]);

  const handleAssetDeleted = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
    addNotification('Asset deleted successfully', 'success');
  }, [addNotification]);

  const handleEditAsset = (asset: unknown) => {
    setSelectedAsset(asset);
    setShowForm(true);
  };

  const handleFilterChange = (newFilters: Partial<AssetFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleExportAssets = async () => {
    const loadingToast = showLoading('Preparing assets export...');

    try {
      const cleanFilters = Object.entries(filters).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== '' && value !== 'undefined') {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>
      );

      const queryParams = new URLSearchParams({
        ...cleanFilters,
        export: 'true',
        limit: '1000',
      });

      const response = await fetch(`/api/assets?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        dismissToast(loadingToast);

        const csvContent = generateAssetCSV(result.data.assets);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assets-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        addNotification('Assets exported successfully', 'success');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Error exporting assets:', error);
      addNotification('Failed to export assets. Please try again.', 'error');
    }
  };

  const generateAssetCSV = (assets: unknown[]): string => {
    const headers = [
      'Asset Name',
      'Type',
      'Brand',
      'Model',
      'Serial Number',
      'Status',
      'Condition',
      'Purchase Price',
      'Current Value',
      'Rental Rate',
      'Building',
      'Purchase Date',
      'Notes',
    ];

    const rows = assets.map((asset: any) => [
      asset.assetName || '',
      asset.assetType || '',
      asset.brand || '',
      asset.model || '',
      asset.serialNumber || '',
      asset.assetStatus || '',
      asset.assetCondition || '',
      asset.purchasePrice || '',
      asset.currentValue || '',
      asset.rentalRate || '',
      asset.buildingName || asset.building_name || '',
      asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
      asset.assetStatus === 'assigned' ? 'Assigned (details tracking coming soon)' : '',
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  if (loading) {
    return <AppLoader variant="inline" className="min-h-[50vh]" />;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Assets"
        description="Manage property assets, track assignments, and monitor financial performance"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExportAssets}
            >
              Export
            </Button>
            <Button type="button" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
              Add Asset
            </Button>
          </div>
        }
      />

      {stats && <AssetStatsCards stats={stats} />}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabList>
          <Tab value="overview">
            <Package className="mr-2 inline-block h-4 w-4" />
            Asset Overview
          </Tab>
          <Tab value="maintenance">
            <AlertTriangle className="mr-2 inline-block h-4 w-4" />
            Maintenance Schedule
          </Tab>
          <Tab value="analytics">
            <TrendingUp className="mr-2 inline-block h-4 w-4" />
            Analytics
          </Tab>
          <Tab value="qrcodes">
            <QrCode className="mr-2 inline-block h-4 w-4" />
            QR Codes
          </Tab>
        </TabList>

        <TabPanel value="overview" className="space-y-6">
          <Card className="mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Search" htmlFor="assets-search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="assets-search"
                    type="text"
                    className="pl-10"
                    placeholder="Name, brand, serial..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                  />
                </div>
              </FormField>

              <FormField label="Building" htmlFor="assets-building">
                <Select
                  id="assets-building"
                  value={filters.buildingId || ''}
                  onChange={(e) => handleFilterChange({ buildingId: e.target.value || undefined })}
                  isDisabled={!Array.isArray(buildings) || buildings.length === 0}
                >
                  <option value="">
                    {Array.isArray(buildings) && buildings.length === 0
                      ? 'Loading buildings...'
                      : 'All Buildings'}
                  </option>
                  {Array.isArray(buildings) &&
                    buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                </Select>
              </FormField>

              <FormField label="Status" htmlFor="assets-status">
                <Select
                  id="assets-status"
                  value={filters.assetStatus || ''}
                  onChange={(e) => handleFilterChange({ assetStatus: e.target.value || undefined })}
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disposed">Disposed</option>
                </Select>
              </FormField>

              <FormField label="Condition" htmlFor="assets-condition">
                <Select
                  id="assets-condition"
                  value={filters.assetCondition || ''}
                  onChange={(e) =>
                    handleFilterChange({ assetCondition: e.target.value || undefined })
                  }
                >
                  <option value="">All Conditions</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="damaged">Damaged</option>
                </Select>
              </FormField>
            </div>
          </Card>

          <AssetsList
            filters={filters}
            refreshTrigger={refreshTrigger}
            onEdit={handleEditAsset}
            onDelete={handleAssetDeleted}
          />
        </TabPanel>

        <TabPanel value="maintenance">
          <MaintenanceSchedule refreshTrigger={refreshTrigger} />
        </TabPanel>

        <TabPanel value="analytics">
          <AssetUtilizationChart refreshTrigger={refreshTrigger} />
        </TabPanel>

        <TabPanel value="qrcodes">
          <AssetQRCodeManager
            assets={allAssets as any[]}
            onQRCodeGenerated={() => setRefreshTrigger((prev) => prev + 1)}
          />
        </TabPanel>
      </Tabs>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-gray-900/50 lg:left-64"
            onClick={() => {
              setShowForm(false);
              setSelectedAsset(null);
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 lg:left-64">
            <div className="pointer-events-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
              <AssetForm
                asset={selectedAsset as any}
                buildings={buildings}
                onSubmit={selectedAsset ? handleAssetUpdated : handleAssetCreated}
                onCancel={() => {
                  setShowForm(false);
                  setSelectedAsset(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
