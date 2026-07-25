'use client';

import { useState, useEffect } from 'react';
import { PaymentGateway } from '@/types/payments';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

export default function PaymentGatewayManager() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      const response = await fetch('/api/payment-gateways');
      const data = await response.json();
      if (data.success) {
        setGateways(data.data);
      }
    } catch (error) {
      console.error('Error fetching gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGateway = async (gatewayId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId, isActive: !isActive }),
      });

      if (response.ok) {
        await fetchGateways();
      }
    } catch (error) {
      console.error('Error toggling gateway:', error);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '🏠' },
    { id: 'gateways', name: 'Gateway Settings', icon: '⚙️' },
    { id: 'methods', name: 'Payment Methods', icon: '💳' },
    { id: 'testing', name: 'Testing', icon: '🧪' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <Card padding="none" className="shadow rounded-lg overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Gateway Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gateways.map((gateway) => (
                <Card key={gateway.id} padding="sm" className="border border-gray-200 shadow-none">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {gateway.type === 'stripe' && '💳'}
                        {gateway.type === 'paypal' && '🅿️'}
                        {gateway.type === 'square' && '⬛'}
                        {gateway.type === 'authorize_net' && '🔒'}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{gateway.name}</h4>
                        <p className="text-sm text-gray-900 capitalize">{gateway.type}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={gateway.isActive}
                        onChange={() => handleToggleGateway(gateway.id, gateway.isActive)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900">Status:</span>
                      <span className={`${
                        gateway.isActive ? 'text-green-600' : 'text-gray-400'
                      } font-medium`}>
                        {gateway.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900">Processing Fee:</span>
                      <span className="text-gray-900 font-medium">
                        {gateway.fees.percentageFee}% + ${gateway.fees.fixedFee}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-900">Supported Methods:</span>
                      <span className="text-gray-900 font-medium">
                        {gateway.supportedMethods.length} methods
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="mt-3 w-full text-purple-600 hover:text-purple-700"
                    onClick={() => {
                      setSelectedGateway(gateway);
                      setShowConfig(true);
                      setActiveTab('gateways');
                    }}
                  >
                    Configure Settings
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gateways' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gateway Configuration</h3>

            {!showConfig ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Gateway to Configure</h4>
                <p className="text-gray-900 mb-6">Choose a payment gateway from the overview tab to manage its settings.</p>
                <Button variant="primary" onClick={() => setActiveTab('overview')}>
                  Go to Overview
                </Button>
              </div>
            ) : (
              <GatewayConfigForm
                gateway={selectedGateway!}
                onSave={() => {
                  setShowConfig(false);
                  fetchGateways();
                }}
                onCancel={() => setShowConfig(false)}
              />
            )}
          </div>
        )}

        {activeTab === 'methods' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Payment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gateways.filter(g => g.isActive).flatMap(gateway =>
                gateway.supportedMethods.map((method, index) => (
                  <Card key={`${gateway.id}-${index}`} padding="sm" className="border border-gray-200 shadow-none">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{method.displayName}</h4>
                        <p className="text-sm text-gray-900">via {gateway.name}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-900">Processing Time:</span>
                        <span className="text-gray-900">{method.processingTime}</span>
                      </div>
                      {method.fees && (
                        <div className="flex justify-between">
                          <span className="text-gray-900">Fees:</span>
                          <span className="text-gray-900">{method.fees}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'testing' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Testing</h3>
            <Alert variant="warning" title="Test Mode Active" className="mb-6">
              All transactions are processed in test mode. No real money will be charged.
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card padding="md" className="border border-gray-200 shadow-none">
                <h4 className="font-medium text-gray-900 mb-4">Test Credit Cards</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">4242 4242 4242 4242</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">4000 0000 0000 0002</span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Declined</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">4000 0000 0000 9995</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Insufficient Funds</span>
                  </div>
                </div>
              </Card>

              <TestPaymentPanel gateways={gateways} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function GatewayConfigForm({
  gateway,
  onSave,
  onCancel
}: {
  gateway: PaymentGateway;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [settings, setSettings] = useState(gateway.settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/payment-gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: gateway.id,
          settings,
          isActive: gateway.isActive,
        }),
      });

      if (response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving gateway config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="text-3xl">
          {gateway.type === 'stripe' && '💳'}
          {gateway.type === 'paypal' && '🅿️'}
          {gateway.type === 'square' && '⬛'}
          {gateway.type === 'authorize_net' && '🔒'}
        </div>
        <div>
          <h4 className="text-xl font-semibold text-gray-900">{gateway.name} Configuration</h4>
          <p className="text-gray-900 capitalize">{gateway.type} gateway settings</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Basic Settings</h5>
          <FormField label="Currency" htmlFor="gateway-currency">
            <Select
              id="gateway-currency"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            >
              <option value="PHP">PHP - Philippine Peso</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </Select>
          </FormField>
        </div>

        <div>
          <h5 className="font-medium text-gray-900 mb-3">Security Settings</h5>
          <div className="space-y-3">
            <Checkbox
              label="Test Mode"
              checked={settings.testMode}
              onChange={(e) => setSettings({ ...settings, testMode: e.target.checked })}
            />
            <Checkbox
              label="Require CVV"
              checked={settings.requireCvv}
              onChange={(e) => setSettings({ ...settings, requireCvv: e.target.checked })}
            />
            <Checkbox
              label="Allow Save Card"
              checked={settings.allowSaveCard}
              onChange={(e) => setSettings({ ...settings, allowSaveCard: e.target.checked })}
            />
          </div>
        </div>

        <div>
          <h5 className="font-medium text-gray-900 mb-3">Payment Settings</h5>
          <div className="space-y-3">
            <Checkbox
              label="Auto-capture Payments"
              checked={settings.autoCapture}
              onChange={(e) => setSettings({ ...settings, autoCapture: e.target.checked })}
            />
            <Checkbox
              label="Enable Recurring Payments"
              checked={settings.enableRecurring}
              onChange={(e) => setSettings({ ...settings, enableRecurring: e.target.checked })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TestPaymentPanel({ gateways }: { gateways: PaymentGateway[] }) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const activeGateway = gateways.find((g) => g.isActive) || gateways[0];

  const handleTestPayment = async () => {
    if (!activeGateway) {
      setMessage('No payment gateway configured.');
      return;
    }

    setRunning(true);
    setMessage('');
    try {
      const response = await fetch('/api/payment-gateways/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId: activeGateway.id, amount: 100 }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Test payment failed');
      }
      setMessage(result.message || 'Test payment succeeded (simulation).');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Test payment failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card padding="md" className="border border-gray-200 shadow-none">
      <h4 className="font-medium text-gray-900 mb-4">Test Payment</h4>
      <p className="text-sm text-gray-900 mb-4">
        Simulate a ₱100 test charge against {activeGateway?.name || 'your gateway'} (test mode only — no real charge).
      </p>
      <Button
        type="button"
        variant="primary"
        className="w-full"
        onClick={handleTestPayment}
        isLoading={running}
        isDisabled={!activeGateway}
      >
        {running ? 'Running test…' : 'Create Test Payment'}
      </Button>
      {message && (
        <p className="mt-3 text-sm text-gray-800">{message}</p>
      )}
    </Card>
  );
}
