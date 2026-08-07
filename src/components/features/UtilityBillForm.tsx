'use client';

import { useState, useEffect } from 'react';
import { UtilityBill, Building, CreateUtilityBillData } from '../../types/database';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { FormActions } from '@/components/ui/FormActions';
import { FormField } from '@/components/forms/FormField';

interface UtilityBillFormProps {
  bill?: UtilityBill | null;
  onSubmit: (data: CreateUtilityBillData) => Promise<void>;
  onCancel: () => void;
}

export default function UtilityBillForm({ bill, onSubmit, onCancel }: UtilityBillFormProps) {
  type FormState = Omit<CreateUtilityBillData, 'amount' | 'usageAmount'> & {
    amount?: number;
    usageAmount?: number;
  };
  const [formData, setFormData] = useState<FormState>({
    buildingId: '',
    utilityType: 'electricity',
    providerName: '',
    providerAccountNumber: '',
    billingPeriodStart: new Date(),
    billingPeriodEnd: new Date(),
    dueDate: new Date(),
    amount: undefined,
    usageAmount: undefined,
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
    const amount = Number(formData.amount);
    if (amount == null || amount <= 0 || Number.isNaN(amount)) {
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
      await onSubmit({
        ...formData,
        amount: formData.amount ?? 0,
        usageAmount: formData.usageAmount ?? 0,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUtilityBillData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    if (field === 'utilityType') {
      const selectedType = utilityTypes.find((type) => type.value === value);
      if (selectedType) {
        setFormData((prev) => ({ ...prev, usageUnit: selectedType.unit }));
      }
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card padding="none" className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {bill ? 'Edit Utility Bill' : 'Add New Utility Bill'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <FormField label="Building" htmlFor="buildingId" required error={errors.buildingId}>
            <Select
              id="buildingId"
              value={formData.buildingId}
              onChange={(e) => handleInputChange('buildingId', e.target.value)}
              isInvalid={Boolean(errors.buildingId)}
            >
              <option value="">Select a building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} - {building.city}, {building.state}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Utility Type" htmlFor="utilityType" required>
            <Select
              id="utilityType"
              value={formData.utilityType}
              onChange={(e) => handleInputChange('utilityType', e.target.value)}
            >
              {utilityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Provider Name"
              htmlFor="providerName"
              required
              error={errors.providerName}
            >
              <Input
                id="providerName"
                type="text"
                value={formData.providerName}
                onChange={(e) => handleInputChange('providerName', e.target.value)}
                isInvalid={Boolean(errors.providerName)}
                placeholder="e.g., Pacific Gas & Electric"
              />
            </FormField>

            <FormField label="Account Number" htmlFor="providerAccountNumber">
              <Input
                id="providerAccountNumber"
                type="text"
                value={formData.providerAccountNumber}
                onChange={(e) => handleInputChange('providerAccountNumber', e.target.value)}
                placeholder="Account or service number"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Billing Period Start" htmlFor="billingPeriodStart" required>
              <Input
                id="billingPeriodStart"
                type="date"
                value={formatDateForInput(formData.billingPeriodStart)}
                onChange={(e) => handleInputChange('billingPeriodStart', new Date(e.target.value))}
                min="2000-01-01"
                max="2099-12-31"
                style={{ colorScheme: 'light' }}
              />
            </FormField>

            <FormField
              label="Billing Period End"
              htmlFor="billingPeriodEnd"
              required
              error={errors.billingPeriodEnd}
            >
              <Input
                id="billingPeriodEnd"
                type="date"
                value={formatDateForInput(formData.billingPeriodEnd)}
                onChange={(e) => handleInputChange('billingPeriodEnd', new Date(e.target.value))}
                min={formatDateForInput(formData.billingPeriodStart) || '2000-01-01'}
                max="2099-12-31"
                isInvalid={Boolean(errors.billingPeriodEnd)}
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Amount" htmlFor="amount" required error={errors.amount}>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={0}
                value={
                  formData.amount === 0 ||
                  formData.amount === undefined ||
                  formData.amount === null
                    ? ''
                    : formData.amount
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    handleInputChange('amount', undefined);
                  } else {
                    const parsed = parseFloat(v);
                    handleInputChange('amount', Number.isNaN(parsed) ? 0 : parsed);
                  }
                }}
                isInvalid={Boolean(errors.amount)}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="Due Date" htmlFor="dueDate" required error={errors.dueDate}>
              <Input
                id="dueDate"
                type="date"
                value={formatDateForInput(formData.dueDate)}
                onChange={(e) => handleInputChange('dueDate', new Date(e.target.value))}
                min={formatDateForInput(formData.billingPeriodEnd) || '2000-01-01'}
                max="2099-12-31"
                isInvalid={Boolean(errors.dueDate)}
                style={{ colorScheme: 'light' }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Usage Amount" htmlFor="usageAmount">
              <Input
                id="usageAmount"
                type="number"
                step="0.01"
                min={0}
                value={
                  formData.usageAmount === 0 ||
                  formData.usageAmount === undefined ||
                  formData.usageAmount === null
                    ? ''
                    : formData.usageAmount
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    handleInputChange('usageAmount', undefined);
                  } else {
                    const parsed = parseFloat(v);
                    handleInputChange('usageAmount', Number.isNaN(parsed) ? 0 : parsed);
                  }
                }}
                placeholder="Consumption amount"
              />
            </FormField>

            <FormField label="Usage Unit" htmlFor="usageUnit">
              <Input
                id="usageUnit"
                type="text"
                value={formData.usageUnit}
                onChange={(e) => handleInputChange('usageUnit', e.target.value)}
                placeholder="e.g., kWh, gallons, therms"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Status" htmlFor="billStatus">
              <Select
                id="billStatus"
                value={formData.billStatus}
                onChange={(e) => handleInputChange('billStatus', e.target.value)}
              >
                {billStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Bill URL (optional)" htmlFor="billUrl">
              <Input
                id="billUrl"
                type="url"
                value={formData.billUrl}
                onChange={(e) => handleInputChange('billUrl', e.target.value)}
                placeholder="https://..."
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              placeholder="Additional notes or comments about this bill..."
            />
          </FormField>

          <FormActions
            className="border-t border-gray-200 pt-6"
            onCancel={onCancel}
            primaryLabel={loading ? 'Saving...' : bill ? 'Update Bill' : 'Create Bill'}
            primaryLoading={loading}
          />
        </form>
      </Card>
    </div>
  );
}
