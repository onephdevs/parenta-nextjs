'use client';

import { useState, useEffect } from 'react';
import { PaymentGateway } from '@/types/payments';

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
    <div className="bg-white shadow rounded-lg">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Gateway Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gateways.map((gateway) => (
                <div key={gateway.id} className="border border-gray-200 rounded-lg p-4">
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
                        <p className="text-sm text-gray-500 capitalize">{gateway.type}</p>
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
                      <span className="text-gray-500">Status:</span>
                      <span className={`${
                        gateway.isActive ? 'text-green-600' : 'text-gray-400'
                      } font-medium`}>
                        {gateway.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Processing Fee:</span>
                      <span className="text-gray-900 font-medium">
                        {gateway.fees.percentageFee}% + ${gateway.fees.fixedFee}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Supported Methods:</span>
                      <span className="text-gray-900 font-medium">
                        {gateway.supportedMethods.length} methods
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedGateway(gateway);
                      setShowConfig(true);
                      setActiveTab('gateways');
                    }}
                    className="mt-3 w-full text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Configure Settings
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gateway Settings Tab */}
        {activeTab === 'gateways' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gateway Configuration</h3>
            
            {!showConfig ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Select a Gateway to Configure</h4>
                <p className="text-gray-500 mb-6">Choose a payment gateway from the overview tab to manage its settings.</p>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  Go to Overview
                </button>
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

        {/* Payment Methods Tab */}
        {activeTab === 'methods' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Supported Payment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gateways.filter(g => g.isActive).flatMap(gateway =>
                gateway.supportedMethods.map((method, index) => (
                  <div key={`${gateway.id}-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{method.displayName}</h4>
                        <p className="text-sm text-gray-500">via {gateway.name}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Processing Time:</span>
                        <span className="text-gray-900">{method.processingTime}</span>
                      </div>
                      {method.fees && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fees:</span>
                          <span className="text-gray-900">{method.fees}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Testing Tab */}
        {activeTab === 'testing' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Testing</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Test Mode Active</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    All transactions are processed in test mode. No real money will be charged.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Cards */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Test Credit Cards</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">4242 4242 4242 4242</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">4000 0000 0000 0002</span>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Declined</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">4000 0000 0000 9995</span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Insufficient Funds</span>
                  </div>
                </div>
              </div>

              {/* Test Actions */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Test Payment</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Create a test payment to verify your gateway configuration.
                </p>
                <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm font-medium">
                  Create Test Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Gateway Configuration Form Component
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
          <p className="text-gray-500 capitalize">{gateway.type} gateway settings</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Settings */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Basic Settings</h5>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="PHP">PHP - Philippine Peso</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Security Settings</h5>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.testMode}
                onChange={(e) => setSettings({ ...settings, testMode: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Test Mode</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requireCvv}
                onChange={(e) => setSettings({ ...settings, requireCvv: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require CVV</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.allowSaveCard}
                onChange={(e) => setSettings({ ...settings, allowSaveCard: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Allow Save Card</span>
            </label>
          </div>
        </div>

        {/* Payment Settings */}
        <div>
          <h5 className="font-medium text-gray-900 mb-3">Payment Settings</h5>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoCapture}
                onChange={(e) => setSettings({ ...settings, autoCapture: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Auto-capture Payments</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableRecurring}
                onChange={(e) => setSettings({ ...settings, enableRecurring: e.target.checked })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Recurring Payments</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
} 