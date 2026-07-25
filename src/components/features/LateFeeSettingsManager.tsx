'use client';

import { useState, useEffect } from 'react';
import {
  LateFeeSettings,
  CreateLateFeeSettingsData,
  LateFeeType,
  CreateLateFeeTierData,
} from '@/types/financial';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';

export default function LateFeeSettingsManager() {
  const { showSuccess, showError } = useNotifications();
  const [settings, setSettings] = useState<LateFeeSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateLateFeeSettingsData>({
    name: '',
    description: '',
    fee_type: 'percentage',
    percentage_amount: 5,
    flat_rate_amount: 0,
    grace_period_days: 5,
    apply_after_days: 5,
    is_recurring: false,
    is_active: true,
    auto_apply: false,
    send_notification: true,
    tiers: [],
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/late-fees/settings', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching late fee settings:', error);
      showError('Failed to load late fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/late-fees/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Late fee setting created successfully!');
        setShowCreateForm(false);
        fetchSettings();

        setFormData({
          name: '',
          description: '',
          fee_type: 'percentage',
          percentage_amount: 5,
          flat_rate_amount: 0,
          grace_period_days: 5,
          apply_after_days: 5,
          is_recurring: false,
          is_active: true,
          auto_apply: false,
          send_notification: true,
          tiers: [],
        });
      } else {
        showError(data.error || 'Failed to create late fee setting');
      }
    } catch (error) {
      console.error('Error creating late fee setting:', error);
      showError('Failed to create late fee setting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTier = () => {
    setFormData({
      ...formData,
      tiers: [
        ...(formData.tiers || []),
        {
          min_days_overdue: 0,
          fee_type: 'percentage',
          percentage_amount: 0,
          tier_order: (formData.tiers?.length || 0) + 1,
        },
      ],
    });
  };

  const removeTier = (index: number) => {
    const newTiers = formData.tiers?.filter((_, i) => i !== index);
    setFormData({ ...formData, tiers: newTiers });
  };

  const updateTier = (index: number, field: keyof CreateLateFeeTierData, value: any) => {
    const newTiers = formData.tiers?.map((tier, i) =>
      i === index ? { ...tier, [field]: value } : tier
    );
    setFormData({ ...formData, tiers: newTiers });
  };

  if (loading) {
    return <div className="p-6">Loading late fee settings...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Late Fee Settings</h2>
        <Button variant={showCreateForm ? 'outline' : 'primary'} onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create New Setting'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-8 bg-gray-50">
          <h3 className="text-xl font-semibold mb-4">Create Late Fee Setting</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField htmlFor="lateFeeName" label="Name" required>
                <Input
                  id="lateFeeName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormField>

              <FormField htmlFor="feeType" label="Fee Type" required>
                <Select
                  id="feeType"
                  value={formData.fee_type}
                  onChange={(e) =>
                    setFormData({ ...formData, fee_type: e.target.value as LateFeeType })
                  }
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat_rate">Flat Rate</option>
                  <option value="tiered">Tiered</option>
                </Select>
              </FormField>
            </div>

            <FormField htmlFor="lateFeeDescription" label="Description">
              <Textarea
                id="lateFeeDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </FormField>

            {formData.fee_type === 'percentage' && (
              <FormField htmlFor="percentageAmount" label="Percentage Amount (%)" required>
                <Input
                  id="percentageAmount"
                  type="number"
                  step="0.01"
                  value={formData.percentage_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, percentage_amount: parseFloat(e.target.value) })
                  }
                  required
                />
              </FormField>
            )}

            {formData.fee_type === 'flat_rate' && (
              <FormField htmlFor="flatRateAmount" label="Flat Rate Amount (₱)" required>
                <Input
                  id="flatRateAmount"
                  type="number"
                  step="0.01"
                  value={formData.flat_rate_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, flat_rate_amount: parseFloat(e.target.value) })
                  }
                  required
                />
              </FormField>
            )}

            {formData.fee_type === 'tiered' && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="block text-sm font-medium">Fee Tiers</span>
                  <Button type="button" variant="success" size="sm" onClick={addTier}>
                    Add Tier
                  </Button>
                </div>
                {formData.tiers && formData.tiers.length > 0 ? (
                  <div className="space-y-3">
                    {formData.tiers.map((tier, index) => (
                      <Card key={index} padding="sm" className="bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">Tier {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTier(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <FormField htmlFor={`tier-${index}-min`} label="Min Days Overdue">
                            <Input
                              id={`tier-${index}-min`}
                              type="number"
                              size="sm"
                              value={tier.min_days_overdue}
                              onChange={(e) =>
                                updateTier(index, 'min_days_overdue', parseInt(e.target.value))
                              }
                              required
                            />
                          </FormField>
                          <FormField htmlFor={`tier-${index}-max`} label="Max Days Overdue (optional)">
                            <Input
                              id={`tier-${index}-max`}
                              type="number"
                              size="sm"
                              value={tier.max_days_overdue || ''}
                              onChange={(e) =>
                                updateTier(
                                  index,
                                  'max_days_overdue',
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )
                              }
                            />
                          </FormField>
                          <FormField htmlFor={`tier-${index}-type`} label="Fee Type">
                            <Select
                              id={`tier-${index}-type`}
                              size="sm"
                              value={tier.fee_type}
                              onChange={(e) => updateTier(index, 'fee_type', e.target.value)}
                            >
                              <option value="percentage">Percentage</option>
                              <option value="flat_rate">Flat Rate</option>
                            </Select>
                          </FormField>
                          {tier.fee_type === 'percentage' ? (
                            <FormField htmlFor={`tier-${index}-pct`} label="Percentage (%)">
                              <Input
                                id={`tier-${index}-pct`}
                                type="number"
                                step="0.01"
                                size="sm"
                                value={tier.percentage_amount || ''}
                                onChange={(e) =>
                                  updateTier(index, 'percentage_amount', parseFloat(e.target.value))
                                }
                                required
                              />
                            </FormField>
                          ) : (
                            <FormField htmlFor={`tier-${index}-amt`} label="Amount (₱)">
                              <Input
                                id={`tier-${index}-amt`}
                                type="number"
                                step="0.01"
                                size="sm"
                                value={tier.flat_rate_amount || ''}
                                onChange={(e) =>
                                  updateTier(index, 'flat_rate_amount', parseFloat(e.target.value))
                                }
                                required
                              />
                            </FormField>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-900">
                    No tiers added yet. Click &quot;Add Tier&quot; to create one.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField htmlFor="gracePeriod" label="Grace Period (days)" required>
                <Input
                  id="gracePeriod"
                  type="number"
                  value={formData.grace_period_days}
                  onChange={(e) =>
                    setFormData({ ...formData, grace_period_days: parseInt(e.target.value) })
                  }
                  required
                />
              </FormField>
              <FormField htmlFor="applyAfter" label="Apply After (days)" required>
                <Input
                  id="applyAfter"
                  type="number"
                  value={formData.apply_after_days}
                  onChange={(e) =>
                    setFormData({ ...formData, apply_after_days: parseInt(e.target.value) })
                  }
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField htmlFor="maxFeeAmount" label="Max Fee Amount (₱)">
                <Input
                  id="maxFeeAmount"
                  type="number"
                  step="0.01"
                  value={formData.max_fee_amount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_fee_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </FormField>
              <FormField htmlFor="minInvoiceAmount" label="Min Invoice Amount (₱)">
                <Input
                  id="minInvoiceAmount"
                  type="number"
                  step="0.01"
                  value={formData.min_invoice_amount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_invoice_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </FormField>
            </div>

            <div className="space-y-2">
              <Checkbox
                label="Active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <Checkbox
                label="Auto-apply (apply automatically without manual approval)"
                checked={formData.auto_apply}
                onChange={(e) => setFormData({ ...formData, auto_apply: e.target.checked })}
              />
              <Checkbox
                label="Send Notification"
                checked={formData.send_notification}
                onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
              Create Late Fee Setting
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Current Settings</h3>
        {settings.length === 0 ? (
          <p className="text-gray-900">No late fee settings configured yet.</p>
        ) : (
          <div className="grid gap-4">
            {settings.map((setting) => (
              <Card key={setting.id} padding="sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold">{setting.name}</h4>
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      setting.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {setting.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {setting.description && (
                  <p className="text-sm text-gray-900 mb-3">{setting.description}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Fee Type:</span>
                    <p className="capitalize">{setting.fee_type}</p>
                  </div>
                  {setting.fee_type === 'percentage' && (
                    <div>
                      <span className="font-medium">Percentage:</span>
                      <p>{setting.percentage_amount}%</p>
                    </div>
                  )}
                  {setting.fee_type === 'flat_rate' && (
                    <div>
                      <span className="font-medium">Flat Rate:</span>
                      <p>₱{setting.flat_rate_amount?.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Grace Period:</span>
                    <p>{setting.grace_period_days} days</p>
                  </div>
                  <div>
                    <span className="font-medium">Apply After:</span>
                    <p>{setting.apply_after_days} days</p>
                  </div>
                  <div>
                    <span className="font-medium">Auto-apply:</span>
                    <p>{setting.auto_apply ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
