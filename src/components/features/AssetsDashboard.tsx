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
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'analytics' | 'qrcodes'>('overview');
  const [allAssets, setAllAssets] = useState<unknown[]>([]);
  const { addNotification, showLoading, dismissToast } = useNotifications();

  // Fetch stats
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

  // Fetch buildings for filters
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch('/api/buildings');
        const result = await response.json();
        
        if (result.success) {
          // API returns { success: true, data: { buildings: [...] } }
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

  // Fetch all assets for QR code management
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
    setRefreshTrigger(prev => prev + 1);
    addNotification('Asset created successfully! 🎉', 'success');
  }, [addNotification]);

  const handleAssetUpdated = useCallback(() => {
    setShowForm(false);
    setSelectedAsset(null);
    setRefreshTrigger(prev => prev + 1);
    addNotification('Asset updated successfully! ✨', 'success');
  }, [addNotification]);

  const handleAssetDeleted = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    addNotification('Asset deleted successfully! 🗑️', 'success');
  }, [addNotification]);

  const handleEditAsset = (asset: unknown) => {
    setSelectedAsset(asset);
    setShowForm(true);
  };

  const handleFilterChange = (newFilters: Partial<AssetFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleExportAssets = async () => {
    const loadingToast = showLoading('Preparing assets export...');
    
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        export: 'true'
      } as Record<string, string>);
      
      const response = await fetch(`/api/assets?${queryParams}`);
      const result = await response.json();
      
      if (result.success) {
        // Dismiss loading toast
        dismissToast(loadingToast);
        
        // Create CSV content
        const csvContent = generateAssetCSV(result.data.assets);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assets-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        addNotification('Assets exported successfully! 📊', 'success');
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
      'Asset Name', 'Type', 'Brand', 'Model', 'Serial Number', 
      'Status', 'Condition', 'Purchase Price', 'Current Value', 
      'Rental Rate', 'Building', 'Purchase Date', 'Notes'
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
      asset.assetStatus === 'assigned' ? 'Assigned (details tracking coming soon)' : ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && <AssetStatsCards stats={stats} />}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline-block w-4 h-4 mr-2" />
            Asset Overview
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maintenance' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="inline-block w-4 h-4 mr-2" />
            Maintenance Schedule
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="inline-block w-4 h-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('qrcodes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'qrcodes' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <QrCode className="inline-block w-4 h-4 mr-2" />
            QR Codes
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={filters.buildingId || ''}
                  onChange={(e) => handleFilterChange({ buildingId: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!Array.isArray(buildings) || buildings.length === 0}
                >
                  <option value="">{Array.isArray(buildings) && buildings.length === 0 ? 'Loading buildings...' : 'All Buildings'}</option>
                  {Array.isArray(buildings) && buildings.map(building => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.assetStatus || ''}
                  onChange={(e) => handleFilterChange({ assetStatus: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disposed">Disposed</option>
                </select>

                <select
                  value={filters.assetCondition || ''}
                  onChange={(e) => handleFilterChange({ assetCondition: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Conditions</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExportAssets}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
            </div>
          </div>

          {/* Assets List */}
          <AssetsList
            filters={filters}
            refreshTrigger={refreshTrigger}
            onEdit={handleEditAsset}
            onDelete={handleAssetDeleted}
          />
        </>
      )}

      {activeTab === 'maintenance' && (
        <MaintenanceSchedule refreshTrigger={refreshTrigger} />
      )}

      {activeTab === 'analytics' && (
        <AssetUtilizationChart refreshTrigger={refreshTrigger} />
      )}

      {activeTab === 'qrcodes' && (
        <AssetQRCodeManager 
          assets={allAssets as any[]} 
          onQRCodeGenerated={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Asset Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AssetForm
              asset={selectedAsset}
              buildings={buildings}
              onSubmit={selectedAsset ? handleAssetUpdated : handleAssetCreated}
              onCancel={() => {
                setShowForm(false);
                setSelectedAsset(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 