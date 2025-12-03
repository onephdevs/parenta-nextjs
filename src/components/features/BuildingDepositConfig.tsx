'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { BuildingDepositConfig } from '@/lib/api/building-deposit-config';

interface BuildingDepositConfigProps {
  buildingId: string;
  onConfigUpdated?: () => void;
  showAsSection?: boolean; // If true, shows as a section; if false, shows as inline form
  renderAsFields?: boolean; // If true, renders only fields (no form wrapper) for use inside another form
  formData?: any; // Form data from parent form (when renderAsFields is true)
  onFormDataChange?: (data: any) => void; // Callback to update parent form data
}

export default function BuildingDepositConfigComponent({
  buildingId,
  onConfigUpdated,
  showAsSection = false,
  renderAsFields = false,
  formData: externalFormData,
  onFormDataChange
}: BuildingDepositConfigProps) {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<BuildingDepositConfig | null>(null);
  const [internalFormData, setInternalFormData] = useState({
    depositMonths: 1,
    depositType: 'months' as 'fixed' | 'percentage' | 'months',
    depositAmount: undefined as number | undefined,
    depositPercentage: undefined as number | undefined,
    advanceMonths: 1,
    advanceType: 'months' as 'fixed' | 'percentage' | 'months',
    advanceAmount: undefined as number | undefined,
    advancePercentage: undefined as number | undefined,
    utilityDepositAmount: 0,
    depositValidityDays: 5,
    depositRefundableAfterDays: 5,
    minimumDepositAmount: 3000,
  });

  useEffect(() => {
    fetchConfig();
  }, [buildingId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/building-deposit-config/${buildingId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setConfig(result.data);
        const newFormData = {
          depositMonths: result.data.depositMonths || 1,
          depositType: result.data.depositType || 'months',
          depositAmount: result.data.depositAmount,
          depositPercentage: result.data.depositPercentage,
          advanceMonths: result.data.advanceMonths || 1,
          advanceType: result.data.advanceType || 'months',
          advanceAmount: result.data.advanceAmount,
          advancePercentage: result.data.advancePercentage,
          utilityDepositAmount: result.data.utilityDepositAmount || 0,
          depositValidityDays: result.data.depositValidityDays || 5,
          depositRefundableAfterDays: result.data.depositRefundableAfterDays || 5,
          minimumDepositAmount: result.data.minimumDepositAmount || 3000,
        };
        setInternalFormData(newFormData);
        if (onFormDataChange) {
          onFormDataChange(newFormData);
        }
      } else {
        // No config exists, use defaults
        setConfig(null);
      }
    } catch (error) {
      console.error('Error fetching deposit config:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load deposit configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  // Use external form data if provided, otherwise use internal
  const formData = externalFormData || internalFormData;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renderAsFields) {
      // When rendering as fields, don't submit here - parent form handles it
      return;
    }
    
    setSaving(true);

    try {
      const response = await fetch('/api/building-deposit-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save deposit configuration');
      }

      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Deposit configuration saved successfully'
      });

      await fetchConfig();
      onConfigUpdated?.();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save deposit configuration'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newValue = name.includes('Months') || name.includes('Days') || name.includes('Amount') || name.includes('Percentage')
      ? (value ? parseFloat(value) : undefined)
      : value;
    
    if (renderAsFields && onFormDataChange) {
      // Update parent form data
      onFormDataChange({
        ...formData,
        [name]: newValue
      });
    } else {
      // Update internal form data
      setInternalFormData(prev => ({
        ...prev,
        [name]: newValue
      }));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-900">Loading deposit configuration...</p>
      </div>
    );
  }

  // Render fields content
  const renderFields = () => (
    <div className="space-y-6">
      {/* Deposit Configuration */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="depositType" className="block text-sm font-medium text-gray-900 mb-2">
              Deposit Type
            </label>
            <select
              id="depositType"
              name="depositType"
              value={formData.depositType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="months">Months of Rent</option>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          {formData.depositType === 'months' && (
            <div>
              <label htmlFor="depositMonths" className="block text-sm font-medium text-gray-900 mb-2">
                Deposit Months
              </label>
              <input
                type="number"
                id="depositMonths"
                name="depositMonths"
                min="0"
                step="0.5"
                value={formData.depositMonths}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 2"
              />
              <p className="mt-1 text-xs text-gray-900">Number of months (e.g., 2 = 2 months rent)</p>
            </div>
          )}

          {formData.depositType === 'fixed' && (
            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-900 mb-2">
                Deposit Amount
              </label>
              <input
                type="number"
                id="depositAmount"
                name="depositAmount"
                min="0"
                step="0.01"
                value={formData.depositAmount || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 9600"
              />
            </div>
          )}

          {formData.depositType === 'percentage' && (
            <div>
              <label htmlFor="depositPercentage" className="block text-sm font-medium text-gray-900 mb-2">
                Deposit Percentage
              </label>
              <input
                type="number"
                id="depositPercentage"
                name="depositPercentage"
                min="0"
                max="100"
                step="0.01"
                value={formData.depositPercentage || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 50"
              />
              <p className="mt-1 text-xs text-gray-900">Percentage of monthly rent</p>
            </div>
          )}

          <div>
            <label htmlFor="minimumDepositAmount" className="block text-sm font-medium text-gray-900 mb-2">
              Minimum Deposit Amount
            </label>
            <input
              type="number"
              id="minimumDepositAmount"
              name="minimumDepositAmount"
              min="0"
              step="0.01"
              value={formData.minimumDepositAmount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., 3000"
            />
            <p className="mt-1 text-xs text-gray-900">Minimum required deposit (default: 3,000)</p>
          </div>
        </div>
      </div>

      {/* Advance Configuration */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Advance Payment Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="advanceType" className="block text-sm font-medium text-gray-900 mb-2">
              Advance Type
            </label>
            <select
              id="advanceType"
              name="advanceType"
              value={formData.advanceType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="months">Months of Rent</option>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          {formData.advanceType === 'months' && (
            <div>
              <label htmlFor="advanceMonths" className="block text-sm font-medium text-gray-900 mb-2">
                Advance Months
              </label>
              <input
                type="number"
                id="advanceMonths"
                name="advanceMonths"
                min="0"
                step="0.5"
                value={formData.advanceMonths}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 1"
              />
              <p className="mt-1 text-xs text-gray-900">Number of months (e.g., 1 = 1 month rent)</p>
            </div>
          )}

          {formData.advanceType === 'fixed' && (
            <div>
              <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-900 mb-2">
                Advance Amount
              </label>
              <input
                type="number"
                id="advanceAmount"
                name="advanceAmount"
                min="0"
                step="0.01"
                value={formData.advanceAmount || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 4800"
              />
            </div>
          )}

          {formData.advanceType === 'percentage' && (
            <div>
              <label htmlFor="advancePercentage" className="block text-sm font-medium text-gray-900 mb-2">
                Advance Percentage
              </label>
              <input
                type="number"
                id="advancePercentage"
                name="advancePercentage"
                min="0"
                max="100"
                step="0.01"
                value={formData.advancePercentage || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 50"
              />
              <p className="mt-1 text-xs text-gray-900">Percentage of monthly rent</p>
            </div>
          )}
        </div>
      </div>

      {/* Utility Deposit */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Utility Deposit</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="utilityDepositAmount" className="block text-sm font-medium text-gray-900 mb-2">
              Utility Deposit Amount
            </label>
            <input
              type="number"
              id="utilityDepositAmount"
              name="utilityDepositAmount"
              min="0"
              step="0.01"
              value={formData.utilityDepositAmount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., 1000"
            />
            <p className="mt-1 text-xs text-gray-900">Fixed utility deposit amount</p>
          </div>
        </div>
      </div>

      {/* Deposit Validity */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Validity Rules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="depositValidityDays" className="block text-sm font-medium text-gray-900 mb-2">
              Deposit Validity (Days)
            </label>
            <input
              type="number"
              id="depositValidityDays"
              name="depositValidityDays"
              min="1"
              value={formData.depositValidityDays}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., 5"
            />
            <p className="mt-1 text-xs text-gray-900">Number of days deposit is valid (default: 5)</p>
          </div>

          <div>
            <label htmlFor="depositRefundableAfterDays" className="block text-sm font-medium text-gray-900 mb-2">
              Non-Refundable After (Days)
            </label>
            <input
              type="number"
              id="depositRefundableAfterDays"
              name="depositRefundableAfterDays"
              min="1"
              value={formData.depositRefundableAfterDays}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., 5"
            />
            <p className="mt-1 text-xs text-gray-900">After this many days, deposit becomes non-refundable (default: 5)</p>
          </div>
        </div>
      </div>

      {!renderAsFields && (
        <div className="flex justify-end pt-4 border-t">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );

  // Wrap in form if not renderAsFields, otherwise return fields directly
  const content = renderAsFields ? (
    renderFields()
  ) : (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderFields()}
    </form>
  );

  if (showAsSection) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Deposit & Advance Configuration
        </h3>
        {config && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              <strong>Current Configuration:</strong> This building has deposit requirements configured. 
              Rooms in this building will inherit these settings unless overridden at the room level.
            </p>
          </div>
        )}
        {content}
      </div>
    );
  }

  return content;
}
