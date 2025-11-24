'use client';

import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, MapPin, Calendar, X, Package, AlertCircle, DollarSign, Info } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface Asset {
  id: string;
  assetName: string;
  assetType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  assetStatus: string;
  assetCondition: string;
  currentValue?: number;
  rentalRate?: number;
  purchasePrice?: number;
  buildingName?: string;
  buildingId?: string;
  purchaseDate?: Date;
  description?: string;
  assignedTo?: string;
  assignedRoom?: string;
  assignedTenant?: string;
  assignmentDate?: Date;
}

interface AssetsListProps {
  filters: {
    buildingId?: string;
    assetType?: string;
    assetStatus?: string;
    assetCondition?: string;
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  refreshTrigger: number;
  onEdit: (asset: Asset) => void;
  onDelete: () => void;
}

export function AssetsList({ filters, refreshTrigger, onEdit, onDelete }: AssetsListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { addNotification, showLoading, dismissToast } = useNotifications();

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        // Filter out undefined values
        const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>);

        const queryParams = new URLSearchParams({
          ...cleanFilters,
          limit: itemsPerPage.toString(),
          offset: ((currentPage - 1) * itemsPerPage).toString()
        });

        const response = await fetch(`/api/assets?${queryParams}`);
        const result = await response.json();

        if (result.success) {
          setAssets(result.data.assets || []);
          setTotal(result.data.total || 0);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
        addNotification('Failed to load assets', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [filters, refreshTrigger, currentPage, addNotification]);

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!confirm(`Are you sure you want to delete "${assetName}"? This action cannot be undone.`)) {
      return;
    }

    const loadingToast = showLoading ? showLoading('Deleting asset...') : null;

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        if (loadingToast && dismissToast) {
          dismissToast(loadingToast);
        }
        addNotification(`"${assetName}" deleted successfully! 🗑️`, 'success');
        onDelete();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (loadingToast && dismissToast) {
        dismissToast(loadingToast);
      }
      console.error('Error deleting asset:', error);
      addNotification(`Failed to delete "${assetName}". Please try again.`, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      available: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      disposed: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getConditionBadge = (condition: string) => {
    const conditionColors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      damaged: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${conditionColors[condition as keyof typeof conditionColors] || 'bg-gray-100 text-gray-800'}`}>
        {condition.charAt(0).toUpperCase() + condition.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condition
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Financial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {asset.assetName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {asset.brand && asset.model ? `${asset.brand} ${asset.model}` : 
                       asset.brand || asset.model || 'No model info'}
                    </div>
                    {asset.serialNumber && (
                      <div className="text-xs text-gray-400">
                        SN: {asset.serialNumber}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-gray-900 capitalize">
                      {asset.assetType}
                    </div>
                    {asset.buildingName && (
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {asset.buildingName}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(asset.assetStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getConditionBadge(asset.assetCondition)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {asset.assetStatus === 'assigned' ? (
                      <>
                        {asset.assignedRoom && (
                          <div className="text-sm text-gray-900">
                            Room: {asset.assignedRoom}
                          </div>
                        )}
                        {asset.assignedTenant && (
                          <div className="text-sm text-gray-500">
                            Tenant: {asset.assignedTenant}
                          </div>
                        )}
                        {asset.assignmentDate && (
                          <div className="text-xs text-gray-400">
                            Since: {formatDate(asset.assignmentDate)}
                          </div>
                        )}
                        {!asset.assignedRoom && !asset.assignedTenant && (
                          <div className="text-sm text-blue-600">
                            Assigned (details pending)
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-gray-400">
                        Not assigned
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {asset.currentValue && (
                      <div className="text-sm text-gray-900">
                        Value: {formatCurrency(asset.currentValue)}
                      </div>
                    )}
                    {asset.rentalRate && (
                      <div className="text-sm text-gray-500">
                        Rent: {formatCurrency(asset.rentalRate)}/mo
                      </div>
                    )}
                    {asset.purchaseDate && (
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(asset.purchaseDate)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAsset(asset)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(asset)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit Asset"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id, asset.assetName)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} assets
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Asset Details Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedAsset.assetName}</h3>
                  <p className="text-blue-100 text-sm capitalize">
                    {selectedAsset.assetType} • {selectedAsset.brand && selectedAsset.model ? `${selectedAsset.brand} ${selectedAsset.model}` : 'Asset Details'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-white hover:text-blue-200 transition-colors rounded-full p-1 hover:bg-white/10"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Asset Name</label>
                      <p className="text-gray-900 font-medium">{selectedAsset.assetName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Type</label>
                        <p className="text-gray-900 capitalize">{selectedAsset.assetType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Location</label>
                        <p className="text-gray-900 flex items-center gap-1">
                          {selectedAsset.buildingName ? (
                            <>
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {selectedAsset.buildingName}
                            </>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {(selectedAsset.brand || selectedAsset.model || selectedAsset.serialNumber) && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">Brand</label>
                          <p className="text-gray-900">{selectedAsset.brand || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">Model</label>
                          <p className="text-gray-900">{selectedAsset.model || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">Serial Number</label>
                          <p className="text-gray-900 font-mono text-sm">{selectedAsset.serialNumber || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Condition */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                    Status & Condition
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">Current Status</label>
                        <div className="flex items-center">
                          {getStatusBadge(selectedAsset.assetStatus)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">Condition</label>
                        <div className="flex items-center">
                          {getConditionBadge(selectedAsset.assetCondition)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Assignment Details */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-2">Assignment Details</label>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        {selectedAsset.assetStatus === 'assigned' ? (
                          <div className="space-y-2">
                            {selectedAsset.assignedRoom && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">Room: {selectedAsset.assignedRoom}</span>
                              </div>
                            )}
                            {selectedAsset.assignedTenant && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-900">Tenant: {selectedAsset.assignedTenant}</span>
                              </div>
                            )}
                            {selectedAsset.assignmentDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-500">Since: {formatDate(selectedAsset.assignmentDate)}</span>
                              </div>
                            )}
                            {!selectedAsset.assignedRoom && !selectedAsset.assignedTenant && (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm text-blue-600">Assigned (details pending)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                            <span className="text-sm">Not currently assigned</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Financial Information
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Current Value</label>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedAsset.currentValue ? formatCurrency(selectedAsset.currentValue) : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Monthly Rental</label>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedAsset.rentalRate ? `${formatCurrency(selectedAsset.rentalRate)}/mo` : '-'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedAsset.purchasePrice && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Purchase Price</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(selectedAsset.purchasePrice)}
                        </p>
                      </div>
                    )}
                    
                    {selectedAsset.purchaseDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Purchase Information</label>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Purchased on {formatDate(selectedAsset.purchaseDate)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-purple-600" />
                    Additional Details
                  </h4>
                  <div className="space-y-4">
                    {selectedAsset.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Description</label>
                        <p className="text-gray-700 bg-white px-3 py-2 rounded border leading-relaxed">
                          {selectedAsset.description}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Asset ID</label>
                      <p className="text-gray-700 font-mono text-sm bg-white px-3 py-2 rounded border">
                        {selectedAsset.id}
                      </p>
                    </div>
                    
                    {/* Performance Metrics */}
                    {(selectedAsset.currentValue && selectedAsset.rentalRate) && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">Performance Metrics</label>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Annual Rental Yield:</span>
                              <p className="font-semibold text-green-600">
                                {((selectedAsset.rentalRate * 12 / selectedAsset.currentValue) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Monthly ROI:</span>
                              <p className="font-semibold text-blue-600">
                                {((selectedAsset.rentalRate / selectedAsset.currentValue) * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedAsset(null);
                    onEdit(selectedAsset);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 