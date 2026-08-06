'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Pencil,
  Trash2,
  Eye,
  MapPin,
  Calendar,
  X,
  Package,
  AlertCircle,
  DollarSign,
  Info,
  History,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import AppLoader from '@/components/ui/AppLoader';
import { AssetStatusBadge, AssetConditionBadge } from '@/components/domain/StatusBadges';

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

interface LocationHistoryItem {
  id: string;
  roomId: string | null;
  assignmentDate: string | null;
  returnDate: string | null;
  assignmentStatus: string;
  roomNumber: string | null;
  buildingName: string | null;
  tenantName: string | null;
  isCurrent: boolean;
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
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { addNotification, showLoading, dismissToast } = useNotifications();
  const { confirm, dialog } = useAppDialog();

  const itemsPerPage = 20;

  useEffect(() => {
    if (!selectedAsset?.id) {
      setLocationHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/assets/${selectedAsset.id}/assign`);
        const result = await response.json();
        if (!cancelled && result.success) {
          setLocationHistory(result.data || []);
        }
      } catch {
        if (!cancelled) setLocationHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAsset?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    const fetchAssets = async () => {
      setLoading(true);
      try {
        // Filter out undefined values
        const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== '' && value !== 'undefined') {
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
    if (
      !(await confirm({
        title: 'Delete asset?',
        message: `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
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

  const getStatusBadge = (status: string) => <AssetStatusBadge status={status} />;

  const getConditionBadge = (condition: string) => (
    <AssetConditionBadge condition={condition} />
  );

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
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <AppLoader variant="inline" className="min-h-[16rem]" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      {dialog}
      {assets.length === 0 ? (
        <div className="p-8 text-center text-gray-900">
          <p className="mb-2 text-lg font-medium">No assets found</p>
          <p className="text-sm text-gray-600">
            Try adjusting your search or filters, or add your first asset.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Type & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Financial
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{asset.assetName}</div>
                        <div className="text-sm text-gray-500">
                          {asset.brand && asset.model
                            ? `${asset.brand} ${asset.model}`
                            : asset.brand || asset.model || 'No model info'}
                        </div>
                        {asset.serialNumber && (
                          <div className="text-xs text-gray-400">SN: {asset.serialNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="text-sm capitalize text-gray-900">{asset.assetType}</div>
                        {asset.buildingName ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {asset.buildingName}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">No building</div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(asset.assetStatus)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getConditionBadge(asset.assetCondition)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        {asset.assetStatus === 'assigned' ? (
                          <>
                            {asset.assignedRoom && (
                              <div className="text-sm text-gray-900">Room: {asset.assignedRoom}</div>
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
                              <div className="text-sm text-gray-600">Assigned (details pending)</div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">Not assigned</div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        {asset.currentValue != null && asset.currentValue > 0 && (
                          <div className="text-sm text-gray-900">
                            Value: {formatCurrency(asset.currentValue)}
                          </div>
                        )}
                        {asset.rentalRate != null && asset.rentalRate > 0 && (
                          <div className="text-sm text-gray-500">
                            Rent: {formatCurrency(asset.rentalRate)}/mo
                          </div>
                        )}
                        {asset.purchaseDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {formatDate(asset.purchaseDate)}
                          </div>
                        )}
                        {!(asset.currentValue || asset.rentalRate || asset.purchaseDate) && (
                          <div className="text-sm text-gray-400">—</div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAsset(asset)}
                          className="text-gray-500 hover:text-gray-900"
                          title="View details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <a
                          href={`/track/asset/${asset.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-900"
                          title="Open tracking page"
                        >
                          <MapPin className="h-5 w-5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onEdit(asset)}
                          className="text-gray-500 hover:text-gray-900"
                          title="Edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(asset.id, asset.assetName)}
                          className="text-gray-500 hover:text-gray-900"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(1, totalPages)}
            totalItems={total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Enhanced Asset Details Modal — inset past sidebar */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 lg:left-64 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setSelectedAsset(null)}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 lg:left-64">
          <div className="pointer-events-auto max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedAsset.assetName}</h3>
                  <p className="text-sm capitalize text-gray-600">
                    {selectedAsset.assetType} •{' '}
                    {selectedAsset.brand && selectedAsset.model
                      ? `${selectedAsset.brand} ${selectedAsset.model}`
                      : 'Asset Details'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="text-gray-500 hover:text-gray-900"
                  title="Close"
                >
                  <X className="h-5 w-5" />
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
                      <label className="text-sm font-medium text-gray-900 block mb-1">Asset Name</label>
                      <p className="text-gray-900 font-medium">{selectedAsset.assetName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-1">Type</label>
                        <p className="text-gray-900 capitalize">{selectedAsset.assetType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-1">Location</label>
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
                          <label className="text-sm font-medium text-gray-900 block mb-1">Brand</label>
                          <p className="text-gray-900">{selectedAsset.brand || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-900 block mb-1">Model</label>
                          <p className="text-gray-900">{selectedAsset.model || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-900 block mb-1">Serial Number</label>
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
                        <label className="text-sm font-medium text-gray-900 block mb-2">Current Status</label>
                        <div className="flex items-center">
                          {getStatusBadge(selectedAsset.assetStatus)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-2">Condition</label>
                        <div className="flex items-center">
                          {getConditionBadge(selectedAsset.assetCondition)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Assignment Details */}
                    <div>
                      <label className="text-sm font-medium text-gray-900 block mb-2">Assignment Details</label>
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
                                <span className="text-sm text-gray-900">Since: {formatDate(selectedAsset.assignmentDate)}</span>
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

                    {/* Location History */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">
                        <History className="h-4 w-4 text-gray-500" />
                        Location History
                      </label>
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        {historyLoading ? (
                          <p className="text-sm text-gray-500">Loading history…</p>
                        ) : locationHistory.length === 0 ? (
                          <EmptyState
                            title="No location history"
                            description="Assignments will appear here when this asset is moved between rooms."
                            className="py-6"
                          />
                        ) : (
                          <div className="space-y-3">
                            {locationHistory.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-col gap-2 rounded-md border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {item.roomId ? (
                                      <Link
                                        href={`/admin/rooms/${item.roomId}`}
                                        className="font-medium text-gray-900 hover:underline"
                                      >
                                        Room {item.roomNumber || '—'}
                                      </Link>
                                    ) : (
                                      <span className="font-medium text-gray-900">
                                        Room {item.roomNumber || 'Unknown room'}
                                      </span>
                                    )}
                                    {item.isCurrent && <Badge tone="success">Current location</Badge>}
                                    {!item.isCurrent && (
                                      <Badge tone="neutral">{item.assignmentStatus}</Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm text-gray-500">
                                    {item.buildingName || 'Building unavailable'}
                                    {item.tenantName ? ` · ${item.tenantName}` : ''}
                                  </p>
                                </div>
                                <div className="text-sm text-gray-600 sm:text-right">
                                  <div>
                                    Assigned:{' '}
                                    {item.assignmentDate
                                      ? formatDate(new Date(item.assignmentDate))
                                      : '—'}
                                  </div>
                                  <div>
                                    Unassigned:{' '}
                                    {item.isCurrent
                                      ? 'Current'
                                      : item.returnDate
                                        ? formatDate(new Date(item.returnDate))
                                        : '—'}
                                  </div>
                                </div>
                              </div>
                            ))}
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
                        <label className="text-sm font-medium text-gray-900 block mb-1">Current Value</label>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedAsset.currentValue ? formatCurrency(selectedAsset.currentValue) : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-1">Monthly Rental</label>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedAsset.rentalRate ? `${formatCurrency(selectedAsset.rentalRate)}/mo` : '-'}
                        </p>
                      </div>
                    </div>
                    
                    {selectedAsset.purchasePrice && (
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-1">Purchase Price</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(selectedAsset.purchasePrice)}
                        </p>
                      </div>
                    )}
                    
                    {selectedAsset.purchaseDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-1">Purchase Information</label>
                        <div className="flex items-center gap-2 text-gray-900">
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
                    <Info className="h-5 w-5 text-slate-600" />
                    Additional Details
                  </h4>
                  <div className="space-y-4">
                    {selectedAsset.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-1">Description</label>
                        <p className="text-gray-900 bg-white px-3 py-2 rounded border leading-relaxed">
                          {selectedAsset.description}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-900 block mb-1">Asset ID</label>
                      <p className="text-gray-900 font-mono text-sm bg-white px-3 py-2 rounded border">
                        {selectedAsset.id}
                      </p>
                    </div>
                    
                    {/* Performance Metrics */}
                    {(selectedAsset.currentValue && selectedAsset.rentalRate) && (
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-2">Performance Metrics</label>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-900">Annual Rental Yield:</span>
                              <p className="font-semibold text-green-600">
                                {selectedAsset.currentValue > 0
                                  ? `${((selectedAsset.rentalRate * 12 / selectedAsset.currentValue) * 100).toFixed(1)}%`
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-900">Monthly ROI:</span>
                              <p className="font-semibold text-blue-600">
                                {selectedAsset.currentValue > 0
                                  ? `${((selectedAsset.rentalRate / selectedAsset.currentValue) * 100).toFixed(2)}%`
                                  : '—'}
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
              <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
                <Button variant="outline" onClick={() => setSelectedAsset(null)}>
                  Close
                </Button>
                <Button
                  leftIcon={<Pencil className="h-4 w-4" />}
                  onClick={() => {
                    setSelectedAsset(null);
                    onEdit(selectedAsset);
                  }}
                >
                  Edit Asset
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}