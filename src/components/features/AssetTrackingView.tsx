'use client';

import { useState } from 'react';

interface AssetData {
  id: string;
  assetName: string;
  assetType: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  assetStatus: string;
  assetCondition: string;
  currentValue?: number;
  buildingName?: string;
  location?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  installedDate?: Date;
  warrantyExpiry?: Date;
  qrCodeGenerated: boolean;
  trackingEnabled: boolean;
}

interface AssetTrackingViewProps {
  asset: AssetData;
}

export default function AssetTrackingView({ asset }: AssetTrackingViewProps) {
  const [activeTab, setActiveTab] = useState('details');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-green-100 text-green-800';
      case 'available':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'disposed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionBadgeClass = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-orange-100 text-orange-800';
      case 'damaged':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs = [
    { id: 'details', name: 'Asset Details', icon: '📋' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
    { id: 'history', name: 'History', icon: '📈' },
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Asset Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{asset.assetName}</h2>
            <p className="text-gray-900">{asset.assetType} • {asset.brand} {asset.model}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(asset.assetStatus)}`}>
              {asset.assetStatus.charAt(0).toUpperCase() + asset.assetStatus.slice(1)}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionBadgeClass(asset.assetCondition)}`}>
              {asset.assetCondition.charAt(0).toUpperCase() + asset.assetCondition.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-900">Location</div>
            <div className="text-lg font-semibold text-gray-900">
              {asset.buildingName}
            </div>
            {asset.location && (
              <div className="text-sm text-gray-900">{asset.location}</div>
            )}
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-900">Current Value</div>
            <div className="text-lg font-semibold text-gray-900">
              {asset.currentValue ? formatCurrency(asset.currentValue) : 'N/A'}
            </div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-900">Serial Number</div>
            <div className="text-lg font-semibold text-gray-900">
              {asset.serialNumber || 'N/A'}
            </div>
          </div>
        </div>
      </div>

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
        {/* Asset Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Information</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Asset Type:</dt>
                    <dd className="text-sm font-medium text-gray-900">{asset.assetType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Brand:</dt>
                    <dd className="text-sm font-medium text-gray-900">{asset.brand || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Model:</dt>
                    <dd className="text-sm font-medium text-gray-900">{asset.model || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Serial Number:</dt>
                    <dd className="text-sm font-medium text-gray-900">{asset.serialNumber || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Status:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {asset.assetStatus.charAt(0).toUpperCase() + asset.assetStatus.slice(1)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Condition:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {asset.assetCondition.charAt(0).toUpperCase() + asset.assetCondition.slice(1)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location & Tracking</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Building:</dt>
                    <dd className="text-sm font-medium text-gray-900">{asset.buildingName || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Specific Location:</dt>
                    <dd className="text-sm font-medium text-gray-900">{asset.location || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">QR Code:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {asset.qrCodeGenerated ? (
                        <span className="text-green-600">✓ Generated</span>
                      ) : (
                        <span className="text-gray-400">Not Generated</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Tracking Enabled:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {asset.trackingEnabled ? (
                        <span className="text-green-600">✓ Enabled</span>
                      ) : (
                        <span className="text-red-600">✗ Disabled</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-900">Current Value:</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {asset.currentValue ? formatCurrency(asset.currentValue) : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Important Dates */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Important Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.installedDate && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Installed Date</div>
                    <div className="text-lg text-blue-900">{formatDate(asset.installedDate)}</div>
                  </div>
                )}
                {asset.warrantyExpiry && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Warranty Expires</div>
                    <div className="text-lg text-green-900">{formatDate(asset.warrantyExpiry)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-yellow-800">Last Maintenance</h3>
                    <p className="text-yellow-700">
                      {asset.lastMaintenanceDate ? formatDate(asset.lastMaintenanceDate) : 'No maintenance recorded'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-blue-800">Next Maintenance</h3>
                    <p className="text-blue-700">
                      {asset.nextMaintenanceDate ? formatDate(asset.nextMaintenanceDate) : 'Not scheduled'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance History</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">Regular Inspection</div>
                      <div className="text-sm text-gray-900">
                        {asset.lastMaintenanceDate ? formatDate(asset.lastMaintenanceDate) : 'N/A'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-900 mt-1">
                      Routine maintenance and performance check completed successfully.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">Installation</div>
                      <div className="text-sm text-gray-900">
                        {asset.installedDate ? formatDate(asset.installedDate) : 'N/A'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-900 mt-1">
                      Asset installed and commissioned for operation.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scan History</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">QR Code Scanned</div>
                    <div className="text-sm text-gray-900">Scanned for routine inspection</div>
                  </div>
                  <div className="text-sm text-gray-900">Today, 2:30 PM</div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Location Updated</div>
                    <div className="text-sm text-gray-900">Moved to current location</div>
                  </div>
                  <div className="text-sm text-gray-900">2 days ago</div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">QR Code Generated</div>
                    <div className="text-sm text-gray-900">QR code created for tracking</div>
                  </div>
                  <div className="text-sm text-gray-900">1 week ago</div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Lifecycle</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Asset Purchased</div>
                    <div className="text-sm text-gray-900">Asset acquired and added to inventory</div>
                  </div>
                  <div className="text-sm text-gray-900">Purchase Date</div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Installed & Commissioned</div>
                    <div className="text-sm text-gray-900">Asset installed and put into service</div>
                  </div>
                  <div className="text-sm text-gray-900">
                    {asset.installedDate ? formatDate(asset.installedDate) : 'N/A'}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">In Service</div>
                    <div className="text-sm text-gray-900">Currently operational and being tracked</div>
                  </div>
                  <div className="text-sm text-gray-900">Current Status</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 