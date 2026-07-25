'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { Bell, Lock, Globe, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

interface SettingsClientProps {
  session: Session;
}

export default function SettingsClient({ session }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('notifications');
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageVariant, setSaveMessageVariant] = useState<'success' | 'danger'>('success');

  useEffect(() => {
    loadSettings();
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

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
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

      if (data.success) {
        setSaveMessage('Settings saved successfully!');
        setSaveMessageVariant('success');
        setTimeout(() => setSaveMessage(''), 3000);
        window.location.reload();
      } else {
        setSaveMessage('Failed to save settings');
        setSaveMessageVariant('danger');
      }
    } catch (error) {
      setSaveMessage('Failed to save settings');
      setSaveMessageVariant('danger');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'preferences', name: 'Preferences', icon: Globe },
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
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'emailNotifications' as const,
                        label: 'Email Notifications',
                        description: 'Receive notifications via email',
                      },
                      {
                        key: 'paymentReminders' as const,
                        label: 'Payment Reminders',
                        description: 'Get notified about upcoming payments',
                      },
                      {
                        key: 'maintenanceAlerts' as const,
                        label: 'Maintenance Alerts',
                        description: 'Receive maintenance request notifications',
                      },
                      {
                        key: 'monthlyReports' as const,
                        label: 'Monthly Reports',
                        description: 'Receive monthly financial reports',
                      },
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900">
                            {label}
                          </label>
                          <p className="text-sm text-gray-900">{description}</p>
                        </div>
                        <button
                          onClick={() =>
                            setSettings({
                              ...settings,
                              [key]: !settings[key],
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings[key] ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings[key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Security Settings
                  </h3>
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

                    <div className="pt-4 border-t border-gray-200">
                      <Button variant="outline" leftIcon={<Lock className="w-4 h-4" />}>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
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

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    System Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Application Version</span>
                      <span className="text-sm text-gray-900">v1.0.0</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Database Status</span>
                      <span className="text-sm text-green-600 font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Last Backup</span>
                      <span className="text-sm text-gray-900">Today at 2:00 AM</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-900">Total Storage Used</span>
                      <span className="text-sm text-gray-900">2.4 GB</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" leftIcon={<Database className="w-4 h-4" />}>
                        Clear Cache
                      </Button>
                      <Button variant="outline" leftIcon={<Database className="w-4 h-4" />}>
                        Export Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
