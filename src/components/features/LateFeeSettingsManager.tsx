'use client';

import { useState, useEffect } from 'react';
import {
  LateFeeSettings,
  CreateLateFeeSettingsData,
  LateFeeType,
  CreateLateFeeTierData,
} from '@/types/financial';

export default function LateFeeSettingsManager() {
  const [settings, setSettings] = useState<LateFeeSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
      alert('Failed to load late fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/late-fees/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Late fee setting created successfully!');
        setShowCreateForm(false);
        fetchSettings();
        
        // Reset form
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
        alert(data.error || 'Failed to create late fee setting');
      }
    } catch (error) {
      console.error('Error creating late fee setting:', error);
      alert('Failed to create late fee setting');
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
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCreateForm ? 'Cancel' : 'Create New Setting'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-8 p-6 border border-gray-300 rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold mb-4">Create Late Fee Setting</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fee Type *</label>
                <select
                  value={formData.fee_type}
                  onChange={(e) => setFormData({ ...formData, fee_type: e.target.value as LateFeeType })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat_rate">Flat Rate</option>
                  <option value="tiered">Tiered</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>

            {/* Fee Amount */}
            {formData.fee_type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium mb-1">Percentage Amount (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.percentage_amount}
                  onChange={(e) => setFormData({ ...formData, percentage_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            )}

            {formData.fee_type === 'flat_rate' && (
              <div>
                <label className="block text-sm font-medium mb-1">Flat Rate Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.flat_rate_amount}
                  onChange={(e) => setFormData({ ...formData, flat_rate_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            )}

            {/* Tiered Fee Structure */}
            {formData.fee_type === 'tiered' && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Fee Tiers</label>
                  <button
                    type="button"
                    onClick={addTier}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Add Tier
                  </button>
                </div>
                {formData.tiers && formData.tiers.length > 0 ? (
                  <div className="space-y-3">
                    {formData.tiers.map((tier, index) => (
                      <div key={index} className="p-3 border border-gray-300 rounded bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">Tier {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeTier(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1">Min Days Overdue</label>
                            <input
                              type="number"
                              value={tier.min_days_overdue}
                              onChange={(e) => updateTier(index, 'min_days_overdue', parseInt(e.target.value))}
                              className="w-full px-2 py-1 border rounded text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Max Days Overdue (optional)</label>
                            <input
                              type="number"
                              value={tier.max_days_overdue || ''}
                              onChange={(e) => updateTier(index, 'max_days_overdue', e.target.value ? parseInt(e.target.value) : undefined)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Fee Type</label>
                            <select
                              value={tier.fee_type}
                              onChange={(e) => updateTier(index, 'fee_type', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="percentage">Percentage</option>
                              <option value="flat_rate">Flat Rate</option>
                            </select>
                          </div>
                          {tier.fee_type === 'percentage' ? (
                            <div>
                              <label className="block text-xs mb-1">Percentage (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.percentage_amount || ''}
                                onChange={(e) => updateTier(index, 'percentage_amount', parseFloat(e.target.value))}
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs mb-1">Amount (₱)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={tier.flat_rate_amount || ''}
                                onChange={(e) => updateTier(index, 'flat_rate_amount', parseFloat(e.target.value))}
                                className="w-full px-2 py-1 border rounded text-sm"
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-900">No tiers added yet. Click "Add Tier" to create one.</p>
                )}
              </div>
            )}

            {/* Grace Period & Application */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grace Period (days) *</label>
                <input
                  type="number"
                  value={formData.grace_period_days}
                  onChange={(e) => setFormData({ ...formData, grace_period_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apply After (days) *</label>
                <input
                  type="number"
                  value={formData.apply_after_days}
                  onChange={(e) => setFormData({ ...formData, apply_after_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Fee Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.max_fee_amount || ''}
                  onChange={(e) => setFormData({ ...formData, max_fee_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Invoice Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.min_invoice_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_invoice_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.auto_apply}
                  onChange={(e) => setFormData({ ...formData, auto_apply: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Auto-apply (apply automatically without manual approval)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.send_notification}
                  onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Send Notification</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
            >
              Create Late Fee Setting
            </button>
          </form>
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Current Settings</h3>
        {settings.length === 0 ? (
          <p className="text-gray-900">No late fee settings configured yet.</p>
        ) : (
          <div className="grid gap-4">
            {settings.map((setting) => (
              <div key={setting.id} className="p-4 border border-gray-300 rounded-lg bg-white">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

