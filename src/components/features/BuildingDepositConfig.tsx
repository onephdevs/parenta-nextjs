'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { BuildingDepositConfig } from '@/lib/api/building-deposit-config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

interface BuildingDepositConfigProps {
  buildingId: string;
  onConfigUpdated?: () => void;
  showAsSection?: boolean;
  renderAsFields?: boolean;
  formData?: any;
  onFormDataChange?: (data: any) => void;
}

export default function BuildingDepositConfigComponent({
  buildingId,
  onConfigUpdated,
  showAsSection = false,
  renderAsFields = false,
  formData: externalFormData,
  onFormDataChange,
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
        setConfig(null);
      }
    } catch (error) {
      console.error('Error fetching deposit config:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load deposit configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  const formData = externalFormData || internalFormData;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (renderAsFields) {
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
        message: 'Deposit configuration saved successfully',
      });

      await fetchConfig();
      onConfigUpdated?.();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save deposit configuration',
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
      onFormDataChange({
        ...formData,
        [name]: newValue,
      });
    } else {
      setInternalFormData(prev => ({
        ...prev,
        [name]: newValue,
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

  const renderFields = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Deposit Type" htmlFor="depositType">
            <Select
              id="depositType"
              name="depositType"
              value={formData.depositType}
              onChange={handleInputChange}
            >
              <option value="months">Months of Rent</option>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </Select>
          </FormField>

          {formData.depositType === 'months' && (
            <FormField
              label="Deposit Months"
              htmlFor="depositMonths"
              hint="Number of months (e.g., 2 = 2 months rent)"
            >
              <Input
                type="number"
                id="depositMonths"
                name="depositMonths"
                min="0"
                step="0.5"
                value={formData.depositMonths}
                onChange={handleInputChange}
                placeholder="e.g., 2"
              />
            </FormField>
          )}

          {formData.depositType === 'fixed' && (
            <FormField label="Deposit Amount" htmlFor="depositAmount">
              <Input
                type="number"
                id="depositAmount"
                name="depositAmount"
                min="0"
                step="0.01"
                value={formData.depositAmount ?? ''}
                onChange={handleInputChange}
                placeholder="e.g., 9600"
              />
            </FormField>
          )}

          {formData.depositType === 'percentage' && (
            <FormField
              label="Deposit Percentage"
              htmlFor="depositPercentage"
              hint="Percentage of monthly rent"
            >
              <Input
                type="number"
                id="depositPercentage"
                name="depositPercentage"
                min="0"
                max="100"
                step="0.01"
                value={formData.depositPercentage ?? ''}
                onChange={handleInputChange}
                placeholder="e.g., 50"
              />
            </FormField>
          )}

          <FormField
            label="Minimum Deposit Amount"
            htmlFor="minimumDepositAmount"
            hint="Minimum required deposit (default: 3,000)"
          >
            <Input
              type="number"
              id="minimumDepositAmount"
              name="minimumDepositAmount"
              min="0"
              step="0.01"
              value={formData.minimumDepositAmount}
              onChange={handleInputChange}
              placeholder="e.g., 3000"
            />
          </FormField>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Advance Payment Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Advance Type" htmlFor="advanceType">
            <Select
              id="advanceType"
              name="advanceType"
              value={formData.advanceType}
              onChange={handleInputChange}
            >
              <option value="months">Months of Rent</option>
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </Select>
          </FormField>

          {formData.advanceType === 'months' && (
            <FormField
              label="Advance Months"
              htmlFor="advanceMonths"
              hint="Number of months (e.g., 1 = 1 month rent)"
            >
              <Input
                type="number"
                id="advanceMonths"
                name="advanceMonths"
                min="0"
                step="0.5"
                value={formData.advanceMonths}
                onChange={handleInputChange}
                placeholder="e.g., 1"
              />
            </FormField>
          )}

          {formData.advanceType === 'fixed' && (
            <FormField label="Advance Amount" htmlFor="advanceAmount">
              <Input
                type="number"
                id="advanceAmount"
                name="advanceAmount"
                min="0"
                step="0.01"
                value={formData.advanceAmount ?? ''}
                onChange={handleInputChange}
                placeholder="e.g., 4800"
              />
            </FormField>
          )}

          {formData.advanceType === 'percentage' && (
            <FormField
              label="Advance Percentage"
              htmlFor="advancePercentage"
              hint="Percentage of monthly rent"
            >
              <Input
                type="number"
                id="advancePercentage"
                name="advancePercentage"
                min="0"
                max="100"
                step="0.01"
                value={formData.advancePercentage ?? ''}
                onChange={handleInputChange}
                placeholder="e.g., 50"
              />
            </FormField>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Utility Deposit</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Utility Deposit Amount"
            htmlFor="utilityDepositAmount"
            hint="Fixed utility deposit amount"
          >
            <Input
              type="number"
              id="utilityDepositAmount"
              name="utilityDepositAmount"
              min="0"
              step="0.01"
              value={formData.utilityDepositAmount}
              onChange={handleInputChange}
              placeholder="e.g., 1000"
            />
          </FormField>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Deposit Validity Rules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Deposit Validity (Days)"
            htmlFor="depositValidityDays"
            hint="Number of days deposit is valid (default: 5)"
          >
            <Input
              type="number"
              id="depositValidityDays"
              name="depositValidityDays"
              min="1"
              value={formData.depositValidityDays}
              onChange={handleInputChange}
              placeholder="e.g., 5"
            />
          </FormField>

          <FormField
            label="Non-Refundable After (Days)"
            htmlFor="depositRefundableAfterDays"
            hint="After this many days, deposit becomes non-refundable (default: 5)"
          >
            <Input
              type="number"
              id="depositRefundableAfterDays"
              name="depositRefundableAfterDays"
              min="1"
              value={formData.depositRefundableAfterDays}
              onChange={handleInputChange}
              placeholder="e.g., 5"
            />
          </FormField>
        </div>
      </div>

      {!renderAsFields && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={saving}
          >
            {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        </div>
      )}
    </div>
  );

  const content = renderAsFields ? (
    renderFields()
  ) : (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderFields()}
    </form>
  );

  if (showAsSection) {
    return (
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Deposit & Advance Configuration
        </h3>
        {config && (
          <Alert variant="info" className="mb-4">
            <strong>Current Configuration:</strong> This building has deposit requirements configured.
            Rooms in this building will inherit these settings unless overridden at the room level.
          </Alert>
        )}
        {content}
      </Card>
    );
  }

  return content;
}
