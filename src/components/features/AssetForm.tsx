'use client';

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface Asset {
  id: string;
  assetName: string;
  assetType: string;
  buildingId?: string;
  assetCondition: string;
  assetStatus: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  currentValue?: number;
  rentalRate?: number;
  description?: string;
}

interface AssetFormProps {
  asset?: Asset; // Optional asset for editing
  buildings: Array<{ id: string; name: string }>;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AssetForm({ asset, buildings, onSubmit, onCancel }: AssetFormProps) {
  const [loading, setLoading] = useState(false);
  const { addNotification, showLoading, dismissToast } = useNotifications();
  
  const [formData, setFormData] = useState({
    assetName: asset?.assetName || '',
    assetType: asset?.assetType || '',
    buildingId: asset?.buildingId || '',
    assetCondition: asset?.assetCondition || 'good',
    assetStatus: asset?.assetStatus || 'available',
    brand: asset?.brand || '',
    model: asset?.model || '',
    serialNumber: asset?.serialNumber || '',
    purchasePrice: asset?.purchasePrice?.toString() || '',
    currentValue: asset?.currentValue?.toString() || '',
    rentalRate: asset?.rentalRate?.toString() || '',
    description: asset?.description || ''
  });

  // Update form when asset prop changes
  useEffect(() => {
    if (asset) {
      setFormData({
        assetName: asset.assetName || '',
        assetType: asset.assetType || '',
        buildingId: asset.buildingId || '',
        assetCondition: asset.assetCondition || 'good',
        assetStatus: asset.assetStatus || 'available',
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        purchasePrice: asset.purchasePrice?.toString() || '',
        currentValue: asset.currentValue?.toString() || '',
        rentalRate: asset.rentalRate?.toString() || '',
        description: asset.description || ''
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Show loading toast
    const loadingToast = showLoading(asset ? 'Updating asset...' : 'Creating asset...');

    try {
      const submitData = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        rentalRate: formData.rentalRate ? parseFloat(formData.rentalRate) : undefined,
      };

      const url = asset ? `/api/assets/${asset.id}` : '/api/assets';
      const method = asset ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        // Dismiss loading toast
        if (loadingToast && dismissToast) {
          dismissToast(loadingToast);
        }
        
        // Don't show notification here - let the parent component handle it
        onSubmit();
      } else {
        throw new Error(`Failed to ${asset ? 'update' : 'create'} asset`);
      }
    } catch (error) {
      // Dismiss loading toast if it exists
      if (loadingToast && dismissToast) {
        dismissToast(loadingToast);
      }
      
      addNotification(
        `Failed to ${asset ? 'update' : 'create'} asset. Please try again.`, 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!asset;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {isEditing ? 'Edit Asset' : 'Add New Asset'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name *
            </label>
            <input
              type="text"
              value={formData.assetName}
              onChange={(e) => setFormData(prev => ({ ...prev, assetName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Type *
            </label>
            <select
              value={formData.assetType}
              onChange={(e) => setFormData(prev => ({ ...prev, assetType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select type</option>
              <option value="furniture">Furniture</option>
              <option value="appliance">Appliance</option>
              <option value="electronics">Electronics</option>
              <option value="hvac">HVAC</option>
              <option value="lighting">Lighting</option>
              <option value="security">Security</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building
            </label>
            <select
              value={formData.buildingId}
              onChange={(e) => setFormData(prev => ({ ...prev, buildingId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select building</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.assetStatus}
              onChange={(e) => setFormData(prev => ({ ...prev, assetStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={formData.assetCondition}
              onChange={(e) => setFormData(prev => ({ ...prev, assetCondition: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number
            </label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Value
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.currentValue}
              onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rental Rate (per month)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.rentalRate}
              onChange={(e) => setFormData(prev => ({ ...prev, rentalRate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <Save className="h-4 w-4" />
            {isEditing ? 'Update Asset' : 'Save Asset'}
          </button>
        </div>
      </form>
    </div>
  );
} 