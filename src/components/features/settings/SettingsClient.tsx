'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Session } from 'next-auth';
import { Bell, Lock, Globe, Shield, Database, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationPreferencesPanel from '@/components/features/notifications/NotificationPreferencesPanel';
import {
  DEFAULT_TENANT_PAYMENT_INSTRUCTIONS,
  type TenantPaymentInstructions,
} from '@/lib/tenant-payment-instructions-shared';

interface SettingsClientProps {
  session: Session;
}

type SettingsTab =
  | 'notifications'
  | 'security'
  | 'preferences'
  | 'payments'
  | 'system';

const PAY_METHODS: Array<{
  id: TenantPaymentInstructions['acceptedMethods'][number];
  label: string;
}> = [
  { id: 'gcash', label: 'GCash' },
  { id: 'maya', label: 'Maya' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'other', label: 'Other e-wallet' },
];

export default function SettingsClient({ session: _session }: SettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showNotification } = useNotifications();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam === 'security' ||
      tabParam === 'preferences' ||
      tabParam === 'system' ||
      tabParam === 'notifications' ||
      tabParam === 'payments'
      ? tabParam
      : 'notifications'
  );
  const [settings, setSettings] = useState({
    emailNotifications: true,
    paymentReminders: true,
    maintenanceAlerts: true,
    monthlyReports: false,
    twoFactorAuth: false,
    sessionTimeout: '30',
    language: 'en',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    dateFormat: 'MM/DD/YYYY',
  });
  const [paymentInstructions, setPaymentInstructions] = useState<TenantPaymentInstructions>({
    ...DEFAULT_TENANT_PAYMENT_INSTRUCTIONS,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageVariant, setSaveMessageVariant] = useState<'success' | 'danger'>('success');
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    void loadSettings();
    void loadPaymentInstructions();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings((prev) => ({
          ...prev,
          currency: data.settings.currency || 'PHP',
          language: data.settings.language || 'en',
          timezone: data.settings.timezone || 'Asia/Manila',
          dateFormat: data.settings.date_format || 'MM/DD/YYYY',
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadPaymentInstructions = async () => {
    try {
      const response = await fetch('/api/admin/payment-instructions');
      const data = await response.json();
      if (data.success && data.data) {
        setPaymentInstructions(data.data);
      }
    } catch (error) {
      console.error('Error loading payment instructions:', error);
    }
  };

  const togglePayMethod = (method: TenantPaymentInstructions['acceptedMethods'][number]) => {
    setPaymentInstructions((prev) => {
      const has = prev.acceptedMethods.includes(method);
      const next = has
        ? prev.acceptedMethods.filter((m) => m !== method)
        : [...prev.acceptedMethods, method];
      return {
        ...prev,
        acceptedMethods: next.length > 0 ? next : prev.acceptedMethods,
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (activeTab === 'payments') {
        const response = await fetch('/api/admin/payment-instructions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentInstructions),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to save payment instructions');
        }
        setPaymentInstructions(data.data);
        setSaveMessage('Payment instructions saved — tenants will see these on Pay.');
        setSaveMessageVariant('success');
        showNotification({
          type: 'success',
          title: 'Payment details saved',
          message: 'Tenants can now see where to send GCash / transfers.',
        });
      } else {
        const response = await fetch('/api/settings/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: {
              currency: settings.currency,
              language: settings.language,
              timezone: settings.timezone,
              date_format: settings.dateFormat,
            },
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to save settings');
        }

        setSaveMessage('Settings saved successfully!');
        setSaveMessageVariant('success');
        showNotification({
          type: 'success',
          title: 'Settings saved',
          message: 'Your preferences have been updated.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      setSaveMessage(message);
      setSaveMessageVariant('danger');
      showNotification({
        type: 'error',
        title: 'Save failed',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      try {
        localStorage.removeItem('parenta-settings-cache');
        sessionStorage.clear();
      } catch {
        // ignore storage access errors
      }

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      showNotification({
        type: 'success',
        title: 'Cache cleared',
        message: 'Browser and session cache cleared. Reloading…',
      });
      setTimeout(() => window.location.reload(), 600);
    } catch {
      showNotification({
        type: 'error',
        title: 'Clear cache failed',
        message: 'Unable to clear cache. Try refreshing the page.',
      });
      setIsClearingCache(false);
    }
  };

  const handleExportData = () => {
    router.push('/admin/export');
  };

  const handleChangePassword = () => {
    router.push('/admin/profile');
  };

  const tabs: Array<{ id: SettingsTab; name: string; icon: typeof Bell }> = [
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'preferences', name: 'Preferences', icon: Globe },
    { id: 'payments', name: 'Tenant payments', icon: Smartphone },
    { id: 'system', name: 'System', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-900">
            Manage your account settings and preferences
          </p>
        </div>

        {saveMessage && (
          <Alert variant={saveMessageVariant} className="mb-6">
            {saveMessage}
          </Alert>
        )}

        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <NotificationPreferencesPanel />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">
                          Two-Factor Authentication
                        </label>
                        <p className="text-sm text-gray-900">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            twoFactorAuth: !settings.twoFactorAuth,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.twoFactorAuth ? 'bg-purple-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <FormField
                      label="Session Timeout"
                      htmlFor="session-timeout"
                      hint="Automatically log out after this period of inactivity"
                    >
                      <Select
                        id="session-timeout"
                        value={settings.sessionTimeout}
                        onChange={(e) =>
                          setSettings({ ...settings, sessionTimeout: e.target.value })
                        }
                        className="max-w-xs"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                        <option value="480">8 hours</option>
                      </Select>
                    </FormField>

                    <div className="border-t border-gray-200 pt-4">
                      <Button
                        variant="outline"
                        leftIcon={<Lock className="h-4 w-4" />}
                        onClick={handleChangePassword}
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900">
                    Application Preferences
                  </h3>
                  <div className="space-y-4">
                    <FormField label="Language" htmlFor="language">
                      <Select
                        id="language"
                        value={settings.language}
                        onChange={(e) =>
                          setSettings({ ...settings, language: e.target.value })
                        }
                        className="max-w-xs"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fil">Filipino</option>
                      </Select>
                    </FormField>

                    <FormField label="Timezone" htmlFor="timezone">
                      <Select
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) =>
                          setSettings({ ...settings, timezone: e.target.value })
                        }
                        className="max-w-xs"
                      >
                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                        <option value="America/New_York">America/New York (GMT-5)</option>
                        <option value="Europe/London">Europe/London (GMT+0)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      </Select>
                    </FormField>

                    <FormField label="Currency" htmlFor="currency">
                      <Select
                        id="currency"
                        value={settings.currency}
                        onChange={(e) =>
                          setSettings({ ...settings, currency: e.target.value })
                        }
                        className="max-w-xs"
                      >
                        <option value="PHP">PHP (₱)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </Select>
                    </FormField>

                    <FormField label="Date Format" htmlFor="date-format">
                      <Select
                        id="date-format"
                        value={settings.dateFormat}
                        onChange={(e) =>
                          setSettings({ ...settings, dateFormat: e.target.value })
                        }
                        className="max-w-xs"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </Select>
                    </FormField>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-1 text-lg font-medium text-gray-900">
                    Tenant payment destination
                  </h3>
                  <p className="mb-4 text-sm text-gray-600">
                    Tenants see this phone number on Pay online so they can send GCash / Maya /
                    bank transfers, then upload a receipt screenshot.
                  </p>
                  <div className="max-w-xl space-y-4">
                    <FormField
                      label="Payment phone number"
                      htmlFor="pay-phone"
                      required
                      hint="GCash / Maya / mobile number that receives tenant payments"
                    >
                      <Input
                        id="pay-phone"
                        type="tel"
                        value={paymentInstructions.phone}
                        onChange={(e) =>
                          setPaymentInstructions({
                            ...paymentInstructions,
                            phone: e.target.value,
                          })
                        }
                        placeholder="09XXXXXXXXX"
                      />
                    </FormField>

                    <FormField label="Account name" htmlFor="pay-account-name">
                      <Input
                        id="pay-account-name"
                        value={paymentInstructions.accountName}
                        onChange={(e) =>
                          setPaymentInstructions({
                            ...paymentInstructions,
                            accountName: e.target.value,
                          })
                        }
                        placeholder="Name on the GCash / bank account"
                      />
                    </FormField>

                    <FormField label="Bank name (optional)" htmlFor="pay-bank-name">
                      <Input
                        id="pay-bank-name"
                        value={paymentInstructions.bankName}
                        onChange={(e) =>
                          setPaymentInstructions({
                            ...paymentInstructions,
                            bankName: e.target.value,
                          })
                        }
                        placeholder="e.g. BPI, BDO"
                      />
                    </FormField>

                    <FormField
                      label="Bank account number (optional)"
                      htmlFor="pay-bank-account"
                    >
                      <Input
                        id="pay-bank-account"
                        value={paymentInstructions.bankAccountNumber}
                        onChange={(e) =>
                          setPaymentInstructions({
                            ...paymentInstructions,
                            bankAccountNumber: e.target.value,
                          })
                        }
                        placeholder="Account number for bank transfer"
                      />
                    </FormField>

                    <FormField label="Instructions shown to tenants" htmlFor="pay-notes">
                      <Textarea
                        id="pay-notes"
                        rows={3}
                        value={paymentInstructions.notes}
                        onChange={(e) =>
                          setPaymentInstructions({
                            ...paymentInstructions,
                            notes: e.target.value,
                          })
                        }
                      />
                    </FormField>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-900">Accepted methods</p>
                      <div className="flex flex-wrap gap-3">
                        {PAY_METHODS.map((method) => {
                          const checked = paymentInstructions.acceptedMethods.includes(
                            method.id
                          );
                          return (
                            <label
                              key={method.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePayMethod(method.id)}
                              />
                              {method.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-medium text-gray-900">System Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-gray-200 py-3">
                      <span className="text-sm font-medium text-gray-900">Application Version</span>
                      <span className="text-sm text-gray-900">v1.0.0</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-3">
                      <span className="text-sm font-medium text-gray-900">Database Status</span>
                      <span className="text-sm font-medium text-green-600">Connected</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-3">
                      <span className="text-sm font-medium text-gray-900">Last Backup</span>
                      <span className="text-sm text-gray-900">Today at 2:00 AM</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-3">
                      <span className="text-sm font-medium text-gray-900">Total Storage Used</span>
                      <span className="text-sm text-gray-900">2.4 GB</span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h4 className="mb-3 text-sm font-medium text-gray-900">Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        leftIcon={<Database className="h-4 w-4" />}
                        onClick={handleClearCache}
                        isLoading={isClearingCache}
                      >
                        Clear Cache
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={<Database className="h-4 w-4" />}
                        onClick={handleExportData}
                      >
                        Export Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              {isSaving
                ? 'Saving...'
                : activeTab === 'payments'
                  ? 'Save payment details'
                  : 'Save Settings'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
