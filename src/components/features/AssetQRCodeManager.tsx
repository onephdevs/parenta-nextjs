'use client';

import { useState, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface Asset {
  id: string;
  assetName: string;
  assetType: string;
  serialNumber?: string;
  buildingName?: string;
  qrCodeGenerated?: boolean;
  trackingEnabled: boolean;
}

interface AssetQRCodeManagerProps {
  assets: Asset[];
  onQRCodeGenerated: () => void;
}

export default function AssetQRCodeManager({ assets, onQRCodeGenerated }: AssetQRCodeManagerProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  const handleAssetSelect = (assetId: string, checked: boolean) => {
    if (checked) {
      setSelectedAssets([...selectedAssets, assetId]);
    } else {
      setSelectedAssets(selectedAssets.filter(id => id !== assetId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allAssetIds = assets.map(asset => asset.id);
      setSelectedAssets(allAssetIds);
    } else {
      setSelectedAssets([]);
    }
  };

  const generateQRCode = async (assetId: string, assetName: string) => {
    try {
      const response = await fetch('/api/assets/qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, assetName }),
      });

      const result = await response.json();
      
      if (result.success) {
        setQrCodes(prev => new Map(prev.set(assetId, result.data.qrCodeUrl)));
        return result.data.qrCodeUrl;
      } else {
        throw new Error(result.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const handleGenerateSelected = async () => {
    if (selectedAssets.length === 0) {
      addNotification('Please select at least one asset', 'warning');
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const assetId of selectedAssets) {
        const asset = assets.find(a => a.id === assetId);
        if (!asset) continue;

        try {
          await generateQRCode(assetId, asset.assetName);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to generate QR code for ${asset.assetName}:`, error);
        }
      }

      if (successCount > 0) {
        addNotification(
          `Successfully generated ${successCount} QR code${successCount > 1 ? 's' : ''}`,
          'success'
        );
        onQRCodeGenerated();
      }

      if (errorCount > 0) {
        addNotification(
          `Failed to generate ${errorCount} QR code${errorCount > 1 ? 's' : ''}`,
          'error'
        );
      }
    } catch (error) {
      addNotification('Failed to generate QR codes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSelected = async () => {
    if (selectedAssets.length === 0) {
      addNotification('Please select at least one asset', 'warning');
      return;
    }

    // Generate QR codes for selected assets if not already generated
    setLoading(true);
    try {
      for (const assetId of selectedAssets) {
        if (!qrCodes.has(assetId)) {
          const asset = assets.find(a => a.id === assetId);
          if (asset) {
            await generateQRCode(assetId, asset.assetName);
          }
        }
      }
      
      setShowPrintView(true);
      
      // Small delay to ensure print view is rendered
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (error) {
      addNotification('Failed to prepare QR codes for printing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedAssets.length === 0) {
      addNotification('Please select at least one asset', 'warning');
      return;
    }

    try {
      const selectedAssetsData = assets.filter(asset => selectedAssets.includes(asset.id));
      const csvContent = generateQRCodeCSV(selectedAssetsData);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset-qr-codes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      addNotification('QR code data exported successfully', 'success');
    } catch (error) {
      addNotification('Failed to export QR code data', 'error');
    }
  };

  const generateQRCodeCSV = (selectedAssets: Asset[]): string => {
    const headers = ['Asset ID', 'Asset Name', 'Asset Type', 'Serial Number', 'Building', 'QR Code Generated', 'Tracking URL'];
    
    const rows = selectedAssets.map(asset => [
      asset.id,
      asset.assetName,
      asset.assetType,
      asset.serialNumber || '',
      asset.buildingName || '',
      asset.qrCodeGenerated ? 'Yes' : 'No',
      `${window.location.origin}/track/asset/${asset.id}?scan=true`
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };

  if (showPrintView) {
    return (
      <div className="print-view">
        <style jsx>{`
          @media print {
            .no-print { display: none !important; }
            .print-view { margin: 0; padding: 0; }
            .qr-code-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 10mm; 
              page-break-inside: avoid;
            }
            .qr-code-item { 
              text-align: center; 
              page-break-inside: avoid;
              border: 1px solid #ccc;
              padding: 5mm;
            }
            .qr-code-image { 
              width: 40mm; 
              height: 40mm; 
              margin: 0 auto;
            }
          }
        `}</style>
        
        <div className="no-print mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">QR Code Print View</h3>
            <div className="space-x-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Print QR Codes
              </button>
              <button
                onClick={() => setShowPrintView(false)}
                className="px-4 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50"
              >
                Back to Manager
              </button>
            </div>
          </div>
        </div>

        <div ref={printRef} className="qr-code-grid">
          {selectedAssets.map(assetId => {
            const asset = assets.find(a => a.id === assetId);
            const qrCodeUrl = qrCodes.get(assetId);
            
            if (!asset || !qrCodeUrl) return null;
            
            return (
              <div key={assetId} className="qr-code-item">
                <img 
                  src={qrCodeUrl} 
                  alt={`QR Code for ${asset.assetName}`}
                  className="qr-code-image"
                />
                <div className="mt-2 text-sm font-medium">{asset.assetName}</div>
                <div className="text-xs text-gray-900">{asset.assetType}</div>
                <div className="text-xs text-gray-900">ID: {asset.id}</div>
                {asset.serialNumber && (
                  <div className="text-xs text-gray-900">SN: {asset.serialNumber}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">QR Code Management</h3>
          <p className="text-sm text-gray-900">Generate and manage QR codes for asset tracking</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-900">
            {selectedAssets.length} of {assets.length} selected
          </span>
          <button
            onClick={handleGenerateSelected}
            disabled={selectedAssets.length === 0 || loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate QR Codes'}
          </button>
          <button
            onClick={handlePrintSelected}
            disabled={selectedAssets.length === 0 || loading}
            className="px-4 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Print Selected
          </button>
          <button
            onClick={handleExportSelected}
            disabled={selectedAssets.length === 0}
            className="px-4 py-2 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedAssets.length === assets.length && assets.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm text-gray-900">Select All Assets</span>
          </label>
          <div className="text-sm text-gray-900">
            {assets.filter(a => a.qrCodeGenerated).length} of {assets.length} assets have QR codes
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Assets</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedAssets.length === assets.length && assets.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Building
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  QR Code Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedAssets.includes(asset.id)}
                      onChange={(e) => handleAssetSelect(asset.id, e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{asset.assetName}</div>
                      {asset.serialNumber && (
                        <div className="text-sm text-gray-900">SN: {asset.serialNumber}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asset.assetType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {asset.buildingName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {asset.qrCodeGenerated ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Generated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Not Generated
                        </span>
                      )}
                      {qrCodes.has(asset.id) && (
                        <img 
                          src={qrCodes.get(asset.id)} 
                          alt="QR Code"
                          className="w-8 h-8 border border-gray-200 rounded"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => generateQRCode(asset.id, asset.assetName)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Generate
                      </button>
                      {qrCodes.has(asset.id) && (
                        <button
                          onClick={() => {
                            setSelectedAssets([asset.id]);
                            handlePrintSelected();
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Print
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">QR Code Guidelines</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>QR codes contain asset tracking information and location data</li>
                <li>Print QR codes on durable, weather-resistant labels for outdoor assets</li>
                <li>Place QR codes in easily accessible but secure locations</li>
                <li>Test QR codes after printing to ensure they scan correctly</li>
                <li>Each scan is logged for tracking and maintenance purposes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 