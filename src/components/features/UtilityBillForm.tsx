'use client';

import { useState, useEffect } from 'react';
import { UtilityBill, Building, CreateUtilityBillData } from '../../types/database';

interface UtilityBillFormProps {
  bill?: UtilityBill | null;
  onSubmit: (data: CreateUtilityBillData) => Promise<void>;
  onCancel: () => void;
}

export default function UtilityBillForm({ bill, onSubmit, onCancel }: UtilityBillFormProps) {
  const [formData, setFormData] = useState<CreateUtilityBillData>({
    buildingId: '',
    utilityType: 'electricity',
    providerName: '',
    providerAccountNumber: '',
    billingPeriodStart: new Date(),
    billingPeriodEnd: new Date(),
    dueDate: new Date(),
    amount: 0,
    usageAmount: 0,
    usageUnit: '',
    billStatus: 'pending',
    billUrl: '',
    notes: '',
  });

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBuildings();
    
    if (bill) {
      setFormData({
        buildingId: bill.buildingId,
        utilityType: bill.utilityType,
        providerName: bill.providerName,
        providerAccountNumber: bill.providerAccountNumber || '',
        billingPeriodStart: new Date(bill.billingPeriodStart),
        billingPeriodEnd: new Date(bill.billingPeriodEnd),
        dueDate: new Date(bill.dueDate),
        amount: bill.amount,
        usageAmount: bill.usageAmount || 0,
        usageUnit: bill.usageUnit || '',
        billStatus: bill.billStatus,
        billUrl: bill.billUrl || '',
        notes: bill.notes || '',
      });
    }
  }, [bill]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings || []);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const utilityTypes = [
    { value: 'electricity', label: '⚡ Electricity', unit: 'kWh' },
    { value: 'water', label: '💧 Water', unit: 'gallons' },
    { value: 'gas', label: '🔥 Gas', unit: 'therms' },
    { value: 'internet', label: '🌐 Internet', unit: 'Mbps' },
    { value: 'cable', label: '📺 Cable TV', unit: 'channels' },
    { value: 'waste', label: '🗑️ Waste Management', unit: 'pickups' },
    { value: 'other', label: '📋 Other', unit: 'units' },
  ];

  const billStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'disputed', label: 'Disputed' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.buildingId) {
      newErrors.buildingId = 'Building is required';
    }
    if (!formData.providerName.trim()) {
      newErrors.providerName = 'Provider name is required';
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (formData.billingPeriodStart >= formData.billingPeriodEnd) {
      newErrors.billingPeriodEnd = 'End date must be after start date';
    }
    if (formData.dueDate < formData.billingPeriodEnd) {
      newErrors.dueDate = 'Due date should be after billing period end';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUtilityBillData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-update usage unit based on utility type
    if (field === 'utilityType') {
      const selectedType = utilityTypes.find(type => type.value === value);
      if (selectedType) {
        setFormData(prev => ({ ...prev, usageUnit: selectedType.unit }));
      }
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {bill ? 'Edit Utility Bill' : 'Add New Utility Bill'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Building Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building *
            </label>
            <select
              value={formData.buildingId}
              onChange={(e) => handleInputChange('buildingId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.buildingId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} - {building.city}, {building.state}
                </option>
              ))}
            </select>
            {errors.buildingId && (
              <p className="mt-1 text-sm text-red-600">{errors.buildingId}</p>
            )}
          </div>

          {/* Utility Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Utility Type *
            </label>
            <select
              value={formData.utilityType}
              onChange={(e) => handleInputChange('utilityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {utilityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provider Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider Name *
              </label>
              <input
                type="text"
                value={formData.providerName}
                onChange={(e) => handleInputChange('providerName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.providerName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Pacific Gas & Electric"
              />
              {errors.providerName && (
                <p className="mt-1 text-sm text-red-600">{errors.providerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.providerAccountNumber}
                onChange={(e) => handleInputChange('providerAccountNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Account or service number"
              />
            </div>
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period Start *
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.billingPeriodStart)}
                onChange={(e) => handleInputChange('billingPeriodStart', new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period End *
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.billingPeriodEnd)}
                onChange={(e) => handleInputChange('billingPeriodEnd', new Date(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.billingPeriodEnd ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.billingPeriodEnd && (
                <p className="mt-1 text-sm text-red-600">{errors.billingPeriodEnd}</p>
              )}
            </div>
          </div>

          {/* Amount and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.dueDate)}
                onChange={(e) => handleInputChange('dueDate', new Date(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Usage Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.usageAmount}
                onChange={(e) => handleInputChange('usageAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Consumption amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Unit
              </label>
              <input
                type="text"
                value={formData.usageUnit}
                onChange={(e) => handleInputChange('usageUnit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., kWh, gallons, therms"
              />
            </div>
          </div>

          {/* Status and Bill URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.billStatus}
                onChange={(e) => handleInputChange('billStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {billStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bill URL (optional)
              </label>
              <input
                type="url"
                value={formData.billUrl}
                onChange={(e) => handleInputChange('billUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or comments about this bill..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : bill ? 'Update Bill' : 'Create Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 