'use client';

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';

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
  asset?: Asset;
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
    description: asset?.description || '',
  });

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
        description: asset.description || '',
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        if (loadingToast && dismissToast) {
          dismissToast(loadingToast);
        }
        onSubmit();
      } else {
        throw new Error(`Failed to ${asset ? 'update' : 'create'} asset`);
      }
    } catch {
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
        <IconButton label="Close" onClick={onCancel}>
          <X className="h-5 w-5" />
        </IconButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Asset Name" htmlFor="assetName" required>
            <Input
              id="assetName"
              type="text"
              value={formData.assetName}
              onChange={(e) => setFormData((prev) => ({ ...prev, assetName: e.target.value }))}
              required
            />
          </FormField>

          <FormField label="Asset Type" htmlFor="assetType" required>
            <Select
              id="assetType"
              value={formData.assetType}
              onChange={(e) => setFormData((prev) => ({ ...prev, assetType: e.target.value }))}
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
            </Select>
          </FormField>

          <FormField label="Building" htmlFor="buildingId">
            <Select
              id="buildingId"
              value={formData.buildingId}
              onChange={(e) => setFormData((prev) => ({ ...prev, buildingId: e.target.value }))}
            >
              <option value="">Select building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Status" htmlFor="assetStatus">
            <Select
              id="assetStatus"
              value={formData.assetStatus}
              onChange={(e) => setFormData((prev) => ({ ...prev, assetStatus: e.target.value }))}
            >
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="disposed">Disposed</option>
            </Select>
          </FormField>

          <FormField label="Condition" htmlFor="assetCondition">
            <Select
              id="assetCondition"
              value={formData.assetCondition}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, assetCondition: e.target.value }))
              }
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="damaged">Damaged</option>
            </Select>
          </FormField>

          <FormField label="Brand" htmlFor="brand">
            <Input
              id="brand"
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
            />
          </FormField>

          <FormField label="Model" htmlFor="model">
            <Input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
            />
          </FormField>

          <FormField label="Serial Number" htmlFor="serialNumber">
            <Input
              id="serialNumber"
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
            />
          </FormField>

          <FormField label="Purchase Price" htmlFor="purchasePrice">
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Current Value" htmlFor="currentValue">
            <Input
              id="currentValue"
              type="number"
              step="0.01"
              value={formData.currentValue}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, currentValue: e.target.value }))
              }
            />
          </FormField>

          <FormField label="Rental Rate (per month)" htmlFor="rentalRate">
            <Input
              id="rentalRate"
              type="number"
              step="0.01"
              value={formData.rentalRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, rentalRate: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="description">
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            {isEditing ? 'Update Asset' : 'Save Asset'}
          </Button>
        </div>
      </form>
    </div>
  );
}
